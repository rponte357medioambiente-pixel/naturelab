import { strToU8, zipSync } from 'fflate';
import { PREFIJO_ESPECIE_PROPIA, VERSION_ESQUEMA } from '../almacenamiento/modelo.js';
import {
  esZip,
  extensionDeTipo,
  LIMITES_ZIP,
  leerZip,
  NOMBRE_DATOS_CATALOGO,
  RUTA_FOTO,
  tipoDeBytes,
} from '../importacion-exportacion/copiaZip.js';

/**
 * «Mi catálogo»: especies que la persona usuaria añade en sus salidas.
 * Se guardan solo en este dispositivo (IndexedDB), con la foto dentro del registro,
 * y se trasladan a otro dispositivo con su propia copia ZIP:
 *   mi-catalogo.json  datos de las especies y vínculos a las fotos
 *   fotos/            una imagen por especie que tenga foto
 *   LEEME.txt
 */
// Conserva el nombre antiguo de la app a propósito: cambiarlo dejaría sin abrir los datos y las copias ya guardados.
export const FORMATO_CATALOGO_PROPIO = 'naturalab-catalogo-propio';

export const ESTADOS_VALIDACION_PROPIA = {
  pendiente: 'Identificación pendiente de comprobar',
  validada: 'Identificación comprobada',
};

export const LIMITES_CATALOGO_PROPIO = {
  especies: 2000,
  textoCorto: 200,
  textoLargo: 2000,
  erroresMostrados: 8,
};

const ID_PROPIA = new RegExp(`^${PREFIJO_ESPECIE_PROPIA}[A-Za-z0-9_-]{1,90}$`);

export const esEspeciePropia = (especie) => Boolean(especie?.propia);

/* ---------- Formato para las pantallas del catálogo ---------- */

// URL temporal de cada foto, reutilizada mientras la especie no cambie.
const urlsFotos = new Map(); // id → { marca, url }

function urlDeFoto(registro) {
  if (!registro.foto?.blob || typeof URL.createObjectURL !== 'function') return null;
  const actual = urlsFotos.get(registro.id);
  if (actual?.marca === registro.fechaModificacion) return actual.url;
  if (actual) URL.revokeObjectURL(actual.url);
  const url = URL.createObjectURL(registro.foto.blob);
  urlsFotos.set(registro.id, { marca: registro.fechaModificacion, url });
  return url;
}

/**
 * Convierte los registros guardados en especies con la misma forma que las del
 * catálogo publicado, marcadas con «propia» y con la URL de su foto.
 */
export function prepararEspeciesPropias(registros) {
  const ids = new Set(registros.map((r) => r.id));
  for (const [id, { url }] of urlsFotos) {
    if (!ids.has(id)) {
      URL.revokeObjectURL(url);
      urlsFotos.delete(id);
    }
  }
  return registros.map((r) => {
    // eslint-disable-next-line no-unused-vars
    const { foto, ...datos } = r;
    return { ...datos, propia: true, imagenUrl: urlDeFoto(r) };
  });
}

/* ---------- Copia ZIP ---------- */

const LEEME = `NatureLab: copia de «Mi catálogo»

Este archivo contiene:
- mi-catalogo.json: las especies que has añadido a tu catálogo.
- fotos/: sus fotografías, si las tienen.

Para recuperarlo, abre NatureLab, ve a Catálogo y pulsa «Importar copia» en
«Mi catálogo». No hace falta descomprimir el archivo.

Las fotografías pueden incluir lugares reconocibles: compártelo con cuidado.
`;

