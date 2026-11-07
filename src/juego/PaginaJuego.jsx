import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { listarInvestigacionesConDatos } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { plural } from '../calculos/formato.js';
import { tieneImagen, urlImagenEspecie, useCatalogo } from '../catalogos/catalogo.js';
import { IconoAtras } from '../componentes/Iconos.jsx';
import {
  crearPartida,
  especiesJugables,
  NOMBRES_RESPUESTA,
  NUMEROS_PREGUNTAS,
  pistaDe,
  resumirPartida,
  textoDe,
} from './partida.js';

/** Juego «¿Qué especie es?»: se ve la imagen de una especie y se elige su nombre entre cuatro. */
export function PaginaJuego() {
  useTituloDocumento('¿Qué especie es?');
  const catalogo = useCatalogo();
  const investigaciones = useConsulta(listarInvestigacionesConDatos, []);
  const [config, setConfig] = useState({ origen: 'todo', ids: [], nombre: 'comun', preguntas: 10 });
  const [partida, setPartida] = useState(null); // { preguntas, respuestas, actual, config }

  if (catalogo.cargando || investigaciones.cargando) return <p className="texto-suave">Cargando…</p>;

  function empezar(cfg = config) {
    const ids =
      cfg.origen === 'investigaciones'
        ? new Set(
            (investigaciones.datos ?? [])
              .filter((d) => cfg.ids.includes(d.investigacion.id))
              .flatMap((d) => d.observaciones.map((o) => o.especieId).filter(Boolean)),
          )
        : null;
    const jugables = especiesJugables(catalogo.especies, tieneImagen, { ids, nombre: cfg.nombre });
    const preguntas = crearPartida(jugables, catalogo.especies, { preguntas: cfg.preguntas, nombre: cfg.nombre });
    setPartida({ preguntas, respuestas: [], actual: 0, config: cfg });
    window.scrollTo(0, 0);
  }

  if (!partida) {
    return (
      <Configurar
        config={config}
        setConfig={setConfig}
        catalogo={catalogo}
        investigaciones={investigaciones.datos ?? []}
        alEmpezar={empezar}
      />
    );
  }

  const terminada = partida.respuestas.length === partida.preguntas.length && partida.actual >= partida.preguntas.length;
  if (terminada) {
    return (
      <Resultado
        partida={partida}
        investigaciones={investigaciones.datos ?? []}
        alRepetir={() => empezar(partida.config)}
        alCambiar={() => setPartida(null)}
      />
    );
  }
  return <Pregunta partida={partida} setPartida={setPartida} alSalir={() => setPartida(null)} />;
}

/* ---------- Configurar la partida ---------- */

