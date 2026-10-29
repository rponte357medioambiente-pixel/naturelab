import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../../accesibilidad/useTituloDocumento.js';
import { crearInvestigacion, crearParcela } from '../../almacenamiento/modelo.js';
import {
  eliminarInvestigacion,
  guardarInvestigacion,
  guardarLote,
  obtenerDatosInvestigacion,
} from '../../almacenamiento/repositorio.js';
import { useConsulta } from '../../almacenamiento/useConsulta.js';
import { UNIDADES_SUPERFICIE, validarSuperficie } from '../../calculos/biodiversidad.js';
import { hoyISO } from '../../calculos/formato.js';
import { IconoAtras, IconoPapelera } from '../../componentes/Iconos.jsx';
import { PaginaNoEncontrada } from '../../app/PaginaNoEncontrada.jsx';

export function PaginaNuevaInvestigacion() {
  useTituloDocumento('Nueva investigación');
  return (
    <>
      <Link to="/investigaciones" className="volver">
        <IconoAtras />
        Investigaciones
      </Link>
      <header className="encabezado-pagina">
        <h1>Nueva investigación</h1>
        <p>Laboratorio de Biodiversidad. Podrás cambiar estos datos más adelante.</p>
      </header>
      <FormularioInvestigacion />
    </>
  );
}

export function PaginaEditarInvestigacion() {
  const { id } = useParams();
  const { datos, cargando } = useConsulta(() => obtenerDatosInvestigacion(id), [id]);
  useTituloDocumento('Editar investigación');
  if (cargando) return <p className="texto-suave">Cargando…</p>;
  if (!datos) return <PaginaNoEncontrada titulo="Investigación no encontrada" />;
  return (
    <>
      <Link to={`/investigaciones/${id}`} className="volver">
        <IconoAtras />
        {datos.investigacion.titulo}
      </Link>
      <header className="encabezado-pagina">
        <h1>Editar investigación</h1>
      </header>
      <FormularioInvestigacion inicial={datos.investigacion} />
      <ZonaEliminar datos={datos} />
    </>
  );
}

