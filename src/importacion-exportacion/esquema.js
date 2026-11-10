import {
  ESTADOS_IDENTIFICACION,
  MODOS_ANOTACION,
  MODOS_DIBUJO,
  TIPOS_PRACTICA,
  VERSION_ESQUEMA,
} from '../almacenamiento/modelo.js';
import { UNIDADES_SUPERFICIE, validarAbundancia, validarSuperficie } from '../calculos/biodiversidad.js';
import { LIMITES_TRANSECTO, validarLongitudTransecto } from '../calculos/cobertura.js';
import { esPaletaValida } from '../apariencia/paletas.js';
import { limpiarCoordenadas } from '../ubicacion/coordenadas.js';
import { leerEspeciesDeCopia, leerFotosCatalogoDeCopia } from '../catalogos/especiesPropias.js';
import { LIMITES_ZIP, RUTA_DIBUJO, RUTA_FOTO, esZip, leerZip, tipoDeBytes } from './copiaZip.js';

/**
 * Formato de intercambio de una investigación (apartado 8). Todo lo que llega de
 * un archivo se trata como datos: se validan tipos y tamaños y se reconstruyen
 * los objetos solo con los campos conocidos.
 */
// Conserva el nombre antiguo de la app a propósito: cambiarlo dejaría sin abrir los datos y las copias ya guardados.
export const FORMATO_PAQUETE = 'naturalab-investigacion';

export const LIMITES = {
  tamanoArchivoBytes: 5 * 1024 * 1024,
  parcelas: 200,
  observaciones: 10000,
  textoCorto: 200,
  textoLargo: 2000,
  erroresMostrados: 8,
};

const LABORATORIOS_DISPONIBLES = ['biodiversidad'];
const ID_VALIDO = /^[A-Za-z0-9_-]{1,100}$/;
const FECHA_DIA = /^\d{4}-\d{2}-\d{2}$/;

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function crearLector(errores, prefijo) {
  const error = (mensaje) => errores.push(prefijo ? `${prefijo}: ${mensaje}` : mensaje);
  return {
    texto(valor, campo, max, { obligatorio = false } = {}) {
      if (valor === undefined || valor === null || valor === '') {
        if (obligatorio) error(`falta «${campo}».`);
        return '';
      }
      if (typeof valor !== 'string') {
        error(`«${campo}» debe ser texto.`);
        return '';
      }
      if (valor.length > max) error(`«${campo}» supera ${max} caracteres.`);
      return valor.slice(0, max).trim();
    },
    id(valor, campo, { opcional = false } = {}) {
      if (opcional && (valor === null || valor === undefined || valor === '')) return null;
      if (typeof valor !== 'string' || !ID_VALIDO.test(valor)) {
        error(`«${campo}» no es un identificador válido.`);
        return null;
      }
      return valor;
    },
    fecha(valor, campo, { soloDia = false, opcional = true } = {}) {
      if (valor === undefined || valor === null || valor === '') {
        if (!opcional) error(`falta «${campo}».`);
        return soloDia ? '' : null;
      }
      const valido =
        typeof valor === 'string' &&
        (soloDia ? FECHA_DIA.test(valor) : !Number.isNaN(Date.parse(valor))) &&
        valor.length <= 40;
      if (!valido) {
        error(`«${campo}» no es una fecha válida.`);
        return soloDia ? '' : null;
      }
      return valor;
    },
    /** Coordenadas en grados decimales, o null. */
    coordenadas(valor) {
      const r = limpiarCoordenadas(valor);
      if (!r.valida) error('sus coordenadas no son válidas.');
      return r.valor;
    },
    /** Lista de medidas en cm, todas mayores que 0. */
    medidas(valor, campo) {
      if (valor === undefined || valor === null) return [];
      if (!Array.isArray(valor) || valor.length > LIMITES_TRANSECTO.manchasMax) {
        error(`«${campo}» no es una lista de medidas válida.`);
        return [];
      }
      if (!valor.every((v) => Number.isFinite(v) && v > 0 && v <= LIMITES_TRANSECTO.longitudMaxCm)) {
        error(`«${campo}» contiene medidas no válidas.`);
        return [];
      }
      return [...valor];
    },
    /** Tramos {desde, hasta} sobre una línea de longitud L. */
    tramos(valor, campo, L) {
      if (valor === undefined || valor === null) return [];
      if (!Array.isArray(valor) || valor.length > LIMITES_TRANSECTO.manchasMax) {
        error(`«${campo}» no es una lista de tramos válida.`);
        return [];
      }
      const validos = valor.every(
        (t) =>
          esObjeto(t) &&
          Number.isFinite(t.desde) &&
          Number.isFinite(t.hasta) &&
          t.desde >= 0 &&
          t.hasta > t.desde &&
          (!(L > 0) || t.hasta <= L),
      );
      if (!validos) {
        error(`«${campo}» contiene tramos no válidos.`);
        return [];
      }
      return valor.map((t) => ({ desde: t.desde, hasta: t.hasta }));
    },
    error,
  };
}

