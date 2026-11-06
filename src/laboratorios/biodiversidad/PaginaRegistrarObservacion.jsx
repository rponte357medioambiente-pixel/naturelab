import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../../accesibilidad/useTituloDocumento.js';
import { crearObservacion, esTransecto } from '../../almacenamiento/modelo.js';
import { guardarObservacion, obtenerDatosInvestigacion } from '../../almacenamiento/repositorio.js';
import { useConsulta } from '../../almacenamiento/useConsulta.js';
import { claveTaxon, validarAbundancia } from '../../calculos/biodiversidad.js';
import { plural } from '../../calculos/formato.js';
import { buscarEspecies, tieneImagen, useCatalogo } from '../../catalogos/catalogo.js';
import { IconoAtras, IconoCamara, IconoMas, IconoMenos } from '../../componentes/Iconos.jsx';
import { comprimirFoto } from '../../fotos/procesarFoto.js';
import { useFoto } from '../../fotos/FotoObservacion.jsx';
import { MiniaturaEspecie } from '../../componentes/ImagenEspecie.jsx';
import { PaginaNoEncontrada } from '../../app/PaginaNoEncontrada.jsx';

const OTRA = '__otra__';

export function PaginaRegistrarObservacion() {
  const { id, observacionId } = useParams();
  const { datos, cargando } = useConsulta(() => obtenerDatosInvestigacion(id), [id]);
  const catalogo = useCatalogo();
  const esEdicion = Boolean(observacionId);
  useTituloDocumento(esEdicion ? 'Editar observación' : 'Registrar observación');

  if (cargando || catalogo.cargando) return <p className="texto-suave">Cargando…</p>;
  if (!datos) return <PaginaNoEncontrada titulo="Investigación no encontrada" />;
  if (esTransecto(datos.investigacion)) return <Navigate to={`/investigaciones/${id}/transectos`} replace />;

  const observacion = esEdicion ? datos.observaciones.find((o) => o.id === observacionId) : null;
  if (esEdicion && !observacion) return <PaginaNoEncontrada titulo="Observación no encontrada" />;

  return (
    <>
      <Link to={`/investigaciones/${id}/observaciones`} className="volver">
        <IconoAtras />
        {datos.investigacion.titulo}
      </Link>
      <header className="encabezado-pagina">
        <h1>{esEdicion ? 'Editar observación' : 'Registrar observación'}</h1>
        <p>Se guarda en este dispositivo al pulsar el botón.</p>
      </header>

      {catalogo.error && (
        <div className="aviso aviso--ocre">
          <p>
            No se ha podido cargar el catálogo. Puedes registrar la planta como «Otra especie o sin identificar» y
            revisarla después.
          </p>
        </div>
      )}

      {datos.parcelas.length === 0 ? (
        <div className="aviso aviso--ocre">
          <p>
            Antes de registrar observaciones, crea una parcela.{' '}
            <Link to={`/investigaciones/${id}/parcelas`}>Ir a Parcelas</Link>
          </p>
        </div>
      ) : (
        <FormularioObservacion
          key={observacionId ?? 'nueva'}
          datos={datos}
          observacion={observacion}
          especies={catalogo.especies}
        />
      )}
    </>
  );
}

