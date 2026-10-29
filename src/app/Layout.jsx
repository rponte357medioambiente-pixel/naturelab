import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { comprobarAlmacenamiento } from '../almacenamiento/repositorio.js';
import { AvisoActualizacion } from '../componentes/AvisoActualizacion.jsx';
import { BarraNavegacion } from '../componentes/BarraNavegacion.jsx';
import { IconoSinConexion, MarcaNaturaLab } from '../componentes/Iconos.jsx';
import { useEnLinea } from '../componentes/useEnLinea.js';

export function Layout() {
  const { pathname } = useLocation();
  const enLinea = useEnLinea();
  const [errorAlmacenamiento, setErrorAlmacenamiento] = useState(null);
  const primeraCarga = useRef(true);

  useEffect(() => {
    comprobarAlmacenamiento().catch((error) => setErrorAlmacenamiento(error));
  }, []);

  // Al cambiar de pantalla: volver arriba y llevar el foco al título (lectores de pantalla).
  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const titulo = document.querySelector('main h1');
    if (titulo) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div className="app">
      <header className="cabecera">
        <Link to="/" className="marca">
          <MarcaNaturaLab />
          NaturaLab
        </Link>
        {!enLinea && (
          <span className="estado estado--neutro">
            <IconoSinConexion />
            Sin conexión
          </span>
        )}
      </header>

      {errorAlmacenamiento && (
        <div className="banda-sistema">
          <div className="aviso aviso--error" role="alert">
            <p>
              <strong>No se puede guardar en este dispositivo.</strong>
              El navegador bloquea el almacenamiento local (por ejemplo, en navegación privada). Abre NaturaLab en
              una ventana normal para registrar observaciones.
            </p>
          </div>
        </div>
      )}

      <AvisoActualizacion />

      <main className="contenido" id="contenido">
        <Outlet />
      </main>

      <BarraNavegacion />
    </div>
  );
}
