import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { UbicacionUnidad } from '../../ubicacion/CamposCoordenadas.jsx';
import { camposDe, leerCoordenadas } from '../../ubicacion/coordenadas.js';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { crearParcela } from '../../almacenamiento/modelo.js';
import { eliminarParcela, guardarParcela } from '../../almacenamiento/repositorio.js';
import { UNIDADES_SUPERFICIE, validarSuperficie } from '../../calculos/biodiversidad.js';
import { formatearNumero, plural } from '../../calculos/formato.js';
import { IconoEditar, IconoMas, IconoPapelera } from '../../componentes/Iconos.jsx';
import { Campo, CamposSuperficie } from './PaginasFormularioInvestigacion.jsx';

export function SeccionParcelas() {
  const { investigacion, parcelas, observaciones } = useOutletContext();
  const anunciar = useAnunciar();
  const [editando, setEditando] = useState(parcelas.length === 0 ? 'nueva' : null);

  async function eliminar(parcela) {
    const n = observaciones.filter((o) => o.parcelaId === parcela.id).length;
    const mensaje =
      n > 0
        ? `¿Eliminar la parcela ${parcela.codigo}? También se eliminarán sus ${plural(n, 'observación', 'observaciones')}.`
        : `¿Eliminar la parcela ${parcela.codigo}?`;
    if (!window.confirm(mensaje)) return;
    try {
      await eliminarParcela(parcela.id);
      anunciar(`Parcela ${parcela.codigo} eliminada.`);
    } catch (error) {
      anunciar(`No se ha podido eliminar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <section aria-labelledby="titulo-parcelas">
      <h2 id="titulo-parcelas" className="solo-lectores">
        Parcelas
      </h2>

      {parcelas.length > 0 && (
        <ul className="lista lista-panel">
          {parcelas.map((parcela) => {
            const obs = observaciones.filter((o) => o.parcelaId === parcela.id);
            const individuos = obs.reduce((s, o) => s + o.abundancia, 0);
            if (editando === parcela.id) {
              return (
                <li key={parcela.id} style={{ padding: '1rem 0' }}>
                  <FormularioParcela
                    inicial={parcela}
                    investigacionId={investigacion.id}
                    parcelas={parcelas}
                    alTerminar={() => setEditando(null)}
                  />
                </li>
              );
            }
            return (
              <li key={parcela.id} className="fila-registro">
                <div className="principal">
                  <strong>Parcela {parcela.codigo}</strong>
                  <span className="texto-suave texto-pequeno">
                    {parcela.superficie
                      ? `${formatearNumero(parcela.superficie, parcela.superficie % 1 ? 1 : 0)} ${UNIDADES_SUPERFICIE[parcela.unidadSuperficie]?.etiqueta}`
                      : 'Superficie sin indicar'}
                    {', '}
                    {plural(obs.length, 'observación', 'observaciones')}, {plural(individuos, 'individuo', 'individuos')}
                  </span>
                  {parcela.descripcion && <p className="texto-pequeno" style={{ margin: '0.25rem 0 0' }}>{parcela.descripcion}</p>}
                </div>
                <div className="herramientas no-imprimir">
                  <button type="button" className="boton boton--sencillo" onClick={() => setEditando(parcela.id)}>
                    <IconoEditar />
                    Editar
                  </button>
                  <button type="button" className="boton boton--sencillo" onClick={() => eliminar(parcela)}>
                    <IconoPapelera />
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editando === 'nueva' ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <h3>Nueva parcela</h3>
          <FormularioParcela
            investigacionId={investigacion.id}
            parcelas={parcelas}
            alTerminar={() => setEditando(null)}
            sePuedeCancelar={parcelas.length > 0}
          />
        </div>
      ) : (
        <div className="acciones no-imprimir">
          <button type="button" className="boton boton--secundario" onClick={() => setEditando('nueva')}>
            <IconoMas />
            Añadir parcela
          </button>
        </div>
      )}
    </section>
  );
}

function FormularioParcela({ inicial, investigacionId, parcelas, alTerminar, sePuedeCancelar = true }) {
  const anunciar = useAnunciar();
  const [campos, setCampos] = useState(() => ({
    codigo: inicial?.codigo ?? siguienteCodigo(parcelas),
    superficie: inicial?.superficie ? String(inicial.superficie).replace('.', ',') : '',
    unidadSuperficie: inicial?.unidadSuperficie ?? 'm2',
    descripcion: inicial?.descripcion ?? '',
    ubicacion: { propia: Boolean(inicial?.coordenadas), ...camposDe(inicial?.coordenadas) },
  }));
  const [errores, setErrores] = useState({});
  const prefijo = `parcela-${inicial?.id ?? 'nueva'}-`;
  const cambiar = (campo) => (e) => setCampos((c) => ({ ...c, [campo]: e.target.value }));

  async function enviar(evento) {
    evento.preventDefault();
    const codigo = campos.codigo.trim();
    const superficie = validarSuperficie(campos.superficie);
    const nuevosErrores = {};
    if (!codigo) nuevosErrores.codigo = 'Escribe un código para la parcela.';
    else if (
      parcelas.some(
        (p) => p.id !== inicial?.id && p.codigo.toLocaleLowerCase('es') === codigo.toLocaleLowerCase('es'),
      )
    ) {
      nuevosErrores.codigo = `Ya hay una parcela con el código ${codigo}.`;
    }
    if (!superficie.valida) nuevosErrores.superficie = superficie.mensaje;
    const ubicacion = campos.ubicacion.propia ? leerCoordenadas(campos.ubicacion) : { coordenadas: null, errores: {} };
    if (ubicacion.errores.lat) nuevosErrores.lat = ubicacion.errores.lat;
    if (ubicacion.errores.lon) nuevosErrores.lon = ubicacion.errores.lon;
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length) return;

    const parcela = inicial
      ? { ...inicial }
      : crearParcela(investigacionId);
    try {
      await guardarParcela({
        ...parcela,
        codigo,
        superficie: superficie.valor,
        unidadSuperficie: campos.unidadSuperficie,
        coordenadas: ubicacion.coordenadas,
        descripcion: campos.descripcion.trim(),
      });
      anunciar(inicial ? 'Parcela actualizada.' : `Parcela ${codigo} creada.`);
      alTerminar();
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <Campo id={`${prefijo}codigo`} etiqueta="Código" error={errores.codigo}>
        <input
          id={`campo-${prefijo}codigo`}
          value={campos.codigo}
          onChange={cambiar('codigo')}
          maxLength={40}
          aria-invalid={Boolean(errores.codigo)}
          aria-describedby={errores.codigo ? `error-${prefijo}codigo` : undefined}
        />
      </Campo>
      <CamposSuperficie
        prefijo={prefijo}
        superficie={campos.superficie}
        unidad={campos.unidadSuperficie}
        error={errores.superficie}
        onSuperficie={cambiar('superficie')}
        onUnidad={cambiar('unidadSuperficie')}
      />
      <Campo id={`${prefijo}descripcion`} etiqueta="Descripción (opcional)">
        <input
          id={`campo-${prefijo}descripcion`}
          value={campos.descripcion}
          onChange={cambiar('descripcion')}
          maxLength={2000}
          placeholder="Por ejemplo: borde del saladar, suelo arenoso"
        />
      </Campo>
      <UbicacionUnidad
        prefijo={prefijo}
        nombre="de la parcela"
        valor={campos.ubicacion}
        alCambiar={(ubicacion) => setCampos((c) => ({ ...c, ubicacion }))}
        errores={{ lat: errores.lat, lon: errores.lon }}
      />
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton">
          {inicial ? 'Guardar parcela' : 'Crear parcela'}
        </button>
        {sePuedeCancelar && (
          <button type="button" className="boton boton--sencillo" onClick={alTerminar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function siguienteCodigo(parcelas) {
  const usados = new Set(parcelas.map((p) => p.codigo.toLocaleLowerCase('es')));
  let n = parcelas.length + 1;
  while (usados.has(`p${n}`)) n += 1;
  return `P${n}`;
}
