import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { generarId } from '../almacenamiento/ids.js';
import { guardarLote, obtenerDatosInvestigacion } from '../almacenamiento/repositorio.js';
import { plural } from '../calculos/formato.js';
import { IconoSubir } from '../componentes/Iconos.jsx';
import { leerArchivoCopia } from './esquema.js';
import { planificarImportacion, prepararCopiaNueva, prepararFusion } from './importar.js';

/**
 * Importación de copias JSON (apartado 8.3): validar, mostrar vista previa y
 * elegir entre importar como nueva, fusionar o crear una copia independiente.
 */
export function PanelImportacion() {
  const entrada = useRef(null);
  const anunciar = useAnunciar();
  const navegar = useNavigate();
  const [estado, setEstado] = useState({ fase: 'inicio' });
  const [resolucion, setResolucion] = useState('mantenerLocal');
  const [ocupado, setOcupado] = useState(false);

  async function alElegirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    const resultado = await leerArchivoCopia(archivo);
    if (!resultado.ok) {
      setEstado({ fase: 'error', errores: resultado.errores, total: resultado.totalErrores, nombre: archivo.name });
      return;
    }
    const existente = await obtenerDatosInvestigacion(resultado.paquete.investigacion.id);
    const plan = planificarImportacion(resultado.paquete, existente);
    setResolucion('mantenerLocal');
    setEstado({ fase: 'revisar', paquete: resultado.paquete, avisos: resultado.avisos, existente, plan, nombre: archivo.name });
  }

  async function ejecutar(accion) {
    const { paquete, existente, plan } = estado;
    let lote;
    let mensaje;
    if (accion === 'copia') {
      lote = prepararCopiaNueva(paquete, generarId);
      mensaje = 'Copia importada como investigación independiente.';
    } else if (accion === 'fusionar') {
      if (
        resolucion === 'usarImportado' &&
        plan.totalConflictos > 0 &&
        !window.confirm(`Se sustituirán ${plan.totalConflictos} registros de este dispositivo por los del archivo. ¿Continuar?`)
      ) {
        return;
      }
      lote = prepararFusion(paquete, existente, plan, resolucion);
      mensaje = `Fusión completada: ${plural(lote.observaciones.length, 'observación añadida o actualizada', 'observaciones añadidas o actualizadas')}.`;
    } else {
      lote = paquete;
      mensaje = 'Investigación importada en este dispositivo.';
    }
    setOcupado(true);
    try {
      await guardarLote(lote);
      anunciar(mensaje);
      setEstado({ fase: 'inicio' });
      navegar(`/investigaciones/${lote.investigacion.id}`);
    } catch (error) {
      anunciar(`No se ha podido importar: ${error.message}`, { tipo: 'error', duracion: 6000 });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className={`importacion no-imprimir${estado.fase === 'inicio' ? '' : ' importacion--abierta'}`}>
      <input
        ref={entrada}
        type="file"
        accept=".zip,.json,application/zip,application/json"
        className="solo-lectores"
        tabIndex={-1}
        aria-hidden="true"
        onChange={alElegirArchivo}
      />
      {estado.fase === 'inicio' && (
        <button type="button" className="boton boton--secundario" onClick={() => entrada.current?.click()}>
          <IconoSubir />
          Importar copia
        </button>
      )}

      {estado.fase === 'error' && (
        <div className="aviso aviso--error" role="alert">
          <strong>No se puede importar «{estado.nombre}».</strong>
          <ul>
            {estado.errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {estado.total > estado.errores.length && (
            <p>Y {estado.total - estado.errores.length} problemas más.</p>
          )}
          <div className="acciones">
            <button type="button" className="boton boton--secundario" onClick={() => entrada.current?.click()}>
              Elegir otro archivo
            </button>
            <button type="button" className="boton boton--sencillo" onClick={() => setEstado({ fase: 'inicio' })}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {estado.fase === 'revisar' && (
        <section className="panel" aria-labelledby="titulo-importacion">
          <h2 id="titulo-importacion">Revisar la copia</h2>
          <p>
            <strong>{estado.paquete.investigacion.titulo}</strong>
            <br />
            {estado.paquete.investigacion.tipoPractica === 'transecto'
              ? `${plural(estado.paquete.parcelas.length, 'transecto', 'transectos')}, ${plural(estado.paquete.observaciones.length, 'especie anotada', 'especies anotadas')}`
              : `${plural(estado.paquete.parcelas.length, 'parcela', 'parcelas')}, ${plural(estado.paquete.observaciones.length, 'observación', 'observaciones')}`}
            {estado.paquete.fotos.length > 0 && `, ${plural(estado.paquete.fotos.length, 'foto', 'fotos')}`}.
          </p>
          {estado.avisos.map((a) => (
            <p key={a} className="aviso aviso--ocre">
              {a}
            </p>
          ))}

          {!estado.plan.existe ? (
            <>
              <p>Esta investigación no está en el dispositivo. Se añadirá tal como está en el archivo.</p>
              <div className="acciones">
                <button type="button" className="boton" disabled={ocupado} onClick={() => ejecutar('nueva')}>
                  Importar investigación
                </button>
                <button type="button" className="boton boton--sencillo" onClick={() => setEstado({ fase: 'inicio' })}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                Ya tienes esta investigación. Al fusionar se añaden los registros nuevos y se omiten los que ya
                tienes, sin duplicar recuentos.
              </p>
              <ul>
                <li>{plural(estado.plan.observaciones.nuevos.length, 'observación nueva', 'observaciones nuevas')}</li>
                <li>{plural(estado.plan.observaciones.iguales.length, 'observación que ya tienes', 'observaciones que ya tienes')}</li>
                <li>
                  {estado.paquete.investigacion.tipoPractica === 'transecto'
                    ? plural(estado.plan.parcelas.nuevos.length, 'transecto nuevo', 'transectos nuevos')
                    : plural(estado.plan.parcelas.nuevos.length, 'parcela nueva', 'parcelas nuevas')}
                </li>
                {estado.plan.totalConflictos > 0 && (
                  <li>
                    <strong>
                      {plural(estado.plan.totalConflictos, 'registro con cambios distintos', 'registros con cambios distintos')}
                    </strong>
                  </li>
                )}
              </ul>
              {estado.plan.totalConflictos > 0 && (
                <fieldset className="campo">
                  <legend>Para los registros con cambios distintos</legend>
                  <label className="casilla">
                    <input
                      type="radio"
                      name="resolucion"
                      value="mantenerLocal"
                      checked={resolucion === 'mantenerLocal'}
                      onChange={() => setResolucion('mantenerLocal')}
                    />
                    Conservar los de este dispositivo
                  </label>
                  <label className="casilla">
                    <input
                      type="radio"
                      name="resolucion"
                      value="usarImportado"
                      checked={resolucion === 'usarImportado'}
                      onChange={() => setResolucion('usarImportado')}
                    />
                    Usar los del archivo
                  </label>
                </fieldset>
              )}
              <div className="acciones">
                <button type="button" className="boton" disabled={ocupado} onClick={() => ejecutar('fusionar')}>
                  Fusionar
                </button>
                <button type="button" className="boton boton--secundario" disabled={ocupado} onClick={() => ejecutar('copia')}>
                  Importar como copia independiente
                </button>
                <button type="button" className="boton boton--sencillo" onClick={() => setEstado({ fase: 'inicio' })}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
