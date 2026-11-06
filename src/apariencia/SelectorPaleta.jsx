import { PALETAS } from './paletas.js';

/** Selector de paleta: una miniatura por paleta, como botones de opción. */
export function SelectorPaleta({ nombre, leyenda, valor, alCambiar, ayuda }) {
  const opciones = Object.entries(PALETAS);
  return (
    <fieldset className="selector-paleta">
      <legend>{leyenda}</legend>
      <div className="selector-paleta__opciones">
        {opciones.map(([id, paleta]) => (
          <label key={id} className="selector-paleta__opcion">
            <input type="radio" name={nombre} checked={valor === id} onChange={() => alCambiar(id)} />
            <span className="selector-paleta__muestra">
              <img src={paleta.muestra} alt="" />
              <span className="selector-paleta__color" style={{ background: paleta.principal }} />
            </span>
            <span className="selector-paleta__nombre">{paleta.nombre}</span>
          </label>
        ))}
      </div>
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </fieldset>
  );
}
