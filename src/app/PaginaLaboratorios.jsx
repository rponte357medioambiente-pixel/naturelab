import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { LABORATORIOS } from '../laboratorios/registro.js';

export function PaginaLaboratorios() {
  useTituloDocumento('Laboratorios');
  return (
    <>
      <header className="encabezado-pagina">
        <h1>Laboratorios</h1>
        <p>Cada laboratorio es un tipo de investigación de campo, con su propio catálogo y sus propios cálculos.</p>
      </header>
      <ul className="lista lista-panel">
        {LABORATORIOS.map((lab) => (
          <li key={lab.id} className="laboratorio">
            <h2>
              {lab.nombre}
              {!lab.disponible && <span className="estado estado--neutro">En preparación</span>}
            </h2>
            <p>{lab.descripcion}</p>
            {lab.id === 'biodiversidad' && (
              <div className="acciones">
                <Link className="boton" to="/investigaciones/nueva">
                  Nueva investigación
                </Link>
                <Link className="boton boton--secundario" to="/catalogo">
                  Ver catálogo de especies
                </Link>
              </div>
            )}
            {lab.id === 'microplasticos' && <Link to="/laboratorios/microplasticos">Qué incluirá este laboratorio</Link>}
          </li>
        ))}
      </ul>
    </>
  );
}
