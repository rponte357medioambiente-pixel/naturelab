import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { contarObservacionesDeEspecie, eliminarEspeciePropia } from '../almacenamiento/repositorio.js';
import { formatearFecha, plural } from '../calculos/formato.js';
import { ImagenEspecie } from '../componentes/ImagenEspecie.jsx';
import { IconoAtras, IconoEditar, IconoPapelera } from '../componentes/Iconos.jsx';
import { PaginaNoEncontrada } from '../app/PaginaNoEncontrada.jsx';
import { tieneImagen as conImagen, useCatalogo } from './catalogo.js';
import { ESTADOS_VALIDACION_PROPIA } from './especiesPropias.js';
import { GaleriaFotos, MiniaturasFotos } from './GaleriaFotos.jsx';
import { EtiquetasHabitat } from './Habitats.jsx';
import { EtiquetasClasificacion, PanelClasificacion } from './Clasificacion.jsx';
import { listarInvestigacionesConDatos } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { EnlaceMapa } from '../ubicacion/CamposCoordenadas.jsx';
import { dondeSeHaObservado, formatearCoordenadas } from '../ubicacion/coordenadas.js';

export function PaginaFichaEspecie() {
  const { especieId } = useParams();
  const { cargando, buscarEspecie } = useCatalogo();
  const especie = buscarEspecie(especieId);
  useTituloDocumento(especie?.nombreComun ?? 'Ficha de especie');

  if (cargando) return <p className="texto-suave">Cargando…</p>;
  if (!especie) {
    return (
      <PaginaNoEncontrada
        titulo="Especie no encontrada"
        texto="No figura en el catálogo de esta versión ni en «Mi catálogo» de este dispositivo."
      />
    );
  }

  const tieneImagen = conImagen(especie);

  return (
    <article className="ficha-especie">
      <Link to="/catalogo" className="volver">
        <IconoAtras />
        Catálogo
      </Link>
      <div className="imagen-ficha">
        <ImagenEspecie especie={especie} />
        {!especie.propia && especie.imagenTipo === 'ilustracion' && especie.imagen && (
          <span className="estado estado--ocre imagen-ficha__marca">Ilustración esquemática</span>
        )}
        {especie.fotoLocal && <span className="estado imagen-ficha__marca">Tu foto</span>}
      </div>
      <MiniaturasFotos especie={especie} />
      <h1>{especie.nombreComun}</h1>
      {especie.nombreCientifico && <p className="cientifico nombre-cientifico">{especie.nombreCientifico}</p>}

      <p style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {especie.propia ? (
          <>
            <span className="estado estado--neutro">Mi catálogo</span>
            <span className={`estado${especie.estadoValidacion === 'validada' ? '' : ' estado--ocre'}`}>
              {ESTADOS_VALIDACION_PROPIA[especie.estadoValidacion] ?? ESTADOS_VALIDACION_PROPIA.pendiente}
            </span>
          </>
        ) : (
          <>
            {especie.estadoValidacion !== 'validada' && (
              <span className="estado estado--ocre">
                {especie.tipo === 'planta' ? 'Pendiente de revisión botánica' : 'Pendiente de revisión'}
              </span>
            )}
            {especie.rango === 'genero' && <span className="estado estado--neutro">Identificado solo hasta género</span>}
          </>
        )}
      </p>

      <GaleriaFotos key={especie.id} especie={especie} />

      <EtiquetasClasificacion especie={especie} />
      {especie.propia && <PanelClasificacion key={`${especie.id}-${especie.fechaModificacion}`} especie={especie} />}
      <EtiquetasHabitat especie={especie} />

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
        {especie.propia && especie.lugarTexto && (
          <div>
            <dt>Dónde la encontraste</dt>
            <dd>{especie.lugarTexto}</dd>
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
            <dd className="texto-con-saltos">{especie.notas}</dd>
          </div>
        )}
        <div>
          <dt>{especie.propia ? 'Foto' : 'Imagen'}</dt>
          <dd>
            {especie.fotoLocal && <>Tu foto, solo en este dispositivo: </>}
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
            ) : especie.propia ? (
              'Sin foto.'
            ) : (
              'Sin imagen de referencia: se añadirá cuando se verifiquen su licencia y procedencia.'
            )}
            {!especie.propia && !especie.fotoLocal && (
              <>
                <br />
                <Link to={`/catalogo/fotos?especie=${especie.id}`} className="texto-pequeno">
                  Preparar foto de esta especie para el catálogo publicado
                </Link>
              </>
            )}
          </dd>
        </div>
        {especie.propia && especie.fechaCreacion && (
          <div>
            <dt>Añadida</dt>
            <dd>{formatearFecha(especie.fechaCreacion)}</dd>
          </div>
        )}
        {especie.fechaRevision && (
          <div>
            <dt>Última revisión</dt>
            <dd>{formatearFecha(especie.fechaRevision)}</dd>
          </div>
        )}
      </dl>

      <DondeSeHaObservado especie={especie} />

      {especie.propia && <AccionesEspeciePropia especie={especie} />}
    </article>
  );
}

