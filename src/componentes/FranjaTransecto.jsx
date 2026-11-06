import { unirTramos } from '../calculos/cobertura.js';
import { formatearNumero } from '../calculos/formato.js';
import { colorTaxon } from './FranjaAbundancia.jsx';

const pct = (cm, L) => `${(cm / L) * 100}%`;

/** Tramos de la línea que no cubre ninguna especie. */
function huecos(L, tramos) {
  const resultado = [];
  let inicio = 0;
  for (const t of unirTramos(tramos)) {
    if (t.desde > inicio) resultado.push({ desde: inicio, hasta: t.desde });
    inicio = Math.max(inicio, t.hasta);
  }
  if (inicio < L) resultado.push({ desde: inicio, hasta: L });
  return resultado;
}

function Carril({ nombre, tramos, L, color, clase = '' }) {
  return (
    <div className="carril-fila">
      <span className="carril-nombre">{nombre}</span>
      <span className={`carril ${clase}`}>
        {tramos.map((t, i) => (
          <span
            key={i}
            style={{ left: pct(t.desde, L), width: `max(2px, ${pct(t.hasta - t.desde, L)})`, background: color }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * Dibujo del transecto anotado por inicio y fin: un carril por especie, para que
 * se vean los solapes, y uno para el suelo desnudo.
 * @param {{L: number, taxones: {clave, nombreComun, tramos}[]}} props
 */
export function FranjaTransecto({ L, taxones }) {
  if (!(L > 0)) return null;
  const conTramos = taxones.filter((t) => t.tramos.length > 0);
  const suelo = huecos(L, conTramos.flatMap((t) => t.tramos));
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => formatearNumero(L * f, (L * f) % 1 ? 1 : 0));
  const descripcion = `Franja del transecto de 0 a ${formatearNumero(L)} cm: ${conTramos
    .map((t) => `${t.nombreComun}, ${t.tramos.map((x) => `de ${formatearNumero(x.desde)} a ${formatearNumero(x.hasta)}`).join(', ')}`)
    .join('; ')}.`;

  return (
    <figure className="franja-transecto">
      <div role="img" aria-label={descripcion}>
        {conTramos.map((t, i) => (
          <Carril key={t.clave} nombre={t.nombreComun} tramos={t.tramos} L={L} color={colorTaxon(i)} />
        ))}
        <Carril nombre="Suelo desnudo" tramos={suelo} L={L} color="var(--arena-oscura)" clase="carril--suelo" />
      </div>
      <div className="carril-fila" aria-hidden="true">
        <span />
        <span className="escala">
          {marcas.map((m, i) => (
            <span key={i}>{i === marcas.length - 1 ? `${m} cm` : m}</span>
          ))}
        </span>
      </div>
    </figure>
  );
}
