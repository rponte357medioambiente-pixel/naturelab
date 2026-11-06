import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { listarInvestigacionesConDatos } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { IconoCuaderno, IconoMas } from '../componentes/Iconos.jsx';
import { TarjetaInvestigacion } from '../componentes/TarjetaInvestigacion.jsx';
import { PanelImportacion } from '../importacion-exportacion/PanelImportacion.jsx';

export function PaginaInvestigaciones() {
  useTituloDocumento('Investigaciones');
  const { datos, cargando, error } = useConsulta(listarInvestigacionesConDatos, []);

  return (
    <>
      <header className="encabezado-pagina">
        <h1>Investigaciones</h1>
        <p>Guardadas en este dispositivo. Exporta una copia de cada una para no perderla.</p>
      </header>

      <div className="acciones" style={{ marginTop: 0, marginBottom: '1.25rem' }}>
        <div className="acciones-apiladas">
          <Link className="boton" to="/investigaciones/nueva">
            <IconoMas />
            Nueva investigación
          </Link>
          <Link className="boton boton--secundario" to="/modelos">
            <IconoCuaderno />
            Cargar un modelo
          </Link>
        </div>
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
          <p>Todavía no hay investigaciones. Crea la primera o carga un modelo, como el Salar de los Canos o Río Antas.</p>
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

    </>
  );
}
