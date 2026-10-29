/**
 * Detección de personas en el propio dispositivo con MediaPipe (Apache 2.0).
 * La foto no sale del navegador. Los modelos y el motor WebAssembly se sirven
 * desde public/modelos y public/mediapipe (los prepara scripts/preparar-detector.mjs)
 * y solo se descargan cuando se usa esta herramienta.
 *
 * Es una ayuda, no una garantía: puede no ver caras pequeñas, de perfil o tapadas.
 */
let promesaDetectores = null;

function cargarDetectores() {
  if (!promesaDetectores) {
    promesaDetectores = (async () => {
      const { FilesetResolver, FaceDetector, ObjectDetector } = await import('@mediapipe/tasks-vision');
      const base = import.meta.env.BASE_URL;
      const motor = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`);
      const [caras, figuras] = await Promise.all([
        FaceDetector.createFromOptions(motor, {
          baseOptions: { modelAssetPath: `${base}modelos/blaze_face_short_range.tflite`, delegate: 'CPU' },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.45,
        }),
        ObjectDetector.createFromOptions(motor, {
          baseOptions: { modelAssetPath: `${base}modelos/efficientdet_lite0.tflite`, delegate: 'CPU' },
          runningMode: 'IMAGE',
          scoreThreshold: 0.3,
          maxResults: 20,
          categoryAllowlist: ['person'],
        }),
      ]);
      return { caras, figuras };
    })().catch((error) => {
      promesaDetectores = null;
      throw error;
    });
  }
  return promesaDetectores;
}

function aZona(deteccion, tipo, escala) {
  const caja = deteccion.boundingBox;
  if (!caja) return null;
  return {
    tipo,
    puntuacion: deteccion.categories?.[0]?.score ?? null,
    x: caja.originX / escala,
    y: caja.originY / escala,
    ancho: caja.width / escala,
    alto: caja.height / escala,
  };
}

/**
 * @param {HTMLCanvasElement} lienzo  copia reducida de la foto
 * @param {number} escala  factor de reducción respecto al original
 * @returns {Promise<object[]>} zonas en píxeles de la imagen original
 */
export async function detectarPersonas(lienzo, escala = 1) {
  const { caras, figuras } = await cargarDetectores();
  const zonas = [
    ...caras.detect(lienzo).detections.map((d) => aZona(d, 'cara', escala)),
    ...figuras.detect(lienzo).detections.map((d) => aZona(d, 'persona', escala)),
  ];
  return zonas.filter(Boolean);
}
