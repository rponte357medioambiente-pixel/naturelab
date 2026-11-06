import { listarEspeciesPropias, listarFotosCatalogo, obtenerAjuste } from '../almacenamiento/repositorio.js';
import { CLAVE_PREPARADAS } from './fotos/procesarImagen.js';

/** Autor de la foto guardada más reciente, para no tener que escribirlo cada vez. */
export async function autorReciente() {
  const [propias, fotos] = await Promise.all([listarEspeciesPropias(), listarFotosCatalogo()]);
  const ultima = [...propias, ...fotos]
    .filter((r) => r.imagenAutor)
    .sort((a, b) => String(b.fechaModificacion).localeCompare(String(a.fechaModificacion)))[0];
  if (ultima) return ultima.imagenAutor;
  const preparadas = (await obtenerAjuste(CLAVE_PREPARADAS)) ?? {};
  return Object.values(preparadas)[0]?.imagenAutor ?? '';
}
