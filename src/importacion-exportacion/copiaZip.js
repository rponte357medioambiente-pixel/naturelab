import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/**
 * Copia completa en ZIP (apartado 8.2):
 *   proyecto.json  datos de la investigación y vínculos a las fotos
 *   fotos/         una imagen por observación que tenga foto
 *   LEEME.txt      explicación del contenido
 * Las fotos viajan como archivos, nunca en Base64 dentro del JSON.
 */
export const LIMITES_ZIP = {
  tamanoArchivoBytes: 200 * 1024 * 1024,
  tamanoDescomprimidoBytes: 400 * 1024 * 1024,
  tamanoFotoBytes: 15 * 1024 * 1024,
  archivos: 3000,
};

export const NOMBRE_DATOS = 'proyecto.json';
// Copia de «Mi catálogo»: mismo formato de ZIP, con otro archivo de datos.
export const NOMBRE_DATOS_CATALOGO = 'mi-catalogo.json';
export const RUTA_FOTO = /^fotos\/([A-Za-z0-9_-]{1,100})\.(jpg|jpeg|png|webp)$/;
// Dibujos de los estudiantes (fase 4): siempre en PNG.
export const RUTA_DIBUJO = /^dibujos\/([A-Za-z0-9_-]{1,100})\.png$/;
const PERMITIDOS = new Set([NOMBRE_DATOS, NOMBRE_DATOS_CATALOGO, 'LEEME.txt', 'catalogo-referencias.json']);
// Metadatos que macOS añade al comprimir carpetas: se ignoran sin error.
const IGNORADOS = /(^__MACOSX\/|(^|\/)\.DS_Store$)/;

const LEEME = `NatureLab: copia de seguridad de una investigación

Este archivo contiene:
- proyecto.json: la investigación, sus parcelas y sus observaciones.
- fotos/: las fotografías de las observaciones, si las hay.
- dibujos/: los dibujos de la investigación, si los hay.

Para recuperarla, abre NatureLab, ve a Investigaciones y pulsa «Importar copia».
No hace falta descomprimir el archivo.

Las fotografías pueden incluir a personas o lugares: compártelo con cuidado.
`;

export function extensionDeTipo(tipo) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[tipo] ?? 'jpg';
}

/** Tipo real de una imagen según sus primeros bytes (no se confía en la extensión). */
export function tipoDeBytes(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  return null;
}

export function esZip(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/**
 * @param {object} paquete  salida de construirPaquete()
 * @param {object[]} fotos  registros de fotos (con blob)
 * @returns {Promise<Blob>}
 */
export async function construirZip(paquete, fotos = [], dibujos = []) {
  const archivos = {};
  const vinculos = [];
  const vinculosDibujos = [];
  for (const dibujo of dibujos) {
    if (!dibujo.blob) continue;
    const ruta = `dibujos/${dibujo.id}.png`;
    archivos[ruta] = [new Uint8Array(await dibujo.blob.arrayBuffer()), { level: 0 }];
    // eslint-disable-next-line no-unused-vars
    const { blob, tipoMime, tamano, ...datos } = dibujo;
    vinculosDibujos.push({ ...datos, archivo: ruta });
  }
  for (const foto of fotos) {
    const ruta = `fotos/${foto.id}.${extensionDeTipo(foto.tipoMime ?? foto.blob.type)}`;
    // Las imágenes ya están comprimidas: se guardan sin volver a comprimir.
    archivos[ruta] = [new Uint8Array(await foto.blob.arrayBuffer()), { level: 0 }];
    vinculos.push({
      id: foto.id,
      observacionId: foto.observacionId,
      archivo: ruta,
      tipoMime: foto.tipoMime ?? foto.blob.type,
      ancho: foto.ancho ?? null,
      alto: foto.alto ?? null,
      fecha: foto.fecha ?? null,
    });
  }
  archivos[NOMBRE_DATOS] = strToU8(
    `${JSON.stringify({ ...paquete, fotos: vinculos, dibujos: vinculosDibujos }, null, 2)}\n`,
  );
  archivos['LEEME.txt'] = strToU8(LEEME);
  return new Blob([zipSync(archivos, { level: 6 })], { type: 'application/zip' });
}

/**
 * Lee un ZIP de NatureLab con controles de seguridad: solo rutas esperadas,
 * sin rutas relativas peligrosas y con límites de tamaño y número de archivos.
 * @param {{nombreDatos?: string}} opciones  archivo JSON que debe contener el ZIP
 * @returns {{datos: object, archivos: Record<string, Uint8Array>}}
 */
export function leerZip(bytes, { nombreDatos = NOMBRE_DATOS } = {}) {
  let total = 0;
  let cuenta = 0;
  const rechazados = [];
  let demasiado = false;

  let contenido;
  try {
    contenido = unzipSync(bytes, {
      filter: (archivo) => {
        const nombre = archivo.name;
        if (nombre.endsWith('/') || IGNORADOS.test(nombre)) return false;
        cuenta += 1;
        const seguro = !nombre.includes('..') && !nombre.startsWith('/') && !nombre.includes('\\');
        if (!seguro || !(PERMITIDOS.has(nombre) || RUTA_FOTO.test(nombre) || RUTA_DIBUJO.test(nombre))) {
          rechazados.push(nombre);
          return false;
        }
        total += archivo.originalSize;
        if (
          cuenta > LIMITES_ZIP.archivos ||
          total > LIMITES_ZIP.tamanoDescomprimidoBytes ||
          ((RUTA_FOTO.test(nombre) || RUTA_DIBUJO.test(nombre)) && archivo.originalSize > LIMITES_ZIP.tamanoFotoBytes)
        ) {
          demasiado = true;
          return false;
        }
        return true;
      },
    });
  } catch {
    throw new Error('El archivo ZIP está dañado o no se puede leer.');
  }

  if (rechazados.length > 0) {
    throw new Error(
      `El ZIP contiene archivos que no son de NatureLab (${rechazados.slice(0, 3).join(', ')}${rechazados.length > 3 ? '…' : ''}).`,
    );
  }
  if (demasiado) throw new Error('El ZIP es demasiado grande o contiene demasiados archivos.');
  if (!contenido[nombreDatos]) {
    if (nombreDatos === NOMBRE_DATOS && contenido[NOMBRE_DATOS_CATALOGO]) {
      throw new Error('Este archivo es una copia de «Mi catálogo». Impórtala desde Catálogo.');
    }
    if (nombreDatos === NOMBRE_DATOS_CATALOGO && contenido[NOMBRE_DATOS]) {
      throw new Error('Este archivo es la copia de una investigación. Impórtala desde Investigaciones.');
    }
    throw new Error(`El ZIP no contiene ${nombreDatos}.`);
  }

  let datos;
  try {
    datos = JSON.parse(strFromU8(contenido[nombreDatos]));
  } catch {
    throw new Error(`El archivo ${nombreDatos} del ZIP no es válido.`);
  }
  return { datos, archivos: contenido };
}
