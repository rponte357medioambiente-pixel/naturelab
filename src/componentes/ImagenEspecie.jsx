import { rutaPublica } from '../catalogos/catalogo.js';
import { IconoBrote } from './Iconos.jsx';

/**
 * Imagen de referencia del catálogo. Solo se muestra si la ficha tiene una imagen
 * con licencia verificada; si no, un marcador neutro.
 */
export function ImagenEspecie({ especie, compacta = false }) {
  const ruta = especie?.imagen && especie?.imagenLicencia ? rutaPublica(especie.imagen) : null;
  if (ruta) {
    return (
      <img
        className="imagen-especie"
        src={ruta}
        alt={`${especie.nombreComun} (${especie.nombreCientifico})`}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <div className="imagen-pendiente" role="img" aria-label="Sin imagen de referencia verificada">
      <IconoBrote />
      {!compacta && <span aria-hidden="true">Imagen pendiente de verificar</span>}
    </div>
  );
}

/**
 * Miniatura de la especie para listas. Sin imagen verificada no muestra nada,
 * salvo que se pida un hueco fijo (por ejemplo, en el selector de especies).
 */
export function MiniaturaEspecie({ especie, conHueco = false }) {
  const ruta = especie?.imagen && especie?.imagenLicencia ? rutaPublica(especie.imagen) : null;
  if (ruta) {
    return <img className="miniatura-especie" src={ruta} alt="" loading="lazy" decoding="async" />;
  }
  return conHueco ? (
    <span className="miniatura-especie miniatura-especie--vacia" aria-hidden="true">
      <IconoBrote />
    </span>
  ) : null;
}
