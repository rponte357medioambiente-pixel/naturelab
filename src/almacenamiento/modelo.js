import { generarId } from './ids.js';

/**
 * Modelo de datos (apartado 5.2). La versión del esquema viaja en cada
 * investigación y en cada exportación para poder migrar en el futuro.
 */
export const VERSION_ESQUEMA = 1;

export const ESTADOS_IDENTIFICACION = {
  confirmada: 'Confirmada',
  pendiente: 'Pendiente de revisar',
  desconocida: 'Sin identificar',
};

const ahora = () => new Date().toISOString();

export function crearInvestigacion(campos = {}) {
  const marca = ahora();
  return {
    id: generarId(),
    titulo: '',
    descripcion: '',
    fechaObservacion: '',
    lugarTexto: '',
    equipoAlias: '',
    laboratorio: 'biodiversidad',
    versionEsquema: VERSION_ESQUEMA,
    fechaCreacion: marca,
    fechaModificacion: marca,
    fechaUltimaExportacion: null,
    ...campos,
  };
}

export function crearParcela(investigacionId, campos = {}) {
  return {
    id: generarId(),
    investigacionId,
    codigo: '',
    superficie: null,
    unidadSuperficie: 'm2',
    descripcion: '',
    notas: '',
    fechaModificacion: ahora(),
    ...campos,
  };
}

export function crearObservacion(investigacionId, parcelaId, campos = {}) {
  const marca = ahora();
  return {
    id: generarId(),
    investigacionId,
    parcelaId,
    especieId: null,
    nombreComun: '',
    nombreCientifico: '',
    abundancia: 1,
    notas: '',
    fecha: marca,
    estadoIdentificacion: 'confirmada',
    fotoLocalId: null,
    fechaModificacion: marca,
    ...campos,
  };
}

/** Indica si una investigación tiene cambios posteriores a su última copia exportada. */
export function necesitaCopia(investigacion) {
  if (!investigacion) return false;
  if (!investigacion.fechaUltimaExportacion) return true;
  return (investigacion.fechaModificacion ?? '') > investigacion.fechaUltimaExportacion;
}
