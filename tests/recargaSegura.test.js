import { describe, expect, it } from 'vitest';
import { esErrorDeModulo } from '../src/app/recargaSegura.js';

describe('recuperación ante módulos desactualizados', () => {
  it('reconoce los errores de carga de módulos de los distintos navegadores', () => {
    expect(esErrorDeModulo(new TypeError('Failed to fetch dynamically imported module: http://x/a.js'))).toBe(true);
    expect(esErrorDeModulo(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(esErrorDeModulo(new Error('error loading dynamically imported module'))).toBe(true);
    expect(esErrorDeModulo(new Error('La investigación ya no existe'))).toBe(false);
  });
});
