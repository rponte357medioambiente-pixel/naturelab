import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { crearTransecto, MODOS_ANOTACION, ORIENTACIONES } from '../../almacenamiento/modelo.js';
import { eliminarParcela, guardarParcela } from '../../almacenamiento/repositorio.js';
import { resumirTransecto, validarLongitudTransecto } from '../../calculos/cobertura.js';
import { formatearNumero, formatearPorcentaje, plural } from '../../calculos/formato.js';
import { IconoEditar, IconoMas, IconoPapelera } from '../../componentes/Iconos.jsx';
import { Campo, CamposTransecto } from './PaginasFormularioInvestigacion.jsx';
import { UbicacionUnidad } from '../../ubicacion/CamposCoordenadas.jsx';
import { camposDe, leerCoordenadas } from '../../ubicacion/coordenadas.js';

export function SeccionTransectos() {
  const { investigacion, parcelas: transectos, observaciones, catalogo } = useOutletContext();
  const anunciar = useAnunciar();
  const [editando, setEditando] = useState(transectos.length === 0 ? 'nuevo' : null);

  async function eliminar(transecto) {
    const n = observaciones.filter((o) => o.parcelaId === transecto.id).length;
    const mensaje =
      n > 0
        ? `¿Eliminar el transecto ${transecto.codigo}? También se eliminarán sus ${plural(n, 'especie anotada', 'especies anotadas')}.`
        : `¿Eliminar el transecto ${transecto.codigo}?`;
    if (!window.confirm(mensaje)) return;
    try {
      await eliminarParcela(transecto.id);
      anunciar(`Transecto ${transecto.codigo} eliminado.`);
    } catch (error) {
      anunciar(`No se ha podido eliminar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <section aria-labelledby="titulo-transectos">
      <h2 id="titulo-transectos" className="solo-lectores">
        Transectos
      </h2>

      {transectos.length > 0 && (
        <ul className="lista lista-panel">
          {transectos.map((t) => {
            if (editando === t.id) {
              return (
                <li key={t.id} style={{ padding: '1rem 0' }}>
                  <FormularioTransecto
                    inicial={t}
                    investigacionId={investigacion.id}
                    transectos={transectos}
                    tieneManchas={tieneManchas(t, observaciones)}
                    alTerminar={() => setEditando(null)}
                  />
                </li>
              );
            }
            const r = resumirTransecto(t, observaciones);
            return (
              <li key={t.id} className="fila-registro">
                <div className="principal">
                  <strong>Transecto {t.codigo}</strong>
                  <span className="texto-suave texto-pequeno">
                    {formatearNumero(t.longitudCm, t.longitudCm % 1 ? 1 : 0)} cm · {t.orientacion} ·{' '}
                    {MODOS_ANOTACION[t.modoAnotacion]?.nombre}
                  </span>
                  <span className="texto-pequeno">
                    {r.S === 0
                      ? 'Sin manchas anotadas'
                      : `${plural(r.S, 'especie', 'especies')} · cobertura ${formatearPorcentaje(r.coberturaTotal)}`}
                    {r.faltanCm > 0 && ` · faltan ${formatearNumero(r.faltanCm, r.faltanCm % 1 ? 1 : 0)} cm`}
                  </span>
                  {t.descripcion && (
                    <p className="texto-pequeno" style={{ margin: '0.25rem 0 0' }}>
                      {t.descripcion}
                    </p>
                  )}
                  {r.taxones.some((x) => x.cm > 0) && (
                    <ul className="especies-transecto">
                      {r.taxones
                        .filter((x) => x.cm > 0)
                        .map((x) => (
                          <li key={x.clave}>
                            <span>{catalogo.buscarEspecie(x.especieId)?.nombreComun ?? x.nombreComun}</span>
                            <span className="texto-suave">
                              {formatearNumero(x.cm, x.cm % 1 ? 1 : 0)} cm · {formatearPorcentaje(x.proporcion)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
                <div className="herramientas no-imprimir">
                  <Link className="boton" to={`/investigaciones/${investigacion.id}/transectos/${t.id}`}>
                    {r.taxones.length ? 'Anotar especies' : 'Añadir especies'}
                  </Link>
                  <button type="button" className="boton boton--sencillo" onClick={() => setEditando(t.id)}>
                    <IconoEditar />
                    Editar
                  </button>
                  <button type="button" className="boton boton--sencillo" onClick={() => eliminar(t)}>
                    <IconoPapelera />
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editando === 'nuevo' ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <h3>Nuevo transecto</h3>
          <FormularioTransecto
            investigacionId={investigacion.id}
            transectos={transectos}
            alTerminar={() => setEditando(null)}
            sePuedeCancelar={transectos.length > 0}
          />
        </div>
      ) : (
        <div className="acciones no-imprimir">
          <button type="button" className="boton boton--secundario" onClick={() => setEditando('nuevo')}>
            <IconoMas />
            Añadir transecto
          </button>
        </div>
      )}
    </section>
  );
}

function tieneManchas(transecto, observaciones) {
  if ((transecto.sueloDesnudo ?? []).length > 0) return true;
  return observaciones.some(
    (o) => o.parcelaId === transecto.id && ((o.longitudes ?? []).length > 0 || (o.tramos ?? []).length > 0),
  );
}

function siguienteCodigo(transectos) {
  const usados = new Set(transectos.map((t) => t.codigo.toLocaleLowerCase('es')));
  let n = transectos.length + 1;
  while (usados.has(`t${n}`)) n += 1;
  return `T${n}`;
}

function FormularioTransecto({ inicial, investigacionId, transectos, tieneManchas = false, alTerminar, sePuedeCancelar = true }) {
  const anunciar = useAnunciar();
  // Un transecto nuevo propone la orientación que aún no se ha usado (E-O y N-S son las habituales).
  const orientacionLibre = ORIENTACIONES.find((o) => !transectos.some((t) => t.orientacion === o)) ?? ORIENTACIONES[0];
  const [campos, setCampos] = useState(() => ({
    codigo: inicial?.codigo ?? siguienteCodigo(transectos),
    longitudCm: inicial ? String(inicial.longitudCm).replace('.', ',') : String(transectos[0]?.longitudCm ?? 400),
    orientacion: inicial?.orientacion ?? orientacionLibre,
    modoAnotacion: inicial?.modoAnotacion ?? transectos[0]?.modoAnotacion ?? 'longitudes',
    descripcion: inicial?.descripcion ?? '',
    ubicacion: { propia: Boolean(inicial?.coordenadas), ...camposDe(inicial?.coordenadas) },
  }));
  const [errores, setErrores] = useState({});
  const prefijo = `transecto-${inicial?.id ?? 'nuevo'}-`;

  async function enviar(evento) {
    evento.preventDefault();
    const codigo = campos.codigo.trim();
    const longitud = validarLongitudTransecto(campos.longitudCm);
    const nuevos = {};
    if (!codigo) nuevos.codigo = 'Escribe un código para el transecto.';
    else if (
      transectos.some((t) => t.id !== inicial?.id && t.codigo.toLocaleLowerCase('es') === codigo.toLocaleLowerCase('es'))
    ) {
      nuevos.codigo = `Ya hay un transecto con el código ${codigo}.`;
    }
    if (!longitud.valida) nuevos.longitudCm = longitud.mensaje;
    const ubicacion = campos.ubicacion.propia ? leerCoordenadas(campos.ubicacion) : { coordenadas: null, errores: {} };
    if (ubicacion.errores.lat) nuevos.lat = ubicacion.errores.lat;
    if (ubicacion.errores.lon) nuevos.lon = ubicacion.errores.lon;
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      document.getElementById(`campo-${prefijo}${Object.keys(nuevos)[0]}`)?.focus();
      return;
    }
    const base = inicial ? { ...inicial } : crearTransecto(investigacionId);
    try {
      await guardarParcela({
        ...base,
        codigo,
        longitudCm: longitud.valor,
        orientacion: campos.orientacion,
        modoAnotacion: tieneManchas ? base.modoAnotacion : campos.modoAnotacion,
        coordenadas: ubicacion.coordenadas,
        descripcion: campos.descripcion.trim(),
      });
      anunciar(inicial ? 'Transecto actualizado.' : `Transecto ${codigo} creado.`);
      alTerminar();
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <CamposTransecto
        prefijo={prefijo}
        campos={campos}
        errores={errores}
        modoBloqueado={tieneManchas}
        alCambiar={(campo, valor) => setCampos((c) => ({ ...c, [campo]: valor }))}
      />
      {inicial && (
        <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
          Aquí se cambian los datos de la línea. Las especies y sus manchas se anotan con «Anotar especies».
        </p>
      )}
      <Campo id={`${prefijo}descripcion`} etiqueta="Descripción (opcional)">
        <input
          id={`campo-${prefijo}descripcion`}
          value={campos.descripcion}
          onChange={(e) => setCampos((c) => ({ ...c, descripcion: e.target.value }))}
          maxLength={2000}
          placeholder="Por ejemplo: dentro del polígono de 4 × 4 m"
        />
      </Campo>
      <UbicacionUnidad
        prefijo={prefijo}
        nombre="del transecto"
        valor={campos.ubicacion}
        alCambiar={(ubicacion) => setCampos((c) => ({ ...c, ubicacion }))}
        errores={{ lat: errores.lat, lon: errores.lon }}
      />
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton">
          {inicial ? 'Guardar transecto' : 'Crear transecto'}
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
