import 'fake-indexeddb/auto';
import { strToU8, zipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { cerrarBD, NOMBRE_BD } from '../src/almacenamiento/db.js';
import { crearEspeciePropia, crearObservacion } from '../src/almacenamiento/modelo.js';
import {
  contarObservacionesDeEspecie,
  eliminarEspeciePropia,
  guardarEspeciePropia,
  guardarEspeciesPropias,
  guardarLote,
  guardarObservacion,
  listarEspeciesPropias,
  obtenerDatosInvestigacion,
  obtenerEspeciePropia,
} from '../src/almacenamiento/repositorio.js';
import {
  catalogoPropioNecesitaCopia,
  construirZipCatalogoPropio,
  leerCopiaCatalogoPropio,
  planificarImportacionPropias,
  validarCatalogoPropio,
} from '../src/catalogos/especiesPropias.js';
import { construirZip } from '../src/importacion-exportacion/copiaZip.js';
import { leerArchivoCopia } from '../src/importacion-exportacion/esquema.js';
import { construirPaquete } from '../src/importacion-exportacion/exportar.js';
import { crearEjemploSalar, ID_EJEMPLO } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

const jpegFalso = (relleno = 7) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(60).fill(relleno), 0xff, 0xd9]);
const fotoFalsa = (relleno) => ({ blob: new Blob([jpegFalso(relleno)], { type: 'image/jpeg' }), ancho: 1200, alto: 900 });
const comoArchivo = async (blob, nombre) => new File([await blob.arrayBuffer()], nombre, { type: blob.type });
const esperar = (ms = 5) => new Promise((r) => setTimeout(r, ms));

function especieCardo(campos = {}) {
  return crearEspeciePropia({
    nombreComun: 'Cardo de la rambla',
    lugarTexto: 'Cabo de Gata',
    imagenAutor: 'Raquel Ponte',
    imagenFuente: 'Fotografía propia',
    imagenLicencia: 'Todos los derechos reservados',
    ...campos,
  });
}

afterEach(async () => {
  await cerrarBD();
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = resolve;
  });
});

describe('Mi catálogo: almacenamiento local', () => {
  it('crea especies con un identificador propio que no choca con el catálogo publicado', () => {
    const a = crearEspeciePropia();
    const b = crearEspeciePropia();
    expect(a.id).toMatch(/^propia-/);
    expect(a.id).not.toBe(b.id);
    expect(a.estadoValidacion).toBe('pendiente');
  });

  it('guarda una especie con su foto, sin asociarla a ninguna investigación', async () => {
    const especie = especieCardo();
    await guardarEspeciePropia(especie, { foto: fotoFalsa() });
    const guardada = await obtenerEspeciePropia(especie.id);
    expect(guardada.nombreComun).toBe('Cardo de la rambla');
    expect(guardada.foto.tipoMime).toBe('image/jpeg');
    expect(guardada.foto.ancho).toBe(1200);
    expect(guardada).not.toHaveProperty('investigacionId');
  });

  it('al editar sin indicar foto conserva la anterior; con null la quita', async () => {
    const especie = especieCardo();
    await guardarEspeciePropia(especie, { foto: fotoFalsa() });
    await guardarEspeciePropia({ ...especie, nombreComun: 'Cardo azul' });
    let guardada = await obtenerEspeciePropia(especie.id);
    expect(guardada.nombreComun).toBe('Cardo azul');
    expect(guardada.foto).not.toBeNull();

    await guardarEspeciePropia(guardada, { foto: null });
    guardada = await obtenerEspeciePropia(especie.id);
    expect(guardada.foto).toBeNull();
  });

  it('mantiene la fecha de creación al editar y actualiza la de modificación', async () => {
    const especie = especieCardo();
    const primera = await guardarEspeciePropia(especie);
    await esperar();
    const segunda = await guardarEspeciePropia({ ...primera, notas: 'Flores azules' });
    expect(segunda.fechaCreacion).toBe(primera.fechaCreacion);
    expect(segunda.fechaModificacion > primera.fechaModificacion).toBe(true);
  });

  it('lista por nombre y elimina sin tocar las observaciones que la usan', async () => {
    const ejemplo = crearEjemploSalar();
    await guardarLote(ejemplo);
    const especie = especieCardo();
    await guardarEspeciePropia(especie);
    await guardarEspeciePropia(crearEspeciePropia({ nombreComun: 'Alcaparra' }));
    expect((await listarEspeciesPropias()).map((e) => e.nombreComun)).toEqual(['Alcaparra', 'Cardo de la rambla']);

    const observacion = crearObservacion(ID_EJEMPLO, ejemplo.parcelas[0].id, {
      especieId: especie.id,
      nombreComun: especie.nombreComun,
      abundancia: 3,
    });
    await guardarObservacion(observacion);
    expect(await contarObservacionesDeEspecie(especie.id)).toBe(1);

    await eliminarEspeciePropia(especie.id);
    expect(await obtenerEspeciePropia(especie.id)).toBeNull();
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    const conservada = datos.observaciones.find((o) => o.id === observacion.id);
    expect(conservada.nombreComun).toBe('Cardo de la rambla');
    expect(datos.observaciones.reduce((s, o) => s + o.abundancia, 0)).toBe(36);
  });
});

