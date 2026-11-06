import { crearEjemploSalar, ID_EJEMPLO } from '../laboratorios/biodiversidad/ejemploSalar.js';
import { crearModeloRioAntas, ID_RIO_ANTAS } from './rioAntas.js';

/**
 * Modelos: investigaciones completas que se pueden cargar para practicar o como
 * punto de partida. Para añadir uno, se crea su archivo con identificadores fijos
 * y se declara aquí.
 */
export const MODELOS = [
  {
    id: ID_EJEMPLO,
    titulo: 'Biodiversidad · Salar de los Canos',
    tipoPractica: 'parcela',
    resumen: '9 especies · 33 individuos · 73,2 m²',
    lugar: 'Salar de los Canos, Vera',
    abrirEn: 'resultados',
    crear: crearEjemploSalar,
  },
  {
    id: ID_RIO_ANTAS,
    titulo: 'Cobertura vegetal · Río Antas',
    tipoPractica: 'transecto',
    resumen: '4 especies · línea de 4 m E-O · 3 nov 2026',
    lugar: 'ZEC Río Antas, Vera',
    abrirEn: 'cobertura',
    crear: crearModeloRioAntas,
  },
];

export const modeloPorId = (id) => MODELOS.find((m) => m.id === id) ?? null;
