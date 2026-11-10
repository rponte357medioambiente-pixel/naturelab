import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { cerrarBD, NOMBRE_BD } from '../src/almacenamiento/db.js';
import { crearEspeciePropia, crearObservacion } from '../src/almacenamiento/modelo.js';
import {
  actualizarEspeciePropia,
  guardarEspeciePropia,
  guardarLote,
  guardarObservacion,
  listarEspeciesPropias,
  listarFotosCatalogo,
  modificarFotosEspecie,
  obtenerDatosInvestigacion,
  pasarAlCatalogo,
} from '../src/almacenamiento/repositorio.js';
import { construirZipCatalogoPropio, leerCopiaCatalogoPropio } from '../src/catalogos/especiesPropias.js';
import { agregarFoto, hacerPrincipal, MAX_FOTOS, quitarFoto } from '../src/catalogos/fotosEspecie.js';
import { textoFuente, validarLicencia, valoresLicencia } from '../src/catalogos/fotos/EditorFoto.jsx';
import { limpiarClasificacion, partesDe, pendienteDeClasificar, textoClasificacion } from '../src/catalogos/tipos.js';
import { crearEjemploSalar, ID_EJEMPLO } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

afterEach(async () => {
  await cerrarBD();
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = resolve;
  });
});

const jpeg = (n) => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(40).fill(n), 0xff, 0xd9])], { type: 'image/jpeg' });
const foto = (n) => ({ blob: jpeg(n), tipoMime: 'image/jpeg', tamano: 46, ancho: 800, alto: 600 });
let contador = 0;
const generarId = () => `f${(contador += 1)}`;

describe('tipos y grupos', () => {
  it('descarta clasificaciones incoherentes', () => {
    expect(limpiarClasificacion({ tipo: 'animal', grupo: 'aves', subgrupo: 'acuaticas' })).toEqual({ tipo: 'animal', grupo: 'aves', subgrupo: 'acuaticas' });
    expect(limpiarClasificacion({ tipo: 'animal', grupo: 'arboles', subgrupo: 'acuaticas' })).toEqual({ tipo: 'animal', grupo: null, subgrupo: null });
    expect(limpiarClasificacion({ tipo: 'hongo' })).toEqual({ tipo: null, grupo: null, subgrupo: null });
  });

  it('sabe qué falta por clasificar y lo describe', () => {
    expect(pendienteDeClasificar({ tipo: 'animal', grupo: null })).toBe(true);
    expect(pendienteDeClasificar({ tipo: 'planta', grupo: 'hierbas' })).toBe(false);
    expect(textoClasificacion({ tipo: 'animal', grupo: 'aves', subgrupo: 'limicolas' })).toBe('Aves · Limícolas');
    expect(textoClasificacion({ tipo: 'animal' })).toBe('Animal · grupo sin decidir');
    expect(textoClasificacion({})).toBe('Sin clasificar');
    expect(partesDe('planta')).toContain('Flor');
  });

  it('todas las especies del catálogo publicado tienen tipo y grupo', () => {
    const catalogo = JSON.parse(readFileSync(new URL('../public/data/especies.json', import.meta.url), 'utf8'));
    for (const e of catalogo.especies) expect(pendienteDeClasificar(e), e.id).toBe(false);
  });
});

describe('autoría de las fotos', () => {
  it('si la foto es propia no hace falta procedencia ni confirmar derechos', () => {
    const v = { ...valoresLicencia({ autor: 'Raquel Ponte' }) };
    expect(v.quien).toBe('yo');
    expect(validarLicencia(v)).toEqual({});
    expect(textoFuente(v)).toBe('Fotografía propia');
  });

  it('si es de otra persona pide procedencia y confirmación', () => {
    const v = { ...valoresLicencia({ autor: 'Ana', fuente: 'https://ejemplo.org' }) };
    expect(v.quien).toBe('otra');
    expect(Object.keys(validarLicencia(v))).toEqual(['derechos']);
    expect(Object.keys(validarLicencia({ ...v, fuente: '' }))).toEqual(['fuente', 'derechos']);
  });
});

