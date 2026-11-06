import { abrirBD, ALMACENES as A } from './db.js';
import { generarId } from './ids.js';
import { VERSION_ESQUEMA } from './modelo.js';

/**
 * Acceso a los datos locales. Cada escritura emite un evento «cambio» para que
 * las pantallas que usan useConsulta() se actualicen solas.
 */
export const cambios = new EventTarget();
const notificar = () => cambios.dispatchEvent(new Event('cambio'));
const ahora = () => new Date().toISOString();
const porCodigo = (a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true });
const masRecientePrimero = (campo) => (a, b) => String(b[campo] ?? '').localeCompare(String(a[campo] ?? ''));

/* ---------- Estado del almacenamiento ---------- */

export async function comprobarAlmacenamiento() {
  await abrirBD();
  return true;
}

let persistenciaSolicitada = false;

/**
 * Pide al navegador que no borre los datos de NatureLab cuando falte espacio.
 * El navegador puede concederlo o no; no garantiza persistencia absoluta.
 */
export async function solicitarPersistencia({ forzar = false } = {}) {
  const almacenamiento = globalThis.navigator?.storage;
  if (!almacenamiento?.persist || (persistenciaSolicitada && !forzar)) return null;
  persistenciaSolicitada = true;
  try {
    if (await almacenamiento.persisted()) return true;
    return await almacenamiento.persist();
  } catch {
    return null;
  }
}

export async function estadoAlmacenamiento() {
  const almacenamiento = globalThis.navigator?.storage;
  const persistente = almacenamiento?.persisted ? await almacenamiento.persisted().catch(() => null) : null;
  const estimacion = almacenamiento?.estimate ? await almacenamiento.estimate().catch(() => null) : null;
  return {
    persistente,
    usado: estimacion?.usage ?? null,
    cuota: estimacion?.quota ?? null,
  };
}

/* ---------- Lectura ---------- */

export async function listarInvestigacionesConDatos() {
  const bd = await abrirBD();
  const tx = bd.transaction([A.investigaciones, A.parcelas, A.observaciones]);
  const [investigaciones, parcelas, observaciones] = await Promise.all([
    tx.objectStore(A.investigaciones).getAll(),
    tx.objectStore(A.parcelas).getAll(),
    tx.objectStore(A.observaciones).getAll(),
    tx.done,
  ]);
  return investigaciones.sort(masRecientePrimero('fechaModificacion')).map((investigacion) => ({
    investigacion,
    parcelas: parcelas.filter((p) => p.investigacionId === investigacion.id).sort(porCodigo),
    observaciones: observaciones.filter((o) => o.investigacionId === investigacion.id),
  }));
}

export async function obtenerInvestigacion(id) {
  if (!id) return null;
  const bd = await abrirBD();
  return (await bd.get(A.investigaciones, id)) ?? null;
}

export async function obtenerDatosInvestigacion(id) {
  const bd = await abrirBD();
  const tx = bd.transaction([A.investigaciones, A.parcelas, A.observaciones]);
  const [investigacion, parcelas, observaciones] = await Promise.all([
    tx.objectStore(A.investigaciones).get(id),
    tx.objectStore(A.parcelas).index('porInvestigacion').getAll(id),
    tx.objectStore(A.observaciones).index('porInvestigacion').getAll(id),
    tx.done,
  ]);
  if (!investigacion) return null;
  return {
    investigacion,
    parcelas: parcelas.sort(porCodigo),
    observaciones: observaciones.sort(masRecientePrimero('fecha')),
  };
}

/* ---------- Escritura ---------- */

/**
 * Ejecuta un trabajo en una transacción de escritura. Si algo falla, la
 * transacción se anula entera: no quedan escrituras a medias.
 */
async function enTransaccion(almacenes, trabajo) {
  const bd = await abrirBD();
  const tx = bd.transaction(almacenes, 'readwrite');
  try {
    const resultado = await trabajo(tx);
    await tx.done;
    return resultado;
  } catch (error) {
    tx.done.catch(() => {});
    try {
      tx.abort();
    } catch {
      /* la transacción ya había terminado */
    }
    throw error;
  }
}

async function tocarInvestigacion(tx, investigacionId, marca) {
  const almacen = tx.objectStore(A.investigaciones);
  const investigacion = await almacen.get(investigacionId);
  if (!investigacion) throw new Error('La investigación ya no existe en este dispositivo.');
  await almacen.put({ ...investigacion, fechaModificacion: marca });
}

async function borrarPorIndice(almacen, indice, clave) {
  const ids = await almacen.index(indice).getAllKeys(clave);
  await Promise.all(ids.map((id) => almacen.delete(id)));
  return ids;
}

export async function guardarInvestigacion(datos) {
  const marca = ahora();
  const registro = {
    ...datos,
    versionEsquema: VERSION_ESQUEMA,
    fechaCreacion: datos.fechaCreacion ?? marca,
    fechaModificacion: marca,
  };
  await enTransaccion([A.investigaciones], (tx) => tx.objectStore(A.investigaciones).put(registro));
  notificar();
  solicitarPersistencia();
  return registro;
}