function FormularioObservacion({ datos, observacion, especies }) {
  const { investigacion, parcelas, observaciones } = datos;
  const navegar = useNavigate();
  const anunciar = useAnunciar();
  const [parametros, setParametros] = useSearchParams();
  const busquedaRef = useRef(null);

  const parcelaInicial =
    observacion?.parcelaId ??
    (parcelas.some((p) => p.id === parametros.get('parcela')) ? parametros.get('parcela') : parcelas[0].id);

  const [parcelaId, setParcelaId] = useState(parcelaInicial);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(() => {
    if (!observacion) return '';
    return observacion.especieId && especies.some((e) => e.id === observacion.especieId) ? observacion.especieId : OTRA;
  });
  const [dudosa, setDudosa] = useState(observacion?.estadoIdentificacion === 'pendiente' && Boolean(observacion?.especieId));
  // Sin especie del catálogo (o si ya no existe, por ejemplo porque se borró de «Mi catálogo»),
  // se conserva el nombre guardado como «Otra especie».
  const fueraDelCatalogo = Boolean(observacion) && !especies.some((e) => e.id === observacion.especieId);
  const [nombreProvisional, setNombreProvisional] = useState(fueraDelCatalogo ? observacion.nombreComun : '');
  const [cientificoProvisional, setCientificoProvisional] = useState(
    fueraDelCatalogo ? observacion.nombreCientifico : '',
  );
  const [abundancia, setAbundancia] = useState(String(observacion?.abundancia ?? 1));
  const [notas, setNotas] = useState(observacion?.notas ?? '');
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  // Foto: 'ninguna' | 'existente' (ya guardada) | 'nueva' (sin guardar aún) | 'quitada'
  const [foto, setFoto] = useState(() =>
    observacion?.fotoLocalId ? { tipo: 'existente', id: observacion.fotoLocalId } : { tipo: 'ninguna' },
  );
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const entradaFoto = useRef(null);
  const urlFotoGuardada = useFoto(foto.tipo === 'existente' ? foto.id : null);
  const urlFotoNueva = useMemo(() => (foto.tipo === 'nueva' ? URL.createObjectURL(foto.blob) : null), [foto]);
  useEffect(() => () => urlFotoNueva && URL.revokeObjectURL(urlFotoNueva), [urlFotoNueva]);
  const urlVistaFoto = urlFotoNueva ?? urlFotoGuardada;

  async function elegirFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setProcesandoFoto(true);
    try {
      const resultado = await comprimirFoto(archivo);
      setFoto({ tipo: 'nueva', ...resultado });
    } catch (error) {
      anunciar(error.message, { tipo: 'error', duracion: 6000 });
    } finally {
      setProcesandoFoto(false);
    }
  }

  const resultados = useMemo(() => buscarEspecies(especies, busqueda), [especies, busqueda]);
  const especieSeleccionada = especies.find((e) => e.id === seleccion) ?? null;
  const hayImagenes = especies.some(tieneImagen);

  // Recordar la parcela elegida en la dirección, para seguir registrando en ella.
  useEffect(() => {
    if (!observacion && parametros.get('parcela') !== parcelaId) {
      setParametros({ parcela: parcelaId }, { replace: true });
    }
  }, [parcelaId, observacion, parametros, setParametros]);

  // Aviso cuando ya hay individuos de ese taxón en la parcela: se sumarán.
  const yaRegistrados = useMemo(() => {
    if (!seleccion) return 0;
    const clave =
      seleccion === OTRA
        ? claveTaxon({ especieId: null, nombreComun: nombreProvisional })
        : claveTaxon({ especieId: seleccion });
    return observaciones
      .filter((o) => o.parcelaId === parcelaId && o.id !== observacion?.id && claveTaxon(o) === clave)
      .reduce((s, o) => s + o.abundancia, 0);
  }, [seleccion, nombreProvisional, observaciones, parcelaId, observacion]);

  function ajustar(delta) {
    const actual = Number.parseInt(abundancia, 10);
    const base = Number.isFinite(actual) ? actual : 0;
    setAbundancia(String(Math.max(1, base + delta)));
  }

  function elegirOtra() {
    setSeleccion(OTRA);
    if (!nombreProvisional && busqueda.trim()) setNombreProvisional(busqueda.trim());
  }

  async function enviar(evento) {
    evento.preventDefault();
    const nuevosErrores = {};
    if (!seleccion) nuevosErrores.especie = 'Elige una especie del catálogo o «Otra especie o sin identificar».';
    if (seleccion === OTRA && !nombreProvisional.trim()) {
      nuevosErrores.provisional = 'Escribe un nombre o una descripción breve, por ejemplo «Gramínea A».';
    }
    const comprobacion = validarAbundancia(abundancia);
    if (!comprobacion.valida) nuevosErrores.abundancia = comprobacion.mensaje;
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length) {
      const primero = { especie: 'busqueda-especie', provisional: 'nombre-provisional', abundancia: 'abundancia' }[
        Object.keys(nuevosErrores)[0]
      ];
      document.getElementById(primero)?.focus();
      return;
    }

    const identificacion =
      seleccion === OTRA
        ? {
            especieId: null,
            nombreComun: nombreProvisional.trim(),
            nombreCientifico: cientificoProvisional.trim(),
            // Lo que no está en el catálogo siempre queda pendiente de revisión.
            estadoIdentificacion: cientificoProvisional.trim() ? 'pendiente' : 'desconocida',
          }
        : {
            especieId: especieSeleccionada.id,
            nombreComun: especieSeleccionada.nombreComun,
            nombreCientifico: especieSeleccionada.nombreCientifico,
            estadoIdentificacion: dudosa ? 'pendiente' : 'confirmada',
          };

    const base = observacion ?? crearObservacion(investigacion.id, parcelaId);
    setGuardando(true);
    try {
      const cambioFoto =
        foto.tipo === 'nueva'
          ? { blob: foto.blob, ancho: foto.ancho, alto: foto.alto }
          : foto.tipo === 'quitada'
            ? null
            : undefined;
      await guardarObservacion(
        {
          ...base,
          ...identificacion,
          parcelaId,
          abundancia: comprobacion.valor,
          notas: notas.trim(),
        },
        { foto: cambioFoto },
      );
      if (observacion) {
        anunciar('Cambios guardados en este dispositivo.');
        navegar(`/investigaciones/${investigacion.id}/observaciones`, { replace: true });
        return;
      }
      anunciar(`${identificacion.nombreComun}: ${plural(comprobacion.valor, 'individuo guardado', 'individuos guardados')} en este dispositivo.`);
      // Preparar la siguiente observación en la misma parcela.
      setSeleccion('');
      setBusqueda('');
      setDudosa(false);
      setNombreProvisional('');
      setCientificoProvisional('');
      setAbundancia('1');
      setNotas('');
      setFoto({ tipo: 'ninguna' });
      window.scrollTo({ top: 0 });
      busquedaRef.current?.focus({ preventScroll: true });
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error', duracion: 6000 });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      {parcelas.length > 1 && (
        <div className="campo">
          <label htmlFor="parcela">Parcela</label>
          <select id="parcela" value={parcelaId} onChange={(e) => setParcelaId(e.target.value)}>
            {parcelas.map((p) => (
              <option key={p.id} value={p.id}>
                Parcela {p.codigo}
              </option>
            ))}
          </select>
        </div>
      )}
      {parcelas.length === 1 && (
        <p className="texto-suave" style={{ margin: 0 }}>
          Parcela {parcelas[0].codigo}
        </p>
      )}

      <fieldset className="selector-especie" aria-describedby={errores.especie ? 'error-especie' : undefined}>
        <legend>Especie</legend>
        <div className="campo">
          <label htmlFor="busqueda-especie" className="solo-lectores">
            Buscar en el catálogo
          </label>
          <input
            id="busqueda-especie"
            ref={busquedaRef}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre común o científico"
            autoComplete="off"
            enterKeyHint="search"
            aria-invalid={Boolean(errores.especie)}
          />
        </div>

        <div className="opciones-especie">
          {resultados.map((e) => (
            <label key={e.id} className="opcion-especie">
              <input
                type="radio"
                name="especie"
                value={e.id}
                checked={seleccion === e.id}
                onChange={() => setSeleccion(e.id)}
              />
              {hayImagenes && <MiniaturaEspecie especie={e} conHueco />}
              <span className="nombres">
                <strong>{e.nombreComun}</strong>
                {e.nombreCientifico && <span className="cientifico texto-suave">{e.nombreCientifico}</span>}
                {e.propia && <span className="texto-suave texto-pequeno">Mi catálogo</span>}
              </span>
            </label>
          ))}
          {resultados.length === 0 && (
            <p className="texto-suave" style={{ padding: '0.75rem 0.8rem', margin: 0 }}>
              Ninguna especie del catálogo coincide con «{busqueda}».
            </p>
          )}
          <label className="opcion-especie">
            <input type="radio" name="especie" value={OTRA} checked={seleccion === OTRA} onChange={elegirOtra} />
            <span className="nombres">
              <strong>Otra especie o sin identificar</strong>
              <span className="texto-suave texto-pequeno">Quedará pendiente de revisar</span>
            </span>
          </label>
        </div>
        {errores.especie && (
          <p className="error-campo" id="error-especie">
            {errores.especie}
          </p>
        )}
      </fieldset>

      {especieSeleccionada && (
        <label className="casilla">
          <input type="checkbox" checked={dudosa} onChange={(e) => setDudosa(e.target.checked)} />
          <span>
            No estoy seguro de la identificación
            <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
              Se marcará como pendiente de revisar.
            </span>
          </span>
        </label>
      )}

      {seleccion === OTRA && (
        <>
          <div className="campo">
            <label htmlFor="nombre-provisional">Nombre o descripción</label>
            <input
              id="nombre-provisional"
              value={nombreProvisional}
              onChange={(e) => setNombreProvisional(e.target.value)}
              maxLength={200}
              placeholder="Por ejemplo: Gramínea A"
              aria-invalid={Boolean(errores.provisional)}
              aria-describedby={`ayuda-provisional${errores.provisional ? ' error-provisional' : ''}`}
            />
            <p className="ayuda" id="ayuda-provisional">
              Usa el mismo nombre si vuelves a encontrar esa planta: así se cuentan juntas.
            </p>
            {errores.provisional && (
              <p className="error-campo" id="error-provisional">
                {errores.provisional}
              </p>
            )}
          </div>
          <div className="campo">
            <label htmlFor="cientifico-provisional">Nombre científico (opcional)</label>
            <input
              id="cientifico-provisional"
              value={cientificoProvisional}
              onChange={(e) => setCientificoProvisional(e.target.value)}
              maxLength={200}
            />
          </div>
        </>
      )}

      <div className="campo">
        <label htmlFor="abundancia">Número de individuos</label>
        <div className="contador">
          <button type="button" className="boton boton--secundario" onClick={() => ajustar(-1)} aria-label="Restar uno">
            <IconoMenos />
          </button>
          <input
            id="abundancia"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={abundancia}
            onChange={(e) => setAbundancia(e.target.value)}
            aria-invalid={Boolean(errores.abundancia)}
            aria-describedby={errores.abundancia ? 'error-abundancia' : undefined}
          />
          <button type="button" className="boton boton--secundario" onClick={() => ajustar(1)} aria-label="Sumar uno">
            <IconoMas />
          </button>
        </div>
        {yaRegistrados > 0 && (
          <p className="ayuda">
            Ya hay {plural(yaRegistrados, 'individuo', 'individuos')} de esta especie en la parcela; se sumarán en los
            resultados.
          </p>
        )}
        {errores.abundancia && (
          <p className="error-campo" id="error-abundancia">
            {errores.abundancia}
          </p>
        )}
      </div>

      <div className="campo">
        <span className="etiqueta">Foto (opcional)</span>
        {urlVistaFoto && <img className="vista-foto" src={urlVistaFoto} alt="Foto de la observación" />}
        <input
          ref={entradaFoto}
          type="file"
          accept="image/*"
          className="solo-lectores"
          tabIndex={-1}
          aria-hidden="true"
          onChange={elegirFoto}
        />
        <div className="acciones" style={{ marginTop: 0 }}>
          <button
            type="button"
            className="boton boton--secundario"
            onClick={() => entradaFoto.current?.click()}
            disabled={procesandoFoto}
          >
            <IconoCamara />
            {procesandoFoto ? 'Preparando foto…' : urlVistaFoto ? 'Cambiar foto' : 'Añadir foto'}
          </button>
          {urlVistaFoto && (
            <button
              type="button"
              className="boton boton--sencillo"
              onClick={() => setFoto(observacion?.fotoLocalId ? { tipo: 'quitada' } : { tipo: 'ninguna' })}
            >
              Quitar foto
            </button>
          )}
        </div>
        <p className="ayuda">
          Se guarda solo en este dispositivo, sin ubicación. Fotografía la planta y evita caras, matrículas y datos
          personales.
        </p>
      </div>

      <div className="campo">
        <label htmlFor="notas">Notas de campo (opcional)</label>
        <textarea
          id="notas"
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          maxLength={2000}
          placeholder="Hábitat, rasgos observados, dudas…"
        />
      </div>

      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton" disabled={guardando}>
          {observacion ? 'Guardar cambios' : 'Guardar observación'}
        </button>
        {!observacion && (
          <Link className="boton boton--sencillo" to={`/investigaciones/${investigacion.id}/observaciones`}>
            Terminar
          </Link>
        )}
      </div>
    </form>
  );
}
