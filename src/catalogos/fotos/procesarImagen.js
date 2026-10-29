/**
 * Procesado de fotos de referencia del catálogo, todo en el navegador:
 * recorte 4:3, pixelado de zonas, compresión y actualización del catálogo.
 */

export const PROPORCION = 4 / 3;
export const ANCHO_MAXIMO_SALIDA = 1200;
export const MARGEN_ZONA = 0.15;

const limitar = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), maximo);

/**
 * Rectángulo de recorte en píxeles de la imagen original.
 * zoom = 1 usa el mayor rectángulo 4:3 que cabe; centroX y centroY van de 0 a 1.
 */
export function calcularRecorte(anchoImagen, altoImagen, { zoom = 1, centroX = 0.5, centroY = 0.5 } = {}) {
  let anchoBase = anchoImagen;
  let altoBase = anchoImagen / PROPORCION;
  if (altoBase > altoImagen) {
    altoBase = altoImagen;
    anchoBase = altoImagen * PROPORCION;
  }
  const ancho = anchoBase / limitar(zoom, 1, 4);
  const alto = altoBase / limitar(zoom, 1, 4);
  return {
    x: limitar(centroX * anchoImagen - ancho / 2, 0, anchoImagen - ancho),
    y: limitar(centroY * altoImagen - alto / 2, 0, altoImagen - alto),
    ancho,
    alto,
  };
}

/** Devuelve un encuadre cuyo centro coincide con el recorte real (sin salirse de la imagen). */
export function normalizarEncuadre(anchoImagen, altoImagen, encuadre) {
  const r = calcularRecorte(anchoImagen, altoImagen, encuadre);
  return {
    zoom: limitar(encuadre.zoom ?? 1, 1, 4),
    centroX: (r.x + r.ancho / 2) / anchoImagen,
    centroY: (r.y + r.alto / 2) / altoImagen,
  };
}

/** Desplaza el encuadre en píxeles de la imagen original. */
export function moverEncuadre(anchoImagen, altoImagen, encuadre, dx, dy) {
  const r = calcularRecorte(anchoImagen, altoImagen, encuadre);
  return normalizarEncuadre(anchoImagen, altoImagen, {
    ...encuadre,
    centroX: (r.x + r.ancho / 2 + dx) / anchoImagen,
    centroY: (r.y + r.alto / 2 + dy) / altoImagen,
  });
}

export function tamanoSalida(recorte) {
  const ancho = Math.max(1, Math.round(Math.min(ANCHO_MAXIMO_SALIDA, recorte.ancho)));
  return { ancho, alto: Math.round(ancho / PROPORCION) };
}

/**
 * Convierte zonas detectadas (píxeles de la imagen original) a coordenadas del
 * lienzo de salida, ampliadas con un margen y recortadas al encuadre.
 */
export function zonasEnRecorte(zonas, recorte, escala, margen = MARGEN_ZONA) {
  const resultado = [];
  for (const z of zonas ?? []) {
    const mx = z.ancho * margen;
    const my = z.alto * margen;
    const x1 = Math.max(z.x - mx, recorte.x);
    const y1 = Math.max(z.y - my, recorte.y);
    const x2 = Math.min(z.x + z.ancho + mx, recorte.x + recorte.ancho);
    const y2 = Math.min(z.y + z.alto + my, recorte.y + recorte.alto);
    if (x2 <= x1 || y2 <= y1) continue;
    resultado.push({
      tipo: z.tipo,
      x: (x1 - recorte.x) * escala,
      y: (y1 - recorte.y) * escala,
      ancho: (x2 - x1) * escala,
      alto: (y2 - y1) * escala,
    });
  }
  return resultado;
}

/** Pixela una zona del lienzo con bloques grandes, para que no se pueda reconocer. */
export function pixelarZona(ctx, zona) {
  const lado = Math.max(zona.ancho, zona.alto);
  const bloque = Math.max(6, lado / 8);
  const columnas = Math.max(1, Math.round(zona.ancho / bloque));
  const filas = Math.max(1, Math.round(zona.alto / bloque));
  const auxiliar = document.createElement('canvas');
  auxiliar.width = columnas;
  auxiliar.height = filas;
  auxiliar.getContext('2d').drawImage(ctx.canvas, zona.x, zona.y, zona.ancho, zona.alto, 0, 0, columnas, filas);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(auxiliar, 0, 0, columnas, filas, zona.x, zona.y, zona.ancho, zona.alto);
  ctx.restore();
}

/**
 * Dibuja el recorte en un lienzo. Devuelve las zonas visibles en coordenadas del lienzo.
 * @param {{zonas?: object[], pixelar?: boolean, marcar?: boolean}} opciones
 */
export function dibujarRecorte(lienzo, imagen, recorte, { zonas = [], pixelar = false, marcar = false } = {}) {
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(imagen, recorte.x, recorte.y, recorte.ancho, recorte.alto, 0, 0, lienzo.width, lienzo.height);
  const visibles = zonasEnRecorte(zonas, recorte, lienzo.width / recorte.ancho);
  if (pixelar) visibles.forEach((z) => pixelarZona(ctx, z));
  if (marcar) {
    ctx.save();
    ctx.lineWidth = Math.max(2, lienzo.width / 260);
    ctx.setLineDash([12, 8]);
    ctx.strokeStyle = '#f2b705';
    visibles.forEach((z) => ctx.strokeRect(z.x, z.y, z.ancho, z.alto));
    ctx.restore();
  }
  return visibles;
}

/** Copia reducida de la imagen para analizarla más rápido. */
export function prepararLienzoAnalisis(imagen, ladoMaximo = 1024) {
  const ancho = imagen.naturalWidth;
  const alto = imagen.naturalHeight;
  const escala = Math.min(1, ladoMaximo / Math.max(ancho, alto));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(ancho * escala);
  lienzo.height = Math.round(alto * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return { lienzo, escala };
}

const aBlob = (lienzo, tipo, calidad) => new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad));

/**
 * Comprime en WebP; si el navegador no sabe generarlo (algunas versiones de Safari),
 * usa JPEG. Al volver a codificar se eliminan los metadatos, incluida la ubicación.
 */
export async function codificarImagen(lienzo) {
  const webp = await aBlob(lienzo, 'image/webp', 0.82);
  if (webp && webp.type === 'image/webp') return { blob: webp, extension: 'webp' };
  const jpeg = await aBlob(lienzo, 'image/jpeg', 0.85);
  if (!jpeg) throw new Error('El navegador no ha podido generar la imagen.');
  return { blob: jpeg, extension: 'jpg' };
}

const CAMPOS_IMAGEN = ['imagen', 'imagenAutor', 'imagenFuente', 'imagenLicencia', 'imagenModificaciones'];

/** Devuelve una copia del catálogo con los datos de imagen preparados. */
export function aplicarCambiosCatalogo(catalogo, cambios) {
  const porId = new Map((cambios ?? []).map((c) => [c.especieId, c]));
  return {
    ...catalogo,
    especies: catalogo.especies.map((especie) => {
      const cambio = porId.get(especie.id);
      if (!cambio) return especie;
      const actualizada = { ...especie };
      for (const campo of CAMPOS_IMAGEN) actualizada[campo] = cambio[campo] ?? null;
      return actualizada;
    }),
  };
}
