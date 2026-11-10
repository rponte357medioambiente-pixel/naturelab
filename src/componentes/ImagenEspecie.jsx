import { textoAlternativoEspecie, urlImagenEspecie } from '../catalogos/catalogo.js';
import { IconoTipo } from '../catalogos/Clasificacion.jsx';
import { IconoBrote } from './Iconos.jsx';

const Marcador = ({ especie }) => (especie?.tipo ? <IconoTipo tipo={especie.tipo} tamano={36} /> : <IconoBrote />);

/**
 * Imagen de referencia del catálogo. Solo se muestra si la ficha tiene una imagen
 * con licencia verificada, o la foto guardada si es de «Mi catálogo»; si no, un marcador neutro.
 */
export function ImagenEspecie({ especie, compacta = false }) {
  const ruta = urlImagenEspecie(especie);
  if (ruta) {
    return (
      <img className="imagen-especie" src={ruta} alt={textoAlternativoEspecie(especie)} loading="lazy" decoding="async" />
    );
  }
  const etiqueta = especie?.propia ? 'Sin foto' : 'Sin imagen de referencia verificada';
  return (
    <div className="imagen-pendiente" role="img" aria-label={etiqueta}>
      <Marcador especie={especie} />
      {!compacta && <span aria-hidden="true">{especie?.propia || especie?.tipo !== 'planta' ? 'Sin foto todavía' : 'Imagen pendiente de verificar'}</span>}
    </div>
  );
}

/**
 * Miniatura de la especie para listas. Sin imagen verificada no muestra nada,
 * salvo que se pida un hueco fijo (por ejemplo, en el selector de especies).
 */
export function MiniaturaEspecie({ especie, conHueco = false }) {
  const ruta = urlImagenEspecie(especie);
  if (ruta) {
    return <img className="miniatura-especie" src={ruta} alt="" loading="lazy" decoding="async" />;
  }
  return conHueco ? (
    <span className="miniatura-especie miniatura-especie--vacia" aria-hidden="true">
      <Marcador especie={especie} />
    </span>
  ) : null;
}
