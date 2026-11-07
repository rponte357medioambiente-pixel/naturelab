/**
 * Lógica de «unir los puntos», sin interfaz. Los puntos van en orden; se toca
 * cada uno a su vez y, al tocar el último, la figura se cierra sola uniendo
 * con el primero.
 *
 * Estado: { siguiente: índice del punto que toca, completo: boolean }
 * Las líneas trazadas son siempre las de los puntos 0 → siguiente − 1 (y la de
 * cierre si está completo), así que el estado no necesita guardarlas.
 */

export const estadoInicial = () => ({ siguiente: 0, completo: false });

/**
 * Procesa un toque en (x, y).
 * @param {number} radio  distancia máxima al punto para darlo por tocado
 * @returns {{estado, resultado: 'acierto'|'fallo'|'nada'}}
 *   acierto: se tocó el punto que tocaba; fallo: se tocó otro punto; nada: ningún punto cerca.
 */
export function tocar(estado, puntos, x, y, radio) {
  if (estado.completo || puntos.length === 0) return { estado, resultado: 'nada' };
  const distancia = (i) => Math.hypot(puntos[i][0] - x, puntos[i][1] - y);
  if (distancia(estado.siguiente) <= radio) {
    const ultimo = estado.siguiente === puntos.length - 1;
    return {
      estado: { siguiente: ultimo ? estado.siguiente : estado.siguiente + 1, completo: ultimo },
      resultado: 'acierto',
    };
  }
  const otro = puntos.some((_, i) => i !== estado.siguiente && distancia(i) <= radio);
  return { estado, resultado: otro ? 'fallo' : 'nada' };
}

export function deshacer(estado) {
  if (estado.completo) return { siguiente: estado.siguiente, completo: false };
  return { siguiente: Math.max(0, estado.siguiente - 1), completo: false };
}

/** Segmentos ya trazados, como pares de índices. */
export function lineas(estado, total) {
  const unidos = estado.completo ? total : estado.siguiente;
  const resultado = [];
  for (let i = 1; i < unidos; i += 1) resultado.push([i - 1, i]);
  if (estado.completo && total > 2) resultado.push([total - 1, 0]);
  return resultado;
}

/** Número que hay que tocar ahora (1, 2, 3…), o null si la figura está completa. */
export const numeroSiguiente = (estado) => (estado.completo ? null : estado.siguiente + 1);

/** Puntos ya tocados. */
export const tocados = (estado) => (estado.completo ? Infinity : estado.siguiente);
