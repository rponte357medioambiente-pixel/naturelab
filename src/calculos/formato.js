const cacheFormatos = new Map();

function formateador(decimales) {
  if (!cacheFormatos.has(decimales)) {
    cacheFormatos.set(
      decimales,
      new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      }),
    );
  }
  return cacheFormatos.get(decimales);
}

/** 1.42885 → «1,429» */
export function formatearNumero(valor, decimales = 0) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '—';
  return formateador(decimales).format(Object.is(valor, -0) ? 0 : valor);
}

/** 0.60606 → «60,61 %» */
export function formatearPorcentaje(proporcion, decimales = 1) {
  if (proporcion === null || proporcion === undefined || !Number.isFinite(proporcion)) return '—';
  return `${formatearNumero(proporcion * 100, decimales)} %`;
}

/** «2026-10-21» o ISO completo → «21 de octubre de 2026» */
export function formatearFecha(valor) {
  if (!valor) return '';
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Fecha local de hoy en formato AAAA-MM-DD, para campos de tipo date. */
export function hoyISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Plural sencillo: plural(1, 'especie', 'especies') → «1 especie». */
export function plural(n, singular, pluralTexto) {
  return `${formatearNumero(n)} ${n === 1 ? singular : pluralTexto}`;
}