export function limpiarInvestigacion(entrada, errores) {
  const lector = crearLector(errores, 'Investigación');
  if (!esObjeto(entrada)) {
    lector.error('no se encuentra en el archivo.');
    return null;
  }
  const laboratorio = lector.texto(entrada.laboratorio, 'laboratorio', 40, { obligatorio: true });
  if (laboratorio && !LABORATORIOS_DISPONIBLES.includes(laboratorio)) {
    lector.error(`pertenece al laboratorio «${laboratorio}», que aún no está disponible en esta versión.`);
  }
  const tipoPractica = entrada.tipoPractica ?? 'parcela';
  if (!Object.hasOwn(TIPOS_PRACTICA, tipoPractica)) lector.error('el tipo de práctica no es válido.');
  return {
    id: lector.id(entrada.id, 'id'),
    titulo: lector.texto(entrada.titulo, 'título', LIMITES.textoCorto, { obligatorio: true }),
    descripcion: lector.texto(entrada.descripcion, 'descripción', LIMITES.textoLargo),
    fechaObservacion: lector.fecha(entrada.fechaObservacion, 'fecha de observación', { soloDia: true }),
    lugarTexto: lector.texto(entrada.lugarTexto, 'lugar', LIMITES.textoCorto),
    coordenadas: lector.coordenadas(entrada.coordenadas),
    equipoAlias: lector.texto(entrada.equipoAlias, 'equipo', LIMITES.textoCorto),
    laboratorio,
    tipoPractica: Object.hasOwn(TIPOS_PRACTICA, tipoPractica) ? tipoPractica : 'parcela',
    // Una paleta desconocida (de una versión futura) no impide importar: se usa la general.
    paleta: esPaletaValida(entrada.paleta) ? entrada.paleta : null,
    versionEsquema: VERSION_ESQUEMA,
    fechaCreacion: lector.fecha(entrada.fechaCreacion, 'fecha de creación') ?? new Date().toISOString(),
    fechaModificacion: lector.fecha(entrada.fechaModificacion, 'fecha de modificación') ?? new Date().toISOString(),
    fechaUltimaExportacion: null,
  };
}

export function limpiarParcela(entrada, investigacionId, errores, numero, tipoPractica = 'parcela') {
  if (tipoPractica === 'transecto') return limpiarTransecto(entrada, investigacionId, errores, numero);
  const lector = crearLector(errores, `Parcela ${numero}`);
  if (!esObjeto(entrada)) {
    lector.error('no tiene un formato válido.');
    return null;
  }
  if (entrada.investigacionId !== investigacionId) lector.error('no pertenece a esta investigación.');
  const superficie = validarSuperficie(entrada.superficie);
  if (!superficie.valida) lector.error(superficie.mensaje.toLowerCase());
  const unidad = entrada.unidadSuperficie ?? 'm2';
  if (!Object.hasOwn(UNIDADES_SUPERFICIE, unidad)) lector.error('la unidad de superficie no es válida.');
  return {
    id: lector.id(entrada.id, 'id'),
    investigacionId,
    codigo: lector.texto(entrada.codigo, 'código', 40, { obligatorio: true }),
    superficie: superficie.valida ? superficie.valor : null,
    unidadSuperficie: Object.hasOwn(UNIDADES_SUPERFICIE, unidad) ? unidad : 'm2',
    coordenadas: lector.coordenadas(entrada.coordenadas),
    descripcion: lector.texto(entrada.descripcion, 'descripción', LIMITES.textoLargo),
    notas: lector.texto(entrada.notas, 'notas', LIMITES.textoLargo),
    fechaModificacion: lector.fecha(entrada.fechaModificacion, 'fecha de modificación') ?? new Date().toISOString(),
  };
}

