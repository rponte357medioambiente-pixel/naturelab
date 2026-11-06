/**
 * Reglas de importación (apartado 8.3 y 9.3):
 * - Los registros se identifican por su id estable.
 * - Mismo id y mismo contenido: duplicado, se omite.
 * - Mismo id y contenido distinto: conflicto, se resuelve con una decisión explícita.
 * - Id nuevo: se añade.
 */

const CAMPOS_PARCELA = [
  'codigo',
  'superficie',
  'unidadSuperficie',
  'descripcion',
  'notas',
  // Transectos
  'longitudCm',
  'orientacion',
  'modoAnotacion',
  'sueloDesnudo',
];
const CAMPOS_OBSERVACION = [
  'parcelaId',
  'especieId',
  'nombreComun',
  'nombreCientifico',
  'abundancia',
  'notas',
  'estadoIdentificacion',
  'fotoLocalId',
  // Anotaciones de transecto
  'longitudes',
  'tramos',
];

/** Compara un campo; las listas (manchas, tramos) se comparan por su contenido. */
function mismoValor(a, b) {
  const x = a ?? null;
  const y = b ?? null;
  if (typeof x === 'object' || typeof y === 'object') return JSON.stringify(x) === JSON.stringify(y);
  return x === y;
}

function mismoContenido(a, b, campos) {
  return campos.every((campo) => mismoValor(a[campo], b[campo]));
}

function clasificar(importados, locales, campos, tipo) {
  const porId = new Map(locales.map((r) => [r.id, r]));
  const resultado = { nuevos: [], iguales: [], conflictos: [] };
  for (const importado of importados) {
    const local = porId.get(importado.id);
    if (!local) resultado.nuevos.push(importado);
    else if (mismoContenido(local, importado, campos)) resultado.iguales.push(importado);
    else {
      resultado.conflictos.push({
        tipo,
        id: importado.id,
        local,
        importado,
        importadoMasReciente: (importado.fechaModificacion ?? '') > (local.fechaModificacion ?? ''),
      });
    }
  }
  return resultado;
}

/**
 * Compara una copia validada con lo que ya hay en el dispositivo.
 * @param {object} paquete  salida de validarPaquete().paquete
 * @param {object|null} existente  datos locales de la misma investigación, o null
 */
export function planificarImportacion(paquete, existente) {
  if (!existente) {
    return {
      existe: false,
      parcelas: { nuevos: paquete.parcelas, iguales: [], conflictos: [] },
      observaciones: { nuevos: paquete.observaciones, iguales: [], conflictos: [] },
      totalConflictos: 0,
    };
  }

  // Un código de parcela ya usado localmente por otra parcela distinta también es conflicto.
  const codigosLocales = new Map(existente.parcelas.map((p) => [p.codigo.toLocaleLowerCase('es'), p.id]));
  const parcelas = clasificar(paquete.parcelas, existente.parcelas, CAMPOS_PARCELA, 'parcela');
  const codigosRepetidos = parcelas.nuevos.filter((p) => codigosLocales.has(p.codigo.toLocaleLowerCase('es')));

  const observaciones = clasificar(
    paquete.observaciones,
    existente.observaciones,
    CAMPOS_OBSERVACION,
    'observacion',
  );

  return {
    existe: true,
    parcelas,
    observaciones,
    codigosRepetidos,
    totalConflictos: parcelas.conflictos.length + observaciones.conflictos.length,
  };
}

/**
 * Construye el lote que se guardará al fusionar.
 * @param {'mantenerLocal'|'usarImportado'} resolucion  qué hacer con los conflictos
 */
export function prepararFusion(paquete, existente, plan, resolucion = 'mantenerLocal') {
  const usarImportado = resolucion === 'usarImportado';
  const conflictosParcelas = usarImportado ? plan.parcelas.conflictos.map((c) => c.importado) : [];
  const conflictosObs = usarImportado ? plan.observaciones.conflictos.map((c) => c.importado) : [];

  // Las parcelas nuevas cuyo código ya existe se renombran para que sigan siendo distinguibles.
  const codigosUsados = new Set(existente.parcelas.map((p) => p.codigo.toLocaleLowerCase('es')));
  const parcelasNuevas = plan.parcelas.nuevos.map((parcela) => {
    let codigo = parcela.codigo;
    let sufijo = 2;
    while (codigosUsados.has(codigo.toLocaleLowerCase('es'))) {
      codigo = `${parcela.codigo} (${sufijo})`;
      sufijo += 1;
    }
    codigosUsados.add(codigo.toLocaleLowerCase('es'));
    return codigo === parcela.codigo ? parcela : { ...parcela, codigo };
  });

  const observaciones = [...plan.observaciones.nuevos, ...conflictosObs];
  const idsEscritas = new Set(observaciones.map((o) => o.id));
  return {
    investigacion: existente.investigacion,
    parcelas: [...parcelasNuevas, ...conflictosParcelas],
    observaciones,
    fotos: (paquete.fotos ?? []).filter((f) => idsEscritas.has(f.observacionId)),
  };
}

/** Importa la copia como una investigación independiente, con identificadores nuevos. */
export function prepararCopiaNueva(paquete, generarId) {
  const investigacionId = generarId();
  const idsParcelas = new Map(paquete.parcelas.map((p) => [p.id, generarId()]));
  const idsObservaciones = new Map(paquete.observaciones.map((o) => [o.id, generarId()]));
  const idsFotos = new Map((paquete.fotos ?? []).map((f) => [f.id, generarId()]));
  return {
    investigacion: {
      ...paquete.investigacion,
      id: investigacionId,
      titulo: `${paquete.investigacion.titulo} (copia)`,
      fechaUltimaExportacion: null,
    },
    parcelas: paquete.parcelas.map((p) => ({ ...p, id: idsParcelas.get(p.id), investigacionId })),
    observaciones: paquete.observaciones.map((o) => ({
      ...o,
      id: idsObservaciones.get(o.id),
      investigacionId,
      parcelaId: idsParcelas.get(o.parcelaId),
      fotoLocalId: o.fotoLocalId ? idsFotos.get(o.fotoLocalId) ?? null : null,
    })),
    fotos: (paquete.fotos ?? []).map((f) => ({
      ...f,
      id: idsFotos.get(f.id),
      observacionId: idsObservaciones.get(f.observacionId),
      investigacionId,
    })),
  };
}
