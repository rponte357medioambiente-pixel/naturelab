import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TAMANOS_TEXTO, useApariencia } from '../apariencia/Apariencia.jsx';
import { SelectorPaleta } from '../apariencia/SelectorPaleta.jsx';
import { IconoAjustes } from './Iconos.jsx';

/**
 * Menú de configuración de la cabecera. Reúne los ajustes de la app y deja sitio
 * para «Mi perfil» en una versión con usuarios.
 */
export function MenuConfiguracion() {
  const [abierto, setAbierto] = useState(false);
  const { ajustes, cambiarAjustes } = useApariencia();
  const { pathname } = useLocation();
  const id = useId();
  const boton = useRef(null);
  const panel = useRef(null);

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  };

  // Al cambiar de pantalla, el menú se cierra.
  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return undefined;
    panel.current?.querySelector('h2')?.focus();
    const alPulsarTecla = (e) => e.key === 'Escape' && cerrar();
    const alPulsarFuera = (e) => {
      if (!panel.current?.contains(e.target) && !boton.current?.contains(e.target)) cerrar(false);
    };
    document.addEventListener('keydown', alPulsarTecla);
    document.addEventListener('pointerdown', alPulsarFuera);
    return () => {
      document.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener('pointerdown', alPulsarFuera);
    };
  }, [abierto]);

  return (
    <div className="menu-configuracion">
      <button
        ref={boton}
        type="button"
        className="boton-configuracion"
        aria-label="Configuración"
        aria-expanded={abierto}
        aria-controls={`${id}-panel`}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
      >
        <IconoAjustes />
      </button>
      {abierto && <div className="menu-configuracion__velo" aria-hidden="true" />}
      <section
        ref={panel}
        id={`${id}-panel`}
        className="menu-configuracion__panel"
        hidden={!abierto}
        aria-labelledby={`${id}-titulo`}
      >
        <header className="menu-configuracion__cabecera">
          <h2 id={`${id}-titulo`} tabIndex={-1}>
            Configuración
          </h2>
          <p className="texto-suave texto-pequeno">Se guarda en este dispositivo.</p>
        </header>

        <div className="menu-configuracion__bloque">
          <SelectorPaleta
            nombre={`${id}-paleta`}
            leyenda="Paleta general"
            valor={ajustes.paletaGeneral}
            alCambiar={(paleta) => cambiarAjustes({ paletaGeneral: paleta })}
            ayuda="Cada investigación puede tener la suya."
          />
        </div>

        <div className="menu-configuracion__bloque">
          <fieldset className="selector-segmentado">
            <legend>Tamaño del texto</legend>
            <div className="segmentos">
              {Object.entries(TAMANOS_TEXTO).map(([valor, etiqueta]) => (
                <label key={valor}>
                  <input
                    type="radio"
                    name={`${id}-texto`}
                    checked={ajustes.texto === valor}
                    onChange={() => cambiarAjustes({ texto: valor })}
                  />
                  <span>{etiqueta}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <nav className="menu-configuracion__enlaces" aria-label="Más opciones">
          <Link to="/ayuda" onClick={() => cerrar(false)}>
            <span>
              <strong>Ayuda, datos y privacidad</strong>
              <span className="texto-suave texto-pequeno">Uso sin conexión, copias de seguridad, licencias</span>
            </span>
            <span aria-hidden="true">›</span>
          </Link>
        </nav>

        <div className="menu-configuracion__perfil">
          <span>
            <strong>Mi perfil</strong>
            <span className="texto-suave texto-pequeno">Reservado para una próxima versión</span>
          </span>
          <span className="estado estado--neutro">Próximamente</span>
        </div>
      </section>
    </div>
  );
}
