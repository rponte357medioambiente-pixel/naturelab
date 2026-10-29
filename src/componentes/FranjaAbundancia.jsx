import { formatearNumero, formatearPorcentaje } from '../calculos/formato.js';

/** Colores del saladar para los taxones, ordenados por abundancia. */
export const PALETA = [
  '#1f5a3d', // albardín
  '#8e2c48', // salicornia
  '#5e4e9a', // limonium
  '#a8741a', // ocre de rambla
  '#2f6f8f', // mar
  '#c0607f', // flor de taray
  '#6b8a35', // matorral
  '#7a4b2a', // tierra
  '#3d8a7a', // agua de salina
  '#4a5a8c',
  '#9a5a9a',
  '#5c6b3a',
];

export const colorTaxon = (indice) => PALETA[indice % PALETA.length];

/**
 * Franja de composición: cada taxón ocupa un ancho proporcional a sus individuos.
 * Una franja dominada por un color indica poca equitatividad; muchas franjas
 * parecidas, un reparto equilibrado.
 */
export function FranjaAbundancia({ taxones, N, mini = false, conLeyenda = false, animada = false }) {
  if (!N) {
    return mini ? (
      <div className="franja franja--mini" aria-hidden="true" />
    ) : (
      <div className="franja-vacia">Sin observaciones todavía</div>
    );
  }

  const maximo = taxones[0]?.abundancia || 1;
  const descripcion = `Composición: ${taxones
    .map((t) => `${t.nombreComun}, ${formatearPorcentaje(t.proporcion)}`)
    .join('; ')}`;
  const clases = ['franja', mini && 'franja--mini', animada && 'franja--animada'].filter(Boolean).join(' ');

  return (
    <>
      <div
        className={clases}
        role={conLeyenda || mini ? undefined : 'img'}
        aria-label={conLeyenda || mini ? undefined : descripcion}
        aria-hidden={conLeyenda || mini ? 'true' : undefined}
      >
        {taxones.map((t, i) => (
          <span
            key={t.clave}
            className={t.pendiente ? 'pendiente' : undefined}
            style={{
              '--color': colorTaxon(i),
              flex: `${t.abundancia} 1 0%`,
              animationDelay: animada ? `${i * 45}ms` : undefined,
            }}
          />
        ))}
      </div>

      {conLeyenda && (
        <ul className="leyenda">
          {taxones.map((t, i) => (
            <li key={t.clave}>
              <span className="muestra" style={{ '--color': colorTaxon(i) }} aria-hidden="true" />
              <span>
                <strong>{t.nombreComun}</strong>{' '}
                {t.nombreCientifico && <span className="cientifico texto-suave">{t.nombreCientifico}</span>}{' '}
                {t.pendiente && <span className="estado estado--ocre">Pendiente de revisar</span>}
              </span>
              <span className="valor">
                {formatearNumero(t.abundancia)}
                <small>{formatearPorcentaje(t.proporcion)}</small>
              </span>
              <span className="pista" aria-hidden="true">
                <span style={{ width: `${(t.abundancia / maximo) * 100}%`, '--color': colorTaxon(i) }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
