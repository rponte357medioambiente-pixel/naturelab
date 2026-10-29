import 'fake-indexeddb/auto';
import { strToU8, zipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { cerrarBD, NOMBRE_BD } from '../src/almacenamiento/db.js';
import {
  eliminarObservacion,
  guardarLote,
  guardarObservacion,
  obtenerDatosInvestigacion,
  obtenerFoto,
  obtenerFotosDeObservaciones,
} from '../src/almacenamiento/repositorio.js';
import { construirZip, tipoDeBytes } from '../src/importacion-exportacion/copiaZip.js';
import { leerArchivoCopia } from '../src/importacion-exportacion/esquema.js';
import { construirPaquete } from '../src/importacion-exportacion/exportar.js';
import { planificarImportacion, prepararCopiaNueva, prepararFusion } from '../src/importacion-exportacion/importar.js';
import { generarPdfCuaderno, textoPdf } from '../src/importacion-exportacion/pdfCuaderno.js';
import { crearEjemploSalar, ID_EJEMPLO } from '../src/laboratorios/biodiversidad/ejemploSalar.js';

// Bytes con cabecera JPEG válida (suficiente para las comprobaciones de tipo).
const jpegFalso = (relleno = 7) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(60).fill(relleno), 0xff, 0xd9]);

async function ejemploConFoto() {
  const datos = crearEjemploSalar();
  const obs = datos.observaciones[4]; // albardín
  const foto = {
    id: 'foto-albardin',
    observacionId: obs.id,
    investigacionId: ID_EJEMPLO,
    blob: new Blob([jpegFalso()], { type: 'image/jpeg' }),
    tipoMime: 'image/jpeg',
    ancho: 1600,
    alto: 1200,
    fecha: '2026-10-22T10:00:00.000Z',
  };
  datos.observaciones[4] = { ...obs, fotoLocalId: foto.id };
  return { datos, foto };
}

async function comoArchivo(blob, nombre) {
  return new File([await blob.arrayBuffer()], nombre, { type: blob.type });
}

afterEach(async () => {
  await cerrarBD();
  await new Promise((resolve) => {
    const r = indexedDB.deleteDatabase(NOMBRE_BD);
    r.onsuccess = r.onerror = r.onblocked = resolve;
  });
});

describe('Copia ZIP con fotos', () => {
  it('exporta e importa sin alterar recuentos y conserva la foto', async () => {
    const { datos, foto } = await ejemploConFoto();
    const zip = await construirZip(construirPaquete(datos, null, new Set([foto.id])), [foto]);
    const r = await leerArchivoCopia(await comoArchivo(zip, 'copia.zip'));
    expect(r.ok).toBe(true);
    expect(r.paquete.observaciones.map((o) => o.abundancia)).toEqual([2, 1, 4, 1, 20, 1, 1, 2, 1]);
    expect(r.paquete.fotos).toHaveLength(1);
    expect(r.paquete.fotos[0].tipoMime).toBe('image/jpeg');
    expect(r.paquete.observaciones[4].fotoLocalId).toBe('foto-albardin');
    expect(new Uint8Array(await r.paquete.fotos[0].blob.arrayBuffer())).toEqual(jpegFalso());
  });

  it('sigue aceptando copias JSON antiguas, sin fotos', async () => {
    const json = JSON.stringify(construirPaquete(crearEjemploSalar(), null));
    const r = await leerArchivoCopia(new File([json], 'copia.json', { type: 'application/json' }));
    expect(r.ok).toBe(true);
    expect(r.paquete.fotos).toEqual([]);
  });

  it('rechaza rutas peligrosas y archivos inesperados', async () => {
    const paquete = strToU8(JSON.stringify(construirPaquete(crearEjemploSalar(), null)));
    for (const intruso of ['../fuera.txt', 'script.js', 'fotos/../../x.jpg']) {
      const zip = zipSync({ 'proyecto.json': paquete, [intruso]: strToU8('x') });
      const r = await leerArchivoCopia(new File([zip], 'copia.zip'));
      expect(r.ok).toBe(false);
      expect(r.errores[0]).toMatch(/no son de NaturaLab/);
    }
  });

  it('ignora los metadatos que añade macOS al comprimir', async () => {
    const paquete = strToU8(JSON.stringify(construirPaquete(crearEjemploSalar(), null)));
    const zip = zipSync({ 'proyecto.json': paquete, '__MACOSX/._proyecto.json': strToU8('x'), '.DS_Store': strToU8('x') });
    expect((await leerArchivoCopia(new File([zip], 'copia.zip'))).ok).toBe(true);
  });

  it('rechaza fotos que no son imágenes o que no corresponden a ninguna observación', async () => {
    const { datos, foto } = await ejemploConFoto();
    const paquete = { ...construirPaquete(datos, null, new Set([foto.id])) };
    const malo = zipSync({
      'proyecto.json': strToU8(
        JSON.stringify({
          ...paquete,
          fotos: [
            { id: 'f1', observacionId: datos.observaciones[4].id, archivo: 'fotos/f1.jpg' },
            { id: 'f2', observacionId: 'no-existe', archivo: 'fotos/f2.jpg' },
          ],
        }),
      ),
      'fotos/f1.jpg': strToU8('esto no es una imagen'),
      'fotos/f2.jpg': jpegFalso(),
    });
    const r = await leerArchivoCopia(new File([malo], 'copia.zip'));
    expect(r.ok).toBe(false);
    expect(r.totalErrores).toBe(2);
  });

  it('detecta el tipo real de imagen por sus bytes', () => {
    expect(tipoDeBytes(jpegFalso())).toBe('image/jpeg');
    expect(tipoDeBytes(strToU8('RIFF____WEBPVP8 '))).toBe('image/webp');
    expect(tipoDeBytes(strToU8('<svg onload=alert(1)>'))).toBeNull();
  });
});

