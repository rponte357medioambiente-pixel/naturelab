import { claveTaxon } from './biodiversidad.js';

/**
 * Cobertura vegetal por transectos lineales (método de intercepción en línea).
 *
 * Funciones puras, sin acceso a almacenamiento ni a la interfaz. Para cada
 * transecto de longitud L (cm):
 *   cmᵢ          = suma de lo que mide cada mancha de la especie i sobre la cuerda
 *   coberturaᵢ   = cmᵢ / L × 100
 *   suelo        = cm de suelo desnudo (anotado, o lo que no cubre ninguna especie)
 *   cob. total   = (L − suelo) / L × 100
 * Las especies pueden solaparse: la suma de coberturas puede pasar del 100 %.
 * Con varios transectos, cada especie suma sus cm en todas las líneas y se divide
 * entre la longitud total.
 */

export const LIMITES_TRANSECTO = {
  longitudMaxCm: 100000, // 1 km
  manchasMax: 500,
};

const aNumero = (valor) =>
  typeof valor === 'number' ? valor : Number(String(valor ?? '').trim().replace(',', '.'));

/** Longitud de la línea en cm: número mayor que 0. */
export function validarLongitudTransecto(valor) {
  if (valor === '' || valor === null || valor === undefined) {
    return { valida: false, mensaje: 'Indica cuánto mide la línea, en cm.' };
  }
  const numero = aNumero(valor);
  if (!Number.isFinite(numero)) return { valida: false, mensaje: 'La longitud debe ser un número.' };
  if (numero <= 0) return { valida: false, mensaje: 'La longitud debe ser mayor que 0.' };
  if (numero > LIMITES_TRANSECTO.longitudMaxCm) {
    return { valida: false, mensaje: `La longitud no puede superar ${LIMITES_TRANSECTO.longitudMaxCm} cm.` };
  }
  return { valida: true, valor: numero };
}

/**
 * Lee lo que mide cada mancha a partir de un texto como «1+12+5+28».
 * Admite coma decimal y separar con +, punto y coma o espacios. Vacío = sin manchas.
 */
export function leerLongitudes(texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return { valida: true, valores: [] };
  const partes = limpio.split(/[+;\s]+/).filter(Boolean);
  if (partes.length > LIMITES_TRANSECTO.manchasMax) {
    return { valida: false, mensaje: `Como máximo ${LIMITES_TRANSECTO.manchasMax} manchas por especie.` };
  }
  const valores = [];
  for (const parte of partes) {
    const numero = aNumero(parte);
    if (!/^\d+([.,]\d+)?$/.test(parte) || !Number.isFinite(numero)) {
      return { valida: false, mensaje: 'Escribe las medidas en cm separadas por +, por ejemplo 1+12+5+28.' };
    }
    if (numero <= 0) return { valida: false, mensaje: 'Cada mancha debe medir más de 0 cm.' };
    if (numero > LIMITES_TRANSECTO.longitudMaxCm) return { valida: false, mensaje: 'Hay una medida demasiado grande.' };
    valores.push(numero);
  }
  return { valida: true, valores };
}

/** [1, 12, 2.5] → «1+12+2,5» */
export function textoLongitudes(valores = []) {
  return valores.map((v) => String(v).replace('.', ',')).join('+');
}

/** Comprueba un tramo «desde–hasta» sobre una línea de longitud L. */
export function validarTramo(desde, hasta, longitud) {
  const d = aNumero(desde);
  const h = aNumero(hasta);
  if (desde === '' || hasta === '' || !Number.isFinite(d) || !Number.isFinite(h)) {
    return { valido: false, mensaje: 'Indica dónde empieza y dónde termina, en cm.' };
  }
  if (d < 0) return { valido: false, mensaje: 'El inicio no puede ser negativo.' };
  if (h <= d) return { valido: false, mensaje: 'El final debe ser mayor que el inicio.' };
  if (longitud > 0 && h > longitud) return { valido: false, mensaje: `El final no puede pasar de ${longitud} cm.` };
  return { valido: true, tramo: { desde: d, hasta: h } };
}

