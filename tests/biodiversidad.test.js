import { describe, expect, it } from 'vitest';
import {
  agruparPorTaxon,
  aMetrosCuadrados,
  calcularIndices,
  resumirBiodiversidad,
  validarAbundancia,
  validarSuperficie,
} from '../src/calculos/biodiversidad.js';
import { crearEjemploSalar } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

describe('Criterio de aceptación: ejemplo del Salar de los Canos', () => {
  const { parcelas, observaciones } = crearEjemploSalar();
  const resumen = resumirBiodiversidad(observaciones, parcelas);

  it('N = 33 y S = 9', () => {
    expect(resumen.N).toBe(33);
    expect(resumen.S).toBe(9);
  });

  it('H′ ≈ 1,429 y J′ ≈ 0,650', () => {
    expect(resumen.shannon).toBeCloseTo(1.429, 3);
    expect(resumen.pielou).toBeCloseTo(0.650, 3);
  });

  it('el albardín domina con ≈ 60,61 %', () => {
    expect(resumen.dominante.nombreComun).toBe('Albardín');
    expect(resumen.dominante.proporcion * 100).toBeCloseTo(60.61, 2);
  });

  it('la densidad usa la superficie de 73,2 m²', () => {
    expect(resumen.superficieM2).toBeCloseTo(73.2, 6);
    expect(resumen.densidadM2).toBeCloseTo(33 / 73.2, 6);
  });

  it('las proporciones suman 1', () => {
    const suma = resumen.taxones.reduce((s, t) => s + t.proporcion, 0);
    expect(suma).toBeCloseTo(1, 10);
  });
});

describe('Casos límite', () => {
  it('N = 0 no divide entre cero', () => {
    const r = calcularIndices([]);
    expect(r.N).toBe(0);
    expect(r.shannon).toBeNull();
    expect(r.pielou).toBeNull();
    expect(r.motivoShannon).toMatch(/Sin observaciones/);
  });

  it('S = 1: H′ = 0 (sin −0) y Pielou no aplicable', () => {
    const r = calcularIndices([{ clave: 'a', abundancia: 7 }]);
    expect(Object.is(r.shannon, 0)).toBe(true);
    expect(r.pielou).toBeNull();
    expect(r.motivoPielou).toMatch(/no es aplicable/);
  });

  it('no cuenta dos veces una observación con el mismo id', () => {
    const obs = { id: 'x', parcelaId: 'p', especieId: 'e', nombreComun: 'E', abundancia: 3, estadoIdentificacion: 'confirmada' };
    const grupos = agruparPorTaxon([obs, { ...obs }, { ...obs, id: 'y' }]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].abundancia).toBe(6);
  });

  it('agrupa las no identificadas por su nombre provisional sin distinguir tildes', () => {
    const base = { parcelaId: 'p', especieId: null, estadoIdentificacion: 'desconocida', abundancia: 1 };
    const grupos = agruparPorTaxon([
      { ...base, id: '1', nombreComun: 'Gramínea A' },
      { ...base, id: '2', nombreComun: 'graminea a' },
      { ...base, id: '3', nombreComun: 'Gramínea B' },
    ]);
    expect(grupos).toHaveLength(2);
    expect(grupos.every((g) => g.pendiente)).toBe(true);
  });

  it('resume por parcela y en conjunto', () => {
    const parcelas = [
      { id: 'p1', superficie: 10, unidadSuperficie: 'm2' },
      { id: 'p2', superficie: null, unidadSuperficie: 'm2' },
    ];
    const observaciones = [
      { id: 'a', parcelaId: 'p1', especieId: 'e1', nombreComun: 'E1', abundancia: 5, estadoIdentificacion: 'confirmada' },
      { id: 'b', parcelaId: 'p2', especieId: 'e2', nombreComun: 'E2', abundancia: 5, estadoIdentificacion: 'confirmada' },
    ];
    const p1 = resumirBiodiversidad(observaciones, parcelas, 'p1');
    expect(p1.N).toBe(5);
    expect(p1.densidadM2).toBe(0.5);
    const todas = resumirBiodiversidad(observaciones, parcelas);
    expect(todas.N).toBe(10);
    expect(todas.shannon).toBeCloseTo(Math.log(2), 10);
    expect(todas.pielou).toBeCloseTo(1, 10);
    expect(todas.superficieM2).toBeNull(); // una parcela sin superficie: no se inventa
  });
});

describe('Validaciones', () => {
  it.each([
    [0, false],
    [-2, false],
    [2.5, false],
    ['abc', false],
    ['', false],
    [null, false],
    [Number.MAX_SAFE_INTEGER + 2, false],
    [1, true],
    ['20', true],
  ])('abundancia %s → válida: %s', (valor, esperado) => {
    expect(validarAbundancia(valor).valida).toBe(esperado);
  });

  it('superficie: vacía permitida, negativa o cero no', () => {
    expect(validarSuperficie('').valor).toBeNull();
    expect(validarSuperficie('73,2').valor).toBe(73.2);
    expect(validarSuperficie(-1).valida).toBe(false);
    expect(validarSuperficie(0).valida).toBe(false);
  });

  it('convierte hectáreas a m²', () => {
    expect(aMetrosCuadrados(0.5, 'ha')).toBe(5000);
    expect(aMetrosCuadrados(null, 'm2')).toBeNull();
  });
});
