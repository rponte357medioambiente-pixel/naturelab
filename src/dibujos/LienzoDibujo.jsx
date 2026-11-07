import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { deshacer, estadoInicial, lineas, numeroSiguiente, tocar } from './unirPuntos.js';

/**
 * Lienzo de dibujo. Con plantilla, primero se unen los puntos tocándolos en
 * orden; al cerrar la figura (o sin plantilla, desde el principio) se dibuja
 * libremente con dedo, ratón o lápiz digital.
 *
 * Todo se dibuja en un espacio lógico de LADO x LADO, independiente del tamaño
 * de la pantalla. Con lápiz digital, el grosor sigue la presión y se ignoran
 * los toques de la mano apoyada.
 */
const LADO = 1000;
// Las plantillas están en un área de 300 x 300 con números alrededor: -25..325 se lleva a 0..LADO.
const aLienzo = ([x, y]) => [((x + 25) / 350) * LADO, ((y + 25) / 350) * LADO];
const RADIO_TOQUE = 55; // margen generoso para dedos pequeños

export const COLORES = [
  { nombre: 'Morado', valor: '#8f6cc2' },
  { nombre: 'Rosa', valor: '#e07aa0' },
  { nombre: 'Amarillo', valor: '#f2c94c' },
  { nombre: 'Verde claro', valor: '#7fb069' },
  { nombre: 'Verde oscuro', valor: '#3f6f3a' },
  { nombre: 'Marrón', valor: '#8a5a3c' },
  { nombre: 'Azul', valor: '#3d7cb8' },
  { nombre: 'Negro', valor: '#2b2b2b' },
];

function colorDeTema(variable, respaldo) {
  if (typeof window === 'undefined') return respaldo;
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || respaldo;
}

