import { VERSION_ESQUEMA } from '../almacenamiento/modelo.js';

/**
 * Modelo «Cobertura vegetal en la duna del río Antas»: taller de transectos del
 * 3 de noviembre de 2026. Una cuerda de 4 m orientada de este a oeste, dentro de
 * un polígono de 4 × 4 m, anotada por longitudes. Identificadores fijos: cargarlo
 * varias veces no duplica datos.
 */
export const ID_RIO_ANTAS = 'modelo-rio-antas';
const ID_TRANSECTO = `${ID_RIO_ANTAS}-t1`;

const MANCHAS = [
  ['elymus-farctus', 'Grama de los arenales', 'Elymus farctus', [320], 'Dominante; ocupa el resto de la línea.'],
  ['lotus-creticus', 'Cuernecillo de mar', 'Lotus creticus', [1, 12, 5, 28], 'Cuatro manchas.'],
  ['paronychia-argentea', 'Hierba carnicera', 'Paronychia argentea', [10, 8, 8], 'Tres manchas.'],
  ['salsola-kali', 'Planta rodante', 'Salsola kali', [8], 'Una mancha.'],
];

export function crearModeloRioAntas() {
  const marca = new Date().toISOString();
  return {
    investigacion: {
      id: ID_RIO_ANTAS,
      titulo: 'Cobertura vegetal en la duna del río Antas',
      descripcion:
        'Taller de transectos lineales en la duna embrionaria de la desembocadura del río Antas. Una cuerda de 4 m orientada de este a oeste, dentro de un polígono de 4 × 4 m; con el metro se mide cuánto ocupa cada especie bajo la cuerda. Nombres pendientes de revisión botánica.',
      fechaObservacion: '2026-11-03',
      lugarTexto: 'ZEC Río Antas, Vera (Almería)',
      equipoAlias: '',
      laboratorio: 'biodiversidad',
      tipoPractica: 'transecto',
      versionEsquema: VERSION_ESQUEMA,
      fechaCreacion: marca,
      fechaModificacion: marca,
      fechaUltimaExportacion: null,
    },
    parcelas: [
      {
        id: ID_TRANSECTO,
        investigacionId: ID_RIO_ANTAS,
        codigo: 'T1',
        superficie: null,
        unidadSuperficie: 'm2',
        longitudCm: 400,
        orientacion: 'Este-Oeste',
        modoAnotacion: 'longitudes',
        sueloDesnudo: [],
        descripcion: 'Dentro del polígono de 4 × 4 m.',
        notas: '',
        fechaModificacion: marca,
      },
    ],
    observaciones: MANCHAS.map(([especieId, nombreComun, nombreCientifico, longitudes, notas]) => ({
      id: `${ID_RIO_ANTAS}-${especieId}`,
      investigacionId: ID_RIO_ANTAS,
      parcelaId: ID_TRANSECTO,
      especieId,
      nombreComun,
      nombreCientifico,
      abundancia: null,
      longitudes,
      tramos: [],
      notas,
      fecha: marca,
      estadoIdentificacion: 'confirmada',
      fotoLocalId: null,
      fechaModificacion: marca,
    })),
  };
}
