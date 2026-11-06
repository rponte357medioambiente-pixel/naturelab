import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../../accesibilidad/useTituloDocumento.js';
import { crearIntercepcion, esTransecto, MODOS_ANOTACION } from '../../almacenamiento/modelo.js';
import {
  eliminarObservacion,
  guardarObservacion,
  guardarParcela,
  obtenerDatosInvestigacion,
} from '../../almacenamiento/repositorio.js';
import { useConsulta } from '../../almacenamiento/useConsulta.js';
import {
  leerLongitudes,
  manchasDe,
  resumirTransecto,
  textoLongitudes,
  validarTramo,
} from '../../calculos/cobertura.js';
import { formatearNumero, formatearPorcentaje, plural } from '../../calculos/formato.js';
import { buscarEspecies, useCatalogo } from '../../catalogos/catalogo.js';
import { FranjaTransecto } from '../../componentes/FranjaTransecto.jsx';
import { IconoAtras, IconoMas, IconoPapelera } from '../../componentes/Iconos.jsx';
import { MiniaturaEspecie } from '../../componentes/ImagenEspecie.jsx';
import { PaginaNoEncontrada } from '../../app/PaginaNoEncontrada.jsx';

const cm = (valor) => `${formatearNumero(valor, valor % 1 ? 1 : 0)} cm`;
const sumar = (valores) => valores.reduce((s, v) => s + v, 0);

export function PaginaTransecto() {
  const { id, transectoId } = useParams();
  const { datos, cargando, error } = useConsulta(() => obtenerDatosInvestigacion(id), [id]);
  const catalogo = useCatalogo();
  const transecto = datos?.parcelas.find((p) => p.id === transectoId) ?? null;
  useTituloDocumento(transecto ? `Transecto ${transecto.codigo}` : 'Transecto');

  if (cargando) return <p className="texto-suave">Cargando…</p>;
  if (error) {
    return (
      <div className="aviso aviso--error" role="alert">
        <p>No se han podido leer los datos del dispositivo: {error.message}</p>
      </div>
    );
  }
  if (!datos || !transecto) {
    return <PaginaNoEncontrada titulo="Transecto no encontrado" texto="No está en este dispositivo." />;
  }
  if (!esTransecto(datos.investigacion)) return <Navigate to={`/investigaciones/${id}`} replace />;

  return <Anotacion datos={datos} transecto={transecto} catalogo={catalogo} />;
}

