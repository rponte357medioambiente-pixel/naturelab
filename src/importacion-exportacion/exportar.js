import { ESTADOS_IDENTIFICACION, VERSION_ESQUEMA } from '../almacenamiento/modelo.js';
import { UNIDADES_SUPERFICIE } from '../calculos/biodiversidad.js';
import { FORMATO_PAQUETE } from './esquema.js';

/* ---------- Copia JSON ---------- */

/**
 * Paquete de intercambio de una investigación. Las fotografías no van dentro
 * del JSON: viajan como archivos en la copia ZIP (copiaZip.js).
 */
export function construirPaquete({ investigacion, parcelas, observaciones }, catalogo, idsFotos = new Set()) {
  const idsEspecies = new Set(observaciones.map((o) => o.especieId).filter(Boolean));
  // eslint-disable-next-line no-unused-vars
  const { fechaUltimaExportacion, ...investigacionExportable } = investigacion;
  return {
    formato: FORMATO_PAQUETE,
    versionEsquema: VERSION_ESQUEMA,
    aplicacion: 'NaturaLab',
    exportadoEn: new Date().toISOString(),
    versionCatalogo: catalogo?.versionCatalogo ?? null,
    investigacion: investigacionExportable,
    parcelas,
    observaciones: observaciones.map((o) => ({ ...o, fotoLocalId: idsFotos.has(o.fotoLocalId) ? o.fotoLocalId : null })),
    referenciasCatalogo: (catalogo?.especies ?? [])
      .filter((e) => idsEspecies.has(e.id))
      .map(({ id, nombreComun, nombreCientifico, familia }) => ({ id, nombreComun, nombreCientifico, familia })),
  };
}

export function convertirEnSlug(texto) {
  return (
    String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'investigacion'
  );
}

export function nombreArchivo(investigacion, sufijo, extension) {
  const fecha = new Date().toISOString().slice(0, 10);
  return `naturalab-${convertirEnSlug(investigacion?.titulo)}-${sufijo}-${fecha}.${extension}`;
}

/* ---------- CSV ---------- */

/** Número con coma decimal, sin separador de miles, para hojas de cálculo en español. */
export function numeroCsv(valor, decimales) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
  const texto = decimales === undefined ? String(valor) : valor.toFixed(decimales);
  return texto.replace('.', ',');
}

/**
 * Celda CSV entre comillas. Los textos que empiezan por = + - @ se prefijan con
 * un apóstrofo para que la hoja de cálculo no los ejecute como fórmulas.
 */
export function celdaCsv(valor, { esNumero = false } = {}) {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  if (!esNumero && /^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Filas → CSV con separador «;», BOM UTF-8 y saltos CRLF (compatible con Excel en español). */
export function aCsv(filas) {
  const cuerpo = filas
    .map((fila) =>
      fila
        .map((celda) =>
          celda && typeof celda === 'object' && 'numero' in celda
            ? celdaCsv(celda.numero, { esNumero: true })
            : celdaCsv(celda),
        )
        .join(';'),
    )
    .join('\r\n');
  return `\ufeff${cuerpo}\r\n`;
}

const num = (valor, decimales) => ({ numero: numeroCsv(valor, decimales) });

export function csvObservaciones({ parcelas, observaciones }, buscarEspecie = () => null) {
  const parcelasPorId = new Map(parcelas.map((p) => [p.id, p]));
  const filas = [
    [
      'Parcela',
      'Superficie',
      'Unidad',
      'Nombre común',
      'Nombre científico',
      'Familia',
      'Individuos',
      'Identificación',
      'Notas',
      'Fecha de registro',
    ],
  ];
  const ordenadas = [...observaciones].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  for (const o of ordenadas) {
    const parcela = parcelasPorId.get(o.parcelaId);
    const especie = buscarEspecie(o.especieId);
    filas.push([
      parcela?.codigo ?? '',
      num(parcela?.superficie),
      parcela?.superficie ? UNIDADES_SUPERFICIE[parcela.unidadSuperficie]?.etiqueta ?? '' : '',
      especie?.nombreComun ?? o.nombreComun,
      especie?.nombreCientifico ?? o.nombreCientifico,
      especie?.familia ?? '',
      num(o.abundancia),
      ESTADOS_IDENTIFICACION[o.estadoIdentificacion] ?? '',
      o.notas,
      o.fecha,
    ]);
  }
  return aCsv(filas);
}

export function csvResultados(resumen, ambito) {
  const filas = [
    ['Ámbito', ambito],
    [],
    ['Especie', 'Nombre científico', 'Individuos (nᵢ)', 'Proporción (pᵢ)', '−pᵢ·ln(pᵢ)', 'Porcentaje', 'Identificación'],
    ...resumen.taxones.map((t) => [
      t.nombreComun,
      t.nombreCientifico,
      num(t.abundancia),
      num(t.proporcion, 5),
      num(t.terminoShannon, 5),
      num(t.proporcion * 100, 2),
      t.pendiente ? 'Pendiente de revisar' : 'Confirmada',
    ]),
    [],
    ['Indicador', 'Valor'],
    ['Abundancia total (N)', num(resumen.N)],
    ['Riqueza de especies (S)', num(resumen.S)],
    ['Índice de Shannon (H′, ln)', resumen.shannon === null ? 'No calculable' : num(resumen.shannon, 4)],
    ['Equitatividad de Pielou (J′)', resumen.pielou === null ? 'No aplicable' : num(resumen.pielou, 4)],
    ['Superficie (m²)', resumen.superficieM2 === null ? 'Desconocida' : num(resumen.superficieM2, 2)],
    ['Densidad (individuos/m²)', resumen.densidadM2 === null ? 'No calculable' : num(resumen.densidadM2, 4)],
  ];
  return aCsv(filas);
}
