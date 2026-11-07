import { generarId } from './ids.js';

/**
 * Modelo de datos (apartado 5.2). La versión del esquema viaja en cada
 * investigación y en cada exportación para poder migrar en el futuro.
 *
 * Versión 2: tipo de práctica «transecto lineal». Un transecto se guarda en el
 * almacén de parcelas (es la unidad de muestreo) con su longitud, orientación y
 * modo de anotación; cada especie anotada es una observación con sus manchas.
 */
export const VERSION_ESQUEMA = 2;

export const TIPOS_PRACTICA = {
  parcela: {
    nombre: 'Recuento en parcela',
    descripcion: 'Cuentas los individuos de cada especie dentro de una superficie. Calcula riqueza, Shannon, Pielou y densidad.',
  },
  transecto: {
    nombre: 'Transecto lineal',
    descripcion:
      'Mides cuánto ocupa cada especie a lo largo de una cuerda. Calcula cobertura por especie, cobertura total y suelo desnudo.',
  },
};

export const esTransecto = (investigacion) => investigacion?.tipoPractica === 'transecto';

export const ORIENTACIONES = ['Este-Oeste', 'Norte-Sur', 'Noreste-Suroeste', 'Noroeste-Sureste'];

export const MODOS_ANOTACION = {
  longitudes: { nombre: 'Longitudes', ayuda: 'Escribes lo que mide cada mancha: 1+12+5+28.' },
  tramos: { nombre: 'Inicio y fin', ayuda: 'Anotas dónde empieza y termina cada mancha sobre la cinta.' },
};

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
    tipoPractica: 'parcela',
    paleta: null, // null: la paleta general de la app
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

/** Transecto: una línea de muestreo. Se guarda en el almacén de parcelas. */
export function crearTransecto(investigacionId, campos = {}) {
  return crearParcela(investigacionId, {
    codigo: 'T1',
    longitudCm: 400,
    orientacion: ORIENTACIONES[0],
    modoAnotacion: 'longitudes',
    sueloDesnudo: [],
    ...campos,
  });
}

/** Especie anotada en un transecto, con sus manchas (longitudes o tramos, según el modo). */
export function crearIntercepcion(investigacionId, transectoId, campos = {}) {
  return crearObservacion(investigacionId, transectoId, {
    abundancia: null,
    longitudes: [],
    tramos: [],
    ...campos,
  });
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

/**
 * Especie de «Mi catálogo». Vive solo en este dispositivo, separada del catálogo
 * publicado (especies.json). El prefijo evita choques con los identificadores
 * oficiales, que se basan en el nombre científico.
 */
export const PREFIJO_ESPECIE_PROPIA = 'propia-';

export function crearEspeciePropia(campos = {}) {
  const marca = ahora();
  return {
    id: `${PREFIJO_ESPECIE_PROPIA}${generarId()}`,
    nombreComun: '',
    nombreCientifico: '',
    familia: '',
    lugarTexto: '',
    notas: '',
    estadoValidacion: 'pendiente',
    foto: null,
    imagenAutor: '',
    imagenFuente: '',
    imagenLicencia: '',
    imagenModificaciones: '',
    versionEsquema: VERSION_ESQUEMA,
    fechaCreacion: marca,
    fechaModificacion: marca,
    ...campos,
  };
}

/**
 * Dibujo de un estudiante: la imagen final (PNG) y sus datos. Se guarda en su
 * investigación y viaja en la copia de seguridad y en el PDF.
 */
export const MODOS_DIBUJO = { puntos: 'Unir los puntos', libre: 'Dibujo libre' };

export function crearDibujo(investigacionId, campos = {}) {
  return {
    id: generarId(),
    investigacionId,
    especieId: null,
    nombreComun: '',
    nombreCientifico: '',
    modo: 'libre',
    nivel: null,
    alias: '',
    fecha: ahora(),
    ...campos,
  };
}

/** Indica si una investigación tiene cambios posteriores a su última copia exportada. */
export function necesitaCopia(investigacion) {
  if (!investigacion) return false;
  if (!investigacion.fechaUltimaExportacion) return true;
  return (investigacion.fechaModificacion ?? '') > investigacion.fechaUltimaExportacion;
}
