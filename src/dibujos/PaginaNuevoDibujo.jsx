import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { crearDibujo, MODOS_DIBUJO } from '../almacenamiento/modelo.js';
import { guardarDibujo, obtenerDatosInvestigacion } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { useCatalogo } from '../catalogos/catalogo.js';
import { PaginaNoEncontrada } from '../app/PaginaNoEncontrada.jsx';
import { IconoAtras } from '../componentes/Iconos.jsx';
import { MiniaturaEspecie } from '../componentes/ImagenEspecie.jsx';
import { LienzoDibujo } from './LienzoDibujo.jsx';
import { NIVELES, usePlantillas } from './plantillas.js';

export function PaginaNuevoDibujo() {
  const { id } = useParams();
  useTituloDocumento('Nuevo dibujo');
  const { datos, cargando } = useConsulta(() => obtenerDatosInvestigacion(id), [id]);
  const catalogo = useCatalogo();
  const plantillas = usePlantillas();
  const [eleccion, setEleccion] = useState(null); // cuando está, se dibuja

  if (cargando || catalogo.cargando || plantillas.cargando) return <p className="texto-suave">Cargando…</p>;
  if (!datos) return <PaginaNoEncontrada titulo="Investigación no encontrada" />;

  return eleccion ? (
    <Dibujar datos={datos} eleccion={eleccion} alVolver={() => setEleccion(null)} />
  ) : (
    <Configurar datos={datos} catalogo={catalogo} plantillas={plantillas.datos?.plantillas ?? new Map()} alEmpezar={setEleccion} />
  );
}