/** @param {object[]} registros  especies tal como están guardadas (con foto.blob) */
export async function construirZipCatalogoPropio(registros) {
  const archivos = {};
  const especies = [];
  for (const registro of registros) {
    const { foto, ...datos } = registro;
    let vinculo = null;
    if (foto?.blob) {
      const tipo = foto.tipoMime ?? foto.blob.type;
      const ruta = `fotos/${registro.id}.${extensionDeTipo(tipo)}`;
      // Las imágenes ya están comprimidas: se guardan sin volver a comprimir.
      archivos[ruta] = [new Uint8Array(await foto.blob.arrayBuffer()), { level: 0 }];
      vinculo = { archivo: ruta, tipoMime: tipo, ancho: foto.ancho ?? null, alto: foto.alto ?? null };
    }
    especies.push({ ...datos, foto: vinculo });
  }
  const paquete = {
    formato: FORMATO_CATALOGO_PROPIO,
    versionEsquema: VERSION_ESQUEMA,
    aplicacion: 'NatureLab',
    exportadoEn: new Date().toISOString(),
    especies,
  };
  archivos[NOMBRE_DATOS_CATALOGO] = strToU8(`${JSON.stringify(paquete, null, 2)}\n`);
  archivos['LEEME.txt'] = strToU8(LEEME);
  return new Blob([zipSync(archivos, { level: 6 })], { type: 'application/zip' });
}

export function nombreArchivoCatalogoPropio() {
  return `naturelab-mi-catalogo-${new Date().toISOString().slice(0, 10)}.zip`;
}

/* ---------- Importación ---------- */

const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const fechaValida = (v) => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
const medidaValida = (v) => (Number.isFinite(v) && v > 0 && v < 100000 ? Math.round(v) : null);

function limpiarEspecie(entrada, archivos, errores, numero) {
  const error = (mensaje) => errores.push(`Especie ${numero}: ${mensaje}`);
  if (!esObjeto(entrada)) {
    error('no tiene un formato válido.');
    return null;
  }
  const texto = (valor, campo, max) => {
    if (valor === undefined || valor === null) return '';
    if (typeof valor !== 'string') {
      error(`«${campo}» debe ser texto.`);
      return '';
    }
    if (valor.length > max) error(`«${campo}» supera ${max} caracteres.`);
    return valor.slice(0, max).trim();
  };

  if (typeof entrada.id !== 'string' || !ID_PROPIA.test(entrada.id)) {
    error('su identificador no es válido.');
    return null;
  }
  const { textoCorto, textoLargo } = LIMITES_CATALOGO_PROPIO;
  const nombreComun = texto(entrada.nombreComun, 'nombre', textoCorto);
  if (!nombreComun) error('falta el nombre.');

  let foto = null;
  if (entrada.foto !== null && entrada.foto !== undefined) {
    const ruta = entrada.foto?.archivo;
    const bytes = typeof ruta === 'string' && RUTA_FOTO.test(ruta) ? archivos[ruta] : null;
    const tipo = bytes ? tipoDeBytes(bytes) : null;
    if (!bytes) error('falta su foto dentro del ZIP.');
    else if (!tipo) error('su foto no es una imagen JPG, PNG o WebP válida.');
    else {
      foto = {
        blob: new Blob([bytes], { type: tipo }),
        tipoMime: tipo,
        tamano: bytes.length,
        ancho: medidaValida(entrada.foto.ancho),
        alto: medidaValida(entrada.foto.alto),
      };
    }
  }

  const ahora = new Date().toISOString();
  return {
    id: entrada.id,
    nombreComun,
    nombreCientifico: texto(entrada.nombreCientifico, 'nombre científico', textoCorto),
    familia: texto(entrada.familia, 'familia', textoCorto),
    lugarTexto: texto(entrada.lugarTexto, 'lugar', textoCorto),
    notas: texto(entrada.notas, 'notas', textoLargo),
    estadoValidacion: entrada.estadoValidacion === 'validada' ? 'validada' : 'pendiente',
    foto,
    imagenAutor: foto ? texto(entrada.imagenAutor, 'autoría', textoCorto) : '',
    imagenFuente: foto ? texto(entrada.imagenFuente, 'procedencia', 500) : '',
    imagenLicencia: foto ? texto(entrada.imagenLicencia, 'licencia', textoCorto) : '',
    imagenModificaciones: foto ? texto(entrada.imagenModificaciones, 'modificaciones', textoCorto) : '',
    versionEsquema: VERSION_ESQUEMA,
    fechaCreacion: fechaValida(entrada.fechaCreacion) ? entrada.fechaCreacion : ahora,
    fechaModificacion: fechaValida(entrada.fechaModificacion) ? entrada.fechaModificacion : ahora,
  };
}

