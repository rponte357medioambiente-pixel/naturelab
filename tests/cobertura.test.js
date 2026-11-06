import { describe, expect, it } from 'vitest';
import {
  largoDeTramos,
  leerLongitudes,
  resumirCobertura,
  resumirTransecto,
  textoLongitudes,
  unirTramos,
  validarLongitudTransecto,
  validarTramo,
} from '../src/calculos/cobertura.js';
import { crearModeloRioAntas } from '../src/modelos/rioAntas.js';

const transecto = (campos = {}) => ({
  id: 't1',
  investigacionId: 'i1',
  codigo: 'T1',
  longitudCm: 400,
  orientacion: 'Este-Oeste',
  modoAnotacion: 'longitudes',
  sueloDesnudo: [],
  ...campos,
});
const obs = (id, campos) => ({
  id,
  investigacionId: 'i1',
  parcelaId: 't1',
  especieId: id,
  nombreComun: id,
  nombreCientifico: '',
  estadoIdentificacion: 'confirmada',
  longitudes: [],
  tramos: [],
  ...campos,
});

describe('lectura de medidas', () => {
  it('lee «1+12+5+28» y admite coma decimal y espacios', () => {
    expect(leerLongitudes('1+12+5+28')).toEqual({ valida: true, valores: [1, 12, 5, 28] });
    expect(leerLongitudes(' 2,5 + 3 ')).toEqual({ valida: true, valores: [2.5, 3] });
    expect(leerLongitudes('')).toEqual({ valida: true, valores: [] });
  });

  it('rechaza textos, ceros y negativos', () => {
    expect(leerLongitudes('12+abc').valida).toBe(false);
    expect(leerLongitudes('0').valida).toBe(false);
    expect(leerLongitudes('-4').valida).toBe(false);
    expect(leerLongitudes('5-3').valida).toBe(false);
  });

  it('vuelve a escribir las medidas con coma decimal', () => {
    expect(textoLongitudes([1, 12, 2.5])).toBe('1+12+2,5');
  });

  it('valida la longitud de la línea y los tramos', () => {
    expect(validarLongitudTransecto('400')).toEqual({ valida: true, valor: 400 });
    expect(validarLongitudTransecto('0').valida).toBe(false);
    expect(validarLongitudTransecto('').valida).toBe(false);
    expect(validarTramo('20', '21', 400)).toEqual({ valido: true, tramo: { desde: 20, hasta: 21 } });
    expect(validarTramo('30', '20', 400).valido).toBe(false);
    expect(validarTramo('390', '410', 400).valido).toBe(false);
  });
});

describe('tramos', () => {
  it('une los que se solapan o se tocan', () => {
    expect(unirTramos([{ desde: 10, hasta: 20 }, { desde: 15, hasta: 30 }, { desde: 30, hasta: 35 }, { desde: 50, hasta: 60 }]))
      .toEqual([{ desde: 10, hasta: 35 }, { desde: 50, hasta: 60 }]);
    expect(largoDeTramos([{ desde: 0, hasta: 10 }, { desde: 5, hasta: 12 }])).toBe(12);
  });
});

describe('modelo de Río Antas (transecto de 4 m, anotado por longitudes)', () => {
  const modelo = crearModeloRioAntas();
  const r = resumirCobertura(modelo.parcelas, modelo.observaciones);

  it('reproduce los valores del cuaderno de campo', () => {
    expect(r.L).toBe(400);
    expect(r.S).toBe(4);
    const porNombre = Object.fromEntries(r.taxones.map((t) => [t.nombreComun, t]));
    expect(porNombre['Grama de los arenales'].cm).toBe(320);
    expect(porNombre['Grama de los arenales'].proporcion).toBeCloseTo(0.8, 6);
    expect(porNombre['Cuernecillo de mar'].cm).toBe(46);
    expect(porNombre['Cuernecillo de mar'].numeroManchas).toBe(4);
    expect(porNombre['Cuernecillo de mar'].proporcion).toBeCloseTo(0.115, 6);
    expect(porNombre['Hierba carnicera'].proporcion).toBeCloseTo(0.065, 6);
    expect(porNombre['Planta rodante'].proporcion).toBeCloseTo(0.02, 6);
  });

  it('cobertura total del 100 % y sin suelo desnudo', () => {
    expect(r.coberturaTotal).toBeCloseTo(1, 6);
    expect(r.suelo).toBe(0);
    expect(r.faltanCm).toBe(0);
    expect(r.solapeCm).toBe(0);
    expect(r.dominante.nombreComun).toBe('Grama de los arenales');
  });
});

