/**
 * Clasificación general de las especies: tipo (planta, animal, insecto u otro
 * invertebrado), grupo y, en las aves, subgrupo. Todo es opcional: en el campo
 * basta un nombre provisional y la clasificación se completa después.
 * Campos de la especie: tipo, grupo, subgrupo (identificadores o null).
 */
export const TIPOS = [
  {
    id: 'planta',
    nombre: 'Planta',
    plural: 'Plantas',
    detalle: 'Árbol, mata, hierba…',
    grupos: [
      { id: 'arboles', nombre: 'Árboles' },
      { id: 'arbustos', nombre: 'Arbustos y matas' },
      { id: 'hierbas', nombre: 'Hierbas y flores' },
      { id: 'gramineas', nombre: 'Gramíneas y juncos' },
      { id: 'helechos', nombre: 'Helechos, musgos y líquenes' },
    ],
    partes: ['Planta entera', 'Hoja', 'Flor', 'Fruto', 'Tallo o corteza'],
  },
  {
    id: 'animal',
    nombre: 'Animal',
    plural: 'Animales',
    detalle: 'Ave, mamífero, reptil…',
    grupos: [
      {
        id: 'aves',
        nombre: 'Aves',
        subgrupos: [
          { id: 'acuaticas', nombre: 'Acuáticas y patos', ejemplos: 'Flamencos, ánades, tarros' },
          { id: 'limicolas', nombre: 'Limícolas', ejemplos: 'Cigüeñuelas, avocetas, chorlitejos, correlimos' },
          { id: 'garzas', nombre: 'Garzas y afines', ejemplos: 'Garcetas, garzas, cigüeñas' },
          { id: 'gaviotas', nombre: 'Gaviotas y charranes', ejemplos: 'Gaviotas, charranes, pagazas' },
          { id: 'rapaces', nombre: 'Rapaces', ejemplos: 'Águilas, cernícalos, búhos' },
          { id: 'pajaros', nombre: 'Pájaros', ejemplos: 'Gorriones, golondrinas, currucas' },
          { id: 'otras-aves', nombre: 'Otras aves', ejemplos: 'Palomas, abubillas, perdices' },
        ],
      },
      { id: 'mamiferos', nombre: 'Mamíferos' },
      { id: 'reptiles', nombre: 'Reptiles' },
      { id: 'anfibios', nombre: 'Anfibios' },
      { id: 'peces', nombre: 'Peces' },
    ],
    partes: ['Cuerpo entero', 'Detalle', 'Huellas o rastro'],
  },
  {
    id: 'insecto',
    nombre: 'Insecto',
    plural: 'Insectos',
    detalle: 'u otro invertebrado',
    grupos: [
      { id: 'mariposas', nombre: 'Mariposas y polillas' },
      { id: 'escarabajos', nombre: 'Escarabajos' },
      { id: 'abejas', nombre: 'Abejas, avispas y hormigas' },
      { id: 'libelulas', nombre: 'Libélulas y caballitos del diablo' },
      { id: 'saltamontes', nombre: 'Saltamontes y grillos' },
      { id: 'moscas', nombre: 'Moscas y mosquitos' },
      { id: 'aranas', nombre: 'Arañas y otros arácnidos' },
      { id: 'moluscos', nombre: 'Caracoles y otros moluscos' },
    ],
    partes: ['Vista de arriba', 'Vista de lado', 'Detalle'],
  },
];

const POR_ID = new Map(TIPOS.map((t) => [t.id, t]));
export const tipoPorId = (id) => POR_ID.get(id) ?? null;
export const grupoPorId = (tipo, id) => tipoPorId(tipo)?.grupos.find((g) => g.id === id) ?? null;
export const subgrupoPorId = (tipo, grupo, id) => grupoPorId(tipo, grupo)?.subgrupos?.find((s) => s.id === id) ?? null;

/** Partes que se pueden fotografiar según el tipo (sin tipo: las de todos). */
export function partesDe(tipo) {
  const t = tipoPorId(tipo);
  return t ? t.partes : [...new Set(TIPOS.flatMap((x) => x.partes))];
}

/** Deja solo una clasificación coherente: un grupo que no es del tipo, o un subgrupo que no es del grupo, se descarta. */
export function limpiarClasificacion({ tipo = null, grupo = null, subgrupo = null } = {}) {
  const t = tipoPorId(tipo) ? tipo : null;
  const g = t && grupoPorId(t, grupo) ? grupo : null;
  const s = g && subgrupoPorId(t, g, subgrupo) ? subgrupo : null;
  return { tipo: t, grupo: g, subgrupo: s };
}

/** Falta el tipo o el grupo. */
export const pendienteDeClasificar = (e) => !tipoPorId(e?.tipo) || !grupoPorId(e.tipo, e.grupo);

/** «Aves · Acuáticas y patos», «Animal · grupo sin decidir», «Sin clasificar». */
export function textoClasificacion(e) {
  const t = tipoPorId(e?.tipo);
  if (!t) return 'Sin clasificar';
  const g = grupoPorId(e.tipo, e.grupo);
  if (!g) return `${t.nombre} · grupo sin decidir`;
  const s = subgrupoPorId(e.tipo, e.grupo, e.subgrupo);
  return s ? `${g.nombre} · ${s.nombre}` : g.nombre;
}