function Anotacion({ datos, transecto, catalogo }) {
  const { investigacion, observaciones } = datos;
  const [anadiendo, setAnadiendo] = useState(false);
  const [abierta, setAbierta] = useState(null); // id de la fila con el panel de edición abierto
  const modo = transecto.modoAnotacion === 'tramos' ? 'tramos' : 'longitudes';
  const filas = observaciones
    .filter((o) => o.parcelaId === transecto.id)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const resumen = useMemo(() => {
    const r = resumirTransecto(transecto, observaciones);
    const taxones = r.taxones.map((t) => {
      const especie = catalogo.buscarEspecie(t.especieId);
      return especie ? { ...t, nombreComun: especie.nombreComun } : t;
    });
    return { ...r, taxones };
  }, [transecto, observaciones, catalogo]);

  return (
    <>
      <Link to={`/investigaciones/${investigacion.id}/transectos`} className="volver">
        <IconoAtras />
        {investigacion.titulo}
      </Link>
      <header className="encabezado-pagina">
        <h1>Transecto {transecto.codigo}</h1>
        <p>
          {cm(transecto.longitudCm)} · {transecto.orientacion} · Anotación por{' '}
          {MODOS_ANOTACION[modo].nombre.toLocaleLowerCase('es')}
        </p>
      </header>

      <ResumenAnotacion resumen={resumen} modo={modo} />
      {modo === 'tramos' && resumen.taxones.some((t) => t.tramos.length > 0) && (
        <div className="panel" style={{ marginTop: '0.75rem' }}>
          <FranjaTransecto L={transecto.longitudCm} taxones={resumen.taxones} />
        </div>
      )}

      <section aria-labelledby="titulo-especies" className="seccion" style={{ marginTop: '1.25rem' }}>
        <h2 id="titulo-especies" className="solo-lectores">
          Especies anotadas
        </h2>
        {filas.length === 0 && !anadiendo && (
          <p className="texto-suave">Todavía no hay especies en este transecto. Añade la primera que corte la cuerda.</p>
        )}
        <ul className="lista lista-anotaciones">
          {filas.map((o) => (
            <li key={o.id}>
              <FilaEspecie
                observacion={o}
                transecto={transecto}
                modo={modo}
                catalogo={catalogo}
                abierta={abierta === o.id}
                alAbrir={(valor) => setAbierta(valor ? o.id : null)}
              />
            </li>
          ))}
          {modo === 'longitudes' && (
            <li>
              <FilaSueloDesnudo transecto={transecto} />
            </li>
          )}
        </ul>

        {anadiendo ? (
          <SelectorNuevaEspecie
            investigacion={investigacion}
            transecto={transecto}
            presentes={filas}
            catalogo={catalogo}
            alTerminar={(nuevaId) => {
              setAnadiendo(false);
              if (nuevaId && modo === 'tramos') setAbierta(nuevaId);
            }}
          />
        ) : (
          <div className="acciones no-imprimir">
            <button type="button" className="boton boton--secundario" onClick={() => setAnadiendo(true)}>
              <IconoMas />
              Añadir especie
            </button>
            <Link className="boton" to={`/investigaciones/${investigacion.id}/cobertura`}>
              Ver resultados
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

function ResumenAnotacion({ resumen, modo }) {
  const { L, coberturaTotal, sueloCm, faltanCm, solapeCm } = resumen;
  const anotado = modo === 'longitudes' ? Math.min(L, resumen.sumaEspeciesCm + sueloCm) : L;
  return (
    <div className="panel resumen-anotacion" role="status">
      <div className="resumen-anotacion__fila">
        <strong>Cobertura total: {formatearPorcentaje(coberturaTotal)}</strong>
        <span className="texto-suave">Suelo desnudo: {cm(sueloCm)}</span>
      </div>
      {modo === 'longitudes' && (
        <div className="barra-progreso" aria-hidden="true">
          <span style={{ width: `${L ? (anotado / L) * 100 : 0}%` }} />
        </div>
      )}
      {faltanCm > 0 && (
        <p className="texto-pequeno aviso-texto">
          Faltan {cm(faltanCm)} por anotar: añade especies o el suelo desnudo hasta llegar a {cm(L)}.
        </p>
      )}
      {solapeCm > 0 && (
        <p className="texto-pequeno texto-suave">
          Las especies se solapan en {cm(solapeCm)}: la suma de coberturas pasa del 100 %, y es correcto.
        </p>
      )}
    </div>
  );
}

/* ---------- Fila de una especie ---------- */

function FilaEspecie({ observacion, transecto, modo, catalogo, abierta, alAbrir }) {
  const especie = catalogo.buscarEspecie(observacion.especieId);
  const nombre = especie?.nombreComun ?? observacion.nombreComun;
  const cientifico = especie?.nombreCientifico ?? observacion.nombreCientifico;
  const total = sumar(manchasDe(observacion, modo));

  return (
    <div className="fila-anotacion">
      <MiniaturaEspecie especie={especie} conHueco />
      <div className="fila-anotacion__cuerpo">
        <div>
          <strong>{nombre}</strong> {cientifico && <span className="cientifico texto-suave texto-pequeno">{cientifico}</span>}
          {observacion.estadoIdentificacion !== 'confirmada' && (
            <span className="estado estado--ocre" style={{ marginLeft: '0.4rem' }}>
              Pendiente de revisar
            </span>
          )}
        </div>
        {modo === 'longitudes' ? (
          <EntradaLongitudes
            id={`manchas-${observacion.id}`}
            etiqueta={`Manchas de ${nombre}, en cm`}
            valores={observacion.longitudes ?? []}
            L={transecto.longitudCm}
            alGuardar={(longitudes) => guardarObservacion({ ...observacion, longitudes })}
          />
        ) : (
          <p className="texto-pequeno" style={{ margin: 0 }}>
            {(observacion.tramos ?? []).length === 0
              ? 'Sin tramos todavía.'
              : `${observacion.tramos.map((t) => `${formatearNumero(t.desde)}–${formatearNumero(t.hasta)}`).join(' · ')} cm`}
            <br />
            <span className="texto-suave">
              = {cm(total)} · {plural((observacion.tramos ?? []).length, 'mancha', 'manchas')} ·{' '}
              {formatearPorcentaje(transecto.longitudCm ? total / transecto.longitudCm : 0)}
            </span>
          </p>
        )}
        {observacion.notas && !abierta && <p className="texto-pequeno texto-suave" style={{ margin: 0 }}>{observacion.notas}</p>}
        {abierta ? (
          <PanelEdicion observacion={observacion} transecto={transecto} modo={modo} nombre={nombre} alCerrar={() => alAbrir(false)} />
        ) : (
          <div>
            <button type="button" className="boton boton--sencillo" onClick={() => alAbrir(true)}>
              {modo === 'tramos' ? 'Editar tramos y notas' : 'Notas e identificación'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Campo «1+12+5+28» que se guarda al salir del campo o al pulsar Intro. */
function EntradaLongitudes({ id, etiqueta, valores, L, alGuardar }) {
  const anunciar = useAnunciar();
  const guardado = textoLongitudes(valores);
  const [texto, setTexto] = useState(guardado);
  const [guardando, setGuardando] = useState(false);
  const enfocado = useRef(false);
  // Si los datos cambian por fuera (otra pestaña, restaurar un modelo), se muestran sin pisar lo que se escribe.
  useEffect(() => {
    if (!enfocado.current) setTexto(guardado);
  }, [guardado]);
  const lectura = leerLongitudes(texto);
  const sucio = texto.trim() !== guardado;
  const actuales = lectura.valida ? lectura.valores : valores;
  const total = sumar(actuales);

  async function guardar() {
    if (!sucio || !lectura.valida || guardando) return;
    setGuardando(true);
    try {
      await alGuardar(lectura.valores);
      setTexto(textoLongitudes(lectura.valores));
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="entrada-longitudes">
      <label htmlFor={id} className="solo-lectores">
        {etiqueta}
      </label>
      <input
        id={id}
        value={texto}
        inputMode="decimal"
        autoComplete="off"
        placeholder="Por ejemplo: 1+12+5+28"
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => {
          enfocado.current = true;
        }}
        onBlur={() => {
          enfocado.current = false;
          guardar();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            guardar();
          }
        }}
        aria-invalid={!lectura.valida}
        aria-describedby={`${id}-resultado`}
      />
      <span id={`${id}-resultado`} className={`texto-pequeno ${lectura.valida ? 'texto-suave' : 'error-campo'}`}>
        {lectura.valida
          ? `= ${cm(total)} · ${plural(actuales.length, 'mancha', 'manchas')} · ${formatearPorcentaje(L ? total / L : 0)}${sucio ? ' · sin guardar' : ''}`
          : lectura.mensaje}
      </span>
    </div>
  );
}

function FilaSueloDesnudo({ transecto }) {
  return (
    <div className="fila-anotacion fila-anotacion--suelo">
      <span className="miniatura-especie miniatura-especie--suelo" aria-hidden="true" />
      <div className="fila-anotacion__cuerpo">
        <strong>Suelo desnudo</strong>
        <EntradaLongitudes
          id={`suelo-${transecto.id}`}
          etiqueta="Tramos de suelo desnudo, en cm"
          valores={transecto.sueloDesnudo ?? []}
          L={transecto.longitudCm}
          alGuardar={(sueloDesnudo) => guardarParcela({ ...transecto, sueloDesnudo })}
        />
        <span className="texto-pequeno texto-suave">Anótalo aunque sea 0 cuando termines, para cerrar la línea.</span>
      </div>
    </div>
  );
}

/* ---------- Panel de edición: tramos, notas e identificación ---------- */

function PanelEdicion({ observacion, transecto, modo, nombre, alCerrar }) {
  const anunciar = useAnunciar();
  const [tramos, setTramos] = useState(() =>
    (observacion.tramos ?? []).map((t) => ({ desde: String(t.desde), hasta: String(t.hasta) })),
  );
  const [notas, setNotas] = useState(observacion.notas ?? '');
  const [dudosa, setDudosa] = useState(observacion.estadoIdentificacion !== 'confirmada');
  const [errores, setErrores] = useState({});
  const sinEspecie = !observacion.especieId;
  const prefijo = `edicion-${observacion.id}`;

  const cambiarTramo = (i, campo, valor) =>
    setTramos((lista) => lista.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));

  async function guardar(evento) {
    evento.preventDefault();
    const nuevos = {};
    let validos = [];
    if (modo === 'tramos') {
      tramos.forEach((t, i) => {
        const r = validarTramo(t.desde.replace(',', '.'), t.hasta.replace(',', '.'), transecto.longitudCm);
        if (!r.valido) nuevos[i] = r.mensaje;
        else validos.push(r.tramo);
      });
      validos = validos.sort((a, b) => a.desde - b.desde);
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    try {
      await guardarObservacion({
        ...observacion,
        ...(modo === 'tramos' ? { tramos: validos } : {}),
        notas: notas.trim(),
        estadoIdentificacion: sinEspecie ? observacion.estadoIdentificacion : dudosa ? 'pendiente' : 'confirmada',
      });
      anunciar('Cambios guardados.');
      alCerrar();
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error' });
    }
  }

  async function quitar() {
    if (!window.confirm(`¿Quitar ${nombre} de este transecto?`)) return;
    try {
      await eliminarObservacion(observacion.id);
      anunciar(`${nombre} quitada del transecto.`);
    } catch (error) {
      anunciar(`No se ha podido quitar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <form className="formulario panel-edicion" onSubmit={guardar} noValidate>
      {modo === 'tramos' && (
        <fieldset className="tramos">
          <legend>Tramos sobre la cinta (cm)</legend>
          {tramos.length === 0 && <p className="texto-suave texto-pequeno">Añade el primer tramo de esta especie.</p>}
          {tramos.map((t, i) => (
            <div key={i} className="tramo">
              <div className="tramo__campos">
                <label>
                  <span className="texto-pequeno">Desde</span>
                  <input
                    inputMode="decimal"
                    value={t.desde}
                    onChange={(e) => cambiarTramo(i, 'desde', e.target.value)}
                    aria-invalid={Boolean(errores[i])}
                  />
                </label>
                <label>
                  <span className="texto-pequeno">Hasta</span>
                  <input
                    inputMode="decimal"
                    value={t.hasta}
                    onChange={(e) => cambiarTramo(i, 'hasta', e.target.value)}
                    aria-invalid={Boolean(errores[i])}
                  />
                </label>
                <button
                  type="button"
                  className="boton boton--sencillo"
                  aria-label={`Quitar tramo ${i + 1}`}
                  onClick={() => setTramos((lista) => lista.filter((_, j) => j !== i))}
                >
                  <IconoPapelera />
                </button>
              </div>
              {errores[i] && <p className="error-campo">{errores[i]}</p>}
            </div>
          ))}
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() =>
              setTramos((lista) => [...lista, { desde: lista.length ? lista[lista.length - 1].hasta : '', hasta: '' }])
            }
          >
            <IconoMas />
            Añadir tramo
          </button>
        </fieldset>
      )}

      <div className="campo">
        <label htmlFor={`${prefijo}-notas`}>Notas (opcional)</label>
        <textarea
          id={`${prefijo}-notas`}
          rows={2}
          maxLength={2000}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Por ejemplo: fijadora de nitrógeno, en flor"
        />
      </div>
      {!sinEspecie && (
        <label className="casilla">
          <input type="checkbox" checked={dudosa} onChange={(e) => setDudosa(e.target.checked)} />
          <span>Identificación dudosa: quedará pendiente de revisar</span>
        </label>
      )}
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton">
          Guardar
        </button>
        <button type="button" className="boton boton--sencillo" onClick={alCerrar}>
          Cancelar
        </button>
        <button type="button" className="boton boton--sencillo" onClick={quitar}>
          <IconoPapelera />
          Quitar especie
        </button>
      </div>
    </form>
  );
}

/* ---------- Añadir una especie al transecto ---------- */

const OTRA = '__otra__';

function SelectorNuevaEspecie({ investigacion, transecto, presentes, catalogo, alTerminar }) {
  const anunciar = useAnunciar();
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [nombreOtra, setNombreOtra] = useState('');
  const [error, setError] = useState('');
  const yaEstan = new Set(presentes.map((o) => o.especieId).filter(Boolean));
  const disponibles = catalogo.especies.filter((e) => !yaEstan.has(e.id));
  const resultados = buscarEspecies(disponibles, busqueda);

  async function anadir(evento) {
    evento.preventDefault();
    let campos;
    if (seleccion === OTRA) {
      const nombre = nombreOtra.trim();
      if (!nombre) {
        setError('Escribe un nombre provisional, por ejemplo «Gramínea de hoja fina».');
        return;
      }
      campos = { especieId: null, nombreComun: nombre, nombreCientifico: '', estadoIdentificacion: 'pendiente' };
    } else {
      const especie = catalogo.buscarEspecie(seleccion);
      if (!especie) {
        setError('Elige una especie de la lista.');
        return;
      }
      campos = {
        especieId: especie.id,
        nombreComun: especie.nombreComun,
        nombreCientifico: especie.nombreCientifico,
        estadoIdentificacion: 'confirmada',
      };
    }
    try {
      const nueva = crearIntercepcion(investigacion.id, transecto.id, campos);
      await guardarObservacion(nueva);
      anunciar(`${campos.nombreComun} añadida al transecto.`);
      alTerminar(nueva.id);
    } catch (e) {
      anunciar(`No se ha podido añadir: ${e.message}`, { tipo: 'error' });
    }
  }

  return (
    <form className="panel formulario" style={{ marginTop: '1rem' }} onSubmit={anadir} noValidate>
      <fieldset className="selector-especie">
        <legend>Añadir especie</legend>
        <div className="campo">
          <label htmlFor="busqueda-transecto" className="solo-lectores">
            Buscar en el catálogo
          </label>
          <input
            id="busqueda-transecto"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre común o científico"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
        <div className="opciones-especie">
          {resultados.map((e) => (
            <label key={e.id} className="opcion-especie">
              <input
                type="radio"
                name="especie-transecto"
                value={e.id}
                checked={seleccion === e.id}
                onChange={() => {
                  setSeleccion(e.id);
                  setError('');
                }}
              />
              <MiniaturaEspecie especie={e} conHueco />
              <span className="nombres">
                <strong>{e.nombreComun}</strong>
                {e.nombreCientifico && <span className="cientifico texto-suave">{e.nombreCientifico}</span>}
                {e.propia && <span className="texto-suave texto-pequeno">Mi catálogo</span>}
              </span>
            </label>
          ))}
          {resultados.length === 0 && (
            <p className="texto-suave" style={{ padding: '0.75rem 0.8rem', margin: 0 }}>
              {busqueda ? `Ninguna especie del catálogo coincide con «${busqueda}».` : 'Ya están todas las del catálogo.'}
            </p>
          )}
          <label className="opcion-especie">
            <input
              type="radio"
              name="especie-transecto"
              value={OTRA}
              checked={seleccion === OTRA}
              onChange={() => {
                setSeleccion(OTRA);
                setError('');
              }}
            />
            <span className="nombres">
              <strong>Otra especie o sin identificar</strong>
              <span className="texto-suave texto-pequeno">Quedará pendiente de revisar</span>
            </span>
          </label>
        </div>
      </fieldset>
      {seleccion === OTRA && (
        <div className="campo">
          <label htmlFor="nombre-otra-transecto">Nombre provisional</label>
          <input
            id="nombre-otra-transecto"
            value={nombreOtra}
            onChange={(e) => setNombreOtra(e.target.value)}
            maxLength={200}
            autoComplete="off"
          />
        </div>
      )}
      {error && (
        <p className="error-campo" role="alert">
          {error}
        </p>
      )}
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton" disabled={!seleccion}>
          Añadir al transecto
        </button>
        <button type="button" className="boton boton--sencillo" onClick={() => alTerminar(null)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
