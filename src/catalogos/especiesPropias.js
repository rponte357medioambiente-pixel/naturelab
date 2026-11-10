import { strToU8, zipSync } from 'fflate';
import { PREFIJO_ESPECIE_PROPIA, VERSION_ESQUEMA } from '../almacenamiento/modelo.js';
import { limpiarHabitats } from './habitats.js';
import { limpiarClasificacion } from './tipos.js';
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

// URL temporal de cada foto, reutilizada mientras el registro no cambie.
function crearCacheUrls() {
  const urls = new Map(); // clave → { marca, url }
  return {
    url(clave, blob, marca) {
      if (!blob || typeof URL.createObjectURL !== 'function') return null;
      const actual = urls.get(clave);
      if (actual?.marca === marca) return actual.url;
      if (actual) URL.revokeObjectURL(actual.url);
      const url = URL.createObjectURL(blob);
      urls.set(clave, { marca, url });
      return url;
    },
    /** Libera las URL de los registros que ya no existen. */
    conservar(claves) {
      for (const [clave, { url }] of urls) {
        if (!claves.has(clave)) {
          URL.revokeObjectURL(url);
          urls.delete(clave);
        }
      }
    },
  };
}

const urlsFotos = crearCacheUrls();
const urlsFotosCatalogo = crearCacheUrls();

/**
 * Fotos de campo que sustituyen, en este dispositivo, la imagen de especies del
 * catálogo publicado.
 * @returns {Map<string, {imagenUrl, imagenAutor, imagenFuente, imagenLicencia, imagenModificaciones, fechaModificacion}>}
 */
/** Fotos adicionales con su URL temporal (la clave incluye el id, que no cambia). */
function prepararExtras(cache, clave, extras = []) {
  return extras.map((x) => ({
    id: x.id,
    url: cache.url(`${clave}#${x.id}`, x.foto?.blob, x.id),
    parte: x.parte ?? null,
    imagenAutor: x.imagenAutor ?? '',
    imagenFuente: x.imagenFuente ?? '',
    imagenLicencia: x.imagenLicencia ?? '',
    imagenModificaciones: x.imagenModificaciones ?? '',
  }));
}

const clavesDe = (clave, extras = []) => [clave, ...extras.map((x) => `${clave}#${x.id}`)];

export function prepararFotosCatalogo(registros) {
  urlsFotosCatalogo.conservar(new Set(registros.flatMap((r) => clavesDe(r.especieId, r.fotosExtra))));
  return new Map(
    registros.map((r) => [
      r.especieId,
      {
        imagenUrl: r.foto ? urlsFotosCatalogo.url(r.especieId, r.foto.blob, r.fechaModificacion) : null,
        imagenAutor: r.imagenAutor,
        imagenFuente: r.imagenFuente,
        imagenLicencia: r.imagenLicencia,
        imagenModificaciones: r.imagenModificaciones,
        partePrincipal: r.partePrincipal ?? null,
        imagenesExtra: prepararExtras(urlsFotosCatalogo, r.especieId, r.fotosExtra),
        fechaModificacion: r.fechaModificacion,
      },
    ]),
  );
}

/** Especie publicada con la foto de campo en lugar de su imagen; conserva la original para poder volver. */
export function aplicarFotoCatalogo(especie, foto) {
  if (!foto) return especie;
  if (!foto.imagenUrl) return { ...especie, imagenesExtra: foto.imagenesExtra ?? [] };
  return {
    ...especie,
    imagenesExtra: foto.imagenesExtra ?? [],
    partePrincipal: foto.partePrincipal ?? null,
    fotoLocal: true,
    imagenUrl: foto.imagenUrl,
    imagenTipo: 'foto-local',
    imagenAutor: foto.imagenAutor,
    imagenFuente: foto.imagenFuente,
    imagenLicencia: foto.imagenLicencia,
    imagenModificaciones: foto.imagenModificaciones,
    imagenOriginal: {
      imagen: especie.imagen ?? null,
      imagenTipo: especie.imagenTipo ?? null,
      imagenLicencia: especie.imagenLicencia ?? null,
    },
  };
}