describe('Mi catálogo: copia ZIP', () => {
  it('exporta e importa las especies con sus fotos', async () => {
    const conFoto = especieCardo();
    const sinFoto = crearEspeciePropia({ nombreComun: 'Alcaparra', notas: 'En un muro' });
    await guardarEspeciePropia(conFoto, { foto: fotoFalsa() });
    await guardarEspeciePropia(sinFoto);

    const zip = await construirZipCatalogoPropio(await listarEspeciesPropias());
    const r = await leerCopiaCatalogoPropio(await comoArchivo(zip, 'mi-catalogo.zip'));
    expect(r.ok).toBe(true);
    expect(r.especies).toHaveLength(2);
    const cardo = r.especies.find((e) => e.id === conFoto.id);
    expect(cardo.lugarTexto).toBe('Cabo de Gata');
    expect(cardo.imagenLicencia).toBe('Todos los derechos reservados');
    expect(cardo.foto.tipoMime).toBe('image/jpeg');
    expect(new Uint8Array(await cardo.foto.blob.arrayBuffer())).toEqual(jpegFalso());
    expect(r.especies.find((e) => e.id === sinFoto.id).foto).toBeNull();
  });

  it('importar la misma copia dos veces no duplica especies', async () => {
    const especie = especieCardo();
    await guardarEspeciePropia(especie, { foto: fotoFalsa() });
    const zip = await construirZipCatalogoPropio(await listarEspeciesPropias());
    for (let i = 0; i < 2; i += 1) {
      const r = await leerCopiaCatalogoPropio(await comoArchivo(zip, 'copia.zip'));
      const plan = planificarImportacionPropias(r.especies, await listarEspeciesPropias());
      await guardarEspeciesPropias([...plan.nuevas, ...plan.actualizadas]);
    }
    expect(await listarEspeciesPropias()).toHaveLength(1);
  });

  it('distingue la copia de una investigación de la de «Mi catálogo»', async () => {
    const investigacion = await construirZip(construirPaquete(crearEjemploSalar(), null));
    const r1 = await leerCopiaCatalogoPropio(await comoArchivo(investigacion, 'inv.zip'));
    expect(r1.ok).toBe(false);
    expect(r1.errores[0]).toMatch(/investigación/);

    await guardarEspeciePropia(especieCardo());
    const catalogo = await construirZipCatalogoPropio(await listarEspeciesPropias());
    const r2 = await leerArchivoCopia(await comoArchivo(catalogo, 'cat.zip'));
    expect(r2.ok).toBe(false);
    expect(r2.errores[0]).toMatch(/Mi catálogo/);
  });

  it('rechaza archivos que no son ZIP y fotos que no son imágenes', async () => {
    const texto = new File(['hola'], 'nota.txt', { type: 'text/plain' });
    expect((await leerCopiaCatalogoPropio(texto)).ok).toBe(false);

    const especie = { ...especieCardo(), foto: { archivo: `fotos/${'propia-abc'}.jpg` } };
    especie.id = 'propia-abc';
    const datos = { formato: 'naturalab-catalogo-propio', versionEsquema: 1, especies: [especie] };
    const zip = zipSync({ 'mi-catalogo.json': strToU8(JSON.stringify(datos)), 'fotos/propia-abc.jpg': strToU8('no es imagen') });
    const r = await leerCopiaCatalogoPropio(new File([zip], 'copia.zip', { type: 'application/zip' }));
    expect(r.ok).toBe(false);
    expect(r.errores[0]).toMatch(/imagen/);
  });
});

