import muestraAmbar from './muestras/ambar.jpg';
import muestraAtardecer from './muestras/atardecer.jpg';
import muestraLavanda from './muestras/lavanda.jpg';
import muestraMar from './muestras/mar.jpg';
import muestraRio from './muestras/rio.jpg';
import muestraRosa from './muestras/rosa.jpg';
import muestraTerracota from './muestras/terracota.jpg';

/**
 * Paletas de NatureLab. Los colores se aplican con variables CSS
 * (html[data-paleta=…] en global.css); aquí se guardan su nombre, su color
 * principal (para la barra del navegador) y la miniatura del selector.
 * Atardecer es la general de la app.
 */
export const PALETA_GENERAL = 'atardecer';

export const PALETAS = {
  atardecer: { nombre: 'Atardecer', principal: '#843024', muestra: muestraAtardecer },
  rosa: { nombre: 'Rosa', principal: '#a23c48', muestra: muestraRosa },
  lavanda: { nombre: 'Lavanda', principal: '#7e3066', muestra: muestraLavanda },
  ambar: { nombre: 'Ámbar', principal: '#964e1e', muestra: muestraAmbar },
  terracota: { nombre: 'Terracota', principal: '#8a3636', muestra: muestraTerracota },
  mar: { nombre: 'Mar', principal: '#065a6c', muestra: muestraMar },
  rio: { nombre: 'Río', principal: '#184e7e', muestra: muestraRio },
};

export const esPaletaValida = (id) => typeof id === 'string' && Object.hasOwn(PALETAS, id);