function limpiarTransecto(entrada, investigacionId, errores, numero) {
  const lector = crearLector(errores, `Transecto ${numero}`);
  if (!esObjeto(entrada)) {
    lector.error('no tiene un formato válido.');
    return null;
  }
  if (entrada.investigacionId !== investigacionId) lector.error('no pertenece a esta investigación.');
  const longitud = validarLongitudTransecto(entrada.longitudCm);
  if (!longitud.valida) lector.error(longitud.mensaje.toLowerCase());
  const modo = entrada.modoAnotacion;
  if (!Object.hasOwn(MODOS_ANOTACION, modo)) lector.error('el modo de anotación no es válido.');
  return {
    id: lector.id(entrada.id, 'id'),
    investigacionId,
    codigo: lector.texto(entrada.codigo, 'código', 40, { obligatorio: true }),
    superficie: null,
    unidadSuperficie: 'm2',
    longitudCm: longitud.valida ? longitud.valor : null,
    orientacion: lector.texto(entrada.orientacion, 'orientación', 40),
    modoAnotacion: Object.hasOwn(MODOS_ANOTACION, modo) ? modo : 'longitudes',
    sueloDesnudo: lector.medidas(entrada.sueloDesnudo, 'suelo desnudo'),
    coordenadas: lector.coordenadas(entrada.coordenadas),
    descripcion: lector.texto(entrada.descripcion, 'descripción', LIMITES.textoLargo),
    notas: lector.texto(entrada.notas, 'notas', LIMITES.textoLargo),
    fechaModificacion: lector.fecha(entrada.fechaModificacion, 'fecha de modificación') ?? new Date().toISOString(),
  };
}

/**
 * @param {Map<string, object>} [transectosPorId]  en investigaciones de transectos, para comprobar los tramos
 */
export function limpiarObservacion(entrada, investigacionId, idsParcelas, errores, numero, transectosPorId = null) {
  const lector = crearLector(errores, `${transectosPorId ? 'Anotación' : 'Observación'} ${numero}`);
  if (!esObjeto(entrada)) {
    lector.error('no tiene un formato válido.');
    return null;
  }
  if (entrada.investigacionId !== investigacionId) lector.error('no pertenece a esta investigación.');
  if (!idsParcelas.has(entrada.parcelaId)) {
    lector.error(`hace referencia a ${transectosPorId ? 'un transecto' : 'una parcela'} que no está en el archivo.`);
  }
  let manchas = {};
  let abundancia = { valida: true, valor: null };
  if (transectosPorId) {
    const transecto = transectosPorId.get(entrada.parcelaId);
    manchas = {
      longitudes: lector.medidas(entrada.longitudes, 'longitudes'),
      tramos: lector.tramos(entrada.tramos, 'tramos', transecto?.longitudCm),
    };
  } else {
    abundancia = validarAbundancia(entrada.abundancia);
    if (!abundancia.valida) lector.error(abundancia.mensaje.toLowerCase());
  }
  const estado = entrada.estadoIdentificacion;
  if (!Object.hasOwn(ESTADOS_IDENTIFICACION, estado)) lector.error('el estado de identificación no es válido.');
  const especieId = lector.id(entrada.especieId, 'especie', { opcional: true });
  return {
    id: lector.id(entrada.id, 'id'),
    investigacionId,
    parcelaId: typeof entrada.parcelaId === 'string' ? entrada.parcelaId : null,
    especieId,
    nombreComun: lector.texto(entrada.nombreComun, 'nombre', LIMITES.textoCorto, { obligatorio: true }),
    nombreCientifico: lector.texto(entrada.nombreCientifico, 'nombre científico', LIMITES.textoCorto),
    abundancia: abundancia.valida ? abundancia.valor : null,
    ...manchas,
    notas: lector.texto(entrada.notas, 'notas', LIMITES.textoLargo),
    fecha: lector.fecha(entrada.fecha, 'fecha') ?? new Date().toISOString(),
    estadoIdentificacion: Object.hasOwn(ESTADOS_IDENTIFICACION, estado) ? estado : 'pendiente',
    fotoLocalId: null, // Se asigna después, solo si la foto viene en el ZIP.
    fechaModificacion: lector.fecha(entrada.fechaModificacion, 'fecha de modificación') ?? new Date().toISOString(),
  };
}