describe('Mi catálogo: validación e importación', () => {
  const valida = (especies) => ({ formato: 'naturalab-catalogo-propio', versionEsquema: 1, especies });

  it('exige nombre e identificador propio, y descarta campos desconocidos', () => {
    expect(validarCatalogoPropio(valida([{ id: 'propia-1', nombreComun: '' }])).ok).toBe(false);
    expect(validarCatalogoPropio(valida([{ id: 'lygeum-spartum', nombreComun: 'Albardín' }])).ok).toBe(false);
    const r = validarCatalogoPropio(valida([{ id: 'propia-1', nombreComun: 'Lentisco', script: '<b>x</b>' }]));
    expect(r.ok).toBe(true);
    expect(r.especies[0]).not.toHaveProperty('script');
    expect(r.especies[0].estadoValidacion).toBe('pendiente');
  });

  it('rechaza copias de una versión más reciente o de otro formato', () => {
    expect(validarCatalogoPropio({ ...valida([]), versionEsquema: 99 }).ok).toBe(false);
    expect(validarCatalogoPropio({ formato: 'naturalab-investigacion', versionEsquema: 1, especies: [] }).ok).toBe(false);
  });

  it('al importar conserva la versión local si es igual o más reciente', () => {
    const local = [
      { id: 'propia-a', fechaModificacion: '2026-10-20T10:00:00.000Z' },
      { id: 'propia-b', fechaModificacion: '2026-10-25T10:00:00.000Z' },
    ];
    const importadas = [
      { id: 'propia-a', fechaModificacion: '2026-10-22T10:00:00.000Z' },
      { id: 'propia-b', fechaModificacion: '2026-10-21T10:00:00.000Z' },
      { id: 'propia-c', fechaModificacion: '2026-10-21T10:00:00.000Z' },
    ];
    const plan = planificarImportacionPropias(importadas, local);
    expect(plan.actualizadas.map((e) => e.id)).toEqual(['propia-a']);
    expect(plan.sinCambios.map((e) => e.id)).toEqual(['propia-b']);
    expect(plan.nuevas.map((e) => e.id)).toEqual(['propia-c']);
  });

  it('avisa de cambios sin copia', () => {
    const registros = [{ fechaModificacion: '2026-10-22T10:00:00.000Z' }];
    expect(catalogoPropioNecesitaCopia([], null)).toBe(false);
    expect(catalogoPropioNecesitaCopia(registros, null)).toBe(true);
    expect(catalogoPropioNecesitaCopia(registros, '2026-10-23T00:00:00.000Z')).toBe(false);
    expect(catalogoPropioNecesitaCopia(registros, '2026-10-21T00:00:00.000Z')).toBe(true);
  });
});

describe('Actualización de la base de datos', () => {
  it('pasa de la versión 1 a la 2 sin perder las investigaciones guardadas', async () => {
    // Base de datos tal como la dejaba la versión anterior de NatureLab.
    await new Promise((resolve, reject) => {
      const peticion = indexedDB.open(NOMBRE_BD, 1);
      peticion.onupgradeneeded = () => {
        const bd = peticion.result;
        bd.createObjectStore('investigaciones', { keyPath: 'id' });
        const parcelas = bd.createObjectStore('parcelas', { keyPath: 'id' });
        parcelas.createIndex('porInvestigacion', 'investigacionId');
        const observaciones = bd.createObjectStore('observaciones', { keyPath: 'id' });
        observaciones.createIndex('porInvestigacion', 'investigacionId');
        observaciones.createIndex('porParcela', 'parcelaId');
        const fotos = bd.createObjectStore('fotos', { keyPath: 'id' });
        fotos.createIndex('porObservacion', 'observacionId');
        bd.createObjectStore('ajustes', { keyPath: 'clave' });
      };
      peticion.onsuccess = () => {
        const bd = peticion.result;
        const ejemplo = crearEjemploSalar();
        const tx = bd.transaction(['investigaciones', 'parcelas', 'observaciones'], 'readwrite');
        tx.objectStore('investigaciones').put(ejemplo.investigacion);
        ejemplo.parcelas.forEach((p) => tx.objectStore('parcelas').put(p));
        ejemplo.observaciones.forEach((o) => tx.objectStore('observaciones').put(o));
        tx.oncomplete = () => {
          bd.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      peticion.onerror = () => reject(peticion.error);
    });

    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(datos.observaciones.reduce((s, o) => s + o.abundancia, 0)).toBe(33);
    expect(await listarEspeciesPropias()).toEqual([]);
    await guardarEspeciePropia(especieCardo());
    expect(await listarEspeciesPropias()).toHaveLength(1);
  });
});