/**
 * Convierte los registros guardados en especies con la misma forma que las del
 * catálogo publicado, marcadas con «propia» y con la URL de su foto.
 */
export function prepararEspeciesPropias(registros) {
  urlsFotos.conservar(new Set(registros.flatMap((r) => clavesDe(r.id, r.fotosExtra))));
  return registros.map((r) => {
    // eslint-disable-next-line no-unused-vars
    const { foto, fotosExtra, ...datos } = r;
    return {
      ...datos,
      propia: true,
      imagenUrl: urlsFotos.url(r.id, r.foto?.blob, r.fechaModificacion),
      imagenesExtra: prepararExtras(urlsFotos, r.id, fotosExtra),
    };
  });
}

/* ---------- Copia ZIP ---------- */

const LEEME = `NatureLab: copia de «Mi catálogo»

Este archivo contiene:
- mi-catalogo.json: las especies que has añadido a tu catálogo y tus fotos
  de campo de especies del catálogo publicado.
- fotos/: las fotografías.

Para recuperarlo, abre NatureLab, ve a Catálogo y pulsa «Importar copia» en
«Mi catálogo». No hace falta descomprimir el archivo.

Las fotografías pueden incluir lugares reconocibles: compártelo con cuidado.
`;

/**
 * Prepara especies de «Mi catálogo» para guardarlas en un ZIP: devuelve sus datos
 * con vínculos a las fotos y los archivos de las fotos. Lo usan la copia de «Mi
 * catálogo» y la copia de cada investigación (con las especies que usa).
 * @returns {Promise<{entradas: object[], archivos: object}>}
 */
export async function serializarEspeciesPropias(registros) {
  const archivos = {};
  async function vincular(foto, nombre) {
    if (!foto?.blob) return null;
    const tipo = foto.tipoMime ?? foto.blob.type;
    const ruta = `fotos/${nombre}.${extensionDeTipo(tipo)}`;
    archivos[ruta] = [new Uint8Array(await foto.blob.arrayBuffer()), { level: 0 }];
    return { archivo: ruta, tipoMime: tipo, ancho: foto.ancho ?? null, alto: foto.alto ?? null };
  }
  const entradas = [];
  for (const registro of registros) {
    const { foto, fotosExtra, ...datos } = registro;
    const extras = [];
    for (const x of fotosExtra ?? []) {
      const vinculo = await vincular(x.foto, `${registro.id}-${x.id}`);
      if (vinculo) extras.push({ ...x, foto: vinculo });
    }
    entradas.push({ ...datos, foto: await vincular(foto, registro.id), fotosExtra: extras });
  }
  return { entradas, archivos };
}

/**
 * Lee las especies de «Mi catálogo» que trae una copia de investigación. Sin las
 * fotos (copia en JSON) se importan sin ellas. Las que no son válidas se omiten.
 * @returns {{especies: object[], avisos: string[]}}
 */
export function leerEspeciesDeCopia(lista, archivos = null) {
  if (!Array.isArray(lista) || lista.length === 0) return { especies: [], avisos: [] };
  const avisos = [];
  const especies = [];
  const vistas = new Set();
  lista.slice(0, LIMITES_CATALOGO_PROPIO.especies).forEach((entrada, i) => {
    const errores = [];
    const datos = archivos ? entrada : { ...entrada, foto: null, fotosExtra: [] };
    const especie = limpiarEspecie(datos, archivos ?? {}, errores, i + 1);
    if (especie && errores.length === 0 && !vistas.has(especie.id)) {
      vistas.add(especie.id);
      especies.push(especie);
    } else if (errores.length) {
      avisos.push(`Una especie de Mi catálogo no se ha podido leer y se omite (${errores[0]}).`);
    }
  });
  if (!archivos && especies.length) avisos.push('Las especies de Mi catálogo de esta copia se importan sin sus fotos.');
  return { especies, avisos };
}

/**
 * @param {object[]} registros  especies tal como están guardadas (con foto.blob)
 * @param {object[]} fotosCatalogo  fotos de campo de especies publicadas (con foto.blob)
 */
