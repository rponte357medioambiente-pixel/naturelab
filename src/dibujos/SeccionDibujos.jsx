import { Link, useOutletContext } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { MODOS_DIBUJO } from '../almacenamiento/modelo.js';
import { eliminarDibujo } from '../almacenamiento/repositorio.js';
import { formatearFecha, plural } from '../calculos/formato.js';
import { IconoDescargar, IconoPapelera } from '../componentes/Iconos.jsx';
import { descargarArchivo } from '../importacion-exportacion/descargar.js';
import { convertirEnSlug } from '../importacion-exportacion/exportar.js';
import { NIVELES } from './plantillas.js';
import { useUrlBlob } from './useUrlBlob.js';

const IconoLapiz = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M4 20l4-1 11-11-3-3L5 16z" />
    <path d="M14 6l3 3" />
  </svg>
);

/** Pestaña «Dibujos» de una investigación. */
export function SeccionDibujos() {
  const { investigacion, dibujos = [], catalogo } = useOutletContext();
  return (
    <section aria-labelledby="titulo-dibujos">
      <h2 id="titulo-dibujos" className="solo-lectores">
        Dibujos
      </h2>
      <div className="acciones no-imprimir" style={{ marginTop: 0, marginBottom: '1rem' }}>
        <Link className="boton" to={`/investigaciones/${investigacion.id}/dibujos/nuevo`}>
          <IconoLapiz />
          Nuevo dibujo
        </Link>
      </div>
      {dibujos.length === 0 ? (
        <div className="vacio">
          <p>
            Todavía no hay dibujos. Se puede unir los puntos de una especie del catálogo o dibujarla libremente, con el
            dedo o con un lápiz digital.
          </p>
        </div>
      ) : (
        <>
          <p className="texto-suave texto-pequeno">
            {plural(dibujos.length, 'dibujo', 'dibujos')}. Salen en el cuaderno en PDF y viajan en la copia de seguridad.
          </p>
          <ul className="lista rejilla-dibujos">
            {dibujos
              .slice()
              .reverse()
              .map((d) => (
                <li key={d.id}>
                  <TarjetaDibujo dibujo={d} investigacion={investigacion} especie={catalogo.buscarEspecie(d.especieId)} />
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}

function TarjetaDibujo({ dibujo, investigacion, especie }) {
  const anunciar = useAnunciar();
  const url = useUrlBlob(dibujo.blob);
  const nombre = especie?.nombreComun ?? dibujo.nombreComun;
  const detalle = dibujo.modo === 'puntos' ? `Unir los puntos · ${NIVELES[dibujo.nivel] ?? ''}` : MODOS_DIBUJO.libre;

  async function eliminar() {
    if (!window.confirm(`¿Eliminar este dibujo de ${nombre}? No se puede deshacer.`)) return;
    try {
      await eliminarDibujo(dibujo.id);
      anunciar('Dibujo eliminado.');
    } catch (error) {
      anunciar(`No se ha podido eliminar: ${error.message}`, { tipo: 'error' });
    }
  }

  function descargar() {
    const nombreArchivo = `naturelab-${convertirEnSlug(investigacion.titulo)}-dibujo-${convertirEnSlug(nombre)}-${dibujo.fecha.slice(0, 10)}.png`;
    descargarArchivo(nombreArchivo, dibujo.blob, 'image/png');
  }

  return (
    <article className="tarjeta-dibujo panel">
      {url && <img src={url} alt={`Dibujo de ${nombre}${dibujo.alias ? `, de ${dibujo.alias}` : ''}`} />}
      <div>
        <strong>{nombre}</strong>
        <span className="texto-suave texto-pequeno">
          {dibujo.alias || 'Sin alias'} · {formatearFecha(dibujo.fecha)}
        </span>
        <span className="texto-suave texto-pequeno">{detalle}</span>
      </div>
      <div className="tarjeta-dibujo__acciones no-imprimir">
        <button type="button" className="boton boton--sencillo" onClick={descargar} aria-label={`Descargar el dibujo de ${nombre}`}>
          <IconoDescargar />
        </button>
        <button type="button" className="boton boton--sencillo" onClick={eliminar} aria-label={`Eliminar el dibujo de ${nombre}`}>
          <IconoPapelera />
        </button>
      </div>
    </article>
  );
}
