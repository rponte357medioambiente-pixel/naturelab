import { Link, useLocation } from 'react-router-dom';
import { IconoCatalogo, IconoCuaderno, IconoInicio, IconoLaboratorio } from './Iconos.jsx';

const ENLACES = [
  { ruta: '/', texto: 'Inicio', Icono: IconoInicio, coincide: (p) => p === '/' },
  {
    ruta: '/laboratorios',
    texto: 'Laboratorios',
    Icono: IconoLaboratorio,
    coincide: (p) => p.startsWith('/laboratorios'),
  },
  {
    ruta: '/investigaciones',
    texto: 'Investigaciones',
    Icono: IconoCuaderno,
    coincide: (p) => p.startsWith('/investigaciones'),
  },
  // La ayuda está en el menú de configuración de la cabecera.
  { ruta: '/catalogo', texto: 'Catálogo', Icono: IconoCatalogo, coincide: (p) => p.startsWith('/catalogo') },
];

export function BarraNavegacion() {
  const { pathname } = useLocation();
  return (
    <nav className="navegacion" aria-label="Secciones principales">
      <ul>
        {ENLACES.map(({ ruta, texto, Icono, coincide }) => {
          const activo = coincide(pathname);
          return (
            <li key={ruta}>
              <Link
                to={ruta}
                className={activo ? 'active' : undefined}
                aria-current={activo ? (pathname === ruta ? 'page' : 'true') : undefined}
              >
                <Icono />
                <span>{texto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