/** Une tramos que se tocan o se solapan. Devuelve tramos ordenados y sin solapes. */
export function unirTramos(tramos) {
  const ordenados = tramos
    .filter((t) => Number.isFinite(t?.desde) && Number.isFinite(t?.hasta) && t.hasta > t.desde)
    .map((t) => ({ desde: t.desde, hasta: t.hasta }))
    .sort((a, b) => a.desde - b.desde);
  const unidos = [];
  for (const t of ordenados) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && t.desde <= ultimo.hasta) ultimo.hasta = Math.max(ultimo.hasta, t.hasta);
    else unidos.push(t);
  }
  return unidos;
}

const sumar = (valores) => valores.reduce((s, v) => s + v, 0);
export const largoDeTramos = (tramos) => sumar(unirTramos(tramos).map((t) => t.hasta - t.desde));

/** Recorta tramos a la línea [0, L]. */
const recortar = (tramos, L) =>
  tramos.map((t) => ({ desde: Math.max(0, t.desde), hasta: Math.min(L, t.hasta) })).filter((t) => t.hasta > t.desde);

/** Medidas de las manchas de una observación según el modo del transecto. */
export function manchasDe(observacion, modo) {
  if (modo === 'tramos') return (observacion.tramos ?? []).map((t) => t.hasta - t.desde).filter((v) => v > 0);
  return (observacion.longitudes ?? []).filter((v) => Number.isFinite(v) && v > 0);
}

function quitarRepetidas(observaciones) {
  const unicas = new Map();
  for (const o of observaciones) if (!unicas.has(o.id)) unicas.set(o.id, o);
  return [...unicas.values()];
}

/**
 * Resumen de un transecto.
 * @returns {{L, modo, taxones, S, sumaEspeciesCm, sueloCm, cubiertoCm, coberturaTotal, suelo,
 *   solapeCm, faltanCm, dominante, taxonesPendientes}}
 */
export function resumirTransecto(transecto, observaciones) {
  const L = transecto.longitudCm > 0 ? transecto.longitudCm : 0;
  const modo = transecto.modoAnotacion === 'tramos' ? 'tramos' : 'longitudes';
  const propias = quitarRepetidas(observaciones.filter((o) => o.parcelaId === transecto.id));

  const grupos = new Map();
  for (const o of propias) {
    const clave = claveTaxon(o);
    const grupo = grupos.get(clave) ?? {
      clave,
      especieId: o.especieId ?? null,
      nombreComun: o.nombreComun || 'Sin nombre',
      nombreCientifico: o.nombreCientifico || '',
      manchas: [],
      tramos: [],
      pendiente: false,
    };
    grupo.manchas.push(...manchasDe(o, modo));
    if (modo === 'tramos') grupo.tramos.push(...recortar(o.tramos ?? [], L || Infinity));
    if (o.estadoIdentificacion !== 'confirmada') grupo.pendiente = true;
    grupos.set(clave, grupo);
  }

  const taxones = [...grupos.values()]
    .map((g) => {
      const tramosUnidos = modo === 'tramos' ? unirTramos(g.tramos) : [];
      // En tramos, los de una misma especie que se solapan cuentan una sola vez.
      const cm = modo === 'tramos' ? sumar(tramosUnidos.map((t) => t.hasta - t.desde)) : sumar(g.manchas);
      return {
        clave: g.clave,
        especieId: g.especieId,
        nombreComun: g.nombreComun,
        nombreCientifico: g.nombreCientifico,
        pendiente: g.pendiente,
        cm,
        numeroManchas: modo === 'tramos' ? tramosUnidos.length : g.manchas.length,
        tramos: tramosUnidos,
        proporcion: L ? cm / L : 0,
        frecuencia: cm > 0 ? 1 : 0,
      };
    })
    .sort((a, b) => b.cm - a.cm || a.nombreComun.localeCompare(b.nombreComun, 'es'));

  const conCobertura = taxones.filter((t) => t.cm > 0);
  const sumaEspeciesCm = sumar(taxones.map((t) => t.cm));

  let sueloCm;
  let cubiertoCm;
  let solapeCm;
  let faltanCm;
  if (modo === 'tramos') {
    // Lo que no cubre ninguna especie es suelo desnudo.
    cubiertoCm = largoDeTramos(taxones.flatMap((t) => t.tramos));
    sueloCm = Math.max(0, L - cubiertoCm);
    solapeCm = Math.max(0, sumaEspeciesCm - cubiertoCm);
    faltanCm = 0;
  } else {
    // Sin posiciones, el suelo desnudo se anota aparte.
    sueloCm = Math.min(L, sumar((transecto.sueloDesnudo ?? []).filter((v) => Number.isFinite(v) && v > 0)));
    const anotado = sumaEspeciesCm + sueloCm;
    faltanCm = Math.max(0, L - anotado);
    solapeCm = Math.max(0, anotado - L);
    // Si falta por anotar, solo se puede afirmar lo que suman las especies.
    cubiertoCm = faltanCm > 0 ? sumaEspeciesCm : L - sueloCm;
  }

  const redondear = (v) => Math.round(v * 1000) / 1000;
  return {
    L,
    modo,
    taxones,
    S: conCobertura.length,
    sumaEspeciesCm: redondear(sumaEspeciesCm),
    sueloCm: redondear(sueloCm),
    cubiertoCm: redondear(cubiertoCm),
    coberturaTotal: L ? cubiertoCm / L : 0,
    suelo: L ? sueloCm / L : 0,
    solapeCm: redondear(solapeCm),
    faltanCm: redondear(faltanCm),
    dominante: conCobertura[0] ?? null,
    taxonesPendientes: conCobertura.filter((t) => t.pendiente).length,
    numeroTransectos: 1,
  };
}