/**
 * Valida el contenido de mi-catalogo.json. Todo lo que llega se trata como datos:
 * se reconstruye cada especie solo con los campos conocidos.
 * @returns {{ok: true, especies: object[], avisos: string[]} | {ok: false, errores: string[], totalErrores: number}}
 */
export function validarCatalogoPropio(datos, archivos = {}) {
  const fallo = (mensaje) => ({ ok: false, errores: [mensaje], totalErrores: 1 });
  if (!esObjeto(datos) || datos.formato !== FORMATO_CATALOGO_PROPIO) {
    return fallo('El archivo no es una copia de «Mi catálogo».');
  }
  if (!Number.isInteger(datos.versionEsquema) || datos.versionEsquema < 1) {
    return fallo('La copia no indica una versión de esquema válida.');
  }
  if (datos.versionEsquema > VERSION_ESQUEMA) {
    return fallo('La copia se creó con una versión más reciente de NatureLab. Actualiza la aplicación y vuelve a intentarlo.');
  }
  if (!Array.isArray(datos.especies)) return fallo('Falta la lista de especies.');
  if (datos.especies.length > LIMITES_CATALOGO_PROPIO.especies) {
    return fallo(`La copia supera el límite de ${LIMITES_CATALOGO_PROPIO.especies} especies.`);
  }

  const errores = [];
  const avisos = [];
  const especies = [];
  const ids = new Set();
  let repetidas = 0;
  datos.especies.forEach((entrada, i) => {
    const especie = limpiarEspecie(entrada, archivos, errores, i + 1);
    if (!especie) return;
    if (ids.has(especie.id)) {
      repetidas += 1;
      return;
    }
    ids.add(especie.id);
    especies.push(especie);
  });
  if (repetidas > 0) avisos.push(`Se han descartado ${repetidas} especies repetidas dentro del propio archivo.`);
  if (errores.length > 0) {
    return { ok: false, errores: errores.slice(0, LIMITES_CATALOGO_PROPIO.erroresMostrados), totalErrores: errores.length };
  }
  return { ok: true, especies, avisos };
}

/** Lee y valida una copia ZIP de «Mi catálogo» elegida por la persona usuaria. */
export async function leerCopiaCatalogoPropio(archivo) {
  const fallo = (mensaje) => ({ ok: false, errores: [mensaje], totalErrores: 1 });
  if (!archivo) return fallo('No se ha elegido ningún archivo.');
  const inicio = new Uint8Array(await archivo.slice(0, 4).arrayBuffer());
  if (!esZip(inicio)) return fallo('El archivo no es una copia ZIP de «Mi catálogo».');
  if (archivo.size > LIMITES_ZIP.tamanoArchivoBytes) return fallo('El archivo ZIP es demasiado grande.');
  try {
    const { datos, archivos } = leerZip(new Uint8Array(await archivo.arrayBuffer()), {
      nombreDatos: NOMBRE_DATOS_CATALOGO,
    });
    return validarCatalogoPropio(datos, archivos);
  } catch (error) {
    return fallo(error.message);
  }
}

/**
 * Compara la copia con lo que hay en el dispositivo, por identificador:
 * id nuevo → se añade; mismo id y la copia es más reciente → se actualiza;
 * mismo id y la local es igual o más reciente → se conserva la local.
 */
export function planificarImportacionPropias(importadas, locales) {
  const porId = new Map(locales.map((r) => [r.id, r]));
  const plan = { nuevas: [], actualizadas: [], sinCambios: [] };
  for (const especie of importadas) {
    const local = porId.get(especie.id);
    if (!local) plan.nuevas.push(especie);
    else if ((especie.fechaModificacion ?? '') > (local.fechaModificacion ?? '')) plan.actualizadas.push(especie);
    else plan.sinCambios.push(especie);
  }
  return plan;
}

/** Hay cambios sin copia si alguna especie se modificó después de la última copia descargada. */
export function catalogoPropioNecesitaCopia(registros, fechaUltimaCopia) {
  if (registros.length === 0) return false;
  if (!fechaUltimaCopia) return true;
  return registros.some((r) => (r.fechaModificacion ?? '') > fechaUltimaCopia);
}
