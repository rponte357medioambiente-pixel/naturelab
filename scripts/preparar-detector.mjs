/**
 * Prepara el detector de personas de la herramienta de fotos del catálogo:
 * 1. Copia el motor WebAssembly de MediaPipe desde node_modules a public/mediapipe/wasm.
 * 2. Descarga los dos modelos a public/modelos (solo la primera vez).
 *
 * Se ejecuta solo antes de «npm run dev» y «npm run build». Si falla (por ejemplo,
 * sin conexión), avisa y deja continuar: la herramienta pedirá revisión manual.
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paquete = path.join(raiz, 'node_modules/@mediapipe/tasks-vision');
const destinoWasm = path.join(raiz, 'public/mediapipe/wasm');
const destinoModelos = path.join(raiz, 'public/modelos');

const ARCHIVOS_WASM = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

const MODELOS = [
  [
    'blaze_face_short_range.tflite',
    'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
  ],
  [
    'efficientdet_lite0.tflite',
    'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite',
  ],
];

async function copiarMotor() {
  const { version } = JSON.parse(await readFile(path.join(paquete, 'package.json'), 'utf8'));
  const marca = path.join(destinoWasm, 'VERSION');
  if (existsSync(marca) && (await readFile(marca, 'utf8')).trim() === version) return;
  await mkdir(destinoWasm, { recursive: true });
  for (const archivo of ARCHIVOS_WASM) {
    await copyFile(path.join(paquete, 'wasm', archivo), path.join(destinoWasm, archivo));
  }
  await writeFile(marca, `${version}\n`);
  console.log(`Detector: motor MediaPipe ${version} copiado.`);
}

async function descargarModelos() {
  await mkdir(destinoModelos, { recursive: true });
  for (const [nombre, url] of MODELOS) {
    const destino = path.join(destinoModelos, nombre);
    if (existsSync(destino) && (await stat(destino)).size > 0) continue;
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`${nombre}: respuesta ${respuesta.status}`);
    await writeFile(destino, Buffer.from(await respuesta.arrayBuffer()));
    console.log(`Detector: modelo ${nombre} descargado.`);
  }
}

try {
  await copiarMotor();
  await descargarModelos();
} catch (error) {
  console.warn(`Aviso: no se ha podido preparar el detector de personas (${error.message}).`);
  console.warn('La app funciona igual; la herramienta de fotos pedirá revisarlas a mano.');
}