function Segmentos({ leyenda, nombre, opciones, valor, alCambiar }) {
  return (
    <fieldset className="selector-segmentado">
      <legend>{leyenda}</legend>
      <div className="segmentos" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
        {opciones.map(([v, texto]) => (
          <label key={v}>
            <input type="radio" name={nombre} checked={valor === v} onChange={() => alCambiar(v)} />
            <span>{texto}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Configurar({ config, setConfig, catalogo, investigaciones, alEmpezar }) {
  const cambiar = (cambios) => setConfig((c) => ({ ...c, ...cambios }));
  const especiesDe = (datos) => new Set(datos.observaciones.map((o) => o.especieId).filter(Boolean));
  const conImagen = (ids) => especiesJugables(catalogo.especies, tieneImagen, { ids, nombre: config.nombre }).length;
  const totalCatalogo = conImagen(null);
  const elegidas = useMemo(() => {
    if (config.origen === 'todo') return null;
    return new Set(investigaciones.filter((d) => config.ids.includes(d.investigacion.id)).flatMap((d) => [...especiesDe(d)]));
  }, [config.origen, config.ids, investigaciones]);
  const disponibles = conImagen(elegidas);
  const preguntas = Math.min(config.preguntas, disponibles);
  const conEspecies = investigaciones.filter((d) => especiesDe(d).size > 0);

  function alternar(id) {
    cambiar({ ids: config.ids.includes(id) ? config.ids.filter((x) => x !== id) : [...config.ids, id] });
  }

  return (
    <>
      <Link to="/catalogo" className="volver">
        <IconoAtras />
        Catálogo
      </Link>
      <header className="encabezado-pagina">
        <h1>¿Qué especie es?</h1>
        <p>Mira la imagen y elige su nombre entre cuatro.</p>
      </header>
      <form
        className="formulario"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (disponibles > 0) alEmpezar();
        }}
      >
        <fieldset className="opciones-tarjeta">
          <legend>Con qué especies</legend>
          <label className="opcion-tarjeta">
            <input type="radio" name="origen-juego" checked={config.origen === 'todo'} onChange={() => cambiar({ origen: 'todo' })} />
            <span>
              <strong>Todo el catálogo</strong>
              <span className="texto-suave">{plural(totalCatalogo, 'especie con imagen', 'especies con imagen')}</span>
            </span>
          </label>
          <label className="opcion-tarjeta">
            <input
              type="radio"
              name="origen-juego"
              checked={config.origen === 'investigaciones'}
              onChange={() => cambiar({ origen: 'investigaciones' })}
              disabled={conEspecies.length === 0}
            />
            <span>
              <strong>Las de mis investigaciones</strong>
              <span className="texto-suave">
                {conEspecies.length === 0 ? 'Todavía no hay investigaciones con especies.' : 'Elige una o varias.'}
              </span>
            </span>
          </label>
          {config.origen === 'investigaciones' && (
            <div className="juego-investigaciones">
              {conEspecies.map((d) => (
                <label key={d.investigacion.id} className="casilla">
                  <input type="checkbox" checked={config.ids.includes(d.investigacion.id)} onChange={() => alternar(d.investigacion.id)} />
                  <span>
                    {d.investigacion.titulo}
                    <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
                      {plural(conImagen(especiesDe(d)), 'especie con imagen', 'especies con imagen')}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <Segmentos
          leyenda="Responder con"
          nombre="nombre-juego"
          opciones={Object.entries(NOMBRES_RESPUESTA)}
          valor={config.nombre}
          alCambiar={(nombre) => cambiar({ nombre })}
        />
        <Segmentos
          leyenda="Preguntas"
          nombre="preguntas-juego"
          opciones={NUMEROS_PREGUNTAS.map((n) => [n, String(n)])}
          valor={config.preguntas}
          alCambiar={(n) => cambiar({ preguntas: n })}
        />

        {disponibles === 0 ? (
          <p className="aviso aviso--ocre" role="status">
            {config.origen === 'investigaciones' && config.ids.length === 0
              ? 'Elige al menos una investigación.'
              : 'No hay especies con imagen para jugar con esta elección.'}
          </p>
        ) : (
          preguntas < config.preguntas && (
            <p className="texto-suave texto-pequeno" role="status" style={{ margin: 0 }}>
              Hay {plural(disponibles, 'especie', 'especies')} con imagen: la partida tendrá {plural(preguntas, 'pregunta', 'preguntas')}.
            </p>
          )
        )}
        <div className="acciones" style={{ marginTop: 0 }}>
          <button type="submit" className="boton" disabled={disponibles === 0}>
            Empezar
          </button>
        </div>
      </form>
    </>
  );
}

/* ---------- Pregunta ---------- */

function Pregunta({ partida, setPartida, alSalir }) {
  const { preguntas, respuestas, actual, config } = partida;
  const pregunta = preguntas[actual];
  const respondida = respuestas[actual];
  const siguiente = useRef(null);
  const aciertos = respuestas.filter((r, i) => r === preguntas[i].especie.id).length;
  const correcta = pregunta.especie;
  const url = urlImagenEspecie(correcta);

  useEffect(() => {
    if (respondida !== undefined) siguiente.current?.focus();
  }, [respondida]);

  function responder(id) {
    if (respondida !== undefined) return;
    setPartida((p) => {
      const nuevas = [...p.respuestas];
      nuevas[p.actual] = id;
      return { ...p, respuestas: nuevas };
    });
  }

  function avanzar() {
    setPartida((p) => ({ ...p, actual: p.actual + 1 }));
    window.scrollTo(0, 0);
  }

  const estadoOpcion = (o) => {
    if (respondida === undefined) return '';
    if (o.id === correcta.id) return 'juego-opcion--correcta';
    if (o.id === respondida) return 'juego-opcion--incorrecta';
    return 'juego-opcion--apagada';
  };

  return (
    <section className="juego" aria-labelledby="titulo-pregunta">
      <div className="juego-cabecera">
        <button
          type="button"
          className="volver boton-enlace"
          onClick={() => {
            if (respuestas.length === 0 || window.confirm('¿Salir de la partida?')) alSalir();
          }}
        >
          <IconoAtras />
          Salir
        </button>
        <span className="texto-suave">
          <strong style={{ color: 'var(--tinta)' }}>
            Pregunta {actual + 1} de {preguntas.length}
          </strong>{' '}
          · {plural(aciertos, 'acierto', 'aciertos')}
        </span>
      </div>
      <div className="barra-progreso" aria-hidden="true">
        <span style={{ width: `${((actual + (respondida !== undefined ? 1 : 0)) / preguntas.length) * 100}%` }} />
      </div>

      {url && <img className="juego-imagen" src={url} alt="Imagen de la especie que hay que adivinar" />}
      <h1 id="titulo-pregunta" className="juego-titulo">
        ¿Qué especie es?
      </h1>

      <div className="juego-opciones" role="group" aria-label="Opciones">
        {pregunta.opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`juego-opcion ${estadoOpcion(o)}`}
            onClick={() => responder(o.id)}
            aria-disabled={respondida !== undefined}
          >
            <span className={config.nombre === 'cientifico' ? 'cientifico' : undefined}>{o.texto}</span>
            {respondida !== undefined && o.id === correcta.id && <span aria-label="correcta">✓</span>}
            {respondida !== undefined && o.id === respondida && o.id !== correcta.id && <span aria-label="incorrecta">✕</span>}
          </button>
        ))}
      </div>

      {respondida !== undefined && (
        <>
          <p className="panel juego-respuesta" role="status">
            <strong>
              {respondida === correcta.id ? 'Correcto: ' : 'Era '}
              {correcta.nombreComun}
              {config.nombre === 'cientifico' || correcta.nombreCientifico ? (
                <span className="cientifico" style={{ fontWeight: 400 }}>
                  {' '}
                  ({textoDe(correcta, 'cientifico') || 'sin nombre científico'})
                </span>
              ) : null}
              .
            </strong>{' '}
            {pistaDe(correcta)}
          </p>
          <button ref={siguiente} type="button" className="boton boton--ancho" onClick={avanzar}>
            {actual + 1 < preguntas.length ? 'Siguiente' : 'Ver el resultado'}
          </button>
        </>
      )}
    </section>
  );
}

/* ---------- Resultado ---------- */

function Resultado({ partida, investigaciones, alRepetir, alCambiar }) {
  const { aciertos, total, fallos } = resumirPartida(partida.preguntas, partida.respuestas);
  const { config } = partida;
  const origen =
    config.origen === 'todo'
      ? 'Todo el catálogo'
      : investigaciones
          .filter((d) => config.ids.includes(d.investigacion.id))
          .map((d) => d.investigacion.titulo)
          .join(', ');
  const titulo = useRef(null);
  useEffect(() => titulo.current?.focus(), []);

  return (
    <section className="juego" aria-labelledby="titulo-resultado">
      <Link to="/catalogo" className="volver">
        <IconoAtras />
        Catálogo
      </Link>
      <div className="panel juego-marcador">
        <span className="texto-suave">Has acertado</span>
        <h1 id="titulo-resultado" ref={titulo} tabIndex={-1}>
          {aciertos} de {total}
        </h1>
        <span className="texto-suave texto-pequeno">
          {origen} · {NOMBRES_RESPUESTA[config.nombre].toLocaleLowerCase('es')}
        </span>
      </div>
      {fallos.length > 0 ? (
        <section className="panel" aria-labelledby="titulo-repaso">
          <h2 id="titulo-repaso" style={{ fontSize: '1.1rem', marginTop: 0 }}>
            Para repasar
          </h2>
          <ul className="lista juego-repaso">
            {fallos.map((e) => (
              <li key={e.id}>
                <Link to={`/catalogo/${e.id}`}>{e.nombreComun}</Link>
                {e.nombreCientifico && <span className="cientifico texto-suave">{e.nombreCientifico}</span>}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="panel">Ningún fallo. Prueba con más preguntas o con el nombre científico.</p>
      )}
      <div className="acciones">
        <button type="button" className="boton" onClick={alRepetir}>
          Jugar otra vez
        </button>
        <button type="button" className="boton boton--secundario" onClick={alCambiar}>
          Cambiar las especies
        </button>
      </div>
    </section>
  );
}