function FormularioInvestigacion({ inicial }) {
  const esNueva = !inicial;
  const navegar = useNavigate();
  const anunciar = useAnunciar();
  const [campos, setCampos] = useState(() => ({
    titulo: inicial?.titulo ?? '',
    fechaObservacion: inicial?.fechaObservacion ?? hoyISO(),
    lugarTexto: inicial?.lugarTexto ?? '',
    equipoAlias: inicial?.equipoAlias ?? '',
    descripcion: inicial?.descripcion ?? '',
    codigoParcela: 'P1',
    superficie: '',
    unidadSuperficie: 'm2',
  }));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (evento) => setCampos((c) => ({ ...c, [campo]: evento.target.value }));

  async function enviar(evento) {
    evento.preventDefault();
    const nuevosErrores = {};
    const titulo = campos.titulo.trim();
    if (!titulo) nuevosErrores.titulo = 'Escribe un título para identificar la investigación.';
    const superficie = validarSuperficie(campos.superficie);
    if (esNueva) {
      if (!campos.codigoParcela.trim()) nuevosErrores.codigoParcela = 'Escribe un código para la parcela.';
      if (!superficie.valida) nuevosErrores.superficie = superficie.mensaje;
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      document.getElementById(`campo-${Object.keys(nuevosErrores)[0]}`)?.focus();
      return;
    }

    const datos = {
      titulo,
      fechaObservacion: campos.fechaObservacion,
      lugarTexto: campos.lugarTexto.trim(),
      equipoAlias: campos.equipoAlias.trim(),
      descripcion: campos.descripcion.trim(),
    };

    setGuardando(true);
    try {
      if (esNueva) {
        const investigacion = crearInvestigacion(datos);
        const parcela = crearParcela(investigacion.id, {
          codigo: campos.codigoParcela.trim(),
          superficie: superficie.valor,
          unidadSuperficie: campos.unidadSuperficie,
        });
        await guardarLote({ investigacion, parcelas: [parcela], observaciones: [] });
        anunciar('Investigación creada en este dispositivo.');
        navegar(`/investigaciones/${investigacion.id}/observar`, { replace: true });
      } else {
        await guardarInvestigacion({ ...inicial, ...datos });
        anunciar('Cambios guardados en este dispositivo.');
        navegar(`/investigaciones/${inicial.id}`, { replace: true });
      }
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error', duracion: 6000 });
      setGuardando(false);
    }
  }

  return (
    <form className="formulario panel" onSubmit={enviar} noValidate>
      <Campo id="titulo" etiqueta="Título" error={errores.titulo}>
        <input
          id="campo-titulo"
          value={campos.titulo}
          onChange={cambiar('titulo')}
          maxLength={200}
          placeholder="Por ejemplo: Saladar, parcela norte"
          aria-invalid={Boolean(errores.titulo)}
          aria-describedby={errores.titulo ? 'error-titulo' : undefined}
        />
      </Campo>

      <Campo id="fechaObservacion" etiqueta="Fecha de observación">
        <input id="campo-fechaObservacion" type="date" value={campos.fechaObservacion} onChange={cambiar('fechaObservacion')} />
      </Campo>

      <Campo
        id="lugarTexto"
        etiqueta="Lugar (opcional)"
        ayuda="Una descripción general, sin coordenadas ni direcciones exactas."
      >
        <input
          id="campo-lugarTexto"
          value={campos.lugarTexto}
          onChange={cambiar('lugarTexto')}
          maxLength={200}
          aria-describedby="ayuda-lugarTexto"
          placeholder="Por ejemplo: Salar de los Canos, Vera"
        />
      </Campo>

      <Campo id="equipoAlias" etiqueta="Equipo (opcional)" ayuda="Usa un alias, no nombres reales.">
        <input
          id="campo-equipoAlias"
          value={campos.equipoAlias}
          onChange={cambiar('equipoAlias')}
          maxLength={200}
          aria-describedby="ayuda-equipoAlias"
          placeholder="Por ejemplo: Equipo Taray"
        />
      </Campo>

      <Campo id="descripcion" etiqueta="Objetivo (opcional)">
        <textarea
          id="campo-descripcion"
          value={campos.descripcion}
          onChange={cambiar('descripcion')}
          maxLength={2000}
          rows={3}
          placeholder="¿Qué queréis averiguar?"
        />
      </Campo>

      {esNueva && (
        <fieldset className="formulario">
          <legend>
            <h2 style={{ marginBottom: 0 }}>Primera parcela</h2>
          </legend>
          <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
            Podrás añadir más parcelas desde la investigación.
          </p>
          <Campo id="codigoParcela" etiqueta="Código de la parcela" error={errores.codigoParcela}>
            <input
              id="campo-codigoParcela"
              value={campos.codigoParcela}
              onChange={cambiar('codigoParcela')}
              maxLength={40}
              aria-invalid={Boolean(errores.codigoParcela)}
              aria-describedby={errores.codigoParcela ? 'error-codigoParcela' : undefined}
            />
          </Campo>
          <CamposSuperficie
            superficie={campos.superficie}
            unidad={campos.unidadSuperficie}
            error={errores.superficie}
            onSuperficie={cambiar('superficie')}
            onUnidad={cambiar('unidadSuperficie')}
          />
        </fieldset>
      )}

      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton" disabled={guardando}>
          {esNueva ? 'Crear investigación' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

export function Campo({ id, etiqueta, ayuda, error, children }) {
  return (
    <div className="campo">
      <label htmlFor={`campo-${id}`}>{etiqueta}</label>
      {children}
      {ayuda && (
        <p className="ayuda" id={`ayuda-${id}`}>
          {ayuda}
        </p>
      )}
      {error && (
        <p className="error-campo" id={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function CamposSuperficie({ superficie, unidad, error, onSuperficie, onUnidad, prefijo = '' }) {
  return (
    <div className="campo">
      <div className="fila-campos">
        <div className="campo">
          <label htmlFor={`campo-${prefijo}superficie`}>Superficie (opcional)</label>
          <input
            id={`campo-${prefijo}superficie`}
            type="text"
            inputMode="decimal"
            value={superficie}
            onChange={onSuperficie}
            placeholder="73,2"
            aria-invalid={Boolean(error)}
            aria-describedby={`ayuda-${prefijo}superficie${error ? ` error-${prefijo}superficie` : ''}`}
          />
        </div>
        <div className="campo">
          <label htmlFor={`campo-${prefijo}unidad`}>Unidad</label>
          <select id={`campo-${prefijo}unidad`} value={unidad} onChange={onUnidad}>
            {Object.entries(UNIDADES_SUPERFICIE).map(([valor, { etiqueta }]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="ayuda" id={`ayuda-${prefijo}superficie`}>
        Con la superficie se calcula la densidad (individuos por m²).
      </p>
      {error && (
        <p className="error-campo" id={`error-${prefijo}superficie`}>
          {error}
        </p>
      )}
    </div>
  );
}

function ZonaEliminar({ datos }) {
  const navegar = useNavigate();
  const anunciar = useAnunciar();
  const { investigacion, observaciones } = datos;

  async function eliminar() {
    const confirmado = window.confirm(
      `¿Eliminar «${investigacion.titulo}» y sus ${observaciones.length} observaciones de este dispositivo? No se puede deshacer. Si la necesitas, exporta antes una copia.`,
    );
    if (!confirmado) return;
    try {
      await eliminarInvestigacion(investigacion.id);
      anunciar('Investigación eliminada de este dispositivo.');
      navegar('/investigaciones', { replace: true });
    } catch (error) {
      anunciar(`No se ha podido eliminar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <section className="seccion" aria-labelledby="titulo-eliminar">
      <h2 id="titulo-eliminar">Eliminar investigación</h2>
      <p className="texto-suave">Se borrarán sus parcelas y observaciones de este dispositivo.</p>
      <button type="button" className="boton boton--peligro" onClick={eliminar}>
        <IconoPapelera />
        Eliminar investigación
      </button>
    </section>
  );
}
