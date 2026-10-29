/**
 * Fotos de campo: se reducen y se vuelven a codificar en JPEG en el propio
 * dispositivo. Al recodificar se eliminan los metadatos (EXIF), incluida la
 * ubicación GPS. Nunca se envían a ningún servidor.
 */
export const LADO_MAXIMO_FOTO = 1600;

export function cargarImagen(origen) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(origen);
    const imagen = new Image();
    imagen.onload = () => resolver({ imagen, liberar: () => URL.revokeObjectURL(url) });
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error('No se puede abrir esta imagen en este navegador.'));
    };
    imagen.src = url;
  });
}

function aBlob(lienzo, tipo, calidad) {
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('No se ha podido procesar la foto.'))), tipo, calidad),
  );
}

/** Reduce una imagen a un lado máximo y la devuelve como JPEG. */
export async function reducirAJpeg(origen, ladoMaximo = LADO_MAXIMO_FOTO, calidad = 0.8) {
  const { imagen, liberar } = await cargarImagen(origen);
  try {
    const escala = Math.min(1, ladoMaximo / Math.max(imagen.naturalWidth, imagen.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.naturalWidth * escala);
    lienzo.height = Math.round(imagen.naturalHeight * escala);
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await aBlob(lienzo, 'image/jpeg', calidad);
    return { blob, ancho: lienzo.width, alto: lienzo.height };
  } finally {
    liberar();
  }
}

/** Foto elegida con la cámara o la galería, lista para guardar. */
export function comprimirFoto(archivo) {
  if (!archivo.type.startsWith('image/') && archivo.type !== '') {
    return Promise.reject(new Error('El archivo elegido no es una imagen.'));
  }
  return reducirAJpeg(archivo, LADO_MAXIMO_FOTO, 0.8);
}

/** Versión reducida de una foto para el cuaderno en PDF (más ligera que la original). */
export async function prepararFotoParaPdf(registro) {
  const { blob, ancho, alto } = await reducirAJpeg(registro.blob, 1000, 0.75);
  return { datos: new Uint8Array(await blob.arrayBuffer()), ancho, alto };
}
