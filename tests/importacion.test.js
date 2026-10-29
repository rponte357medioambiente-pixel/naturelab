import { describe, expect, it } from 'vitest';
import { construirPaquete } from '../src/importacion-exportacion/exportar.js';
import { validarPaquete } from '../src/importacion-exportacion/esquema.js';
import {
  planificarImportacion,
  prepararCopiaNueva,
  prepararFusion,
} from '../src/importacion-exportacion/importar.js';
import { crearEjemploSalar } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

const paqueteValido = () => JSON.parse(JSON.stringify(construirPaquete(crearEjemploSalar(), null)));

describe('Validación de copias', () => {
  it('acepta una copia exportada por la propia app sin alterar los recuentos', () => {
    const r = validarPaquete(paqueteValido());
    expect(r.ok).toBe(true);
    expect(r.paquete.observaciones.map((o) => o.abundancia)).toEqual([2, 1, 4, 1, 20, 1, 1, 2, 1]);
  });

  it('rechaza archivos que no son de NaturaLab', () => {
    expect(validarPaquete({ version: 1, records: [] }).ok).toBe(false);
    expect(validarPaquete(null).ok).toBe(false);
    expect(validarPaquete([]).ok).toBe(false);
  });

  it('rechaza versiones de esquema futuras', () => {
    const p = paqueteValido();
    p.versionEsquema = 99;
    const r = validarPaquete(p);
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toMatch(/más reciente/);
  });

  it('rechaza abundancias inválidas y referencias rotas', () => {
    const p = paqueteValido();
    p.observaciones[0].abundancia = -3;
    p.observaciones[1].parcelaId = 'no-existe';
    const r = validarPaquete(p);
    expect(r.ok).toBe(false);
    expect(r.totalErrores).toBe(2);
  });

  it('rechaza identificadores con caracteres no permitidos', () => {
    const p = paqueteValido();
    p.observaciones[0].id = '"><img src=x onerror=alert(1)>';
    expect(validarPaquete(p).ok).toBe(false);
  });

  it('descarta campos desconocidos y no importa fotografías', () => {
    const p = paqueteValido();
    p.observaciones[0].photo = 'data:image/jpeg;base64,AAAA';
    p.observaciones[0].fotoLocalId = 'algo';
    p.investigacion.script = '<script>';
    const r = validarPaquete(p);
    expect(r.ok).toBe(true);
    expect(r.paquete.observaciones[0]).not.toHaveProperty('photo');
    expect(r.paquete.observaciones[0].fotoLocalId).toBeNull();
    expect(r.paquete.investigacion).not.toHaveProperty('script');
  });

  it('descarta observaciones repetidas dentro del archivo y avisa', () => {
    const p = paqueteValido();
    p.observaciones.push({ ...p.observaciones[0] });
    const r = validarPaquete(p);
    expect(r.ok).toBe(true);
    expect(r.paquete.observaciones).toHaveLength(9);
    expect(r.avisos[0]).toMatch(/repetidas/);
  });
});

describe('Fusión y deduplicación', () => {
  const local = crearEjemploSalar();

  it('importar dos veces la misma copia no duplica nada', () => {
    const { paquete } = validarPaquete(paqueteValido());
    const plan = planificarImportacion(paquete, local);
    expect(plan.observaciones.nuevos).toHaveLength(0);
    expect(plan.observaciones.iguales).toHaveLength(9);
    expect(plan.totalConflictos).toBe(0);
    const lote = prepararFusion(paquete, local, plan);
    expect(lote.observaciones).toHaveLength(0);
  });

  it('detecta conflictos y respeta la decisión', () => {
    const p = paqueteValido();
    p.observaciones[4].abundancia = 25;
    p.observaciones.push({ ...p.observaciones[0], id: 'nueva-obs', abundancia: 3 });
    const { paquete } = validarPaquete(p);
    const plan = planificarImportacion(paquete, local);
    expect(plan.observaciones.nuevos).toHaveLength(1);
    expect(plan.observaciones.conflictos).toHaveLength(1);

    const conservar = prepararFusion(paquete, local, plan, 'mantenerLocal');
    expect(conservar.observaciones.map((o) => o.id)).toEqual(['nueva-obs']);

    const sustituir = prepararFusion(paquete, local, plan, 'usarImportado');
    expect(sustituir.observaciones).toHaveLength(2);
    expect(sustituir.observaciones.find((o) => o.abundancia === 25)).toBeTruthy();
  });

  it('renombra parcelas nuevas cuyo código ya existe', () => {
    const p = paqueteValido();
    p.parcelas.push({ ...p.parcelas[0], id: 'otra-parcela' });
    p.parcelas[1].codigo = 'p1';
    p.parcelas[0].codigo = 'P0';
    const { paquete } = validarPaquete(p);
    const plan = planificarImportacion(paquete, local);
    const lote = prepararFusion(paquete, local, plan);
    expect(lote.parcelas.find((x) => x.id === 'otra-parcela').codigo).toBe('p1 (2)');
  });

  it('importar como copia nueva cambia todos los identificadores de forma coherente', () => {
    let n = 0;
    const generarId = () => `id-${++n}`;
    const { paquete } = validarPaquete(paqueteValido());
    const copia = prepararCopiaNueva(paquete, generarId);
    const idsOriginales = new Set([paquete.investigacion.id, ...paquete.parcelas.map((x) => x.id), ...paquete.observaciones.map((x) => x.id)]);
    expect(idsOriginales.has(copia.investigacion.id)).toBe(false);
    expect(copia.observaciones.every((o) => o.investigacionId === copia.investigacion.id)).toBe(true);
    expect(copia.observaciones.every((o) => o.parcelaId === copia.parcelas[0].id)).toBe(true);
    expect(copia.investigacion.titulo).toMatch(/\(copia\)$/);
  });
});
