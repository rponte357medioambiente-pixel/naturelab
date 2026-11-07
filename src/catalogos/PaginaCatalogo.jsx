import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { plural } from '../calculos/formato.js';
import { ImagenEspecie } from '../componentes/ImagenEspecie.jsx';
import { IconoAtras, IconoCamara } from '../componentes/Iconos.jsx';
import { buscarEspecies, useCatalogo } from './catalogo.js';
import { CopiaMiCatalogo } from './CopiaMiCatalogo.jsx';

const IconoJuego = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" />
    <path d="M12 17v.01" />
  </svg>
);

const IconoFichas = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <rect x="3" y="5" width="8" height="14" rx="1.5" strokeDasharray="2.5 2" />
    <rect x="13" y="5" width="8" height="14" rx="1.5" strokeDasharray="2.5 2" />
    <path d="M15.5 9.5h3M15.5 12h3M15.5 14.5h2" />
  </svg>
);

export function PaginaCatalogo() {
  useTituloDocumento('Catálogo de especies');
  const { cargando, error, especies, catalogo } = useCatalogo();
  const [consulta, setConsulta] = useState('');
  const buscando = consulta.trim() !== '';
  const resultados = useMemo(() => buscarEspecies(especies, consulta), [especies, consulta]);
  const propias = resultados.filter((e) => e.propia);
  const publicadas = resultados.filter((e) => !e.propia);
  // El catálogo publicado se agrupa por zona, en el orden en que aparecen en especies.json.
  const zonas = useMemo(() => {
    const grupos = new Map();
    for (const e of publicadas) {
      const zona = e.zona || 'Otras especies';
      grupos.set(zona, [...(grupos.get(zona) ?? []), e]);
    }
    return [...grupos.entries()];
  }, [publicadas]);

  return (
    <>
      <Link to="/laboratorios" className="volver">
        <IconoAtras />
        Laboratorios
      </Link>
      <header className="encabezado-pagina">
        <h1>Catálogo de especies</h1>
        <p>Las plantas de los lugares estudiados y las que añadas tú en tus salidas.</p>
      </header>

      <div className="acciones-apiladas-catalogo">
        <Link to="/catalogo/nueva" className="boton boton--ancho">
          <IconoCamara />
          Añadir a mi catálogo
        </Link>
        <Link to="/catalogo/juego" className="boton boton--secundario boton--ancho">
          <IconoJuego />
          Jugar: ¿qué especie es?
        </Link>
        <Link to="/catalogo/fichas" className="boton boton--secundario boton--ancho">
          <IconoFichas />
          Fichas para imprimir
        </Link>
      </div>

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
          {!buscando && !cargando && <CopiaMiCatalogo />}
        </section>
      )}

      {error && !buscando && (
        <div className="aviso aviso--error seccion-catalogo" role="alert">
          <p>
            No se ha podido cargar el catálogo publicado. Si es la primera vez que abres NatureLab, conéctate a Internet
            una vez para que quede guardado en el dispositivo.
          </p>
        </div>
      )}
      {zonas.map(([zona, lista], i) => (
        <section key={zona} className="seccion-catalogo" aria-labelledby={`titulo-zona-${i}`}>
          <h2 id={`titulo-zona-${i}`}>{zona}</h2>
          {i === 0 && catalogo?.estado === 'provisional' && (
            <p className="texto-suave texto-pequeno">Nombres y fichas pendientes de revisión botánica.</p>
          )}
          <RejillaEspecies especies={lista} />
        </section>
      ))}

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