function limpiarFoto(entrada, investigacionId, observacionesPorId, archivos, errores, numero) {
  const lector = crearLector(errores, `Foto ${numero}`);
  if (!esObjeto(entrada)) {
    lector.error('no tiene un formato válido.');
    return null;
  }
  const id = lector.id(entrada.id, 'id');
  if (!observacionesPorId.has(entrada.observacionId)) {
    lector.error('no corresponde a ninguna observación del archivo.');
    return null;
  }
  if (typeof entrada.archivo !== 'string' || !RUTA_FOTO.test(entrada.archivo) || !archivos[entrada.archivo]) {
    lector.error('falta su imagen dentro del ZIP.');
    return null;
  }
  const bytes = archivos[entrada.archivo];
  const tipo = tipoDeBytes(bytes);
  if (!tipo) {
    lector.error('no es una imagen JPG, PNG o WebP válida.');
    return null;
  }
  if (!id) return null;
  const numeroValido = (v) => (Number.isFinite(v) && v > 0 && v < 100000 ? Math.round(v) : null);
  return {
    id,
    observacionId: entrada.observacionId,
    investigacionId,
    blob: new Blob([bytes], { type: tipo }),
    tipoMime: tipo,
    tamano: bytes.length,
    ancho: numeroValido(entrada.ancho),
    alto: numeroValido(entrada.alto),
    fecha: lector.fecha(entrada.fecha, 'fecha') ?? new Date().toISOString(),
  };
}

const NIVELES_DIBUJO = new Set(['facil', 'medio', 'dificil']);

function limpiarDibujo(entrada, investigacionId, archivos, errores, numero) {
  const lector = crearLector(errores, `Dibujo ${numero}`);
  if (!esObjeto(entrada)) {
    lector.error('no tiene un formato válido.');
    return null;
  }
  const id = lector.id(entrada.id, 'id');
  if (entrada.investigacionId !== investigacionId) lector.error('no pertenece a esta investigación.');
  if (typeof entrada.archivo !== 'string' || !RUTA_DIBUJO.test(entrada.archivo) || !archivos[entrada.archivo]) {
    lector.error('falta su imagen dentro del ZIP.');
    return null;
  }
  const bytes = archivos[entrada.archivo];
  if (tipoDeBytes(bytes) !== 'image/png') {
    lector.error('no es una imagen PNG válida.');
    return null;
  }
  const modo = Object.hasOwn(MODOS_DIBUJO, entrada.modo) ? entrada.modo : null;
  if (!modo) lector.error('el modo de dibujo no es válido.');
  if (!id || !modo) return null;
  const numeroValido = (v) => (Number.isFinite(v) && v > 0 && v < 100000 ? Math.round(v) : null);
  return {
    id,
    investigacionId,
    especieId: typeof entrada.especieId === 'string' && entrada.especieId ? entrada.especieId.slice(0, 120) : null,
    nombreComun: lector.texto(entrada.nombreComun, 'nombre común', LIMITES.textoCorto, { obligatorio: true }),
    nombreCientifico: lector.texto(entrada.nombreCientifico, 'nombre científico', LIMITES.textoCorto),
    modo,
    nivel: modo === 'puntos' && NIVELES_DIBUJO.has(entrada.nivel) ? entrada.nivel : null,
    alias: lector.texto(entrada.alias, 'alias', 60),
    fecha: lector.fecha(entrada.fecha, 'fecha') ?? new Date().toISOString(),
    blob: new Blob([bytes], { type: 'image/png' }),
    tipoMime: 'image/png',
    tamano: bytes.length,
    ancho: numeroValido(entrada.ancho),
    alto: numeroValido(entrada.alto),
  };
}

