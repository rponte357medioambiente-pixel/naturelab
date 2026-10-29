import { Link, useLocation } from 'react-router-dom';
import { IconoAyuda, IconoCuaderno, IconoInicio, IconoLaboratorio } from './Iconos.jsx';

const ENLACES = [
  { ruta: '/', texto: 'Inicio', Icono: IconoInicio, coincide: (p) => p === '/' },
  {
    ruta: '/laboratorios',
    texto: 'Laboratorios',
    Icono: IconoLaboratorio,
    coincide: (p) => p.startsWith('/laboratorios') || p.startsWith('/catalogo'),
  },
  {
    ruta: '/investigaciones',
    texto: 'Investigaciones',
    Icono: IconoCuaderno,
    coincide: (p) => p.startsWith('/investigaciones'),
  },
  { ruta: '/ayuda', texto: 'Ayuda', Icono: IconoAyuda, coincide: (p) => p.startsWith('/ayuda') },
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