describe('modo longitudes', () => {
  it('avisa de lo que falta por anotar', () => {
    const r = resumirTransecto(transecto(), [obs('a', { longitudes: [100] })]);
    expect(r.faltanCm).toBe(300);
    expect(r.coberturaTotal).toBeCloseTo(0.25, 6);
  });

  it('con suelo desnudo anotado, calcula la cobertura total', () => {
    const r = resumirTransecto(transecto({ sueloDesnudo: [40, 60] }), [obs('a', { longitudes: [300] })]);
    expect(r.sueloCm).toBe(100);
    expect(r.faltanCm).toBe(0);
    expect(r.coberturaTotal).toBeCloseTo(0.75, 6);
  });

  it('detecta solapes cuando la suma pasa de la longitud', () => {
    const r = resumirTransecto(transecto(), [obs('a', { longitudes: [300] }), obs('b', { longitudes: [150] })]);
    expect(r.solapeCm).toBe(50);
    expect(r.coberturaTotal).toBeCloseTo(1, 6);
    expect(r.taxones.reduce((s, t) => s + t.proporcion, 0)).toBeCloseTo(1.125, 6);
  });

  it('no cuenta dos veces una observación repetida', () => {
    const a = obs('a', { longitudes: [50] });
    expect(resumirTransecto(transecto(), [a, a]).taxones[0].cm).toBe(50);
  });
});

describe('modo inicio y fin', () => {
  const t = transecto({ modoAnotacion: 'tramos' });

  it('calcula el suelo desnudo como lo que no cubre ninguna especie', () => {
    const r = resumirTransecto(t, [
      obs('a', { tramos: [{ desde: 0, hasta: 100 }, { desde: 200, hasta: 250 }] }),
      obs('b', { tramos: [{ desde: 90, hasta: 120 }] }),
    ]);
    expect(r.taxones.find((x) => x.clave === 'especie:a').cm).toBe(150);
    expect(r.cubiertoCm).toBe(170);
    expect(r.sueloCm).toBe(230);
    expect(r.solapeCm).toBe(10);
    expect(r.coberturaTotal).toBeCloseTo(170 / 400, 6);
  });

  it('los tramos repetidos de una misma especie cuentan una vez', () => {
    const r = resumirTransecto(t, [obs('a', { tramos: [{ desde: 0, hasta: 50 }, { desde: 40, hasta: 60 }] })]);
    expect(r.taxones[0].cm).toBe(60);
    expect(r.taxones[0].numeroManchas).toBe(1);
  });
});

describe('varios transectos', () => {
  it('suma cm de todas las líneas y calcula la frecuencia', () => {
    const t1 = transecto();
    const t2 = transecto({ id: 't2', codigo: 'T2', orientacion: 'Norte-Sur' });
    const r = resumirCobertura(
      [t1, t2],
      [
        obs('a', { longitudes: [320] }),
        obs('b', { longitudes: [80] }),
        { ...obs('b2', { longitudes: [400] }), parcelaId: 't2', especieId: 'b' },
      ],
    );
    expect(r.L).toBe(800);
    const b = r.taxones.find((x) => x.especieId === 'b');
    expect(b.cm).toBe(480);
    expect(b.proporcion).toBeCloseTo(0.6, 6);
    expect(b.frecuencia).toBe(2);
    expect(r.taxones.find((x) => x.especieId === 'a').frecuencia).toBe(1);
    expect(r.coberturaTotal).toBeCloseTo(1, 6);
  });
});
