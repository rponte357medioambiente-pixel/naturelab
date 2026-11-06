import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { cerrarBD, NOMBRE_BD } from '../src/almacenamiento/db.js';
import { crearIntercepcion, crearTransecto } from '../src/almacenamiento/modelo.js';
import { guardarLote, guardarObservacion, obtenerDatosInvestigacion } from '../src/almacenamiento/repositorio.js';
import { resumirCobertura } from '../src/calculos/cobertura.js';
import { construirZip } from '../src/importacion-exportacion/copiaZip.js';
import { leerArchivoCopia, validarPaquete } from '../src/importacion-exportacion/esquema.js';
import { construirPaquete, csvAnotaciones, csvCobertura } from '../src/importacion-exportacion/exportar.js';
import { planificarImportacion } from '../src/importacion-exportacion/importar.js';
import { crearEjemploSalar } from '../src/laboratorios/biodiversidad/ejemploSalar.js';
import { MODELOS } from '../src/modelos/registro.js';
import { crearModeloRioAntas, ID_RIO_ANTAS } from '../src/modelos/rioAntas.js';

afterEach(async () => {
  await cerrarBD();
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = resolve;
  });
});

const comoArchivo = async (blob, nombre) => new File([await blob.arrayBuffer()], nombre, { type: blob.type });

describe('modelos', () => {
  it('cada modelo tiene identificadores fijos y su tipo de práctica', () => {
    const ids = MODELOS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MODELOS) {
      const a = m.crear();
      const b = m.crear();
      expect(a.investigacion.id).toBe(m.id);
      expect(a.observaciones.map((o) => o.id)).toEqual(b.observaciones.map((o) => o.id));
      expect(a.investigacion.tipoPractica).toBe(m.tipoPractica);
    }
  });

  it('el modelo de Río Antas se guarda y se lee con sus manchas', async () => {
    await guardarLote(crearModeloRioAntas());
    await guardarLote(crearModeloRioAntas());
    const datos = await obtenerDatosInvestigacion(ID_RIO_ANTAS);
    expect(datos.observaciones).toHaveLength(4);
    expect(datos.parcelas[0].longitudCm).toBe(400);
    expect(resumirCobertura(datos.parcelas, datos.observaciones).coberturaTotal).toBeCloseTo(1, 6);
  });
});

describe('copia de una investigación de transectos', () => {
  it('ida y vuelta en ZIP sin alterar las manchas', async () => {
    const modelo = crearModeloRioAntas();
    const zip = await construirZip(construirPaquete(modelo, null), []);
    const r = await leerArchivoCopia(await comoArchivo(zip, 'copia.zip'));
    expect(r.ok).toBe(true);
    expect(r.paquete.investigacion.tipoPractica).toBe('transecto');
    expect(r.paquete.parcelas[0].modoAnotacion).toBe('longitudes');
    const lotus = r.paquete.observaciones.find((o) => o.especieId === 'lotus-creticus');
    expect(lotus.longitudes).toEqual([1, 12, 5, 28]);
    expect(lotus.abundancia).toBeNull();
  });

  it('valida tramos y medidas', () => {
    const modelo = crearModeloRioAntas();
    const paquete = construirPaquete(modelo, null);
    paquete.parcelas[0].modoAnotacion = 'tramos';
    paquete.observaciones[0].tramos = [{ desde: 390, hasta: 450 }]; // pasa de 400 cm
    expect(validarPaquete(paquete).ok).toBe(false);

    const otro = construirPaquete(modelo, null);
    otro.observaciones[1].longitudes = [12, -3];
    expect(validarPaquete(otro).ok).toBe(false);
  });

  it('las copias de la versión 1 se importan como recuento en parcela', () => {
    const paquete = construirPaquete(crearEjemploSalar(), null);
    paquete.versionEsquema = 1;
    delete paquete.investigacion.tipoPractica;
    const r = validarPaquete(paquete);
    expect(r.ok).toBe(true);
    expect(r.paquete.investigacion.tipoPractica).toBe('parcela');
  });

  it('al fusionar detecta cambios en las manchas', async () => {
    const modelo = crearModeloRioAntas();
    await guardarLote(modelo);
    const existente = await obtenerDatosInvestigacion(ID_RIO_ANTAS);
    const igual = validarPaquete(construirPaquete(modelo, null)).paquete;
    expect(planificarImportacion(igual, existente).totalConflictos).toBe(0);

    const cambiado = construirPaquete(modelo, null);
    cambiado.observaciones[1].longitudes = [1, 12, 5, 30];
    const plan = planificarImportacion(validarPaquete(cambiado).paquete, existente);
    expect(plan.observaciones.conflictos).toHaveLength(1);
  });
});

describe('anotar en un transecto nuevo', () => {
  it('crea transecto y especie, y guarda tramos', async () => {
    const modelo = crearModeloRioAntas();
    await guardarLote(modelo);
    const t2 = crearTransecto(ID_RIO_ANTAS, { codigo: 'T2', orientacion: 'Norte-Sur', modoAnotacion: 'tramos' });
    await guardarLote({ investigacion: modelo.investigacion, parcelas: [t2] });
    const nueva = crearIntercepcion(ID_RIO_ANTAS, t2.id, {
      especieId: 'elymus-farctus',
      nombreComun: 'Grama de los arenales',
      tramos: [{ desde: 0, hasta: 200 }, { desde: 250, hasta: 400 }],
    });
    await guardarObservacion(nueva);
    const datos = await obtenerDatosInvestigacion(ID_RIO_ANTAS);
    const r = resumirCobertura(datos.parcelas, datos.observaciones);
    expect(r.L).toBe(800);
    const grama = r.taxones.find((t) => t.especieId === 'elymus-farctus');
    expect(grama.cm).toBe(670);
    expect(grama.frecuencia).toBe(2);
    expect(r.sueloCm).toBe(50);
  });
});

describe('CSV de transectos', () => {
  it('incluye cada mancha y los resultados con coma decimal', () => {
    const modelo = crearModeloRioAntas();
    const anotaciones = csvAnotaciones(modelo);
    expect(anotaciones).toContain('"1+12+5+28"');
    const r = resumirCobertura(modelo.parcelas, modelo.observaciones);
    const cobertura = csvCobertura(r, 'el transecto T1');
    expect(cobertura).toContain('"11,50"');
    expect(cobertura).toContain('"Cobertura total (%)";"100,00"');
  });
});

describe('paleta de la investigación en las copias', () => {
  it('conserva una paleta válida y descarta una desconocida', () => {
    const modelo = crearModeloRioAntas();
    const conPaleta = validarPaquete(construirPaquete(modelo, null));
    expect(conPaleta.paquete.investigacion.paleta).toBe('terracota');

    const rara = construirPaquete(modelo, null);
    rara.investigacion.paleta = 'neon';
    const r = validarPaquete(rara);
    expect(r.ok).toBe(true);
    expect(r.paquete.investigacion.paleta).toBeNull();
  });
});
