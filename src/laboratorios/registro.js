/**
 * Registro de laboratorios. Para añadir uno nuevo se crea su carpeta en
 * src/laboratorios/ y se declara aquí; la navegación, el almacenamiento y las
 * exportaciones son comunes.
 */
export const LABORATORIOS = [
  {
    id: 'biodiversidad',
    nombre: 'Biodiversidad',
    descripcion:
      'Reconoce plantas en una parcela, cuenta sus individuos y calcula la diversidad con los índices de Shannon y Pielou.',
    disponible: true,
  },
  {
    id: 'microplasticos',
    nombre: 'Microplásticos',
    descripcion:
      'Clasifica partículas sospechosas en muestras de arena o agua por tipo, color y tamaño.',
    disponible: false,
  },
];

export const laboratorioPorId = (id) => LABORATORIOS.find((l) => l.id === id) ?? null;
