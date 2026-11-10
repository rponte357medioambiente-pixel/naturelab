/**
 * Clasificación de las plantas por hábitat natural. Una especie puede tener
 * varios. Se guarda como lista de identificadores en `habitatsNaturales`.
 */
export const HABITATS = [
  {
    id: 'dunas-costa',
    nombre: 'Dunares y de costa',
    tecnico: 'Psamófilas y halófilas',
    descripcion: 'Plantas de playas, dunas y acantilados marinos; toleran la sal y el viento.',
    ejemplos: 'Barrón, lirio de mar',
  },
  {
    id: 'desierto',
    nombre: 'Crasas de desierto',
    tecnico: 'Xerófilas',
    descripcion: 'Especies de climas áridos que acumulan agua en sus hojas o tallos.',
    ejemplos: 'Cactus, aloes, agaves',
  },
  {
    id: 'alta-montana',
    nombre: 'De alta montaña',
    tecnico: 'Alpinas',
    descripcion: 'Plantas resistentes al frío extremo, la nieve y los vientos fuertes; suelen ser pequeñas y rastreras.',
    ejemplos: '',
  },
  {
    id: 'bosque',
    nombre: 'Forestales y de bosque',
    tecnico: '',
    descripcion: 'Especies que crecen a la sombra de los árboles grandes, amantes de la humedad y el mantillo.',
    ejemplos: 'Helechos, musgos',
  },
  {
    id: 'ribera',
    nombre: 'Acuáticas y de ribera',
    tecnico: 'Hidrófilas',
    descripcion: 'Plantas que viven flotando, sumergidas o en los márgenes húmedos de ríos y lagos.',
    ejemplos: 'Nenúfares, juncos',
  },
  {
    id: 'pradera',
    nombre: 'Praderas y campo abierto',
    tecnico: '',
    descripcion: 'Hierbas y flores silvestres de llanuras, pastizales y zonas soleadas.',
    ejemplos: 'Amapolas, margaritas',
  },
];

const PORID = new Map(HABITATS.map((h) => [h.id, h]));
export const habitatPorId = (id) => PORID.get(id) ?? null;
export const esHabitatValido = (id) => PORID.has(id);

/** Hábitats válidos de una especie, en el orden de la lista. */
export function habitatsDe(especie) {
  const ids = new Set(Array.isArray(especie?.habitatsNaturales) ? especie.habitatsNaturales : []);
  return HABITATS.filter((h) => ids.has(h.id));
}

/** Deja solo identificadores conocidos y sin repetir (para importar o guardar). */
export function limpiarHabitats(valor) {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.filter(esHabitatValido))];
}
