import { ESTADOS_IDENTIFICACION } from '../almacenamiento/modelo.js';
import { resumirBiodiversidad, UNIDADES_SUPERFICIE } from '../calculos/biodiversidad.js';
import { formatearFecha, formatearNumero, formatearPorcentaje, plural } from '../calculos/formato.js';
import { PALETA } from '../componentes/FranjaAbundancia.jsx';

/**
 * Cuaderno de campo en PDF, generado en el propio dispositivo (sin conexión).
 * jsPDF se carga solo al pulsar el botón.
 */

// Caracteres que las fuentes estándar del PDF (WinAnsi) no pueden mostrar.
const SUSTITUCIONES = {
  '\u2032': "'", // ′
  '\u2212': '-', // −
  '\u1d62': 'i', // ᵢ
  '\u03a3': 'Suma de', // Σ
  '\u2248': '~',
  '\u00b2': '2', // ² (no se muestra con las fuentes estándar)
  '\u00b3': '3',
  '\u202f': ' ',
  '\u2009': ' ',
  '\u00a0': ' ',
};
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

/** Adapta un texto a las fuentes estándar del PDF; lo que no se puede mostrar se omite. */
export function textoPdf(texto) {
  let resultado = '';
  for (const caracter of String(texto ?? '').normalize('NFC')) {
    const c = SUSTITUCIONES[caracter] ?? caracter;
    for (const letra of c) {
      const codigo = letra.codePointAt(0);
      if (letra === '\n' || (codigo >= 0x20 && codigo <= 0x7e) || (codigo >= 0xa1 && codigo <= 0xff) || WIN_ANSI_EXTRA.has(letra)) {
        resultado += letra;
      }
    }
  }
  return resultado;
}

const hexARgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

const COLOR = {
  tinta: [28, 39, 33],
  suave: [74, 90, 80],
  linea: [211, 221, 213],
  verde: [31, 90, 61],
  ocre: [127, 85, 8],
};

const PAGINA = { ancho: 210, alto: 297, margen: 18, pie: 16 };
const ANCHO_UTIL = PAGINA.ancho - PAGINA.margen * 2;
const PT_A_MM = 0.3528;

/**
 * @param {{investigacion: object, parcelas: object[], observaciones: object[]}} datos
 * @param {object} opciones
 * @param {(id: string) => object|null} opciones.buscarEspecie
 * @param {(observaciones: object[]) => Promise<object[]>} [opciones.obtenerFotos]
 * @param {(foto: object) => Promise<{datos: Uint8Array, ancho: number, alto: number}>} [opciones.prepararFoto]
 * @returns {Promise<Blob>}
 */