export async function guardarParcela(parcela) {
  const marca = ahora();
  const registro = { ...parcela, fechaModificacion: marca };
  await enTransaccion([A.investigaciones, A.parcelas], async (tx) => {
    await tocarInvestigacion(tx, parcela.investigacionId, marca);
    await tx.objectStore(A.parcelas).put(registro);
  });
  notificar();
  return registro;
}

/**
 * Guarda una observación y, opcionalmente, su foto.
 * @param {{foto?: {blob: Blob, ancho: number, alto: number} | null}} opciones
 *   foto sin indicar: se conserva la actual; null: se elimina; objeto: se sustituye.
 */
export async function guardarObservacion(observacion, { foto } = {}) {
  const marca = ahora();
  let registro = { ...observacion, fechaModificacion: marca };
  await enTransaccion([A.investigaciones, A.parcelas, A.observaciones, A.fotos], async (tx) => {
    const parcela = await tx.objectStore(A.parcelas).get(observacion.parcelaId);
    if (!parcela || parcela.investigacionId !== observacion.investigacionId) {
      throw new Error('La parcela seleccionada no pertenece a esta investigación.');
    }
    const anterior = await tx.objectStore(A.observaciones).get(observacion.id);
    const fotoAnterior = anterior?.fotoLocalId ?? null;
    if (foto === undefined) {
      registro = { ...registro, fotoLocalId: fotoAnterior };
    } else {
      if (fotoAnterior) await tx.objectStore(A.fotos).delete(fotoAnterior);
      let fotoLocalId = null;
      if (foto) {
        fotoLocalId = generarId();
        await tx.objectStore(A.fotos).put({
          id: fotoLocalId,
          observacionId: observacion.id,
          investigacionId: observacion.investigacionId,
          blob: foto.blob,
          tipoMime: foto.blob.type,
          tamano: foto.blob.size,
          ancho: foto.ancho ?? null,
          alto: foto.alto ?? null,
          fecha: marca,
        });
      }
      registro = { ...registro, fotoLocalId };
    }
    await tocarInvestigacion(tx, observacion.investigacionId, marca);
    await tx.objectStore(A.observaciones).put(registro);
  });
  notificar();
  solicitarPersistencia();
  return registro;
}

export async function eliminarObservacion(id) {
  await enTransaccion([A.investigaciones, A.observaciones, A.fotos], async (tx) => {
    const observacion = await tx.objectStore(A.observaciones).get(id);
    if (!observacion) return;
    await tx.objectStore(A.observaciones).delete(id);
    await borrarPorIndice(tx.objectStore(A.fotos), 'porObservacion', id);
    await tocarInvestigacion(tx, observacion.investigacionId, ahora());
  });
  notificar();
}

export async function eliminarParcela(id) {
  await enTransaccion([A.investigaciones, A.parcelas, A.observaciones, A.fotos], async (tx) => {
    const parcela = await tx.objectStore(A.parcelas).get(id);
    if (!parcela) return;
    const idsObs = await borrarPorIndice(tx.objectStore(A.observaciones), 'porParcela', id);
    for (const idObs of idsObs) await borrarPorIndice(tx.objectStore(A.fotos), 'porObservacion', idObs);
    await tx.objectStore(A.parcelas).delete(id);
    await tocarInvestigacion(tx, parcela.investigacionId, ahora());
  });
  notificar();
}

export async function eliminarInvestigacion(id) {
  await enTransaccion([A.investigaciones, A.parcelas, A.observaciones, A.fotos], async (tx) => {
    const idsObs = await borrarPorIndice(tx.objectStore(A.observaciones), 'porInvestigacion', id);
    for (const idObs of idsObs) await borrarPorIndice(tx.objectStore(A.fotos), 'porObservacion', idObs);
    await borrarPorIndice(tx.objectStore(A.parcelas), 'porInvestigacion', id);
    await tx.objectStore(A.investigaciones).delete(id);
  });
  notificar();
}

/**
 * Guarda una investigación completa en una sola transacción (importación y ejemplo).
 * Los registros se escriben por identificador: repetir la operación no duplica datos.
 */
export async function guardarLote({ investigacion, parcelas = [], observaciones = [], fotos = [] }) {
  const marca = ahora();
  const idsFotosNuevas = new Set(fotos.map((f) => f.id));
  await enTransaccion([A.investigaciones, A.parcelas, A.observaciones, A.fotos], async (tx) => {
    await tx.objectStore(A.investigaciones).put({ ...investigacion, fechaModificacion: marca });
    for (const p of parcelas) await tx.objectStore(A.parcelas).put(p);
    for (const o of observaciones) {
      // Si la observación ya tenía otra foto, se elimina para no dejarla huérfana.
      const anterior = await tx.objectStore(A.observaciones).get(o.id);
      if (anterior?.fotoLocalId && anterior.fotoLocalId !== o.fotoLocalId && !idsFotosNuevas.has(anterior.fotoLocalId)) {
        await tx.objectStore(A.fotos).delete(anterior.fotoLocalId);
      }
      await tx.objectStore(A.observaciones).put(o);
    }
    for (const f of fotos) await tx.objectStore(A.fotos).put(f);
  });
  notificar();
  solicitarPersistencia();
}