describe('hasta tres fotos por especie', () => {
  const nueva = (n, parte) => ({ foto: foto(n), parte, imagenAutor: 'Raquel', imagenFuente: 'Fotografía propia', imagenLicencia: 'Todos los derechos reservados', imagenModificaciones: '' });

  it('añade como principal o adicional y no pasa de tres', () => {
    let r = { foto: null, fotosExtra: [] };
    r = { ...r, ...agregarFoto(r, nueva(1, 'Planta entera'), { principal: true, generarId }) };
    r = { ...r, ...agregarFoto(r, nueva(2, 'Flor'), { generarId }) };
    r = { ...r, ...agregarFoto(r, nueva(3, 'Fruto'), { principal: true, generarId }) };
    expect(r.partePrincipal).toBe('Fruto');
    expect(r.fotosExtra.map((x) => x.parte)).toEqual(['Planta entera', 'Flor']);
    expect(() => agregarFoto(r, nueva(4, 'Hoja'), { generarId })).toThrow(String(MAX_FOTOS));
  });

  it('cambia la principal y, al quitarla, sube la siguiente (en Mi catálogo)', () => {
    let r = { foto: foto(1), partePrincipal: 'Flor', fotosExtra: [{ id: 'x1', foto: foto(2), parte: 'Fruto' }] };
    r = { ...r, ...hacerPrincipal(r, 'x1', { generarId }) };
    expect(r.partePrincipal).toBe('Fruto');
    expect(r.fotosExtra[0].parte).toBe('Flor');
    const sinPrincipal = { ...r, ...quitarFoto(r, 'principal') };
    expect(sinPrincipal.partePrincipal).toBe('Flor');
    expect(sinPrincipal.fotosExtra).toHaveLength(0);
    const publicada = { ...r, ...quitarFoto(r, 'principal', { publicada: true }) };
    expect(publicada.foto).toBeNull();
    expect(publicada.fotosExtra).toHaveLength(1);
  });

  it('se guardan en la especie y viajan en la copia de Mi catálogo', async () => {
    const especie = await guardarEspeciePropia(crearEspeciePropia({ nombreComun: 'Adelfa', tipo: 'planta', grupo: 'arbustos' }), { foto: { blob: jpeg(1), ancho: 800, alto: 600 } });
    await modificarFotosEspecie({ ...especie, propia: true }, (r) => agregarFoto(r, nueva(2, 'Flor'), { generarId }));
    await modificarFotosEspecie({ id: 'lotus-creticus', propia: false }, (r) => agregarFoto(r, nueva(3, 'Fruto'), { generarId }));
    const zip = await construirZipCatalogoPropio(await listarEspeciesPropias(), await listarFotosCatalogo());
    const r = await leerCopiaCatalogoPropio(new File([await zip.arrayBuffer()], 'copia.zip', { type: 'application/zip' }));
    expect(r.ok).toBe(true);
    expect(r.especies[0].fotosExtra[0].parte).toBe('Flor');
    expect(r.especies[0].tipo).toBe('planta');
    expect(r.especies[0].grupo).toBe('arbustos');
    expect(r.fotosCatalogo[0].foto).toBeNull();
    expect(r.fotosCatalogo[0].fotosExtra[0].parte).toBe('Fruto');
    expect(new Uint8Array(await r.fotosCatalogo[0].fotosExtra[0].foto.blob.arrayBuffer())).toEqual(new Uint8Array(await jpeg(3).arrayBuffer()));
  });
});

describe('especies creadas en el campo', () => {
  it('actualizar la clasificación no toca las fotos', async () => {
    const especie = await guardarEspeciePropia(crearEspeciePropia({ nombreComun: 'Pato de cabeza verde', tipo: 'animal' }), { foto: { blob: jpeg(5), ancho: 1, alto: 1 } });
    await actualizarEspeciePropia(especie.id, { grupo: 'aves', subgrupo: 'acuaticas', nombreComun: 'Ánade azulón' });
    const [guardada] = await listarEspeciesPropias();
    expect(guardada.nombreComun).toBe('Ánade azulón');
    expect(guardada.subgrupo).toBe('acuaticas');
    expect(guardada.foto.blob).toBeTruthy();
  });

  it('«Pasar al catálogo» crea la especie y enlaza las observaciones con ese nombre libre', async () => {
    await guardarLote(crearEjemploSalar());
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    const parcela = datos.parcelas[0].id;
    await guardarObservacion({ ...crearObservacion(ID_EJEMPLO, parcela), especieId: null, nombreComun: 'Gramínea A', abundancia: 2 });
    await guardarObservacion({ ...crearObservacion(ID_EJEMPLO, parcela), especieId: null, nombreComun: 'gramínea a', abundancia: 3 });
    const especie = await pasarAlCatalogo('Gramínea A');
    const despues = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(despues.observaciones.filter((o) => o.especieId === especie.id)).toHaveLength(2);
    expect((await listarEspeciesPropias())[0].estadoValidacion).toBe('pendiente');
  });
});

