import { describe, expect, it } from 'vitest';
import { asignarLetras, contenidoFicha } from '../src/catalogos/fichasPdf.js';

describe('fichas para imprimir', () => {
  it('asigna una letra distinta a cada especie, también con más de 26', () => {
    const letras = asignarLetras(30, () => 0.5);
    expect(new Set(letras).size).toBe(30);
    expect(letras).toContain('A');
    expect(letras).toContain('D2');
  });

  it('la tarjeta de características no incluye el nombre de la especie', () => {
    const especie = {
      nombreComun: 'Cuernecillo de mar',
      nombreCientifico: 'Lotus creticus',
      familia: 'Fabaceae',
      descripcion: 'Mata rastrera.',
      rasgos: ['Hojas plateadas'],
      habitat: 'Dunas costeras.',
    };
    const apartados = contenidoFicha(especie);
    const texto = JSON.stringify(apartados);
    expect(texto).not.toMatch(/Cuernecillo|Lotus/);
    expect(apartados.map((a) => a.titulo)).toEqual(['Familia', null, 'Cómo reconocerla', 'Dónde vive']);
  });

  it('las especies de Mi catálogo usan su lugar y sus notas', () => {
    const apartados = contenidoFicha({ propia: true, nombreComun: 'Cardo', lugarTexto: 'Cabo de Gata', notas: 'Flores azules' });
    expect(apartados.map((a) => a.titulo)).toEqual(['Dónde se encontró', 'Notas']);
    expect(contenidoFicha({ nombreComun: 'X' })[0].texto).toMatch(/Sin descripción/);
  });
});