function Configurar({ datos, catalogo, plantillas, alEmpezar }) {
  const { investigacion, observaciones } = datos;
  // Primero las especies de esta investigación; después, el resto del catálogo.
  const deLaInvestigacion = useMemo(() => {
    const ids = [...new Set(observaciones.map((o) => o.especieId).filter(Boolean))];
    return ids.map((i) => catalogo.buscarEspecie(i)).filter(Boolean);
  }, [observaciones, catalogo]);
  const resto = catalogo.especies.filter((e) => !deLaInvestigacion.some((d) => d.id === e.id));
  const [verTodo, setVerTodo] = useState(deLaInvestigacion.length === 0);
  const [modo, setModo] = useState('puntos');
  const [especieId, setEspecieId] = useState(deLaInvestigacion[0]?.id ?? null);
  const [nivel, setNivel] = useState('facil');
  const [alias, setAlias] = useState('');
  const plantilla = especieId ? plantillas.get(especieId) : null;
  const sinPlantilla = modo === 'puntos' && especieId && !plantilla;

  function empezar(evento) {
    evento.preventDefault();
    const especie = catalogo.buscarEspecie(especieId);
    if (!especie || sinPlantilla) return;
    alEmpezar({
      modo,
      nivel: modo === 'puntos' ? nivel : null,
      especie,
      alias: alias.trim(),
      niveles: modo === 'puntos' ? plantilla.niveles[nivel] : null,
    });
  }

  const opcionEspecie = (e) => (
    <label key={e.id} className="opcion-especie">
      <input type="radio" name="especie-dibujo" value={e.id} checked={especieId === e.id} onChange={() => setEspecieId(e.id)} />
      <MiniaturaEspecie especie={e} conHueco />
      <span className="nombres">
        <strong>{e.nombreComun}</strong>
        {e.nombreCientifico && <span className="cientifico texto-suave">{e.nombreCientifico}</span>}
        {modo === 'puntos' && !plantillas.has(e.id) && (
          <span className="texto-suave texto-pequeno">Sin plantilla: solo dibujo libre</span>
        )}
      </span>
    </label>
  );

  return (
    <>
      <Link to={`/investigaciones/${investigacion.id}/dibujos`} className="volver">
        <IconoAtras />
        {investigacion.titulo}
      </Link>
      <header className="encabezado-pagina">
        <h1>Nuevo dibujo</h1>
      </header>
      <form className="formulario" onSubmit={empezar} noValidate>
        <fieldset className="opciones-tarjeta opciones-tarjeta--fila">
          <legend>Cómo dibujar</legend>
          {Object.entries(MODOS_DIBUJO).map(([id, nombre]) => (
            <label key={id} className="opcion-tarjeta">
              <input type="radio" name="modo-dibujo" checked={modo === id} onChange={() => setModo(id)} />
              <span>
                <strong>{nombre}</strong>
                <span className="texto-suave">
                  {id === 'puntos' ? 'Con el contorno de la especie.' : 'Hoja en blanco, con el dedo o con lápiz.'}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="selector-especie">
          <legend>Especie</legend>
          {deLaInvestigacion.length > 0 && (
            <>
              <p className="texto-suave texto-pequeno" style={{ margin: '0 0 0.4rem' }}>
                En esta investigación
              </p>
              <div className="opciones-especie">{deLaInvestigacion.map(opcionEspecie)}</div>
            </>
          )}
          {verTodo ? (
            <>
              {deLaInvestigacion.length > 0 && (
                <p className="texto-suave texto-pequeno" style={{ margin: '0.75rem 0 0.4rem' }}>
                  Resto del catálogo
                </p>
              )}
              <div className="opciones-especie">{resto.map(opcionEspecie)}</div>
            </>
          ) : (
            <button type="button" className="boton boton--sencillo" onClick={() => setVerTodo(true)}>
              Ver todo el catálogo
            </button>
          )}
        </fieldset>

        {sinPlantilla && (
          <div className="aviso aviso--ocre" role="status">
            <p>
              Esta especie aún no tiene plantilla para unir los puntos.{' '}
              <button type="button" className="boton boton--sencillo" onClick={() => setModo('libre')}>
                Dibujarla en modo libre
              </button>
            </p>
          </div>
        )}

        {modo === 'puntos' && plantilla && (
          <fieldset className="selector-segmentado selector-segmentado--tres">
            <legend>Dificultad</legend>
            <div className="segmentos">
              {Object.entries(NIVELES).map(([id, nombre]) =>
                plantilla.niveles[id] ? (
                  <label key={id}>
                    <input type="radio" name="nivel-dibujo" checked={nivel === id} onChange={() => setNivel(id)} />
                    <span>
                      {nombre}
                      <small>{plantilla.niveles[id].puntos.length} puntos</small>
                    </span>
                  </label>
                ) : null,
              )}
            </div>
          </fieldset>
        )}

        <div className="campo">
          <label htmlFor="alias-dibujo">Quién dibuja (opcional)</label>
          <input
            id="alias-dibujo"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={60}
            placeholder="Por ejemplo: Equipo Taray"
            autoComplete="off"
            aria-describedby="ayuda-alias-dibujo"
          />
          <p className="ayuda" id="ayuda-alias-dibujo">
            Usa un alias, nunca el nombre real.
          </p>
        </div>

        <div className="acciones" style={{ marginTop: 0 }}>
          <button type="submit" className="boton" disabled={!especieId || sinPlantilla}>
            Empezar a dibujar
          </button>
        </div>
        {!especieId && <p className="texto-suave texto-pequeno">Elige la especie que vas a dibujar.</p>}
      </form>
    </>
  );
}

function Dibujar({ datos, eleccion, alVolver }) {
  const { investigacion } = datos;
  const navegar = useNavigate();
  const anunciar = useAnunciar();
  const lienzo = useRef(null);
  const [estado, setEstado] = useState({ puedeGuardar: false, conContenido: false });
  const [guardando, setGuardando] = useState(false);
  const alCambiar = useCallback((nuevo) => setEstado(nuevo), []);
  const { especie, modo } = eleccion;

  async function guardar() {
    setGuardando(true);
    try {
      const imagen = await lienzo.current.exportar();
      await guardarDibujo(
        crearDibujo(investigacion.id, {
          especieId: especie.id,
          nombreComun: especie.nombreComun,
          nombreCientifico: especie.nombreCientifico ?? '',
          modo,
          nivel: eleccion.nivel,
          alias: eleccion.alias,
        }),
        imagen,
      );
      anunciar(`Dibujo de ${especie.nombreComun} guardado en la investigación.`);
      navegar(`/investigaciones/${investigacion.id}/dibujos`, { replace: true });
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error', duracion: 6000 });
      setGuardando(false);
    }
  }

  function cancelar() {
    if (estado.conContenido && !window.confirm('¿Salir sin guardar el dibujo?')) return;
    alVolver();
  }

  return (
    <>
      <button type="button" className="volver boton-enlace" onClick={cancelar}>
        <IconoAtras />
        Nuevo dibujo
      </button>
      <header className="encabezado-pagina" style={{ marginBottom: '0.75rem' }}>
        <h1>{especie.nombreComun}</h1>
        <p>
          {modo === 'puntos'
            ? estado.completo
              ? 'Figura completa. Ahora puedes colorearla.'
              : 'Une los puntos en orden.'
            : 'Dibuja con el dedo o con un lápiz digital.'}
        </p>
      </header>
      <LienzoDibujo ref={lienzo} plantilla={eleccion.niveles} alCambiar={alCambiar} />
      <div className="acciones">
        <button type="button" className="boton" onClick={guardar} disabled={!estado.puedeGuardar || guardando}>
          {guardando ? 'Guardando…' : 'Guardar dibujo'}
        </button>
        <button type="button" className="boton boton--sencillo" onClick={cancelar}>
          Cancelar
        </button>
      </div>
      {!estado.puedeGuardar && (
        <p className="texto-suave texto-pequeno">
          {modo === 'puntos' ? 'Podrás guardarlo cuando unas todos los puntos.' : 'Dibuja algo para poder guardarlo.'}
        </p>
      )}
    </>
  );
}