describe('fauna del catálogo publicado', () => {
  const catalogo = JSON.parse(readFileSync(new URL('../public/data/especies.json', import.meta.url), 'utf8'));
  const animales = catalogo.especies.filter((e) => e.tipo !== 'planta');

  it('incluye aves del Salar con su subgrupo, un reptil y libélulas', () => {
    const aves = animales.filter((e) => e.grupo === 'aves');
    expect(aves.length).toBeGreaterThanOrEqual(15);
    for (const a of aves) expect(limpiarClasificacion(a).subgrupo, a.id).toBeTruthy();
    expect(animales.some((e) => e.grupo === 'reptiles')).toBe(true);
    expect(animales.some((e) => e.tipo === 'insecto' && e.grupo === 'libelulas')).toBe(true);
  });

  it('cada especie tiene nombre científico, familia, rasgos y la fuente en las notas', () => {
    for (const e of animales) {
      expect(e.nombreCientifico, e.id).toBeTruthy();
      expect(e.familia, e.id).toBeTruthy();
      expect(e.rasgos.length, e.id).toBeGreaterThan(0);
      expect(e.notas, e.id).toMatch(/Citada|Habitual/);
    }
  });
});

describe('las especies de Mi catálogo viajan con la investigación', () => {
  it('la copia incluye las especies que usa, con sus fotos, y se recuperan en otro dispositivo', async () => {
    const { serializarEspeciesPropias, planificarImportacionPropias } = await import('../src/catalogos/especiesPropias.js');
    const { construirZip } = await import('../src/importacion-exportacion/copiaZip.js');
    const { leerArchivoCopia, validarPaquete } = await import('../src/importacion-exportacion/esquema.js');
    const { construirPaquete } = await import('../src/importacion-exportacion/exportar.js');
    const { guardarEspeciesPropias } = await import('../src/almacenamiento/repositorio.js');

    // Dispositivo 1: una especie creada en el campo y una observación que la usa
    await guardarLote(crearEjemploSalar());
    const pato = await guardarEspeciePropia(crearEspeciePropia({ nombreComun: 'Pato de cabeza verde', tipo: 'animal' }), {
      foto: { blob: jpeg(7), ancho: 800, alto: 600 },
    });
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    await guardarObservacion({ ...crearObservacion(ID_EJEMPLO, datos.parcelas[0].id), especieId: pato.id, nombreComun: pato.nombreComun, abundancia: 4 });
    const conPato = await obtenerDatosInvestigacion(ID_EJEMPLO);
    const propias = (await listarEspeciesPropias()).filter((e) => conPato.observaciones.some((o) => o.especieId === e.id));
    const zip = await construirZip(construirPaquete(conPato, null), [], [], await serializarEspeciesPropias(propias));

    // Dispositivo 2: base de datos vacía
    await cerrarBD();
    await new Promise((resolve) => {
      const r = indexedDB.deleteDatabase(NOMBRE_BD);
      r.onsuccess = r.onerror = r.onblocked = resolve;
    });
    const leida = await leerArchivoCopia(new File([await zip.arrayBuffer()], 'copia.zip', { type: 'application/zip' }));
    expect(leida.ok).toBe(true);
    expect(leida.paquete.especiesPropias).toHaveLength(1);
    expect(leida.paquete.especiesPropias[0].foto.blob).toBeTruthy();
    await guardarLote(leida.paquete);
    const plan = planificarImportacionPropias(leida.paquete.especiesPropias, await listarEspeciesPropias());
    await guardarEspeciesPropias([...plan.nuevas, ...plan.actualizadas]);
    const [recuperada] = await listarEspeciesPropias();
    expect(recuperada.id).toBe(pato.id);
    expect(recuperada.tipo).toBe('animal');
    const importada = await obtenerDatosInvestigacion(ID_EJEMPLO);
    expect(importada.observaciones.some((o) => o.especieId === pato.id)).toBe(true);

    // Una copia en JSON trae las especies, pero sin fotos
    const sinFotos = validarPaquete({ ...construirPaquete(conPato, null), especiesPropias: [{ ...propias[0], foto: { archivo: 'fotos/x.jpg' } }] });
    expect(sinFotos.paquete.especiesPropias[0].foto).toBeNull();
    expect(sinFotos.avisos.join(' ')).toMatch(/sin sus fotos/);
  });
});
