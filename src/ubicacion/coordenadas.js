/**
 * Coordenadas geográficas en grados decimales (WGS84), como en los mapas.
 * Se guardan en la investigación y, si hace falta, en cada parcela o transecto:
 *   { lat, lon, precision }   precision: metros, si vienen del GPS (o null)
 */

const DECIMALES = 5; // unos 1,1 m

const aNumero = (texto) => Number(String(texto ?? '').trim().replace(',', '.').replace('−', '-'));

/** Lee una latitud o longitud escrita a mano (admite coma decimal). */
export function leerCoordenada(texto, tipo) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return { valida: true, valor: null };
  const numero = aNumero(limpio);
  const maximo = tipo === 'lat' ? 90 : 180;
  if (!/^[-−]?\d+([.,]\d+)?$/.test(limpio) || !Number.isFinite(numero)) {
    return { valida: false, mensaje: 'Escribe un número en grados decimales, por ejemplo 37.21610.' };
  }
  if (Math.abs(numero) > maximo) {
    return { valida: false, mensaje: `La ${tipo === 'lat' ? 'latitud' : 'longitud'} debe estar entre -${maximo} y ${maximo}.` };
  }
  return { valida: true, valor: Math.round(numero * 10 ** DECIMALES) / 10 ** DECIMALES };
}

/**
 * Lee la pareja escrita en un formulario.
 * @param {{lat: string, lon: string, precision: number|null}} campos
 * @returns {{valida: boolean, coordenadas: object|null, errores: {lat?, lon?}}}
 */
export function leerCoordenadas(campos) {
  const lat = leerCoordenada(campos.lat, 'lat');
  const lon = leerCoordenada(campos.lon, 'lon');
  const errores = {};
  if (!lat.valida) errores.lat = lat.mensaje;
  if (!lon.valida) errores.lon = lon.mensaje;
  if (lat.valida && lon.valida && (lat.valor === null) !== (lon.valor === null)) {
    errores[lat.valor === null ? 'lat' : 'lon'] = 'Faltan la latitud o la longitud.';
  }
  if (Object.keys(errores).length) return { valida: false, coordenadas: null, errores };
  if (lat.valor === null) return { valida: true, coordenadas: null, errores };
  const precision = Number.isFinite(campos.precision) && campos.precision >= 0 ? Math.round(campos.precision) : null;
  return { valida: true, coordenadas: { lat: lat.valor, lon: lon.valor, precision }, errores };
}

/** Campos de formulario a partir de unas coordenadas guardadas. */
export const camposDe = (c) => ({ lat: c ? String(c.lat) : '', lon: c ? String(c.lon) : '', precision: c?.precision ?? null });

/** Valida unas coordenadas que llegan de una copia de seguridad. */
export function limpiarCoordenadas(valor) {
  if (valor === null || valor === undefined) return { valida: true, valor: null };
  const valido =
    typeof valor === 'object' &&
    Number.isFinite(valor.lat) &&
    Number.isFinite(valor.lon) &&
    Math.abs(valor.lat) <= 90 &&
    Math.abs(valor.lon) <= 180 &&
    (valor.precision === undefined || valor.precision === null || (Number.isFinite(valor.precision) && valor.precision >= 0));
  if (!valido) return { valida: false, valor: null };
  return { valida: true, valor: { lat: valor.lat, lon: valor.lon, precision: valor.precision ?? null } };
}

export function formatearCoordenadas(c) {
  if (!c) return '';
  return `${c.lat.toFixed(DECIMALES)}, ${c.lon.toFixed(DECIMALES)}`;
}

export function textoPrecision(c) {
  return Number.isFinite(c?.precision) ? `±${Math.round(c.precision)} m` : '';
}

/** Enlace a OpenStreetMap centrado en el punto. */
export function enlaceMapa(c) {
  const lat = c.lat.toFixed(DECIMALES);
  const lon = c.lon.toFixed(DECIMALES);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

/** Coordenadas que valen para una parcela o transecto: las suyas o, si no tiene, las de la investigación. */
export const coordenadasDe = (parcela, investigacion) => parcela?.coordenadas ?? investigacion?.coordenadas ?? null;

/**
 * Dónde se ha observado una especie, a partir de las investigaciones del dispositivo.
 * @param {{investigacion, parcelas, observaciones}[]} investigaciones
 * @returns {{investigacion, unidades: {id, codigo, coordenadas}[], coordenadas}[]}
 */
export function dondeSeHaObservado(especieId, investigaciones) {
  if (!especieId) return [];
  const resultado = [];
  for (const { investigacion, parcelas, observaciones } of investigaciones) {
    const ids = new Set(observaciones.filter((o) => o.especieId === especieId).map((o) => o.parcelaId));
    if (ids.size === 0) continue;
    const unidades = parcelas
      .filter((p) => ids.has(p.id))
      .map((p) => ({ id: p.id, codigo: p.codigo, coordenadas: coordenadasDe(p, investigacion) }));
    resultado.push({ investigacion, unidades, coordenadas: investigacion.coordenadas ?? unidades.find((u) => u.coordenadas)?.coordenadas ?? null });
  }
  return resultado.sort((a, b) =>
    String(b.investigacion.fechaObservacion ?? '').localeCompare(String(a.investigacion.fechaObservacion ?? '')),
  );
}

/** Pide la ubicación al dispositivo. Solo funciona en conexiones seguras (https o localhost). */
export function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      reject(new Error('La ubicación solo funciona con una conexión segura (https). Escribe las coordenadas a mano.'));
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error('Este navegador no puede obtener la ubicación. Escribe las coordenadas a mano.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) =>
        resolve({
          lat: Math.round(posicion.coords.latitude * 1e5) / 1e5,
          lon: Math.round(posicion.coords.longitude * 1e5) / 1e5,
          precision: Math.round(posicion.coords.accuracy),
        }),
      (error) => {
        const mensajes = {
          1: 'No se ha dado permiso para usar la ubicación. Puedes activarlo en los ajustes del navegador o escribir las coordenadas.',
          2: 'No se ha podido obtener la ubicación. Prueba al aire libre o escribe las coordenadas.',
          3: 'La ubicación está tardando demasiado. Vuelve a intentarlo o escribe las coordenadas.',
        };
        reject(new Error(mensajes[error.code] ?? 'No se ha podido obtener la ubicación.'));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
    );
  });
}
