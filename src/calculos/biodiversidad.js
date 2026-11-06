/**
 * Cálculos de biodiversidad de NatureLab (apartado 5.5 de la especificación).
 *
 * Funciones puras, sin acceso a almacenamiento ni a la interfaz, para poder
 * probarlas de forma aislada. Fórmulas:
 *   N  = Σ nᵢ
 *   S  = número de taxones con nᵢ > 0
 *   pᵢ = nᵢ / N
 *   H′ = −Σ pᵢ · ln(pᵢ)          (logaritmo natural)
 *   J′ = H′ / ln(S)  si S > 1    (no aplicable si S ≤ 1)
 *   Densidad = N / superficie    (si la superficie es conocida y positiva)
 */

export const UNIDADES_SUPERFICIE = {
  m2: { etiqueta: 'm²', factorM2: 1 },
  ha: { etiqueta: 'ha', factorM2: 10000 },
};

/** Comprueba que una abundancia sea un entero positivo (≥ 1). */
export function validarAbundancia(valor) {
  if (valor === '' || valor === null || valor === undefined) {
    return { valida: false, mensaje: 'Indica cuántos individuos has contado.' };
  }
  const numero = typeof valor === 'number' ? valor : Number(String(valor).trim());
  if (!Number.isFinite(numero)) {
    return { valida: false, mensaje: 'La abundancia debe ser un número.' };
  }
  if (!Number.isInteger(numero)) {
    return { valida: false, mensaje: 'La abundancia debe ser un número entero, sin decimales.' };
  }
  if (numero < 1) {
    return { valida: false, mensaje: 'La abundancia debe ser 1 o más.' };
  }
  if (!Number.isSafeInteger(numero)) {
    return { valida: false, mensaje: 'La abundancia es demasiado grande.' };
  }
  return { valida: true, valor: numero };
}

/** Comprueba una superficie opcional: vacía o número positivo. */
export function validarSuperficie(valor) {
  if (valor === '' || valor === null || valor === undefined) return { valida: true, valor: null };
  const numero = typeof valor === 'number' ? valor : Number(String(valor).trim().replace(',', '.'));
  if (!Number.isFinite(numero)) return { valida: false, mensaje: 'La superficie debe ser un número.' };
  if (numero <= 0) return { valida: false, mensaje: 'La superficie debe ser mayor que 0.' };
  return { valida: true, valor: numero };
}

export function aMetrosCuadrados(superficie, unidad = 'm2') {
  if (!(superficie > 0)) return null;
  const factor = UNIDADES_SUPERFICIE[unidad]?.factorM2;
  return factor ? superficie * factor : null;
}

/** Normaliza un texto para comparar nombres sin tildes ni mayúsculas. */
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}

/**
 * Clave de taxón de una observación. Las observaciones con especie del catálogo
 * se agrupan por su identificador; las no identificadas, por su nombre provisional.
 */
export function claveTaxon(observacion) {
  if (observacion.especieId) return `especie:${observacion.especieId}`;
  return `provisional:${normalizarTexto(observacion.nombreComun) || 'sin-nombre'}`;
}

/**
 * Agrupa observaciones por taxón sumando abundancias.
 * Elimina duplicados por identificador de observación, para no contar dos veces
 * una observación importada o repetida.
 */
export function agruparPorTaxon(observaciones) {
  const unicas = new Map();
  for (const obs of observaciones ?? []) {
    if (obs && obs.id && !unicas.has(obs.id)) unicas.set(obs.id, obs);
  }

  const grupos = new Map();
  for (const obs of unicas.values()) {
    const comprobacion = validarAbundancia(obs.abundancia);
    if (!comprobacion.valida) continue;
    const clave = claveTaxon(obs);
    const grupo = grupos.get(clave);
    const pendiente = obs.estadoIdentificacion !== 'confirmada';
    if (grupo) {
      grupo.abundancia += comprobacion.valor;
      grupo.observaciones += 1;
      grupo.pendiente = grupo.pendiente || pendiente;
    } else {
      grupos.set(clave, {
        clave,
        especieId: obs.especieId ?? null,
        nombreComun: obs.nombreComun ?? '',
        nombreCientifico: obs.nombreCientifico ?? '',
        abundancia: comprobacion.valor,
        observaciones: 1,
        pendiente,
      });
    }
  }

  return [...grupos.values()].sort(
    (a, b) => b.abundancia - a.abundancia || a.nombreComun.localeCompare(b.nombreComun, 'es'),
  );
}

/** Evita mostrar «−0» cuando un resultado es cero. */
const sinCeroNegativo = (x) => (Object.is(x, -0) ? 0 : x);

/**
 * Calcula los indicadores a partir de grupos de taxones (salida de agruparPorTaxon).
 * Devuelve null en H′ y J′ cuando no son calculables, con el motivo.
 */
export function calcularIndices(grupos) {
  const taxones = (grupos ?? []).filter((g) => g.abundancia > 0);
  const N = taxones.reduce((suma, g) => suma + g.abundancia, 0);
  const S = taxones.length;

  if (N === 0) {
    return {
      N: 0,
      S: 0,
      taxones: [],
      shannon: null,
      pielou: null,
      dominante: null,
      motivoShannon: 'Sin observaciones no se puede calcular la diversidad.',
      motivoPielou: 'Sin observaciones no se puede calcular la equitatividad.',
    };
  }

  const conProporciones = taxones.map((g) => {
    const p = g.abundancia / N;
    return { ...g, proporcion: p, terminoShannon: sinCeroNegativo(-p * Math.log(p)) };
  });

  const shannon = sinCeroNegativo(conProporciones.reduce((suma, t) => suma + t.terminoShannon, 0));
  const pielou = S > 1 ? shannon / Math.log(S) : null;

  return {
    N,
    S,
    taxones: conProporciones,
    shannon,
    pielou,
    dominante: conProporciones[0],
    motivoShannon: null,
    motivoPielou: S > 1 ? null : 'Con una sola especie la equitatividad no es aplicable.',
  };
}

/**
 * Resumen completo para una parcela concreta o para toda la investigación.
 * @param {object[]} observaciones
 * @param {object[]} parcelas
 * @param {string|null} parcelaId  null = todas las parcelas
 */
export function resumirBiodiversidad(observaciones, parcelas, parcelaId = null) {
  const parcelasIncluidas = parcelaId
    ? (parcelas ?? []).filter((p) => p.id === parcelaId)
    : (parcelas ?? []);
  const idsParcelas = new Set(parcelasIncluidas.map((p) => p.id));
  const obsIncluidas = (observaciones ?? []).filter((o) => idsParcelas.has(o.parcelaId));

  const indices = calcularIndices(agruparPorTaxon(obsIncluidas));

  const superficies = parcelasIncluidas.map((p) => aMetrosCuadrados(p.superficie, p.unidadSuperficie));
  const superficieConocida = superficies.length > 0 && superficies.every((s) => s !== null);
  const superficieM2 = superficieConocida ? superficies.reduce((a, b) => a + b, 0) : null;

  return {
    ...indices,
    parcelas: parcelasIncluidas.length,
    superficieM2,
    densidadM2: superficieM2 && indices.N > 0 ? indices.N / superficieM2 : null,
    taxonesPendientes: indices.taxones.filter((t) => t.pendiente).length,
  };
}
