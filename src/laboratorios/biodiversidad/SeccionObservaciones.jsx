import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { ESTADOS_IDENTIFICACION } from '../../almacenamiento/modelo.js';
import { eliminarObservacion } from '../../almacenamiento/repositorio.js';
import { formatearNumero, plural } from '../../calculos/formato.js';
import { nombresDeObservacion, tieneImagen } from '../../catalogos/catalogo.js';
import { IconoEditar, IconoPapelera } from '../../componentes/Iconos.jsx';
import { MiniaturaEspecie } from '../../componentes/ImagenEspecie.jsx';
import { MiniaturaFoto, VisorFoto } from '../../fotos/FotoObservacion.jsx';

export function SeccionObservaciones() {
  const { investigacion, parcelas, observaciones, catalogo } = useOutletContext();
  const anunciar = useAnunciar();
  const [filtro, setFiltro] = useState('todas');
  const [fotoAbierta, setFotoAbierta] = useState(null);

  if (parcelas.length === 0) {
    return (
      <div className="aviso aviso--ocre">
        <p>
          Para registrar observaciones, primero crea una parcela.{' '}
          <Link to={`/investigaciones/${investigacion.id}/parcelas`}>Ir a Parcelas</Link>
        </p>
      </div>
    );
  }

  const pendientes = observaciones.filter((o) => o.estadoIdentificacion !== 'confirmada').length;
  const parcelasMostradas = filtro === 'todas' ? parcelas : parcelas.filter((p) => p.id === filtro);

  async function eliminar(observacion, nombre) {
    if (!window.confirm(`¿Eliminar la observación de ${nombre} (${observacion.abundancia} individuos)?`)) return;
    try {
      await eliminarObservacion(observacion.id);
      anunciar('Observación eliminada.');
    } catch (error) {
      anunciar(`No se ha podido eliminar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <section aria-labelledby="titulo-observaciones">
      <h2 id="titulo-observaciones" className="solo-lectores">
        Observaciones
      </h2>

      {observaciones.length === 0 && (
        <div className="vacio">
          <p>
            Aún no hay observaciones. Pulsa «Registrar observación», elige la especie en el catálogo e indica cuántos
            individuos has contado.
          </p>
        </div>
      )}

      {pendientes > 0 && (
        <div className="aviso aviso--ocre">
          <p>
            {plural(pendientes, 'observación tiene', 'observaciones tienen')} la identificación pendiente de revisar.
            Cuenta en los resultados, pero conviene confirmarla.
          </p>
        </div>
      )}

      {parcelas.length > 1 && observaciones.length > 0 && (
        <div className="campo" style={{ marginBottom: '1rem' }}>
          <label htmlFor="filtro-parcela">Mostrar</label>
          <select id="filtro-parcela" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todas">Todas las parcelas</option>
            {parcelas.map((p) => (
              <option key={p.id} value={p.id}>
                Parcela {p.codigo}
              </option>
            ))}
          </select>
        </div>
      )}

      {observaciones.length > 0 &&
        parcelasMostradas.map((parcela) => {
          const obs = observaciones
            .filter((o) => o.parcelaId === parcela.id)
            .sort(
              (a, b) =>
                String(b.fecha).localeCompare(String(a.fecha)) ||
                String(a.nombreComun).localeCompare(String(b.nombreComun), 'es'),
            );
          if (obs.length === 0 && filtro === 'todas') return null;
          return (
            <div key={parcela.id} className="grupo-parcela">
              <h3>Parcela {parcela.codigo}</h3>
              {obs.length === 0 ? (
                <p className="texto-suave">Sin observaciones en esta parcela.</p>
              ) : (
                <ul className="lista lista-panel">
                  {obs.map((o) => {
                    const { nombreComun, nombreCientifico } = nombresDeObservacion(o, catalogo.buscarEspecie);
                    const especie = catalogo.buscarEspecie(o.especieId);
                    const conImagenCatalogo = tieneImagen(especie);
                    const conImagen = Boolean(o.fotoLocalId) || conImagenCatalogo;
                    return (
                      <li key={o.id} className={`fila-registro${conImagen ? ' fila-registro--imagen' : ''}`}>
                        {o.fotoLocalId ? (
                          <MiniaturaFoto id={o.fotoLocalId} descripcion={nombreComun} alAbrir={setFotoAbierta} />
                        ) : (
                          conImagenCatalogo && <MiniaturaEspecie especie={especie} />
                        )}
                        <div className="principal">
                          <strong>{nombreComun}</strong>
                          {nombreCientifico && <span className="cientifico texto-suave">{nombreCientifico}</span>}
                          {o.estadoIdentificacion !== 'confirmada' && (
                            <span>
                              <span className="estado estado--ocre">{ESTADOS_IDENTIFICACION[o.estadoIdentificacion]}</span>
                            </span>
                          )}
                          {o.notas && (
                            <p className="texto-pequeno texto-suave" style={{ margin: '0.25rem 0 0' }}>
                              {o.notas}
                            </p>
                          )}
                        </div>
                        <div className="cantidad">
                          {formatearNumero(o.abundancia)}
                          <span className="solo-lectores"> individuos</span>
                        </div>
                        <div className="herramientas no-imprimir">
                          <Link
                            className="boton boton--sencillo"
                            to={`/investigaciones/${investigacion.id}/observaciones/${o.id}`}
                          >
                            <IconoEditar />
                            Editar
                          </Link>
                          <button
                            type="button"
                            className="boton boton--sencillo"
                            onClick={() => eliminar(o, nombreComun)}
                          >
                            <IconoPapelera />
                            Eliminar
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

      <VisorFoto foto={fotoAbierta} alCerrar={() => setFotoAbierta(null)} />
    </section>
  );
}
