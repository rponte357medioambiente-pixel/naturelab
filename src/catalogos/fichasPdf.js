import { formatearFecha } from '../calculos/formato.js';
import { textoPdf } from '../importacion-exportacion/pdfCuaderno.js';

/**
 * Fichas de especies en PDF, para estudiar y para recortar.
 *
 * Cada fila es una especie: a la izquierda, su imagen con el nombre y un
 * número; a la derecha, sus características con una letra. Sin recortar, cada
 * fila es una ficha completa. Recortadas por las líneas de puntos, se juega a
 * emparejar cada imagen con sus características: las letras están barajadas y
 * las soluciones van en la última página, con los créditos de las imágenes.
 */

const PAGINA = { ancho: 210, alto: 297, margen: 12, pie: 10 };
const ANCHO_UTIL = PAGINA.ancho - PAGINA.margen * 2;
const FILA = { alto: 50, hueco: 4.5 };
const TARJETA_IMAGEN = 78;
const HUECO_COLUMNAS = 6;
const TARJETA_DATOS = ANCHO_UTIL - TARJETA_IMAGEN - HUECO_COLUMNAS;
const PT_A_MM = 0.3528;
const TINTA = [43, 30, 26];
const SUAVE = [107, 74, 64];
const CORTE = [190, 170, 160];

const hexARgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(String(hex).slice(i, i + 2), 16) || 0);
const aclarar = ([r, g, b], f) => [r, g, b].map((c) => Math.round(c + (255 - c) * f));

/** Etiquetas A, B… Z, A2, B2… asignadas al azar a las especies. */
export function asignarLetras(total, azar = Math.random) {
  const etiquetas = Array.from({ length: total }, (_, i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) + 1 : ''));
  for (let i = etiquetas.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [etiquetas[i], etiquetas[j]] = [etiquetas[j], etiquetas[i]];
  }
  return etiquetas;
}

/** Apartados de la tarjeta de características (sin el nombre, que es lo que hay que adivinar). */
export function contenidoFicha(especie) {
  const apartados = [];
  if (especie.familia) apartados.push({ titulo: 'Familia', texto: especie.familia });
  if (especie.descripcion) apartados.push({ titulo: null, texto: especie.descripcion });
  if (especie.rasgos?.length) apartados.push({ titulo: 'Cómo reconocerla', lista: especie.rasgos });
  if (especie.habitat) apartados.push({ titulo: 'Dónde vive', texto: especie.habitat });
  if (especie.propia && especie.lugarTexto) apartados.push({ titulo: 'Dónde se encontró', texto: especie.lugarTexto });
  if (especie.propia && especie.notas) apartados.push({ titulo: 'Notas', texto: especie.notas });
  if (apartados.length === 0) apartados.push({ titulo: null, texto: 'Sin descripción todavía.' });
  return apartados;
}

/**
 * Prepara una imagen (foto, ilustración SVG o foto guardada) para el PDF:
 * recortada a 4:3 y en JPEG. Solo funciona en el navegador.
 */
export async function imagenParaPdf(url) {
  const imagen = new Image();
  imagen.decoding = 'async';
  imagen.src = url;
  await imagen.decode();
  const lienzo = document.createElement('canvas');
  lienzo.width = 800;
  lienzo.height = 600;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 800, 600);
  const ancho = imagen.naturalWidth || 800;
  const alto = imagen.naturalHeight || 600;
  const escala = Math.max(800 / ancho, 600 / alto);
  ctx.drawImage(imagen, (800 - ancho * escala) / 2, (600 - alto * escala) / 2, ancho * escala, alto * escala);
  return lienzo.toDataURL('image/jpeg', 0.86);
}

/**
 * @param {object[]} especies  con imagen
 * @param {{titulo: string, color: string, obtenerImagen: (especie) => Promise<string|null>, azar?: () => number}} opciones
 * @returns {Promise<Blob>}
 */