/**
 * Resumen de uno o de todos los transectos de una investigación.
 * @param {string|null} transectoId  null = todos los transectos juntos
 */
export function resumirCobertura(transectos, observaciones, transectoId = null) {
  if (transectoId) {
    const transecto = transectos.find((t) => t.id === transectoId);
    return transecto ? resumirTransecto(transecto, observaciones) : resumirCobertura([], observaciones);
  }
  const parciales = transectos.map((t) => resumirTransecto(t, observaciones));
  const L = sumar(parciales.map((p) => p.L));

  const grupos = new Map();
  for (const p of parciales) {
    for (const t of p.taxones) {
      const grupo = grupos.get(t.clave) ?? { ...t, cm: 0, numeroManchas: 0, tramos: [], frecuencia: 0 };
      grupo.cm += t.cm;
      grupo.numeroManchas += t.numeroManchas;
      grupo.frecuencia += t.cm > 0 ? 1 : 0;
      grupo.pendiente = grupo.pendiente || t.pendiente;
      grupos.set(t.clave, grupo);
    }
  }
  const taxones = [...grupos.values()]
    .map((t) => ({ ...t, proporcion: L ? t.cm / L : 0 }))
    .sort((a, b) => b.cm - a.cm || a.nombreComun.localeCompare(b.nombreComun, 'es'));
  const conCobertura = taxones.filter((t) => t.cm > 0);
  const total = (campo) => sumar(parciales.map((p) => p[campo]));

  return {
    L,
    modo: null,
    taxones,
    S: conCobertura.length,
    sumaEspeciesCm: total('sumaEspeciesCm'),
    sueloCm: total('sueloCm'),
    cubiertoCm: total('cubiertoCm'),
    coberturaTotal: L ? total('cubiertoCm') / L : 0,
    suelo: L ? total('sueloCm') / L : 0,
    solapeCm: total('solapeCm'),
    faltanCm: total('faltanCm'),
    dominante: conCobertura[0] ?? null,
    taxonesPendientes: conCobertura.filter((t) => t.pendiente).length,
    numeroTransectos: transectos.length,
  };
}