export async function construirZipCatalogoPropio(registros, fotosCatalogo = []) {
  const archivos = {};
  const especies = [];
  const fotos = [];
  // Guarda una foto en el ZIP y devuelve su vínculo. Las imágenes ya están
  // comprimidas: se guardan sin volver a comprimir.
  async function vincular(foto, nombre) {
    if (!foto?.blob) return null;
    const tipo = foto.tipoMime ?? foto.blob.type;
    const ruta = `fotos/${nombre}.${extensionDeTipo(tipo)}`;
    archivos[ruta] = [new Uint8Array(await foto.blob.arrayBuffer()), { level: 0 }];
    return { archivo: ruta, tipoMime: tipo, ancho: foto.ancho ?? null, alto: foto.alto ?? null };
  }
  async function vincularExtras(extras = [], prefijo) {
    const salida = [];
    for (const x of extras) {
      const vinculo = await vincular(x.foto, `${prefijo}-${x.id}`);
      if (vinculo) salida.push({ ...x, foto: vinculo });
    }
    return salida;
  }
  for (const registro of fotosCatalogo) {
    const { foto, fotosExtra, ...datos } = registro;
    const extras = await vincularExtras(fotosExtra, `catalogo-${registro.especieId}`);
    const vinculo = await vincular(foto, `catalogo-${registro.especieId}`);
    if (vinculo || extras.length) fotos.push({ ...datos, foto: vinculo, fotosExtra: extras });
  }
  for (const registro of registros) {
    const { foto, fotosExtra, ...datos } = registro;
    especies.push({
      ...datos,
      foto: await vincular(foto, registro.id),
      fotosExtra: await vincularExtras(fotosExtra, registro.id),
    });
  }
  const paquete = {
    formato: FORMATO_CATALOGO_PROPIO,
    versionEsquema: VERSION_ESQUEMA,
    aplicacion: 'NatureLab',
    exportadoEn: new Date().toISOString(),
    especies,
    fotosCatalogo: fotos,
  };
  archivos[NOMBRE_DATOS_CATALOGO] = strToU8(`${JSON.stringify(paquete, null, 2)}\n`);
  archivos['LEEME.txt'] = strToU8(LEEME);
  return new Blob([zipSync(archivos, { level: 6 })], { type: 'application/zip' });
}

export function nombreArchivoCatalogoPropio() {
  return `naturelab-mi-catalogo-${new Date().toISOString().slice(0, 10)}.zip`;
}

/* ---------- Importación ---------- */

/** Foto dentro del ZIP a partir de su vínculo; null si no está o no es una imagen válida. */
function leerFotoDelZip(vinculo, archivos, error, que) {
  const ruta = vinculo?.archivo;
  const bytes = typeof ruta === 'string' && RUTA_FOTO.test(ruta) ? archivos[ruta] : null;
  const tipo = bytes ? tipoDeBytes(bytes) : null;
  if (!bytes) {
    error(`falta ${que} dentro del ZIP.`);
    return null;
  }
  if (!tipo) {
    error(`${que} no es una imagen JPG, PNG o WebP válida.`);
    return null;
  }
  return {
    blob: new Blob([bytes], { type: tipo }),
    tipoMime: tipo,
    tamano: bytes.length,
    ancho: Number.isFinite(vinculo.ancho) && vinculo.ancho > 0 && vinculo.ancho < 100000 ? Math.round(vinculo.ancho) : null,
    alto: Number.isFinite(vinculo.alto) && vinculo.alto > 0 && vinculo.alto < 100000 ? Math.round(vinculo.alto) : null,
  };
}

const ID_FOTO_EXTRA = /^[A-Za-z0-9_-]{1,60}$/;