export async function generarPdfCuaderno(datos, { buscarEspecie = () => null, obtenerFotos, prepararFoto } = {}) {
  const { jsPDF } = await import('jspdf');
  const { investigacion, parcelas, observaciones } = datos;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: textoPdf(investigacion.titulo), creator: 'NaturaLab' });

  let y = PAGINA.margen;
  const limite = PAGINA.alto - PAGINA.margen - PAGINA.pie;

  const nuevaPagina = () => {
    doc.addPage();
    y = PAGINA.margen;
  };
  const asegurar = (alto) => {
    if (y + alto > limite) nuevaPagina();
  };
  const fuente = ({ tamano = 10, estilo = 'normal', familia = 'helvetica', color = COLOR.tinta } = {}) => {
    doc.setFont(familia, estilo);
    doc.setFontSize(tamano);
    doc.setTextColor(...color);
    return tamano * PT_A_MM * 1.4;
  };
  const lineasDe = (texto, ancho, opciones) => {
    fuente(opciones);
    return doc.splitTextToSize(textoPdf(texto), ancho);
  };
  const parrafo = (texto, opciones = {}, { x = PAGINA.margen, ancho = ANCHO_UTIL, espacioDespues = 2 } = {}) => {
    if (!texto) return;
    const lineas = lineasDe(texto, ancho, opciones);
    const alto = fuente(opciones);
    for (const linea of lineas) {
      asegurar(alto);
      doc.text(linea, x, y + alto * 0.72);
      y += alto;
    }
    y += espacioDespues;
  };
  const titulo = (texto, tamano = 15) => {
    asegurar(tamano * PT_A_MM * 1.4 + 12);
    y += 3;
    parrafo(texto, { tamano, estilo: 'bold', familia: 'times', color: COLOR.verde }, { espacioDespues: 2 });
  };
  const separador = () => {
    doc.setDrawColor(...COLOR.linea);
    doc.setLineWidth(0.3);
    doc.line(PAGINA.margen, y, PAGINA.ancho - PAGINA.margen, y);
  };

  const nombreDe = (o) => {
    const especie = buscarEspecie(o.especieId);
    return {
      comun: especie?.nombreComun ?? o.nombreComun,
      cientifico: especie?.nombreCientifico ?? o.nombreCientifico,
    };
  };

  /* ---------- Portada y resumen ---------- */

  parrafo('NaturaLab, cuaderno de campo', { tamano: 9, color: COLOR.suave }, { espacioDespues: 1 });
  parrafo(investigacion.titulo, { tamano: 24, estilo: 'bold', familia: 'times' }, { espacioDespues: 3 });
  const meta = [
    investigacion.fechaObservacion && `Fecha: ${formatearFecha(investigacion.fechaObservacion)}`,
    investigacion.lugarTexto && `Lugar: ${investigacion.lugarTexto}`,
    investigacion.equipoAlias && `Equipo: ${investigacion.equipoAlias}`,
  ].filter(Boolean);
  meta.forEach((m) => parrafo(m, { tamano: 10.5, color: COLOR.suave }, { espacioDespues: 0.5 }));
  y += 2;
  parrafo(investigacion.descripcion, { tamano: 10.5 }, { espacioDespues: 4 });

  const resumen = resumirBiodiversidad(observaciones, parcelas);
  const taxones = resumen.taxones.map((t) => {
    const especie = buscarEspecie(t.especieId);
    return especie ? { ...t, nombreComun: especie.nombreComun, nombreCientifico: especie.nombreCientifico } : t;
  });

  titulo('Resumen');
  if (resumen.N === 0) {
    parrafo('Todavía no hay observaciones registradas.', { tamano: 10.5, color: COLOR.suave });
  } else {
    parrafo(
      `${plural(resumen.S, 'especie', 'especies')} y ${plural(resumen.N, 'individuo', 'individuos')} en ${plural(parcelas.length, 'parcela', 'parcelas')}${resumen.superficieM2 ? ` (${formatearNumero(resumen.superficieM2, 1)} m²)` : ''}.`,
      { tamano: 10.5 },
    );

    // Franja de composición
    asegurar(14);
    let x = PAGINA.margen;
    taxones.forEach((t, i) => {
      const ancho = ANCHO_UTIL * t.proporcion;
      doc.setFillColor(...hexARgb(PALETA[i % PALETA.length]));
      doc.rect(x, y, Math.max(ancho - 0.4, 0.3), 9, 'F');
      x += ancho;
    });
    y += 13;

    // Leyenda y tabla
    const columnas = { nombre: PAGINA.margen + 6, n: PAGINA.margen + 125, pct: PAGINA.ancho - PAGINA.margen };
    taxones.forEach((t, i) => {
      const alto = fuente({ tamano: 10 });
      asegurar(alto + 1);
      doc.setFillColor(...hexARgb(PALETA[i % PALETA.length]));
      doc.rect(PAGINA.margen, y + alto * 0.18, 3.2, 3.2, 'F');
      fuente({ tamano: 10, estilo: 'bold' });
      const nombre = textoPdf(t.nombreComun);
      doc.text(nombre, columnas.nombre, y + alto * 0.72);
      if (t.nombreCientifico) {
        const anchoNombre = doc.getTextWidth(`${nombre} `);
        fuente({ tamano: 10, estilo: 'italic', familia: 'times', color: COLOR.suave });
        doc.text(textoPdf(t.nombreCientifico + (t.pendiente ? ' (pendiente de revisar)' : '')), columnas.nombre + anchoNombre, y + alto * 0.72);
      }
      fuente({ tamano: 10 });
      doc.text(formatearNumero(t.abundancia), columnas.n, y + alto * 0.72, { align: 'right' });
      doc.text(textoPdf(formatearPorcentaje(t.proporcion, 1)), columnas.pct, y + alto * 0.72, { align: 'right' });
      y += alto + 0.6;
    });
    y += 3;

    titulo('Índices de biodiversidad', 13);
    const indicadores = [
      ['Riqueza (S)', plural(resumen.S, 'especie', 'especies')],
      ['Abundancia (N)', plural(resumen.N, 'individuo', 'individuos')],
      ["Índice de Shannon (H')", formatearNumero(resumen.shannon, 3)],
      ["Equitatividad de Pielou (J')", resumen.pielou === null ? 'No aplicable (una sola especie)' : formatearNumero(resumen.pielou, 3)],
      ['Especie dominante', `${taxones[0].nombreComun}, ${formatearPorcentaje(taxones[0].proporcion, 2)}`],
      ['Densidad', resumen.densidadM2 === null ? 'Sin superficie conocida' : `${formatearNumero(resumen.densidadM2, 2)} individuos/m²`],
    ];
    indicadores.forEach(([etiqueta, valor]) => {
      const alto = fuente({ tamano: 10.5 });
      asegurar(alto);
      fuente({ tamano: 10.5, color: COLOR.suave });
      doc.text(textoPdf(etiqueta), PAGINA.margen, y + alto * 0.72);
      fuente({ tamano: 10.5, estilo: 'bold' });
      doc.text(textoPdf(valor), PAGINA.margen + 70, y + alto * 0.72);
      y += alto;
    });
    y += 3;
    parrafo(
      `Conclusión: en el conjunto de parcelas se han registrado ${plural(resumen.S, 'especie', 'especies')} y ${plural(resumen.N, 'individuo', 'individuos')}. La más abundante es ${taxones[0].nombreComun}, con el ${formatearPorcentaje(taxones[0].proporcion)} del total. Estos valores describen la muestra registrada, no todo el espacio natural.`,
      { tamano: 10.5 },
    );
    if (resumen.taxonesPendientes > 0) {
      parrafo(
        `${plural(resumen.taxonesPendientes, 'especie tiene', 'especies tienen')} la identificación pendiente de revisar; los índices pueden cambiar al confirmarlas.`,
        { tamano: 9.5, color: COLOR.ocre },
      );
    }
    parrafo(
      "Fórmulas: pi = ni / N; H' = -Suma de pi·ln(pi), con logaritmo natural; J' = H' / ln(S).",
      { tamano: 8.5, color: COLOR.suave },
    );
  }

  /* ---------- Observaciones por parcela ---------- */

  const fotos = obtenerFotos ? await obtenerFotos(observaciones) : [];
  const fotosPorId = new Map(fotos.map((f) => [f.id, f]));

  for (const parcela of parcelas) {
    const lista = observaciones
      .filter((o) => o.parcelaId === parcela.id)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    nuevaPagina();
    const superficie = parcela.superficie
      ? `, ${formatearNumero(parcela.superficie, parcela.superficie % 1 ? 1 : 0)} ${UNIDADES_SUPERFICIE[parcela.unidadSuperficie]?.etiqueta ?? ''}`
      : '';
    titulo(`Parcela ${parcela.codigo}${superficie}`, 16);
    parrafo(parcela.descripcion, { tamano: 10, color: COLOR.suave }, { espacioDespues: 3 });
    if (lista.length === 0) {
      parrafo('Sin observaciones.', { tamano: 10, color: COLOR.suave });
      continue;
    }

    for (const o of lista) {
      const { comun, cientifico } = nombreDe(o);
      const registro = o.fotoLocalId ? fotosPorId.get(o.fotoLocalId) : null;
      let imagen = null;
      if (registro && prepararFoto) {
        try {
          imagen = await prepararFoto(registro);
        } catch {
          imagen = null;
        }
      }

      const anchoFoto = 62;
      const xTexto = imagen ? PAGINA.margen + anchoFoto + 6 : PAGINA.margen;
      const anchoTexto = imagen ? ANCHO_UTIL - anchoFoto - 6 : ANCHO_UTIL;
      let altoFoto = 0;
      let anchoDibujo = 0;
      if (imagen) {
        const proporcion = imagen.alto / imagen.ancho;
        anchoDibujo = anchoFoto;
        altoFoto = anchoFoto * proporcion;
        if (altoFoto > 80) {
          altoFoto = 80;
          anchoDibujo = altoFoto / proporcion;
        }
      }

      const bloques = [
        { texto: comun, estilo: { tamano: 12, estilo: 'bold' } },
        cientifico && { texto: cientifico, estilo: { tamano: 11, estilo: 'italic', familia: 'times', color: COLOR.suave } },
        { texto: `Individuos: ${o.abundancia}`, estilo: { tamano: 10.5 } },
        o.estadoIdentificacion !== 'confirmada' && {
          texto: `Identificación: ${ESTADOS_IDENTIFICACION[o.estadoIdentificacion]}`,
          estilo: { tamano: 10, color: COLOR.ocre },
        },
        o.notas && { texto: `Notas: ${o.notas}`, estilo: { tamano: 10 } },
        { texto: `Registrada el ${formatearFecha(o.fecha)}`, estilo: { tamano: 8.5, color: COLOR.suave } },
      ].filter(Boolean);
      const altoTexto = bloques.reduce((s, b) => s + lineasDe(b.texto, anchoTexto, b.estilo).length * fuente(b.estilo), 0);
      const altoBloque = Math.max(altoFoto, altoTexto) + 6;

      asegurar(Math.min(altoBloque, limite - PAGINA.margen));
      const yInicio = y;
      if (imagen) {
        doc.addImage(imagen.datos, 'JPEG', PAGINA.margen, y, anchoDibujo, altoFoto, undefined, 'FAST');
      }
      for (const b of bloques) {
        const alto = fuente(b.estilo);
        for (const linea of lineasDe(b.texto, anchoTexto, b.estilo)) {
          asegurar(alto);
          fuente(b.estilo);
          doc.text(linea, xTexto, y + alto * 0.72);
          y += alto;
        }
      }
      y = Math.max(y, yInicio + altoFoto) + 3;
      separador();
      y += 3;
    }
  }

  /* ---------- Pie de página ---------- */

  const total = doc.getNumberOfPages();
  const generado = `Generado con NaturaLab el ${formatearFecha(new Date().toISOString())}`;
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    fuente({ tamano: 8, color: COLOR.suave });
    doc.text(textoPdf(generado), PAGINA.margen, PAGINA.alto - 10);
    doc.text(`Página ${i} de ${total}`, PAGINA.ancho - PAGINA.margen, PAGINA.alto - 10, { align: 'right' });
  }

  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
}
