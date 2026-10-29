import {
  eliminarObservacion,
  eliminarParcela,
  guardarLote,
  obtenerDatosInvestigacion,
} from '../../almacenamiento/repositorio.js';
import { crearEjemploSalar, ID_EJEMPLO } from './ejemploSalar.js';

/**
 * Carga (o restaura) la investigación de ejemplo, pidiendo confirmación si ya existe.
 * @returns {Promise<string|null>} id de la investigación, o null si se canceló
 */
export async function cargarEjemploSalar() {
  const existente = await obtenerDatosInvestigacion(ID_EJEMPLO);
  if (
    existente &&
    !window.confirm(
      'El ejemplo del Salar de los Canos ya está en este dispositivo. ¿Quieres restaurar sus datos originales? Se perderán los cambios que hayas hecho en él.',
    )
  ) {
    return null;
  }
  const ejemplo = crearEjemploSalar();
  if (existente) {
    // Restaurar: se eliminan observaciones añadidas al ejemplo que no forman parte del original.
    const idsObs = new Set(ejemplo.observaciones.map((o) => o.id));
    const idsParcelas = new Set(ejemplo.parcelas.map((p) => p.id));
    for (const o of existente.observaciones) if (!idsObs.has(o.id)) await eliminarObservacion(o.id);
    for (const p of existente.parcelas) if (!idsParcelas.has(p.id)) await eliminarParcela(p.id);
  }
  await guardarLote(ejemplo);
  return ID_EJEMPLO;
}