/** Hasta dos fotos adicionales, cada una con su parte y su autoría. */
function leerFotosExtra(lista, archivos, error) {
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) {
    error('la lista de fotos adicionales no es válida.');
    return [];
  }
  const texto = (v, max) => (typeof v === 'string' ? v.slice(0, max).trim() : '');
  const salida = [];
  for (const x of lista.slice(0, 2)) {
    if (!esObjeto(x) || typeof x.id !== 'string' || !ID_FOTO_EXTRA.test(x.id)) {
      error('una foto adicional no tiene un formato válido.');
      continue;
    }
    const foto = leerFotoDelZip(x.foto, archivos, error, 'una foto adicional');
    if (!foto) continue;
    salida.push({
      id: x.id,
      foto,
      parte: texto(x.parte, 60) || null,
      imagenAutor: texto(x.imagenAutor, 200),
      imagenFuente: texto(x.imagenFuente, 500),
      imagenLicencia: texto(x.imagenLicencia, 200),
      imagenModificaciones: texto(x.imagenModificaciones, 200),
    });
  }
  return salida;
}

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
    habitatsNaturales: limpiarHabitats(entrada.habitatsNaturales),
    ...limpiarClasificacion(entrada),
    foto,
    partePrincipal: foto && typeof entrada.partePrincipal === 'string' ? entrada.partePrincipal.slice(0, 60).trim() || null : null,
    fotosExtra: leerFotosExtra(entrada.fotosExtra, archivos, error),
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

  // Fotos de campo de especies publicadas (opcional: las copias anteriores no las tienen).
  const fotosCatalogo = [];
  if (datos.fotosCatalogo !== undefined) {
    if (!Array.isArray(datos.fotosCatalogo) || datos.fotosCatalogo.length > LIMITES_CATALOGO_PROPIO.especies) {
      errores.push('La lista de fotos de campo no es válida.');
    } else {
      const vistas = new Set();
      datos.fotosCatalogo.forEach((entrada, i) => {
        const foto = limpiarFotoCatalogo(entrada, archivos, errores, i + 1);
        if (foto && !vistas.has(foto.especieId)) {
          vistas.add(foto.especieId);
          fotosCatalogo.push(foto);
        }
      });
    }
  }

  if (errores.length > 0) {
    return { ok: false, errores: errores.slice(0, LIMITES_CATALOGO_PROPIO.erroresMostrados), totalErrores: errores.length };
  }
  return { ok: true, especies, fotosCatalogo, avisos };
}

// Identificador de una especie publicada (no de «Mi catálogo»).
const ID_PUBLICADA = /^(?!propia-)[a-z0-9][a-z0-9-]{0,99}$/;

function limpiarFotoCatalogo(entrada, archivos, errores, numero) {
  const error = (mensaje) => errores.push(`Foto de campo ${numero}: ${mensaje}`);
  if (!esObjeto(entrada) || typeof entrada.especieId !== 'string' || !ID_PUBLICADA.test(entrada.especieId)) {
    error('no indica una especie válida.');
    return null;
  }
  const foto = entrada.foto ? leerFotoDelZip(entrada.foto, archivos, error, 'la foto') : null;
  if (entrada.foto && !foto) return null;
  const fotosExtra = leerFotosExtra(entrada.fotosExtra, archivos, error);
  if (!foto && fotosExtra.length === 0) {
    error('no trae ninguna foto.');
    return null;
  }
  const texto = (valor, max) => (typeof valor === 'string' ? valor.slice(0, max).trim() : '');
  return {
    especieId: entrada.especieId,
    foto,
    imagenAutor: foto ? texto(entrada.imagenAutor, LIMITES_CATALOGO_PROPIO.textoCorto) : '',
    imagenFuente: foto ? texto(entrada.imagenFuente, 500) : '',
    imagenLicencia: foto ? texto(entrada.imagenLicencia, LIMITES_CATALOGO_PROPIO.textoCorto) : '',
    imagenModificaciones: foto ? texto(entrada.imagenModificaciones, LIMITES_CATALOGO_PROPIO.textoCorto) : '',
    partePrincipal: foto ? texto(entrada.partePrincipal, 60) || null : null,
    fotosExtra,
    fechaModificacion: fechaValida(entrada.fechaModificacion) ? entrada.fechaModificacion : new Date().toISOString(),
  };
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
export function planificarImportacionPropias(importadas, locales, clave = 'id') {
  const porId = new Map(locales.map((r) => [r[clave], r]));
  const plan = { nuevas: [], actualizadas: [], sinCambios: [] };
  for (const especie of importadas) {
    const local = porId.get(especie[clave]);
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
