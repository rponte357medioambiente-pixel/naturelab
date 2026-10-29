import { Link, useParams } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { formatearFecha } from '../calculos/formato.js';
import { ImagenEspecie } from '../componentes/ImagenEspecie.jsx';
import { IconoAtras } from '../componentes/Iconos.jsx';
import { PaginaNoEncontrada } from '../app/PaginaNoEncontrada.jsx';
import { useCatalogo } from './catalogo.js';

export function PaginaFichaEspecie() {
  const { especieId } = useParams();
  const { cargando, buscarEspecie } = useCatalogo();
  const especie = buscarEspecie(especieId);
  useTituloDocumento(especie?.nombreComun ?? 'Ficha de especie');

  if (cargando) return <p className="texto-suave">Cargando…</p>;
  if (!especie) return <PaginaNoEncontrada titulo="Especie no encontrada" texto="No figura en el catálogo de esta versión." />;

  const tieneImagen = Boolean(especie.imagen && especie.imagenLicencia);

  return (
    <article className="ficha-especie">
      <Link to="/catalogo" className="volver">
        <IconoAtras />
        Catálogo
      </Link>
      <ImagenEspecie especie={especie} />
      <h1>{especie.nombreComun}</h1>
      <p className="cientifico nombre-cientifico">{especie.nombreCientifico}</p>

      <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {especie.estadoValidacion !== 'validada' && (
          <span className="estado estado--ocre">Pendiente de revisión botánica</span>
        )}
        {especie.rango === 'genero' && <span className="estado estado--neutro">Identificado solo hasta género</span>}
      </p>

      {especie.descripcion && <p>{especie.descripcion}</p>}

      <dl className="datos-ficha">
        {especie.rasgos?.length > 0 && (
          <div>
            <dt>Cómo reconocerla</dt>
            <dd>
              <ul>
                {especie.rasgos.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {especie.habitat && (
          <div>
            <dt>Dónde vive</dt>
            <dd>{especie.habitat}</dd>
          </div>
        )}
        {especie.familia && (
          <div>
            <dt>Familia</dt>
            <dd>{especie.familia}</dd>
          </div>
        )}
        {especie.notas && (
          <div>
            <dt>Notas</dt>
            <dd>{especie.notas}</dd>
          </div>
        )}
        <div>
          <dt>Imagen</dt>
          <dd>
            {tieneImagen ? (
              <>
                {especie.imagenAutor && <>{especie.imagenAutor}. </>}
                {/^https?:\/\//.test(especie.imagenFuente ?? '') ? (
                  <a href={especie.imagenFuente} target="_blank" rel="noopener noreferrer">
                    Ver original
                  </a>
                ) : (
                  especie.imagenFuente
                )}
                {especie.imagenFuente && '. '}
                {especie.imagenLicencia}.
                {especie.imagenModificaciones && <> {especie.imagenModificaciones}.</>}
              </>
            ) : (
              'Sin imagen de referencia: se añadirá cuando se verifiquen su licencia y procedencia.'
            )}
            <br />
            <Link to={`/catalogo/fotos?especie=${especie.id}`} className="texto-pequeno">
              Preparar foto de esta especie
            </Link>
          </dd>
        </div>
        {especie.fechaRevision && (
          <div>
            <dt>Última revisión</dt>
            <dd>{formatearFecha(especie.fechaRevision)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