/** Registra la fecha de la última copia exportada sin alterar la fecha de modificación. */
export async function marcarExportada(id) {
  await enTransaccion([A.investigaciones], async (tx) => {
    const almacen = tx.objectStore(A.investigaciones);
    const investigacion = await almacen.get(id);
    if (!investigacion) return;
    const marca = ahora();
    await almacen.put({
      ...investigacion,
      fechaUltimaExportacion:
        marca > (investigacion.fechaModificacion ?? '') ? marca : investigacion.fechaModificacion,
    });
  });
  notificar();
}

/* ---------- Ajustes y datos auxiliares ---------- */

export async function obtenerAjuste(clave) {
  const bd = await abrirBD();
  return (await bd.get(A.ajustes, clave))?.valor ?? null;
}

export async function guardarAjuste(clave, valor) {
  await enTransaccion([A.ajustes], (tx) => tx.objectStore(A.ajustes).put({ clave, valor }));
  notificar();
}

/* ---------- Fotos de las observaciones ---------- */

export async function obtenerFoto(id) {
  if (!id) return null;
  const bd = await abrirBD();
  return (await bd.get(A.fotos, id)) ?? null;
}

/** Fotos de una lista de observaciones, en el mismo orden (solo las que existen). */
export async function obtenerFotosDeObservaciones(observaciones) {
  const ids = observaciones.map((o) => o.fotoLocalId).filter(Boolean);
  if (ids.length === 0) return [];
  const bd = await abrirBD();
  const tx = bd.transaction(A.fotos);
  const fotos = await Promise.all(ids.map((id) => tx.store.get(id)));
  await tx.done;
  return fotos.filter(Boolean);
}

/* ---------- Mi catálogo (especies propias) ---------- */

const porNombreComun = (a, b) => String(a.nombreComun).localeCompare(String(b.nombreComun), 'es', { sensitivity: 'base' });

export async function listarEspeciesPropias() {
  const bd = await abrirBD();
  return (await bd.getAll(A.especiesPropias)).sort(porNombreComun);
}

export async function obtenerEspeciePropia(id) {
  if (!id) return null;
  const bd = await abrirBD();
  return (await bd.get(A.especiesPropias, id)) ?? null;
}

/**
 * Guarda una especie de «Mi catálogo» con su foto dentro del mismo registro.
 * @param {{foto?: {blob: Blob, ancho: number, alto: number} | null}} opciones
 *   foto sin indicar: se conserva la actual; null: se elimina; objeto: se sustituye.
 */
export async function guardarEspeciePropia(especie, { foto } = {}) {
  const marca = ahora();
  let registro = null;
  await enTransaccion([A.especiesPropias], async (tx) => {
    const almacen = tx.objectStore(A.especiesPropias);
    const anterior = await almacen.get(especie.id);
    let fotoFinal;
    if (foto === undefined) fotoFinal = anterior?.foto ?? null;
    else if (foto === null) fotoFinal = null;
    else {
      fotoFinal = {
        blob: foto.blob,
        tipoMime: foto.blob.type,
        tamano: foto.blob.size,
        ancho: foto.ancho ?? null,
        alto: foto.alto ?? null,
      };
    }
    registro = {
      ...especie,
      foto: fotoFinal,
      versionEsquema: VERSION_ESQUEMA,
      fechaCreacion: anterior?.fechaCreacion ?? especie.fechaCreacion ?? marca,
      fechaModificacion: marca,
    };
    await almacen.put(registro);
  });
  notificar();
  solicitarPersistencia();
  return registro;
}

export async function eliminarEspeciePropia(id) {
  await enTransaccion([A.especiesPropias], (tx) => tx.objectStore(A.especiesPropias).delete(id));
  notificar();
}

/** Guarda varias especies tal como llegan (importación). Mismo id: se sustituye, no se duplica. */
export async function guardarEspeciesPropias(registros) {
  await enTransaccion([A.especiesPropias], async (tx) => {
    for (const r of registros) await tx.objectStore(A.especiesPropias).put(r);
  });
  notificar();
  solicitarPersistencia();
}

/** Número de observaciones, en cualquier investigación, que usan una especie. */
export async function contarObservacionesDeEspecie(especieId) {
  const bd = await abrirBD();
  const observaciones = await bd.getAll(A.observaciones);
  return observaciones.filter((o) => o.especieId === especieId).length;
}
