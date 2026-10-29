import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { plural } from '../calculos/formato.js';
import { ImagenEspecie } from '../componentes/ImagenEspecie.jsx';
import { IconoAtras, IconoCamara } from '../componentes/Iconos.jsx';
import { buscarEspecies, useCatalogo } from './catalogo.js';
import { CopiaMiCatalogo } from './CopiaMiCatalogo.jsx';

export function PaginaCatalogo() {
  useTituloDocumento('Catálogo de especies');
  const { cargando, error, especies, especiesPropias, catalogo } = useCatalogo();
  const [consulta, setConsulta] = useState('');
  const buscando = consulta.trim() !== '';
  const resultados = useMemo(() => buscarEspecies(especies, consulta), [especies, consulta]);
  const propias = resultados.filter((e) => e.propia);
  const publicadas = resultados.filter((e) => !e.propia);

  return (
    <>
      <Link to="/laboratorios" className="volver">
        <IconoAtras />
        Laboratorios
      </Link>
      <header className="encabezado-pagina">
        <h1>Catálogo de especies</h1>
        <p>Las plantas del Salar de los Canos y las que añadas tú en tus salidas.</p>
      </header>

      <Link to="/catalogo/nueva" className="boton boton--ancho">
        <IconoCamara />
        Añadir a mi catálogo
      </Link>

      <div className="campo" style={{ marginTop: '1.25rem' }}>
        <label htmlFor="buscar-catalogo">Buscar por nombre común, científico o familia</label>
        <input
          id="buscar-catalogo"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      <p className="texto-suave texto-pequeno" role="status" style={{ marginTop: '0.5rem' }}>
        {cargando ? 'Cargando…' : plural(resultados.length, 'especie', 'especies')}
      </p>

      {(!buscando || propias.length > 0) && (
        <section className="seccion-catalogo" aria-labelledby="titulo-mi-catalogo">
          <h2 id="titulo-mi-catalogo">Mi catálogo</h2>
          {propias.length > 0 ? (
            <RejillaEspecies especies={propias} />
          ) : (
            !cargando && (
              <p className="texto-suave">
                Todavía no has añadido especies. Cuando encuentres una planta que quieras guardar, pulsa «Añadir a mi
                catálogo».
              </p>
            )
          )}
          {!buscando && !cargando && <CopiaMiCatalogo total={especiesPropias.length} />}
        </section>
      )}

      {(!buscando || publicadas.length > 0) && (
        <section className="seccion-catalogo" aria-labelledby="titulo-salar">
          <h2 id="titulo-salar">Salar de los Canos</h2>
          {catalogo?.estado === 'provisional' && (
            <p className="texto-suave texto-pequeno">Nombres y fichas pendientes de revisión botánica.</p>
          )}
          {error && (
            <div className="aviso aviso--error" role="alert">
              <p>
                No se ha podido cargar este catálogo. Si es la primera vez que abres NaturaLab, conéctate a Internet una
                vez para que quede guardado en el dispositivo.
              </p>
            </div>
          )}
          <RejillaEspecies especies={publicadas} />
        </section>
      )}

      {buscando && resultados.length === 0 && !cargando && (
        <p className="texto-suave">Ninguna especie coincide con «{consulta.trim()}».</p>
      )}

      <p className="texto-suave texto-pequeno" style={{ marginTop: '1.75rem' }}>
        Herramienta para responsables: <Link to="/catalogo/fotos">preparar fotos del catálogo</Link>.
      </p>
    </>
  );
}

function RejillaEspecies({ especies }) {
  if (especies.length === 0) return null;
  return (
    <ul className="rejilla-catalogo">
      {especies.map((e) => (
        <li key={e.id}>
          <Link to={`/catalogo/${e.id}`} className="ficha-mini">
            <ImagenEspecie especie={e} compacta />
            <span className="texto">
              <strong>{e.nombreComun}</strong>
              {e.nombreCientifico && <span className="cientifico texto-suave">{e.nombreCientifico}</span>}
              {e.propia && e.lugarTexto && <span className="texto-suave texto-pequeno">{e.lugarTexto}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
