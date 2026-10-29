import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { plural } from '../calculos/formato.js';
import { ImagenEspecie } from '../componentes/ImagenEspecie.jsx';
import { IconoAtras } from '../componentes/Iconos.jsx';
import { buscarEspecies, useCatalogo } from './catalogo.js';

export function PaginaCatalogo() {
  useTituloDocumento('Catálogo de especies');
  const { cargando, error, especies, catalogo } = useCatalogo();
  const [consulta, setConsulta] = useState('');
  const resultados = useMemo(() => buscarEspecies(especies, consulta), [especies, consulta]);

  return (
    <>
      <Link to="/laboratorios" className="volver">
        <IconoAtras />
        Laboratorios
      </Link>
      <header className="encabezado-pagina">
        <h1>Catálogo de especies</h1>
        <p>
          Plantas de partida del Salar de los Canos.
          {catalogo?.estado === 'provisional' && ' Nombres y fichas pendientes de revisión botánica.'}
        </p>
      </header>

      {error && (
        <div className="aviso aviso--error" role="alert">
          <p>
            No se ha podido cargar el catálogo. Si es la primera vez que abres NaturaLab, conéctate a Internet una vez
            para que quede guardado en el dispositivo.
          </p>
        </div>
      )}

      <div className="campo">
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

      <ul className="rejilla-catalogo">
        {resultados.map((e) => (
          <li key={e.id}>
            <Link to={`/catalogo/${e.id}`} className="ficha-mini">
              <ImagenEspecie especie={e} compacta />
              <span className="texto">
                <strong>{e.nombreComun}</strong>
                <span className="cientifico texto-suave">{e.nombreCientifico}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="texto-suave texto-pequeno" style={{ marginTop: '1.75rem' }}>
        Herramienta para responsables: <Link to="/catalogo/fotos">preparar fotos del catálogo</Link>.
      </p>
    </>
  );
}