/**
 * Punto único para adaptar copias de versiones anteriores del esquema.
 * 1 → 2: las investigaciones anteriores son todas de recuento en parcela.
 */
export function migrarPaquete(datos) {
  if (datos.versionEsquema < 2 && esObjeto(datos.investigacion) && !datos.investigacion.tipoPractica) {
    return { ...datos, investigacion: { ...datos.investigacion, tipoPractica: 'parcela' } };
  }
  return datos;
}

/**
 * Valida una copia ya convertida desde JSON.
 * @returns {{ok: true, paquete: object, avisos: string[]} | {ok: false, errores: string[], totalErrores: number}}
 */
export function validarPaquete(datos, { archivos = null } = {}) {
  const fallo = (mensaje) => ({ ok: false, errores: [mensaje], totalErrores: 1 });

  if (!esObjeto(datos) || datos.formato !== FORMATO_PAQUETE) {
    return fallo('El archivo no es una copia de investigación de NatureLab.');
  }
  if (!Number.isInteger(datos.versionEsquema) || datos.versionEsquema < 1) {
    return fallo('La copia no indica una versión de esquema válida.');
  }
  if (datos.versionEsquema > VERSION_ESQUEMA) {
    return fallo('La copia se creó con una versión más reciente de NatureLab. Actualiza la aplicación y vuelve a intentarlo.');
  }

  const migrado = migrarPaquete(datos);
  if (!Array.isArray(migrado.parcelas) || !Array.isArray(migrado.observaciones)) {
    return fallo('Faltan las listas de parcelas u observaciones.');
  }
  if (migrado.parcelas.length > LIMITES.parcelas || migrado.observaciones.length > LIMITES.observaciones) {
    return fallo(
      `La copia supera el límite de ${LIMITES.parcelas} parcelas o ${LIMITES.observaciones} observaciones.`,
    );
  }

  const errores = [];
  const avisos = [];
  const investigacion = limpiarInvestigacion(migrado.investigacion, errores);
  const investigacionId = investigacion?.id;

  const parcelas = [];
  const idsParcelas = new Set();
  const codigos = new Set();
  const tipoPractica = investigacion?.tipoPractica ?? 'parcela';
  const unidad = tipoPractica === 'transecto' ? 'Transecto' : 'Parcela';
  migrado.parcelas.forEach((entrada, i) => {
    const parcela = limpiarParcela(entrada, investigacionId, errores, i + 1, tipoPractica);
    if (!parcela) return;
    if (idsParcelas.has(parcela.id)) {
      errores.push(`${unidad} ${i + 1}: su identificador está repetido.`);
      return;
    }
    const codigo = parcela.codigo.toLocaleLowerCase('es');
    if (codigos.has(codigo)) errores.push(`${unidad} ${i + 1}: el código «${parcela.codigo}» está repetido.`);
    codigos.add(codigo);
    idsParcelas.add(parcela.id);
    parcelas.push(parcela);
  });

  const observaciones = [];
  const idsObservaciones = new Set();
  let repetidas = 0;
  const transectosPorId = tipoPractica === 'transecto' ? new Map(parcelas.map((p) => [p.id, p])) : null;
  migrado.observaciones.forEach((entrada, i) => {
    const observacion = limpiarObservacion(entrada, investigacionId, idsParcelas, errores, i + 1, transectosPorId);
    if (!observacion) return;
    if (idsObservaciones.has(observacion.id)) {
      repetidas += 1;
      return;
    }
    idsObservaciones.add(observacion.id);
    observaciones.push(observacion);
  });
  if (repetidas > 0) {
    avisos.push(`Se han descartado ${repetidas} observaciones repetidas dentro del propio archivo.`);
  }

  const fotos = [];
  if (Array.isArray(migrado.fotos) && migrado.fotos.length > 0) {
    if (!archivos) {
      avisos.push('Esta copia no incluye las fotos. Para recuperarlas, importa la copia en formato ZIP.');
    } else {
      const observacionesPorId = new Map(observaciones.map((o) => [o.id, o]));
      migrado.fotos.forEach((entrada, i) => {
        const foto = limpiarFoto(entrada, investigacionId, observacionesPorId, archivos, errores, i + 1);
        if (!foto) return;
        const observacion = observacionesPorId.get(foto.observacionId);
        if (observacion.fotoLocalId) return; // una foto por observación
        observacion.fotoLocalId = foto.id;
        fotos.push(foto);
      });
    }
  }

  const dibujos = [];
  if (Array.isArray(migrado.dibujos) && migrado.dibujos.length > 0) {
    if (!archivos) {
      avisos.push('Esta copia no incluye los dibujos. Para recuperarlos, importa la copia en formato ZIP.');
    } else if (migrado.dibujos.length > LIMITES.observaciones) {
      errores.push('La copia tiene demasiados dibujos.');
    } else {
      const vistos = new Set();
      migrado.dibujos.forEach((entrada, i) => {
        const dibujo = limpiarDibujo(entrada, investigacionId, archivos, errores, i + 1);
        if (dibujo && !vistos.has(dibujo.id)) {
          vistos.add(dibujo.id);
          dibujos.push(dibujo);
        }
      });
    }
  }

  if (errores.length > 0) {
    return { ok: false, errores: errores.slice(0, LIMITES.erroresMostrados), totalErrores: errores.length };
  }

  // Especies de «Mi catálogo» que usa la investigación. Un problema con ellas no impide importar.
  const propias = leerEspeciesDeCopia(migrado.especiesPropias, archivos);
  avisos.push(...propias.avisos);
  const fotosCampo = leerFotosCatalogoDeCopia(migrado.fotosCatalogo, archivos);
  avisos.push(...fotosCampo.avisos);

  return {
    ok: true,
    paquete: {
      investigacion,
      parcelas,
      observaciones,
      fotos,
      dibujos,
      especiesPropias: propias.especies,
      fotosCatalogo: fotosCampo.fotosCatalogo,
      versionCatalogo: migrado.versionCatalogo ?? null,
    },
    avisos,
  };
}

