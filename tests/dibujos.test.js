import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cerrarBD, NOMBRE_BD } from '../src/almacenamiento/db.js';
import { crearDibujo } from '../src/almacenamiento/modelo.js';
import {
  eliminarDibujo,
  eliminarInvestigacion,
  guardarDibujo,
  guardarLote,
  obtenerDatosInvestigacion,
} from '../src/almacenamiento/repositorio.js';
import { deshacer, estadoInicial, lineas, numeroSiguiente, tocar } from '../src/dibujos/unirPuntos.js';
import { validarPlantillas } from '../src/dibujos/plantillas.js';
import { construirZip } from '../src/importacion-exportacion/copiaZip.js';
import { leerArchivoCopia, validarPaquete } from '../src/importacion-exportacion/esquema.js';
import { construirPaquete } from '../src/importacion-exportacion/exportar.js';
import { planificarImportacion, prepararCopiaNueva, prepararFusion } from '../src/importacion-exportacion/importar.js';
import { crearEjemploSalar, ID_EJEMPLO } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

afterEach(async () => {
  await cerrarBD();
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = resolve;
  });
});

const pngFalso = (relleno = 1) =>
  new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(40).fill(relleno)])], {
    type: 'image/png',
  });
const comoArchivo = async (blob, nombre) => new File([await blob.arrayBuffer()], nombre, { type: blob.type });
const cuadrado = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];

describe('unir los puntos', () => {
  it('acepta los puntos en orden y cierra la figura con el último', () => {
    let e = estadoInicial();
    expect(numeroSiguiente(e)).toBe(1);
    for (const [x, y] of cuadrado) {
      const r = tocar(e, cuadrado, x + 3, y - 2, 10);
      expect(r.resultado).toBe('acierto');
      e = r.estado;
    }
    expect(e.completo).toBe(true);
    expect(numeroSiguiente(e)).toBeNull();
    expect(lineas(e, 4)).toEqual([[0, 1], [1, 2], [2, 3], [3, 0]]);
  });

  it('un punto equivocado no avanza y se distingue de un toque en vacío', () => {
    const e = estadoInicial();
    expect(tocar(e, cuadrado, 100, 100, 10)).toEqual({ estado: e, resultado: 'fallo' });
    expect(tocar(e, cuadrado, 50, 50, 10)).toEqual({ estado: e, resultado: 'nada' });
  });

  it('deshacer retrocede un punto y reabre la figura completa', () => {
    let e = { siguiente: 3, completo: true };
    e = deshacer(e);
    expect(e).toEqual({ siguiente: 3, completo: false });
    expect(deshacer({ siguiente: 2, completo: false })).toEqual({ siguiente: 1, completo: false });
    expect(deshacer(estadoInicial())).toEqual(estadoInicial());
  });
});

describe('plantillas', () => {
  const datos = JSON.parse(readFileSync(new URL('../public/data/plantillas.json', import.meta.url), 'utf8'));
  const catalogo = JSON.parse(readFileSync(new URL('../public/data/especies.json', import.meta.url), 'utf8'));
  const { plantillas } = validarPlantillas(datos);

  it('hay una plantilla válida para cada especie del catálogo', () => {
    for (const especie of catalogo.especies) expect(plantillas.has(especie.id), especie.id).toBe(true);
  });

  it('cada nivel tiene más puntos que el anterior y un número por punto', () => {
    for (const p of plantillas.values()) {
      const { facil, medio, dificil } = p.niveles;
      expect(facil.puntos.length).toBeGreaterThanOrEqual(15);
      expect(medio.puntos.length).toBeGreaterThan(facil.puntos.length);
      expect(dificil.puntos.length).toBeGreaterThan(medio.puntos.length);
      for (const n of [facil, medio, dificil]) expect(n.etiquetas.length).toBe(n.puntos.length);
    }
  });

  it('descarta plantillas mal formadas', () => {
    const r = validarPlantillas({ plantillas: [{ especieId: 'x', niveles: { facil: { puntos: [[1, 2]], etiquetas: [] } } }] });
    expect(r.plantillas.size).toBe(0);
  });
});

describe('dibujos en la investigación', () => {
  it('se guardan, se leen con la investigación y se eliminan', async () => {
    await guardarLote(crearEjemploSalar());
    const dibujo = crearDibujo(ID_EJEMPLO, { especieId: 'moricandia-arvensis', nombreComun: 'Moricandia', modo: 'puntos', nivel: 'facil', alias: 'Equipo Taray' });
    await guardarDibujo(dibujo, { blob: pngFalso(), ancho: 1000, alto: 1000 });
    let datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(datos.dibujos).toHaveLength(1);
    expect(datos.dibujos[0].alias).toBe('Equipo Taray');
    expect(datos.dibujos[0].tipoMime).toBe('image/png');
    await eliminarDibujo(dibujo.id);
    datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(datos.dibujos).toHaveLength(0);
  });

  it('se borran al eliminar la investigación', async () => {
    await guardarLote(crearEjemploSalar());
    await guardarDibujo(crearDibujo(ID_EJEMPLO, { nombreComun: 'Taray' }), { blob: pngFalso(), ancho: 1000, alto: 1000 });
    await eliminarInvestigacion(ID_EJEMPLO);
    await guardarLote(crearEjemploSalar());
    expect((await obtenerDatosInvestigacion(ID_EJEMPLO)).dibujos).toHaveLength(0);
  });
});