function dibujarTrazo(ctx, trazo) {
  const p = trazo.puntos;
  ctx.strokeStyle = trazo.goma ? '#ffffff' : trazo.color;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (p.length === 1) {
    ctx.beginPath();
    ctx.arc(p[0][0], p[0][1], p[0][2] / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (let i = 1; i < p.length; i += 1) {
    ctx.beginPath();
    ctx.lineWidth = (p[i - 1][2] + p[i][2]) / 2;
    ctx.moveTo(p[i - 1][0], p[i - 1][1]);
    ctx.lineTo(p[i][0], p[i][1]);
    ctx.stroke();
  }
}

/**
 * @param {{puntos: number[][], etiquetas: number[][]} | null} props.plantilla  nivel elegido, en coordenadas de 300
 * @param {(estado: {puedeGuardar: boolean, completo: boolean}) => void} props.alCambiar
 */
export const LienzoDibujo = forwardRef(function LienzoDibujo({ plantilla, alCambiar }, ref) {
  const lienzo = useRef(null);
  const puntos = useMemo(() => (plantilla ? plantilla.puntos.map(aLienzo) : []), [plantilla]);
  const etiquetas = useMemo(() => (plantilla ? plantilla.etiquetas.map(aLienzo) : []), [plantilla]);
  const conPuntos = puntos.length > 0;

  const [estado, setEstado] = useState(estadoInicial);
  const [trazos, setTrazos] = useState([]);
  const [herramienta, setHerramienta] = useState('lapiz');
  const [color, setColor] = useState(COLORES[0].valor);
  const [grosor, setGrosor] = useState(10);
  const [conLapiz, setConLapiz] = useState(false);
  const [aviso, setAviso] = useState(0); // marca de tiempo hasta la que parpadea el punto que toca
  const trazoActual = useRef(null);
  const lapizDetectado = useRef(false);
  const libre = !conPuntos || estado.completo;

  const pintar = useCallback(
    (ctx, { guia = true, ahora = 0 } = {}) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, LADO, LADO);
      const contorno = colorDeTema('--albardin-oscuro', '#5e2018');
      const principal = colorDeTema('--albardin', '#843024');
      if (conPuntos) {
        ctx.strokeStyle = contorno;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        for (const [a, b] of lineas(estado, puntos.length)) {
          ctx.beginPath();
          ctx.moveTo(puntos[a][0], puntos[a][1]);
          ctx.lineTo(puntos[b][0], puntos[b][1]);
          ctx.stroke();
        }
      }
      for (const t of trazos) dibujarTrazo(ctx, t);
      if (trazoActual.current) dibujarTrazo(ctx, trazoActual.current);
      if (guia && conPuntos && !estado.completo) {
        ctx.font = '600 30px "Atkinson Hyperlegible Next", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        puntos.forEach(([x, y], i) => {
          const hecho = i < estado.siguiente;
          const toca = i === estado.siguiente;
          if (toca) {
            const pulso = ahora < aviso ? 1 + 0.6 * Math.abs(Math.sin((ahora / 1000) * Math.PI * 3)) : 1;
            ctx.beginPath();
            ctx.arc(x, y, 30 * pulso, 0, Math.PI * 2);
            ctx.strokeStyle = principal;
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
          ctx.beginPath();
          ctx.arc(x, y, toca ? 15 : 12, 0, Math.PI * 2);
          ctx.fillStyle = hecho || toca ? principal : '#ffffff';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = principal;
          ctx.stroke();
          ctx.fillStyle = hecho || toca ? contorno : '#6b4a40';
          ctx.fillText(String(i + 1), etiquetas[i][0], etiquetas[i][1]);
        });
      }
    },
    [conPuntos, estado, puntos, etiquetas, trazos, aviso],
  );

  // Ajustar la resolución del lienzo a su tamaño en pantalla y redibujar.
  const redibujar = useCallback(
    (ahora = performance.now()) => {
      const c = lienzo.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      ctx.setTransform(c.width / LADO, 0, 0, c.height / LADO, 0, 0);
      pintar(ctx, { ahora });
    },
    [pintar],
  );

  useEffect(() => {
    const c = lienzo.current;
    if (!c) return undefined;
    const ajustar = () => {
      const lado = Math.round(c.getBoundingClientRect().width * (window.devicePixelRatio || 1));
      if (lado > 0 && c.width !== lado) {
        c.width = lado;
        c.height = lado;
      }
      redibujar();
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(c);
    return () => observador.disconnect();
  }, [redibujar]);

  // Parpadeo del punto que toca tras un toque equivocado.
  useEffect(() => {
    if (!aviso) return undefined;
    let marco;
    const animar = (t) => {
      redibujar(t);
      if (performance.now() < aviso) marco = requestAnimationFrame(animar);
      else redibujar();
    };
    marco = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(marco);
  }, [aviso, redibujar]);

  const puedeGuardar = conPuntos ? estado.completo : trazos.length > 0;
  useEffect(() => {
    alCambiar?.({ puedeGuardar, completo: estado.completo, conContenido: trazos.length > 0 || estado.siguiente > 0 });
  }, [puedeGuardar, estado, trazos, alCambiar]);

  useImperativeHandle(
    ref,
    () => ({
      /** Imagen final, sin números ni puntos, en PNG. */
      exportar() {
        const c = document.createElement('canvas');
        c.width = LADO;
        c.height = LADO;
        pintar(c.getContext('2d'), { guia: false });
        return new Promise((resolve, reject) =>
          c.toBlob((blob) => (blob ? resolve({ blob, ancho: LADO, alto: LADO }) : reject(new Error('No se ha podido crear la imagen.'))), 'image/png'),
        );
      },
    }),
    [pintar],
  );

  function posicion(e) {
    const r = lienzo.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * LADO, ((e.clientY - r.top) / r.height) * LADO];
  }

  function ancho(e) {
    if (e.pointerType === 'pen' && e.pressure > 0) return grosor * (0.35 + e.pressure * 1.3);
    return grosor;
  }

  function alPulsar(e) {
    if (e.pointerType === 'pen' && !lapizDetectado.current) {
      lapizDetectado.current = true;
      setConLapiz(true);
    }
    // Con lápiz digital, la mano apoyada en la pantalla no pinta.
    if (lapizDetectado.current && e.pointerType === 'touch') return;
    e.preventDefault();
    const [x, y] = posicion(e);
    if (!libre) {
      const r = tocar(estado, puntos, x, y, RADIO_TOQUE);
      if (r.resultado === 'acierto') setEstado(r.estado);
      else if (r.resultado === 'fallo') setAviso(performance.now() + 1200);
      return;
    }
    lienzo.current.setPointerCapture?.(e.pointerId);
    trazoActual.current = { goma: herramienta === 'goma', color, puntos: [[x, y, ancho(e)]] };
    redibujar();
  }

  function alMover(e) {
    if (!trazoActual.current) return;
    if (lapizDetectado.current && e.pointerType === 'touch') return;
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of eventos.length ? eventos : [e.nativeEvent]) {
      const [x, y] = posicion(ev);
      trazoActual.current.puntos.push([x, y, ancho(ev)]);
    }
    // Solo se pinta el tramo nuevo: más fluido en móviles.
    const c = lienzo.current;
    const ctx = c.getContext('2d');
    ctx.setTransform(c.width / LADO, 0, 0, c.height / LADO, 0, 0);
    const p = trazoActual.current.puntos;
    dibujarTrazo(ctx, { ...trazoActual.current, puntos: p.slice(-eventos.length - 1) });
  }

  function alSoltar() {
    if (!trazoActual.current) return;
    const trazo = trazoActual.current;
    trazoActual.current = null;
    setTrazos((t) => [...t, trazo]);
  }

  function deshacerUltimo() {
    if (trazos.length) setTrazos((t) => t.slice(0, -1));
    else if (conPuntos) setEstado((s) => deshacer(s));
  }

  function borrarTodo() {
    if (window.confirm('¿Borrar todo lo que has coloreado o dibujado?')) setTrazos([]);
  }

  const siguiente = numeroSiguiente(estado);
  const descripcion = !conPuntos
    ? 'Hoja de dibujo libre.'
    : estado.completo
      ? 'Figura completa. Puedes colorearla.'
      : `Une los puntos. Toca el ${siguiente}. Llevas ${estado.siguiente} de ${puntos.length}.`;

  return (
    <div className="lienzo-dibujo">
      {conPuntos && !estado.completo && (
        <p className="panel lienzo-dibujo__estado" role="status">
          <strong>Toca el {siguiente}</strong>
          <span className="texto-suave">
            {estado.siguiente} de {puntos.length}
          </span>
        </p>
      )}
      {libre && conLapiz && (
        <p className="texto-pequeno texto-suave" role="status" style={{ margin: 0 }}>
          Lápiz digital: el trazo sigue la presión y la mano apoyada no pinta.
        </p>
      )}
      <canvas
        ref={lienzo}
        className="lienzo-dibujo__hoja"
        role="img"
        aria-label={descripcion}
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onPointerLeave={(e) => e.buttons === 0 && alSoltar()}
      />

      {!libre ? (
        <>
          <p className="texto-pequeno texto-suave" style={{ margin: 0 }}>
            Si tocas otro número no pasa nada: el que toca parpadea.
          </p>
          <div className="acciones" style={{ marginTop: 0 }}>
            <button type="button" className="boton boton--secundario" onClick={deshacerUltimo} disabled={estado.siguiente === 0}>
              Deshacer
            </button>
            <button
              type="button"
              className="boton boton--sencillo"
              onClick={() => setEstado(estadoInicial())}
              disabled={estado.siguiente === 0}
            >
              Empezar de nuevo
            </button>
          </div>
        </>
      ) : (
        <div className="panel lienzo-dibujo__herramientas">
          <div className="lienzo-dibujo__colores" role="radiogroup" aria-label="Color">
            {COLORES.map((c) => (
              <button
                key={c.valor}
                type="button"
                role="radio"
                aria-checked={color === c.valor && herramienta === 'lapiz'}
                aria-label={c.nombre}
                className="lienzo-dibujo__color"
                style={{ background: c.valor }}
                onClick={() => {
                  setColor(c.valor);
                  setHerramienta('lapiz');
                }}
              />
            ))}
          </div>
          <div className="lienzo-dibujo__grosor">
            <label htmlFor="grosor-dibujo">Grosor</label>
            <input
              id="grosor-dibujo"
              type="range"
              min="3"
              max="40"
              value={grosor}
              onChange={(e) => setGrosor(Number(e.target.value))}
            />
          </div>
          <div className="lienzo-dibujo__botones">
            <button type="button" className={`boton ${herramienta === 'lapiz' ? '' : 'boton--secundario'}`} aria-pressed={herramienta === 'lapiz'} onClick={() => setHerramienta('lapiz')}>
              Lápiz
            </button>
            <button type="button" className={`boton ${herramienta === 'goma' ? '' : 'boton--secundario'}`} aria-pressed={herramienta === 'goma'} onClick={() => setHerramienta('goma')}>
              Goma
            </button>
            <button type="button" className="boton boton--secundario" onClick={deshacerUltimo} disabled={trazos.length === 0}>
              Deshacer
            </button>
            <button type="button" className="boton boton--secundario" onClick={borrarTodo} disabled={trazos.length === 0}>
              Borrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
