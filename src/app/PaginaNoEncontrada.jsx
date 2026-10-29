import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';

export function PaginaNoEncontrada({ titulo = 'Esta página no existe', texto }) {
  useTituloDocumento(titulo);
  return (
    <div className="vacio">
      <h1>{titulo}</h1>
      <p>{texto ?? 'Es posible que el enlace sea incorrecto o que el contenido se haya eliminado de este dispositivo.'}</p>
      <Link className="boton" to="/">
        Ir al inicio
      </Link>
    </div>
  );
}