export async function generarPdfFichas(especies, { titulo, color = '#843024', obtenerImagen, azar = Math.random }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: textoPdf(`Fichas de especies · ${titulo}`), creator: 'NatureLab' });
  const principal = hexARgb(color);
  const fondoSuave = aclarar(principal, 0.9);
  const letras = asignarLetras(especies.length, azar);

  const fuente = ({ tamano = 9, estilo = 'normal', familia = 'helvetica', tono = TINTA } = {}) => {
    doc.setFont(familia, estilo);
    doc.setFontSize(tamano);
    doc.setTextColor(...tono);
    return tamano * PT_A_MM * 1.3;
  };

  const lineaCorte = (x, y, w, h) => {
    doc.setDrawColor(...CORTE);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1.6, 1.2], 0);
    doc.rect(x, y, w, h);
    doc.setLineDashPattern([], 0);
  };

  const insignia = (x, y, texto) => {
    doc.setFillColor(...principal);
    doc.circle(x, y, 4, 'F');
    fuente({ tamano: texto.length > 2 ? 7 : 9, estilo: 'bold', tono: [255, 255, 255] });
    doc.text(texto, x, y + 1.1, { align: 'center' });
  };

  /* ---------- Cabecera de la primera página ---------- */
  let y = PAGINA.margen;
  fuente({ tamano: 20, estilo: 'bold', familia: 'times', tono: principal });
  doc.text('Fichas de especies', PAGINA.margen, y + 6);
  fuente({ tamano: 9, tono: SUAVE });
  doc.text(textoPdf(`NatureLab · ${titulo}`), PAGINA.ancho - PAGINA.margen, y + 6, { align: 'right', maxWidth: 80 });
  fuente({ tamano: 9.5, tono: SUAVE });
  const instrucciones = doc.splitTextToSize(
    textoPdf(
      'Para estudiar, cada fila es una ficha completa. Para jugar, recorta por las líneas de puntos y empareja cada imagen con sus características. Las soluciones están en la última página.',
    ),
    ANCHO_UTIL,
  );
  doc.text(instrucciones, PAGINA.margen, y + 12.5);
  y += 12.5 + instrucciones.length * 4.2 + 2;

  /* ---------- Una fila por especie ---------- */
  const limite = PAGINA.alto - PAGINA.margen - PAGINA.pie;
  for (let i = 0; i < especies.length; i += 1) {
    const especie = especies[i];
    if (y + FILA.alto > limite) {
      doc.addPage();
      y = PAGINA.margen;
    }

    // Tarjeta de la imagen
    const xA = PAGINA.margen;
    lineaCorte(xA, y, TARJETA_IMAGEN, FILA.alto);
    const anchoImg = 46;
    const altoImg = anchoImg * 0.75;
    const xImg = xA + (TARJETA_IMAGEN - anchoImg) / 2 + 3;
    let imagen = null;
    try {
      imagen = await obtenerImagen(especie);
    } catch {
      imagen = null;
    }
    if (imagen) {
      doc.addImage(imagen, 'JPEG', xImg, y + 3, anchoImg, altoImg, undefined, 'FAST');
    } else {
      doc.setFillColor(...fondoSuave);
      doc.rect(xImg, y + 3, anchoImg, altoImg, 'F');
    }
    insignia(xA + 6, y + 7, String(i + 1));
    const altoNombre = fuente({ tamano: 11.5, estilo: 'bold', familia: 'times' });
    const nombre = doc.splitTextToSize(textoPdf(especie.nombreComun), TARJETA_IMAGEN - 6)[0];
    doc.text(nombre, xA + TARJETA_IMAGEN / 2, y + 3 + altoImg + altoNombre + 0.2, { align: 'center' });
    if (especie.nombreCientifico) {
      fuente({ tamano: 9, estilo: 'italic', familia: 'times', tono: SUAVE });
      doc.text(doc.splitTextToSize(textoPdf(especie.nombreCientifico), TARJETA_IMAGEN - 6)[0], xA + TARJETA_IMAGEN / 2, y + FILA.alto - 2.4, {
        align: 'center',
      });
    }

    // Tarjeta de las características: el texto se ajusta para caber
    const xB = xA + TARJETA_IMAGEN + HUECO_COLUMNAS;
    lineaCorte(xB, y, TARJETA_DATOS, FILA.alto);
    doc.setFillColor(...fondoSuave);
    doc.rect(xB + 0.4, y + 0.4, TARJETA_DATOS - 0.8, 8, 'F');
    fuente({ tamano: 8.5, estilo: 'bold', tono: principal });
    doc.text('Características', xB + 4, y + 5.5);
    insignia(xB + TARJETA_DATOS - 6, y + 4.5, letras[i]);

    const apartados = contenidoFicha(especie);
    const anchoTexto = TARJETA_DATOS - 8;
    const disponible = FILA.alto - 12;
    let tamano = 8.4;
    let bloques = [];
    for (; tamano >= 6.4; tamano -= 0.3) {
      bloques = [];
      let alto = 0;
      for (const a of apartados) {
        const lineaAlto = fuente({ tamano }) ;
        if (a.titulo) {
          bloques.push({ texto: a.titulo, estilo: 'bold', alto: lineaAlto });
          alto += lineaAlto;
        }
        const lineas = a.lista
          ? a.lista.flatMap((r) => doc.splitTextToSize(textoPdf(`• ${r}`), anchoTexto))
          : doc.splitTextToSize(textoPdf(a.texto), anchoTexto);
        for (const l of lineas) bloques.push({ texto: l, estilo: 'normal', alto: lineaAlto });
        alto += lineas.length * lineaAlto + lineaAlto * 0.35;
        bloques.push({ espacio: lineaAlto * 0.35 });
      }
      if (alto <= disponible) break;
    }
    let yTexto = y + 11.5;
    for (const b of bloques) {
      if (b.espacio) {
        yTexto += b.espacio;
        continue;
      }
      if (yTexto + b.alto > y + FILA.alto - 2) {
        fuente({ tamano, tono: SUAVE });
        doc.text('…', xB + 4, yTexto + b.alto * 0.75);
        break;
      }
      fuente({ tamano, estilo: b.estilo, tono: b.estilo === 'bold' ? principal : TINTA });
      doc.text(b.texto, xB + 4, yTexto + b.alto * 0.75);
      yTexto += b.alto;
    }

    y += FILA.alto + FILA.hueco;
  }

  /* ---------- Soluciones y créditos ---------- */
  doc.addPage();
  y = PAGINA.margen;
  fuente({ tamano: 18, estilo: 'bold', familia: 'times', tono: principal });
  doc.text('Soluciones', PAGINA.margen, y + 6);
  y += 13;
  const columnas = 2;
  const anchoColumna = ANCHO_UTIL / columnas;
  const filas = Math.ceil(especies.length / columnas);
  especies.forEach((e, i) => {
    const col = Math.floor(i / filas);
    const fila = i % filas;
    const x = PAGINA.margen + col * anchoColumna;
    const yy = y + fila * 7;
    fuente({ tamano: 10, estilo: 'bold', tono: principal });
    doc.text(`${i + 1}  -  ${letras[i]}`, x, yy);
    fuente({ tamano: 10 });
    doc.text(doc.splitTextToSize(textoPdf(e.nombreComun), anchoColumna - 24)[0], x + 18, yy);
  });
  y += filas * 7 + 8;

  const creditos = especies
    .map((e, i) => ({ i, e }))
    .filter(({ e }) => e.imagenAutor || e.imagenLicencia || e.imagenFuente);
  if (creditos.length) {
    fuente({ tamano: 12, estilo: 'bold', familia: 'times', tono: principal });
    doc.text('Créditos de las imágenes', PAGINA.margen, y);
    y += 6;
    for (const { i, e } of creditos) {
      const partes = [e.imagenAutor, /^https?:/.test(e.imagenFuente ?? '') ? null : e.imagenFuente, e.imagenLicencia, e.imagenModificaciones].filter(Boolean);
      const lineas = (() => {
        fuente({ tamano: 8.5, tono: SUAVE });
        return doc.splitTextToSize(textoPdf(`${i + 1}. ${e.nombreComun}: ${partes.join('. ')}.${/^https?:/.test(e.imagenFuente ?? '') ? ` ${e.imagenFuente}` : ''}`), ANCHO_UTIL);
      })();
      if (y + lineas.length * 3.8 > PAGINA.alto - PAGINA.margen - PAGINA.pie) {
        doc.addPage();
        y = PAGINA.margen;
      }
      doc.text(lineas, PAGINA.margen, y);
      y += lineas.length * 3.8 + 1;
    }
  }

  /* ---------- Pie de página ---------- */
  const total = doc.getNumberOfPages();
  for (let n = 1; n <= total; n += 1) {
    doc.setPage(n);
    fuente({ tamano: 7.5, tono: SUAVE });
    doc.text(textoPdf(`NatureLab · Fichas de especies · ${formatearFecha(new Date().toISOString())}`), PAGINA.margen, PAGINA.alto - 6);
    doc.text(`Página ${n} de ${total}`, PAGINA.ancho - PAGINA.margen, PAGINA.alto - 6, { align: 'right' });
  }
  return doc.output('blob');
}
