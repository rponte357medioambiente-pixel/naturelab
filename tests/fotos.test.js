import { describe, expect, it } from 'vitest';
import {
  aplicarCambiosCatalogo,
  calcularRecorte,
  moverEncuadre,
  normalizarEncuadre,
  tamanoSalida,
  zonasEnRecorte,
} from '../src/catalogos/fotos/procesarImagen.js';

describe('Recorte 4:3', () => {
  it('en una foto apaisada usa toda la altura y centra', () => {
    const r = calcularRecorte(4000, 2000);
    expect(r.alto).toBe(2000);
    expect(r.ancho).toBeCloseTo(2666.67, 1);
    expect(r.x).toBeCloseTo((4000 - r.ancho) / 2, 6);
    expect(r.y).toBe(0);
  });

  it('en una foto vertical usa toda la anchura', () => {
    const r = calcularRecorte(3000, 4000);
    expect(r.ancho).toBe(3000);
    expect(r.alto).toBe(2250);
  });

  it('el zoom reduce el recorte y nunca se sale de la imagen', () => {
    const r = calcularRecorte(4000, 3000, { zoom: 2, centroX: 0, centroY: 1 });
    expect(r.ancho).toBe(2000);
    expect(r.x).toBe(0);
    expect(r.y).toBe(1500);
  });

  it('normaliza el centro al recorte real', () => {
    const e = normalizarEncuadre(4000, 3000, { zoom: 1, centroX: 0.1, centroY: 0.9 });
    expect(e.centroX).toBeCloseTo(0.5, 6);
    expect(e.centroY).toBeCloseTo(0.5, 6);
  });

  it('mueve el encuadre en píxeles de la imagen', () => {
    const e = moverEncuadre(4000, 3000, { zoom: 2, centroX: 0.5, centroY: 0.5 }, 400, 0);
    expect(e.centroX).toBeCloseTo(0.6, 6);
  });

  it('limita el tamaño de salida a 1200 × 900', () => {
    expect(tamanoSalida({ ancho: 3000, alto: 2250 })).toEqual({ ancho: 1200, alto: 900 });
    expect(tamanoSalida({ ancho: 800, alto: 600 })).toEqual({ ancho: 800, alto: 600 });
  });
});

describe('Zonas detectadas', () => {
  const recorte = { x: 1000, y: 0, ancho: 2000, alto: 1500 };

  it('traslada, escala y amplía las zonas dentro del encuadre', () => {
    const [z] = zonasEnRecorte([{ tipo: 'cara', x: 1100, y: 100, ancho: 200, alto: 200 }], recorte, 0.5, 0.1);
    expect(z).toEqual({ tipo: 'cara', x: 40, y: 40, ancho: 120, alto: 120 });
  });

  it('descarta zonas fuera del encuadre y recorta las que lo cruzan', () => {
    const zonas = zonasEnRecorte(
      [
        { tipo: 'persona', x: 0, y: 0, ancho: 300, alto: 300 },
        { tipo: 'persona', x: 900, y: 100, ancho: 200, alto: 200 },
      ],
      recorte,
      1,
      0,
    );
    expect(zonas).toHaveLength(1);
    expect(zonas[0].x).toBe(0);
    expect(zonas[0].ancho).toBe(100);
  });
});

describe('Actualización del catálogo', () => {
  const catalogo = {
    versionCatalogo: 1,
    especies: [
      { id: 'a', nombreComun: 'A', imagen: null, imagenLicencia: null },
      { id: 'b', nombreComun: 'B', imagen: null, imagenLicencia: null },
    ],
  };

  it('solo cambia los campos de imagen de las especies preparadas', () => {
    const nuevo = aplicarCambiosCatalogo(catalogo, [
      {
        especieId: 'b',
        imagen: 'imagenes/especies/b.webp',
        imagenAutor: 'Autora',
        imagenFuente: 'Fotografía propia',
        imagenLicencia: 'CC BY 4.0',
        imagenModificaciones: 'Recortada a 4:3 y comprimida',
        blob: 'no debe copiarse',
      },
    ]);
    expect(nuevo.especies[0]).toBe(catalogo.especies[0]);
    expect(nuevo.especies[1]).toMatchObject({ id: 'b', nombreComun: 'B', imagen: 'imagenes/especies/b.webp', imagenLicencia: 'CC BY 4.0' });
    expect(nuevo.especies[1]).not.toHaveProperty('blob');
    expect(catalogo.especies[1].imagen).toBeNull();
  });
});