function AccionesEspeciePropia({ especie }) {
  const navegar = useNavigate();
  const anunciar = useAnunciar();
  const [ocupado, setOcupado] = useState(false);

  async function eliminar() {
    setOcupado(true);
    try {
      const usos = await contarObservacionesDeEspecie(especie.id);
      const detalle = usos
        ? ` La usan ${plural(usos, 'observación', 'observaciones')}: conservarán el nombre, pero no la foto del catálogo.`
        : '';
      if (!window.confirm(`¿Eliminar «${especie.nombreComun}» de tu catálogo?${detalle} No se puede deshacer.`)) return;
      // Primero se sale de la ficha, para que no se vea «Especie no encontrada» al borrarla.
      navegar('/catalogo', { replace: true });
      await eliminarEspeciePropia(especie.id);
      anunciar(`${especie.nombreComun} se ha eliminado de tu catálogo.`);
    } catch (error) {
      anunciar(`No se ha podido eliminar: ${error.message}`, { tipo: 'error', duracion: 6000 });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <p className="texto-suave texto-pequeno">
        Guardada solo en este dispositivo. Para no perderla, descarga la copia de «Mi catálogo» desde Catálogo.
      </p>
      <div className="acciones">
        <Link to={`/catalogo/${especie.id}/editar`} className="boton boton--secundario">
          <IconoEditar />
          Editar
        </Link>
        <button type="button" className="boton boton--peligro" onClick={eliminar} disabled={ocupado}>
          <IconoPapelera />
          Eliminar
        </button>
      </div>
    </>
  );
}

/** Investigaciones de este dispositivo en las que aparece la especie, con su ubicación. */
function DondeSeHaObservado({ especie }) {
  const { datos } = useConsulta(listarInvestigacionesConDatos, []);
  const lugares = dondeSeHaObservado(especie.id, datos ?? []);
  if (lugares.length === 0) return null;
  return (
    <section className="panel donde-observada" aria-labelledby="titulo-donde">
      <h2 id="titulo-donde">Dónde se ha observado</h2>
      <p className="texto-suave texto-pequeno">En tus investigaciones de este dispositivo.</p>
      <ul className="lista">
        {lugares.map(({ investigacion, unidades, coordenadas }) => {
          // Si alguna parcela o transecto tiene ubicación propia, se muestra cada uno.
          const propias = unidades.filter((u) => u.coordenadas && u.coordenadas !== investigacion.coordenadas);
          const filas = propias.length ? unidades : [{ id: 'general', codigo: null, coordenadas }];
          return (
            <li key={investigacion.id}>
              <Link to={`/investigaciones/${investigacion.id}`} className="donde-observada__titulo">
                {investigacion.titulo}
              </Link>
              <span className="texto-suave texto-pequeno">
                {[investigacion.lugarTexto, investigacion.fechaObservacion && formatearFecha(investigacion.fechaObservacion)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {filas.map((u) => (
                <span key={u.id} className="donde-observada__coordenadas">
                  <span>
                    {u.codigo && <strong>{u.codigo}: </strong>}
                    {u.coordenadas ? formatearCoordenadas(u.coordenadas) : <span className="texto-suave">Sin coordenadas</span>}
                  </span>
                  <EnlaceMapa coordenadas={u.coordenadas} />
                </span>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
