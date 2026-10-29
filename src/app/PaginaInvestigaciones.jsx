import { Link, useNavigate } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { listarInvestigacionesConDatos } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { IconoMas } from '../componentes/Iconos.jsx';
import { TarjetaInvestigacion } from '../componentes/TarjetaInvestigacion.jsx';
import { PanelImportacion } from '../importacion-exportacion/PanelImportacion.jsx';
import { cargarEjemploSalar } from '../laboratorios/biodiversidad/cargarEjemplo.js';

export function PaginaInvestigaciones() {
  useTituloDocumento('Investigaciones');
  const { datos, cargando, error } = useConsulta(listarInvestigacionesConDatos, []);
  const anunciar = useAnunciar();
  const navegar = useNavigate();

  async function cargarEjemplo() {
    try {
      const id = await cargarEjemploSalar();
      if (!id) return;
      anunciar('Ejemplo del Salar cargado en este dispositivo.');
      navegar(`/investigaciones/${id}`);
    } catch (e) {
      anunciar(e.message, { tipo: 'error' });
    }
  }

  return (
    <>
      <header className="encabezado-pagina">
        <h1>Investigaciones</h1>
        <p>Guardadas en este dispositivo. Exporta una copia de cada una para no perderla.</p>
      </header>

      <div className="acciones" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
        <Link className="boton" to="/investigaciones/nueva">
          <IconoMas />
          Nueva investigación
        </Link>
        <PanelImportacion />
      </div>

      {error && (
        <div className="aviso aviso--error" role="alert">
          <p>No se han podido leer los datos del dispositivo: {error.message}</p>
        </div>
      )}
      {cargando && <p className="texto-suave">Cargando…</p>}

      {!cargando && datos?.length === 0 && (
        <div className="vacio">
          <p>Todavía no hay investigaciones. Crea la primera o carga el ejemplo del Salar de los Canos.</p>
          <button type="button" className="boton boton--secundario" onClick={cargarEjemplo}>
            Cargar ejemplo del Salar
          </button>
        </div>
      )}

      {datos?.length > 0 && (
        <ul className="lista lista-panel">
          {datos.map((d) => (
            <li key={d.investigacion.id}>
              <TarjetaInvestigacion {...d} />
            </li>
          ))}
        </ul>
      )}

      {datos?.length > 0 && (
        <p className="texto-suave texto-pequeno" style={{ marginTop: '1.25rem' }}>
          ¿Quieres ver cómo funcionan los cálculos?{' '}
          <button type="button" className="boton boton--sencillo" onClick={cargarEjemplo}>
            Cargar ejemplo del Salar
          </button>
        </p>
      )}
    </>
  );
}