describe('Fusión y copia con fotos', () => {
  it('la copia independiente renombra fotos y vínculos de forma coherente', async () => {
    const { datos, foto } = await ejemploConFoto();
    const zip = await construirZip(construirPaquete(datos, null, new Set([foto.id])), [foto]);
    const { paquete } = await leerArchivoCopia(await comoArchivo(zip, 'copia.zip'));
    let n = 0;
    const copia = prepararCopiaNueva(paquete, () => `nuevo-${++n}`);
    const obs = copia.observaciones.find((o) => o.fotoLocalId);
    expect(copia.fotos[0].id).toBe(obs.fotoLocalId);
    expect(copia.fotos[0].observacionId).toBe(obs.id);
    expect(copia.fotos[0].investigacionId).toBe(copia.investigacion.id);
  });

  it('al fusionar trae la foto de una observación nueva', async () => {
    const { datos, foto } = await ejemploConFoto();
    const nueva = { ...datos.observaciones[0], id: 'obs-nueva', fotoLocalId: 'foto-nueva' };
    const fotoNueva = { ...foto, id: 'foto-nueva', observacionId: 'obs-nueva' };
    datos.observaciones.push(nueva);
    const zip = await construirZip(construirPaquete(datos, null, new Set([foto.id, 'foto-nueva'])), [foto, fotoNueva]);
    const { paquete } = await leerArchivoCopia(await comoArchivo(zip, 'copia.zip'));
    const local = { ...crearEjemploSalar() };
    local.observaciones[4] = { ...local.observaciones[4], fotoLocalId: 'foto-albardin' };
    const plan = planificarImportacion(paquete, local);
    const lote = prepararFusion(paquete, local, plan);
    expect(lote.observaciones.map((o) => o.id)).toEqual(['obs-nueva']);
    expect(lote.fotos.map((f) => f.id)).toEqual(['foto-nueva']);
  });
});

describe('Fotos en el almacenamiento local', () => {
  it('guarda, sustituye y elimina la foto de una observación', async () => {
    await guardarLote(crearEjemploSalar());
    const datos = await obtenerDatosInvestigacion(ID_EJEMPLO);
    const obs = datos.observaciones[0];
    const blob = new Blob([jpegFalso()], { type: 'image/jpeg' });

    const conFoto = await guardarObservacion(obs, { foto: { blob, ancho: 10, alto: 8 } });
    expect(conFoto.fotoLocalId).toBeTruthy();
    expect((await obtenerFoto(conFoto.fotoLocalId)).ancho).toBe(10);

    const sinCambio = await guardarObservacion({ ...conFoto, abundancia: 5 });
    expect(sinCambio.fotoLocalId).toBe(conFoto.fotoLocalId);

    const sustituida = await guardarObservacion(sinCambio, { foto: { blob, ancho: 20, alto: 16 } });
    expect(await obtenerFoto(conFoto.fotoLocalId)).toBeNull();
    expect(await obtenerFotosDeObservaciones([sustituida])).toHaveLength(1);

    await eliminarObservacion(sustituida.id);
    expect(await obtenerFoto(sustituida.fotoLocalId)).toBeNull();
  });
});

describe('Cuaderno en PDF', () => {
  it('adapta los textos a las fuentes del PDF', () => {
    expect(textoPdf('H′ = −Σ pᵢ')).toBe("H' = -Suma de pi");
    expect(textoPdf('Albardín, niño, «pingüino» €')).toBe('Albardín, niño, «pingüino» €');
    expect(textoPdf('Hola 🌿')).toBe('Hola ');
  });

  it('genera un PDF del ejemplo', async () => {
    const blob = await generarPdfCuaderno(crearEjemploSalar());
    const cabecera = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 5).arrayBuffer()));
    expect(cabecera).toBe('%PDF-');
    expect(blob.size).toBeGreaterThan(2000);
  });
});
