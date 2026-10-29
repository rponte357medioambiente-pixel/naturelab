import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { cerrarBD, NOMBRE_BD } from '../src/almacenamiento/db.js';
import {
  eliminarInvestigacion,
  eliminarParcela,
  guardarLote,
  guardarObservacion,
  listarInvestigacionesConDatos,
  marcarExportada,
  obtenerDatosInvestigacion,
} from '../src/almacenamiento/repositorio.js';
import { crearObservacion, necesitaCopia } from '../src/almacenamiento/modelo.js';
import { crearEjemploSalar, ID_EJEMPLO } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

afterEach(async () => {
  await cerrarBD();
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = resolve;
  });
});

describe('Almacenamiento local (IndexedDB)', () => {
  it('cargar el ejemplo dos veces no duplica observaciones', async () => {
    await guardarLote(crearEjemploSalar());
    await guardarLote(crearEjemploSalar());
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(datos.parcelas).toHaveLength(1);
    expect(datos.observaciones).toHaveLength(9);
    expect(datos.observaciones.reduce((s, o) => s + o.abundancia, 0)).toBe(33);
  });

  it('rechaza una observación en una parcela de otra investigación sin escribir nada', async () => {
    await guardarLote(crearEjemploSalar());
    const mala = crearObservacion(ID_EJEMPLO, 'parcela-inexistente', { nombreComun: 'X' });
    await expect(guardarObservacion(mala)).rejects.toThrow(/parcela/);
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(datos.observaciones).toHaveLength(9);
  });

  it('eliminar una parcela elimina sus observaciones', async () => {
    const ejemplo = crearEjemploSalar();
    await guardarLote(ejemplo);
    await eliminarParcela(ejemplo.parcelas[0].id);
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(datos.parcelas).toHaveLength(0);
    expect(datos.observaciones).toHaveLength(0);
  });

  it('eliminar una investigación borra todo lo relacionado', async () => {
    await guardarLote(crearEjemploSalar());
    await eliminarInvestigacion(ID_EJEMPLO);
    expect(await obtenerDatosInvestigacion(ID_EJEMPLO)).toBeNull();
    expect(await listarInvestigacionesConDatos()).toHaveLength(0);
  });

  it('marca la copia como al día tras exportar y pendiente tras un cambio', async () => {
    const ejemplo = crearEjemploSalar();
    await guardarLote(ejemplo);
    await marcarExportada(ID_EJEMPLO);
    let datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(necesitaCopia(datos.investigacion)).toBe(false);

    await new Promise((r) => setTimeout(r, 5));
    await guardarObservacion({ ...datos.observaciones[0], abundancia: 3 });
    datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(necesitaCopia(datos.investigacion)).toBe(true);
  });
});
