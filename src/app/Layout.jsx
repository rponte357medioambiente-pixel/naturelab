import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useApariencia } from '../apariencia/Apariencia.jsx';
import { comprobarAlmacenamiento, obtenerInvestigacion } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { AvisoActualizacion } from '../componentes/AvisoActualizacion.jsx';
import { BarraNavegacion } from '../componentes/BarraNavegacion.jsx';
import { IconoSinConexion, MarcaNatureLab } from '../componentes/Iconos.jsx';
import { MenuConfiguracion } from '../componentes/MenuConfiguracion.jsx';
import { useEnLinea } from '../componentes/useEnLinea.js';

export function Layout() {
  const { pathname } = useLocation();
  const enLinea = useEnLinea();
  const [errorAlmacenamiento, setErrorAlmacenamiento] = useState(null);
  const primeraCarga = useRef(true);

  // Dentro de una investigación se usa su paleta.
  const { setPaletaRuta } = useApariencia();
  const idInvestigacion = /^\/investigaciones\/([^/]+)/.exec(pathname)?.[1];
  const { datos: investigacionAbierta } = useConsulta(
    () =>
      idInvestigacion && idInvestigacion !== 'nueva' ? obtenerInvestigacion(idInvestigacion) : Promise.resolve(null),
    [idInvestigacion],
  );
  useEffect(() => {
    setPaletaRuta(idInvestigacion ? investigacionAbierta?.paleta ?? null : null);
  }, [idInvestigacion, investigacionAbierta, setPaletaRuta]);

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
          <MarcaNatureLab />
          <span className="marca__texto">
            NatureLab
            <small>Investigaciones ambientales</small>
          </span>
        </Link>
        <div className="cabecera__lateral">
          {!enLinea && (
            <span className="estado estado--neutro">
              <IconoSinConexion />
              Sin conexión
            </span>
          )}
          <MenuConfiguracion />
        </div>
      </header>

      {errorAlmacenamiento && (
        <div className="banda-sistema">
          <div className="aviso aviso--error" role="alert">
            <p>
              <strong>No se puede guardar en este dispositivo.</strong>
              El navegador bloquea el almacenamiento local (por ejemplo, en navegación privada). Abre NatureLab en
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
