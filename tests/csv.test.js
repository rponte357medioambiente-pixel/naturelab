import { describe, expect, it } from 'vitest';
import { resumirBiodiversidad } from '../src/calculos/biodiversidad.js';
import { aCsv, celdaCsv, convertirEnSlug, csvResultados, numeroCsv } from '../src/importacion-exportacion/exportar.js';
import { crearEjemploSalar } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

describe('CSV', () => {
  it('escapa comillas y separa con punto y coma, con BOM y CRLF', () => {
    const csv = aCsv([['a "b"', 'c;d']]);
    expect(csv).toBe('\ufeff"a ""b""";"c;d"\r\n');
  });

  it('neutraliza fórmulas en textos introducidos por usuarios', () => {
    expect(celdaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celdaCsv('+34')).toBe(`"'+34"`);
    expect(celdaCsv('@suma')).toBe(`"'@suma"`);
  });

  it('usa coma decimal sin separador de miles', () => {
    expect(numeroCsv(1.42885, 3)).toBe('1,429');
    expect(numeroCsv(12345.5, 1)).toBe('12345,5');
    expect(numeroCsv(null)).toBe('');
  });

  it('incluye los indicadores del ejemplo', () => {
    const { parcelas, observaciones } = crearEjemploSalar();
    const csv = csvResultados(resumirBiodiversidad(observaciones, parcelas), 'Todas las parcelas');
    expect(csv).toContain('"Índice de Shannon (H′, ln)";"1,4289"');
    expect(csv).toContain('"Equitatividad de Pielou (J′)";"0,6503"');
  });

  it('genera nombres de archivo sin tildes ni espacios', () => {
    expect(convertirEnSlug('Biodiversidad en el Salar de los Canos')).toBe('biodiversidad-en-el-salar-de-los-canos');
    expect(convertirEnSlug('')).toBe('investigacion');
  });
});
