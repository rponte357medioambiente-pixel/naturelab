import { plural } from '../calculos/formato.js';

/**
 * Elegir con qué especies trabajar: todo el catálogo o las de una o varias
 * investigaciones. Lo usan el juego «¿Qué especie es?» y las fichas para imprimir.
 * @param {(ids: Set<string>|null) => number} contar  cuántas especies sirven con esa elección
 */
export function SeleccionEspecies({ nombre, origen, ids, investigaciones, contar, alCambiar }) {
  const especiesDe = (datos) => new Set(datos.observaciones.map((o) => o.especieId).filter(Boolean));
  const conEspecies = investigaciones.filter((d) => especiesDe(d).size > 0);
  const alternar = (id) => alCambiar({ ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });

  return (
    <fieldset className="opciones-tarjeta">
      <legend>Con qué especies</legend>
      <label className="opcion-tarjeta">
        <input type="radio" name={`${nombre}-origen`} checked={origen === 'todo'} onChange={() => alCambiar({ origen: 'todo' })} />
        <span>
          <strong>Todo el catálogo</strong>
          <span className="texto-suave">{plural(contar(null), 'especie con imagen', 'especies con imagen')}</span>
        </span>
      </label>
      <label className="opcion-tarjeta">
        <input
          type="radio"
          name={`${nombre}-origen`}
          checked={origen === 'investigaciones'}
          onChange={() => alCambiar({ origen: 'investigaciones' })}
          disabled={conEspecies.length === 0}
        />
        <span>
          <strong>Las de mis investigaciones</strong>
          <span className="texto-suave">
            {conEspecies.length === 0 ? 'Todavía no hay investigaciones con especies.' : 'Elige una o varias.'}
          </span>
        </span>
      </label>
      {origen === 'investigaciones' && (
        <div className="juego-investigaciones">
          {conEspecies.map((d) => (
            <label key={d.investigacion.id} className="casilla">
              <input type="checkbox" checked={ids.includes(d.investigacion.id)} onChange={() => alternar(d.investigacion.id)} />
              <span>
                {d.investigacion.titulo}
                <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
                  {plural(contar(especiesDe(d)), 'especie con imagen', 'especies con imagen')}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

/** Especies de las investigaciones marcadas (null = todo el catálogo). */
export function idsSeleccionados(origen, ids, investigaciones) {
  if (origen === 'todo') return null;
  return new Set(
    investigaciones
      .filter((d) => ids.includes(d.investigacion.id))
      .flatMap((d) => d.observaciones.map((o) => o.especieId).filter(Boolean)),
  );
}

/** Nombre corto de la elección, para títulos y pies de página. */
export function textoSeleccion(origen, ids, investigaciones) {
  if (origen === 'todo') return 'Todo el catálogo';
  return investigaciones
    .filter((d) => ids.includes(d.investigacion.id))
    .map((d) => d.investigacion.titulo)
    .join(', ');
}
