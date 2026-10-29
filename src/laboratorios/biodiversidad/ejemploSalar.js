import { VERSION_ESQUEMA } from '../../almacenamiento/modelo.js';

/**
 * Investigación de ejemplo del Salar de los Canos (apartado 5.4).
 * Usa identificadores fijos: cargarla varias veces, o en varios dispositivos y
 * después fusionar, no duplica los recuentos.
 */
export const ID_EJEMPLO = 'ejemplo-salar-de-los-canos';
const ID_PARCELA = `${ID_EJEMPLO}-p1`;

const RECUENTOS = [
  ['tamarix-canariensis', 'Taray', 'Tamarix canariensis', 2],
  ['anthyllis-cytisoides', 'Albaida', 'Anthyllis cytisoides', 1],
  ['launaea-arborescens', 'Aulaga rascavieja', 'Launaea arborescens', 4],
  ['artemisia-glutinosa', 'Boja negra', 'Artemisia glutinosa', 1],
  ['lygeum-spartum', 'Albardín', 'Lygeum spartum', 20],
  ['limonium-sp', 'Siempreviva', 'Limonium sp.', 1],
  ['salicornia-sp', 'Salicornia', 'Salicornia sp.', 1],
  ['moricandia-arvensis', 'Moricandia', 'Moricandia arvensis', 2],
  ['portulaca-oleracea', 'Verdolaga', 'Portulaca oleracea', 1],
];

export function crearEjemploSalar() {
  const marca = new Date().toISOString();
  return {
    investigacion: {
      id: ID_EJEMPLO,
      titulo: 'Biodiversidad en el Salar de los Canos',
      descripcion:
        'Ejercicio de campo previo. Datos provisionales, sujetos a revisión botánica; sirven para comprobar los cálculos.',
      fechaObservacion: '',
      lugarTexto: 'Salar de los Canos, Vera (Almería)',
      equipoAlias: '',
      laboratorio: 'biodiversidad',
      versionEsquema: VERSION_ESQUEMA,
      fechaCreacion: marca,
      fechaModificacion: marca,
      fechaUltimaExportacion: null,
    },
    parcelas: [
      {
        id: ID_PARCELA,
        investigacionId: ID_EJEMPLO,
        codigo: 'P1',
        superficie: 73.2,
        unidadSuperficie: 'm2',
        descripcion: 'Parcela de referencia del ejercicio de campo.',
        notas: '',
        fechaModificacion: marca,
      },
    ],
    observaciones: RECUENTOS.map(([especieId, nombreComun, nombreCientifico, abundancia]) => ({
      id: `${ID_EJEMPLO}-${especieId}`,
      investigacionId: ID_EJEMPLO,
      parcelaId: ID_PARCELA,
      especieId,
      nombreComun,
      nombreCientifico,
      abundancia,
      notas: '',
      fecha: marca,
      estadoIdentificacion: especieId === 'artemisia-glutinosa' ? 'pendiente' : 'confirmada',
      fotoLocalId: null,
      fechaModificacion: marca,
    })),
  };
}