describe('dibujos en la copia de seguridad', () => {
  async function copiaConDibujo() {
    await guardarLote(crearEjemploSalar());
    await guardarDibujo(crearDibujo(ID_EJEMPLO, { especieId: 'portulaca-oleracea', nombreComun: 'Verdolaga', modo: 'libre', alias: 'Equipo Albardín' }), {
      blob: pngFalso(7),
      ancho: 1000,
      alto: 1000,
    });
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    return { datos, zip: await construirZip(construirPaquete(datos, null), [], datos.dibujos) };
  }

  it('viajan en el ZIP y se recuperan intactos', async () => {
    const { zip } = await copiaConDibujo();
    const r = await leerArchivoCopia(await comoArchivo(zip, 'copia.zip'));
    expect(r.ok).toBe(true);
    expect(r.paquete.dibujos).toHaveLength(1);
    const d = r.paquete.dibujos[0];
    expect(d.nombreComun).toBe('Verdolaga');
    expect(d.modo).toBe('libre');
    expect(d.nivel).toBeNull();
    expect(new Uint8Array(await d.blob.arrayBuffer())).toEqual(new Uint8Array(await pngFalso(7).arrayBuffer()));
  });

  it('al fusionar solo se añaden los dibujos nuevos; como copia, con identificadores nuevos', async () => {
    const { zip, datos } = await copiaConDibujo();
    const { paquete } = await leerArchivoCopia(await comoArchivo(zip, 'copia.zip'));
    const plan = planificarImportacion(paquete, datos);
    expect(prepararFusion(paquete, datos, plan).dibujos).toHaveLength(0);
    let n = 0;
    const copia = prepararCopiaNueva(paquete, () => `nuevo-${(n += 1)}`);
    expect(copia.dibujos[0].id).not.toBe(paquete.dibujos[0].id);
    expect(copia.dibujos[0].investigacionId).toBe(copia.investigacion.id);
  });

  it('rechaza un dibujo que no es PNG y avisa si la copia JSON no los trae', () => {
    const paquete = construirPaquete(crearEjemploSalar(), null);
    const conDibujo = {
      ...paquete,
      dibujos: [{ id: 'd1', investigacionId: ID_EJEMPLO, nombreComun: 'Taray', modo: 'libre', archivo: 'dibujos/d1.png' }],
    };
    const noPng = validarPaquete(conDibujo, { archivos: { 'dibujos/d1.png': new Uint8Array([1, 2, 3, 4]) } });
    expect(noPng.ok).toBe(false);
    const sinArchivos = validarPaquete(conDibujo);
    expect(sinArchivos.ok).toBe(true);
    expect(sinArchivos.avisos.join(' ')).toMatch(/dibujos/);
  });
});

describe('actualización de la base de datos a la versión 4', () => {
  it('añade el almacén de dibujos sin tocar las investigaciones', async () => {
    await new Promise((resolve, reject) => {
      const peticion = indexedDB.open(NOMBRE_BD, 3);
      peticion.onupgradeneeded = () => {
        const bd = peticion.result;
        bd.createObjectStore('investigaciones', { keyPath: 'id' });
        bd.createObjectStore('ajustes', { keyPath: 'clave' });
        bd.createObjectStore('especiesPropias', { keyPath: 'id' });
        bd.createObjectStore('fotosCatalogo', { keyPath: 'especieId' });
        const parcelas = bd.createObjectStore('parcelas', { keyPath: 'id' });
        parcelas.createIndex('porInvestigacion', 'investigacionId');
        const obs = bd.createObjectStore('observaciones', { keyPath: 'id' });
        obs.createIndex('porInvestigacion', 'investigacionId');
        obs.createIndex('porParcela', 'parcelaId');
        const fotos = bd.createObjectStore('fotos', { keyPath: 'id' });
        fotos.createIndex('porObservacion', 'observacionId');
      };
      peticion.onsuccess = () => {
        const bd = peticion.result;
        const tx = bd.transaction(['investigaciones'], 'readwrite');
        tx.objectStore('investigaciones').put(crearEjemploSalar().investigacion);
        tx.oncomplete = () => {
          bd.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      peticion.onerror = () => reject(peticion.error);
    });
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(datos.investigacion.titulo).toBeTruthy();
    expect(datos.dibujos).toEqual([]);
  });
});
