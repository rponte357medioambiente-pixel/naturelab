import { useState } from 'react';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { crearEspeciePropia } from '../almacenamiento/modelo.js';
import { actualizarEspeciePropia, guardarEspeciePropia } from '../almacenamiento/repositorio.js';
import { grupoPorId, pendienteDeClasificar, subgrupoPorId, textoClasificacion, tipoPorId, TIPOS } from './tipos.js';

const TRAZOS = {
  planta: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 13c-4 0-7-3-7-7 4 0 7 3 7 7z" />
      <path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7z" />
    </>
  ),
  animal: (
    <>
      <path d="M4 15c2-5 6-7 10-6l4-3 1 4c1 1 1 3 0 4-2 3-6 4-10 3" />
      <circle cx="15.5" cy="10.5" r=".8" />
      <path d="M9 16l-1 4M13 17l1 3" />
    </>
  ),
  insecto: (
    <>
      <ellipse cx="12" cy="14" rx="3.2" ry="5" />
      <circle cx="12" cy="7" r="2" />
      <path d="M9 12l-4-2M15 12l4-2M9 15H4M15 15h5M9 18l-4 2M15 18l4 2M11 5l-2-3M13 5l2-3" />
    </>
  ),
  duda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" />
      <path d="M12 17v.01" />
    </>
  ),
};

export function IconoTipo({ tipo, tamano = 24 }) {
  return (
    <svg viewBox="0 0 24 24" width={tamano} height={tamano} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {TRAZOS[tipo] ?? TRAZOS.duda}
    </svg>
  );
}

