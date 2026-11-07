import { describe, expect, it } from 'vitest';
import { crearPartida, especiesJugables, pistaDe, resumirPartida } from '../src/juego/partida.js';

// Azar determinista para las pruebas
function azarFijo(semilla = 1) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const especie = (id, comun, cientifico, conImagen = true) => ({ id, nombreComun: comun, nombreCientifico: cientifico, conImagen, rasgos: [`Rasgo de ${comun}`] });
const catalogo = [
  especie('a', 'Albardín', 'Lygeum spartum'),
  especie('b', 'Taray', 'Tamarix canariensis'),
  especie('c', 'Albaida', 'Anthyllis cytisoides'),
  especie('d', 'Verdolaga', 'Portulaca oleracea'),
  especie('e', 'Salicornia', 'Salicornia sp.', false),
  especie('f', 'Mi planta', ''),
];
const tieneImagen = (e) => e.conImagen;

describe('especies que se pueden preguntar', () => {
  it('solo las que tienen imagen y el nombre que se pide', () => {
    expect(especiesJugables(catalogo, tieneImagen).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd', 'f']);
    expect(especiesJugables(catalogo, tieneImagen, { nombre: 'cientifico' }).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('se pueden limitar a las de unas investigaciones', () => {
    expect(especiesJugables(catalogo, tieneImagen, { ids: new Set(['b', 'e']) }).map((e) => e.id)).toEqual(['b']);
  });
});

describe('partida', () => {
  it('cada especie sale una vez y cada pregunta tiene cuatro opciones distintas con la correcta', () => {
    const jugables = especiesJugables(catalogo, tieneImagen);
    const partida = crearPartida(jugables, catalogo, { preguntas: 10, azar: azarFijo(7) });
    expect(partida).toHaveLength(jugables.length);
    expect(new Set(partida.map((p) => p.especie.id)).size).toBe(partida.length);
    for (const p of partida) {
      expect(p.opciones).toHaveLength(4);
      expect(new Set(p.opciones.map((o) => o.texto)).size).toBe(4);
      expect(p.opciones.some((o) => o.id === p.especie.id)).toBe(true);
    }
  });

  it('con pocas especies elegidas, completa las opciones con el resto del catálogo', () => {
    const jugables = especiesJugables(catalogo, tieneImagen, { ids: new Set(['a']) });
    const [p] = crearPartida(jugables, catalogo, { preguntas: 5, azar: azarFijo(3) });
    expect(p.opciones).toHaveLength(4);
  });

  it('respeta el número de preguntas pedido', () => {
    const jugables = especiesJugables(catalogo, tieneImagen);
    expect(crearPartida(jugables, catalogo, { preguntas: 2, azar: azarFijo(5) })).toHaveLength(2);
  });

  it('con el nombre científico, las opciones son nombres científicos', () => {
    const jugables = especiesJugables(catalogo, tieneImagen, { nombre: 'cientifico' });
    const partida = crearPartida(jugables, catalogo, { preguntas: 4, nombre: 'cientifico', azar: azarFijo(9) });
    for (const p of partida) {
      const correcta = p.opciones.find((o) => o.id === p.especie.id);
      expect(correcta.texto).toBe(p.especie.nombreCientifico);
      expect(p.opciones.every((o) => o.texto && o.texto !== 'Mi planta')).toBe(true);
    }
  });
});

describe('resultado', () => {
  it('cuenta aciertos y lista las especies falladas', () => {
    const jugables = especiesJugables(catalogo, tieneImagen).slice(0, 3);
    const partida = crearPartida(jugables, catalogo, { preguntas: 3, azar: azarFijo(2) });
    const respuestas = [partida[0].especie.id, 'otra', partida[2].especie.id];
    const r = resumirPartida(partida, respuestas);
    expect(r.aciertos).toBe(2);
    expect(r.total).toBe(3);
    expect(r.fallos.map((f) => f.id)).toEqual([partida[1].especie.id]);
  });

  it('la pista es un rasgo breve de la especie', () => {
    expect(pistaDe(catalogo[0])).toBe('Rasgo de Albardín');
    expect(pistaDe({ descripcion: 'x'.repeat(200) }).length).toBeLessThanOrEqual(160);
  });
});
