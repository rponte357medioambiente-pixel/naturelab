import { HABITATS, habitatsDe } from './habitats.js';

/** Iconos sencillos, con el estilo de los demás iconos de la app. */
const TRAZOS = {
  'dunas-costa': (
    <>
      <path d="M3 18c2.5-2 5-2 7.5 0s5 2 7.5 0 3-1.5 3-1.5" />
      <path d="M3 13c3-4 7-6 11-5" />
      <circle cx="18" cy="6" r="2" />
    </>
  ),
  desierto: (
    <>
      <path d="M12 21V5a2 2 0 0 1 4 0v8" />
      <path d="M12 21V8a2 2 0 0 0-4 0v3" />
      <path d="M16 11h1.5a1.5 1.5 0 0 0 1.5-1.5V8M8 13H6.5A1.5 1.5 0 0 1 5 11.5V10" />
      <path d="M4 21h16" />
    </>
  ),
  'alta-montana': (
    <>
      <path d="M3 20l6-11 4 6 2-3 6 8z" />
      <path d="M7.4 12l1.6-3 1.6 2.4" />
    </>
  ),
  bosque: (
    <>
      <path d="M12 3l5 7h-3l4 6H6l4-6H7z" />
      <path d="M12 16v5" />
    </>
  ),
  ribera: (
    <>
      <path d="M3 17c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
      <path d="M3 21c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
      <path d="M8 14V5M8 8c1.5-1 2.5-1 3.5 0M13 14V7" />
    </>
  ),
  pradera: (
    <>
      <path d="M4 21c1-4 2-6 4-8M8 21c0-3 .5-5 2-7M14 21c0-4 1-7 3-9M20 21c-1-3-2-5-3.5-6" />
      <circle cx="9" cy="6" r="2" />
      <path d="M9 8v5" />
    </>
  ),
};

export function IconoHabitat({ id, tamano = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {TRAZOS[id]}
    </svg>
  );
}

/** Etiquetas con los hábitats de una especie. */
export function EtiquetasHabitat({ especie }) {
  const lista = habitatsDe(especie);
  if (lista.length === 0) return null;
  return (
    <ul className="etiquetas-habitat" aria-label="Hábitat natural">
      {lista.map((h) => (
        <li key={h.id} className="etiqueta-habitat">
          <IconoHabitat id={h.id} tamano={16} />
          {h.nombre}
        </li>
      ))}
    </ul>
  );
}

/** Selector de hábitats para el formulario de una especie (se pueden marcar varios). */
export function SelectorHabitats({ valor, alCambiar }) {
  const alternar = (id) => alCambiar(valor.includes(id) ? valor.filter((x) => x !== id) : [...valor, id]);
  return (
    <fieldset className="selector-habitats">
      <legend>Hábitat natural</legend>
      <p className="ayuda" style={{ margin: '0 0 0.5rem' }}>
        Dónde vive la planta. Puedes marcar más de uno.
      </p>
      <div className="selector-habitats__opciones">
        {HABITATS.map((h) => (
          <label key={h.id} className="opcion-habitat">
            <input type="checkbox" checked={valor.includes(h.id)} onChange={() => alternar(h.id)} />
            <span className="opcion-habitat__icono">
              <IconoHabitat id={h.id} tamano={26} />
            </span>
            <span className="opcion-habitat__texto">
              <strong>
                {h.nombre}
                {h.tecnico && <span className="texto-suave"> · {h.tecnico}</span>}
              </strong>
              <span className="texto-suave texto-pequeno">
                {h.descripcion}
                {h.ejemplos && ` Por ejemplo: ${h.ejemplos.toLocaleLowerCase('es')}.`}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
