import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HABITATS, habitatsDe, limpiarHabitats } from '../src/catalogos/habitats.js';
import { validarCatalogoPropio } from '../src/catalogos/especiesPropias.js';
import { validarPaquete } from '../src/importacion-exportacion/esquema.js';
import { construirPaquete, csvAnotaciones, csvObservaciones } from '../src/importacion-exportacion/exportar.js';
import { crearEjemploSalar } from '../src/laboratorios/biodiversidad/ejemploSalar.js';
import { crearModeloRioAntas } from '../src/modelos/rioAntas.js';
import {
  coordenadasDe,
  dondeSeHaObservado,
  enlaceMapa,
  formatearCoordenadas,
  leerCoordenada,
  leerCoordenadas,
  limpiarCoordenadas,
} from '../src/ubicacion/coordenadas.js';

describe('coordenadas', () => {
  it('lee grados decimales con punto o coma y comprueba los rangos', () => {
    expect(leerCoordenada('37.21610', 'lat')).toEqual({ valida: true, valor: 37.2161 });
    expect(leerCoordenada('-1,81320', 'lon')).toEqual({ valida: true, valor: -1.8132 });
    expect(leerCoordenada('', 'lat')).toEqual({ valida: true, valor: null });
    expect(leerCoordenada('95', 'lat').valida).toBe(false);
    expect(leerCoordenada('37°12', 'lat').valida).toBe(false);
  });

  it('exige latitud y longitud juntas y conserva la precisión del GPS', () => {
    expect(leerCoordenadas({ lat: '37.2', lon: '', precision: null }).valida).toBe(false);
    expect(leerCoordenadas({ lat: '', lon: '', precision: null })).toEqual({ valida: true, coordenadas: null, errores: {} });
    expect(leerCoordenadas({ lat: '37.21610', lon: '-1.81320', precision: 8.4 }).coordenadas).toEqual({ lat: 37.2161, lon: -1.8132, precision: 8 });
  });

  it('formatea y enlaza con OpenStreetMap', () => {
    const c = { lat: 37.2161, lon: -1.8132, precision: null };
    expect(formatearCoordenadas(c)).toBe('37.21610, -1.81320');
    expect(enlaceMapa(c)).toBe('https://www.openstreetmap.org/?mlat=37.21610&mlon=-1.81320#map=17/37.21610/-1.81320');
  });

  it('una parcela sin coordenadas usa las de la investigación', () => {
    const inv = { coordenadas: { lat: 1, lon: 2 } };
    expect(coordenadasDe({ coordenadas: null }, inv)).toBe(inv.coordenadas);
    expect(coordenadasDe({ coordenadas: { lat: 3, lon: 4 } }, inv)).toEqual({ lat: 3, lon: 4 });
    expect(limpiarCoordenadas({ lat: 100, lon: 0 }).valida).toBe(false);
  });
});

describe('dónde se ha observado una especie', () => {
  it('lista las investigaciones en que aparece, con la ubicación de cada transecto', () => {
    const rio = crearModeloRioAntas();
    rio.investigacion.coordenadas = { lat: 37.2161, lon: -1.8132, precision: 8 };
    const salar = crearEjemploSalar();
    const lista = dondeSeHaObservado('lotus-creticus', [salar, rio]);
    expect(lista).toHaveLength(1);
    expect(lista[0].investigacion.id).toBe(rio.investigacion.id);
    expect(lista[0].unidades[0].codigo).toBe('T1');
    expect(lista[0].unidades[0].coordenadas).toEqual(rio.investigacion.coordenadas);
    expect(dondeSeHaObservado('especie-inexistente', [salar, rio])).toEqual([]);
  });
});

describe('coordenadas en las copias y en los CSV', () => {
  it('viajan en la copia y se rechazan si no son válidas', () => {
    const rio = crearModeloRioAntas();
    rio.investigacion.coordenadas = { lat: 37.2161, lon: -1.8132, precision: 8 };
    rio.parcelas[0].coordenadas = { lat: 37.2165, lon: -1.813, precision: null };
    const r = validarPaquete(construirPaquete(rio, null));
    expect(r.ok).toBe(true);
    expect(r.paquete.investigacion.coordenadas).toEqual({ lat: 37.2161, lon: -1.8132, precision: 8 });
    expect(r.paquete.parcelas[0].coordenadas.lat).toBe(37.2165);

    const mala = construirPaquete(rio, null);
    mala.investigacion.coordenadas = { lat: 'norte', lon: 2 };
    expect(validarPaquete(mala).ok).toBe(false);
  });

  it('los CSV llevan latitud y longitud', () => {
    const salar = crearEjemploSalar();
    salar.investigacion.coordenadas = { lat: 37.25, lon: -1.85, precision: null };
    expect(csvObservaciones(salar)).toContain('"37,25000";"-1,85000"');
    const rio = crearModeloRioAntas();
    expect(csvAnotaciones(rio).split('\r\n')[0]).toContain('"Latitud";"Longitud"');
  });
});

describe('hábitat natural', () => {
  it('cada especie del catálogo tiene al menos un hábitat válido', () => {
    const catalogo = JSON.parse(readFileSync(new URL('../public/data/especies.json', import.meta.url), 'utf8'));
    for (const e of catalogo.especies) expect(habitatsDe(e).length, e.id).toBeGreaterThan(0);
    expect(HABITATS).toHaveLength(6);
  });

  it('descarta hábitats desconocidos o repetidos', () => {
    expect(limpiarHabitats(['dunas-costa', 'marte', 'dunas-costa', 'ribera'])).toEqual(['dunas-costa', 'ribera']);
    expect(limpiarHabitats('dunas')).toEqual([]);
  });

  it('las especies de Mi catálogo conservan su hábitat en la copia', () => {
    const r = validarCatalogoPropio({
      formato: 'naturalab-catalogo-propio',
      versionEsquema: 2,
      especies: [{ id: 'propia-1', nombreComun: 'Lentisco', habitatsNaturales: ['bosque', 'nada'] }],
    });
    expect(r.ok).toBe(true);
    expect(r.especies[0].habitatsNaturales).toEqual(['bosque']);
  });
});