/** Lee y valida un archivo elegido por la persona usuaria: copia ZIP (con fotos) o JSON. */
export async function leerArchivoCopia(archivo) {
  if (!archivo) return { ok: false, errores: ['No se ha elegido ningún archivo.'], totalErrores: 1 };
  const inicio = new Uint8Array(await archivo.slice(0, 4).arrayBuffer());
  if (esZip(inicio)) {
    if (archivo.size > LIMITES_ZIP.tamanoArchivoBytes) {
      return { ok: false, errores: ['El archivo ZIP es demasiado grande.'], totalErrores: 1 };
    }
    try {
      const { datos, archivos } = leerZip(new Uint8Array(await archivo.arrayBuffer()));
      return validarPaquete(datos, { archivos });
    } catch (error) {
      return { ok: false, errores: [error.message], totalErrores: 1 };
    }
  }
  if (archivo.size > LIMITES.tamanoArchivoBytes) {
    return {
      ok: false,
      errores: [`El archivo ocupa más de ${LIMITES.tamanoArchivoBytes / 1024 / 1024} MB, el máximo permitido.`],
      totalErrores: 1,
    };
  }
  let datos;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    return { ok: false, errores: ['El archivo no es un JSON válido.'], totalErrores: 1 };
  }
  return validarPaquete(datos);
}
