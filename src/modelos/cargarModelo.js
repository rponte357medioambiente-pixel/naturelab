import {
  eliminarObservacion,
  eliminarParcela,
  guardarLote,
  obtenerDatosInvestigacion,
} from '../almacenamiento/repositorio.js';

/**
 * Carga un modelo o, si ya está en el dispositivo, restaura sus datos originales
 * tras pedir confirmación.
 * @returns {Promise<string|null>} id de la investigación, o null si se canceló
 */
export async function cargarModelo(modelo) {
  const existente = await obtenerDatosInvestigacion(modelo.id);
  if (
    existente &&
    !window.confirm(
      `«${modelo.titulo}» ya está en este dispositivo. ¿Quieres restaurar sus datos originales? Se perderán los cambios que hayas hecho en él.`,
    )
  ) {
    return null;
  }
  const datos = modelo.crear();
  if (existente) {
    // Restaurar: se eliminan los registros añadidos que no forman parte del original.
    const idsObs = new Set(datos.observaciones.map((o) => o.id));
    const idsParcelas = new Set(datos.parcelas.map((p) => p.id));
    for (const o of existente.observaciones) if (!idsObs.has(o.id)) await eliminarObservacion(o.id);
    for (const p of existente.parcelas) if (!idsParcelas.has(p.id)) await eliminarParcela(p.id);
  }
  await guardarLote(datos);
  return modelo.id;
}