/** Tarjetas para elegir el tipo general; con «No lo sé» si conDuda. */
export function SelectorTipo({ nombre, valor, alCambiar, conDuda = true, leyenda = '¿Qué es?' }) {
  const opciones = [...TIPOS.map((t) => ({ id: t.id, nombre: t.nombre, detalle: t.detalle })), ...(conDuda ? [{ id: null, nombre: 'No lo sé', detalle: 'Lo decidiré después' }] : [])];
  return (
    <fieldset className="selector-tipo">
      <legend>
        {leyenda} <span className="texto-suave texto-pequeno">(si lo sabes)</span>
      </legend>
      <div className="selector-tipo__opciones">
        {opciones.map((o) => (
          <label key={o.id ?? 'duda'} className="opcion-tipo">
            <input type="radio" name={nombre} checked={valor === o.id} onChange={() => alCambiar(o.id)} />
            <IconoTipo tipo={o.id ?? 'duda'} tamano={30} />
            <strong>{o.nombre}</strong>
            <span className="texto-suave texto-pequeno">{o.detalle}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Tipo, grupo y, en las aves, subgrupo. */
export function SelectorClasificacion({ prefijo, valor, alCambiar }) {
  const tipo = tipoPorId(valor.tipo);
  const grupo = grupoPorId(valor.tipo, valor.grupo);
  return (
    <div className="selector-clasificacion">
      <SelectorTipo
        nombre={`${prefijo}tipo`}
        valor={valor.tipo ?? null}
        alCambiar={(t) => alCambiar({ tipo: t, grupo: null, subgrupo: null })}
      />
      {tipo && (
        <div className="campo">
          <label htmlFor={`${prefijo}grupo`}>Grupo</label>
          <select
            id={`${prefijo}grupo`}
            value={valor.grupo ?? ''}
            onChange={(e) => alCambiar({ ...valor, grupo: e.target.value || null, subgrupo: null })}
          >
            <option value="">Sin decidir todavía</option>
            {tipo.grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      {grupo?.subgrupos && (
        <fieldset className="selector-subgrupo">
          <legend>Tipo de {grupo.nombre.toLocaleLowerCase('es').replace(/s$/, '')}</legend>
          {grupo.subgrupos.map((s) => (
            <label key={s.id} className="casilla">
              <input
                type="radio"
                name={`${prefijo}subgrupo`}
                checked={valor.subgrupo === s.id}
                onChange={() => alCambiar({ ...valor, subgrupo: s.id })}
              />
              <span>
                {s.nombre}
                <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
                  {s.ejemplos}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}

/** Etiquetas de la ficha: tipo, grupo y lo que falte. */
export function EtiquetasClasificacion({ especie }) {
  const tipo = tipoPorId(especie.tipo);
  const grupo = grupoPorId(especie.tipo, especie.grupo);
  const subgrupo = subgrupoPorId(especie.tipo, especie.grupo, especie.subgrupo);
  return (
    <ul className="etiquetas-habitat" aria-label="Clasificación">
      <li className="etiqueta-habitat">
        <IconoTipo tipo={especie.tipo ?? 'duda'} tamano={16} />
        {tipo ? tipo.nombre : 'Sin clasificar'}
      </li>
      {grupo && <li className="etiqueta-habitat">{subgrupo ? `${grupo.nombre} · ${subgrupo.nombre}` : grupo.nombre}</li>}
      {tipo && !grupo && <li className="etiqueta-habitat etiqueta-habitat--pendiente">Grupo sin decidir</li>}
      {especie.propia && especie.estadoValidacion !== 'validada' && (
        <li className="etiqueta-habitat etiqueta-habitat--pendiente">Identificación pendiente</li>
      )}
    </ul>
  );
}

/** Panel de la ficha para completar la clasificación de una especie de «Mi catálogo». */
export function PanelClasificacion({ especie }) {
  const anunciar = useAnunciar();
  const [abierto, setAbierto] = useState(pendienteDeClasificar(especie));
  const [valor, setValor] = useState({ tipo: especie.tipo ?? null, grupo: especie.grupo ?? null, subgrupo: especie.subgrupo ?? null });
  const [nombre, setNombre] = useState(especie.nombreComun);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await actualizarEspeciePropia(especie.id, { ...valor, nombreComun: nombre.trim() });
      anunciar('Clasificación guardada. Las observaciones de esta especie se actualizan solas.');
      setAbierto(false);
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <p className="texto-pequeno" style={{ margin: '0 0 1rem' }}>
        <span className="texto-suave">{textoClasificacion(especie)}. </span>
        <button type="button" className="boton-enlace enlace" onClick={() => setAbierto(true)}>
          Cambiar la clasificación
        </button>
      </p>
    );
  }
  return (
    <section className="panel formulario panel-clasificacion" aria-labelledby="titulo-clasificacion">
      <h2 id="titulo-clasificacion">Completar la clasificación</h2>
      <SelectorClasificacion prefijo="ficha-" valor={valor} alCambiar={setValor} />
      <div className="campo">
        <label htmlFor="ficha-nombre">Nombre (cuando lo sepas)</label>
        <input id="ficha-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={200} autoComplete="off" />
      </div>
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="button" className="boton" onClick={guardar} disabled={guardando || !nombre.trim()}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {!pendienteDeClasificar(especie) && (
          <button type="button" className="boton boton--sencillo" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * Especie nueva creada en el campo: basta un nombre provisional y, si se sabe,
 * el tipo. Se guarda en «Mi catálogo», pendiente de identificar.
 * No es un <form> porque se usa dentro de otros formularios.
 */
export function EspecieNueva({ nombreInicial = '', alCrear, alCancelar }) {
  const anunciar = useAnunciar();
  const [nombre, setNombre] = useState(nombreInicial);
  const [tipo, setTipo] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    if (!nombre.trim()) {
      setError('Escribe un nombre provisional, por ejemplo «Pato de cabeza verde».');
      document.getElementById('especie-nueva-nombre')?.focus();
      return;
    }
    setGuardando(true);
    try {
      const especie = await guardarEspeciePropia(crearEspeciePropia({ nombreComun: nombre.trim(), tipo }), { foto: null });
      anunciar(`«${especie.nombreComun}» añadida a Mi catálogo, pendiente de identificar.`);
      alCrear(especie);
    } catch (e) {
      anunciar(`No se ha podido crear: ${e.message}`, { tipo: 'error' });
      setGuardando(false);
    }
  }

  return (
    <section className="panel formulario especie-nueva" aria-labelledby="titulo-especie-nueva">
      <h3 id="titulo-especie-nueva">Especie nueva</h3>
      <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
        No hace falta saber qué es: pon un nombre provisional y la investigas después desde su ficha.
      </p>
      <div className="campo">
        <label htmlFor="especie-nueva-nombre">Nombre provisional</label>
        <input
          id="especie-nueva-nombre"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              crear();
            }
          }}
          maxLength={200}
          autoComplete="off"
          aria-invalid={Boolean(error)}
        />
        {error && <p className="error-campo">{error}</p>}
      </div>
      <SelectorTipo nombre="especie-nueva-tipo" valor={tipo} alCambiar={setTipo} />
      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="button" className="boton" onClick={crear} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar y usar'}
        </button>
        <button type="button" className="boton boton--sencillo" onClick={alCancelar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
