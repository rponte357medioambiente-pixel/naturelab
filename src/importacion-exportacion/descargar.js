/** Descarga un archivo generado en el navegador. No se envía nada a ningún servidor. */
export function descargarArchivo(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Indica si el sistema permite compartir archivos (AirDrop, mensajería, correo…). */
export function puedeCompartirArchivos(tipo = 'application/json', nombre = 'prueba.json') {
  try {
    const prueba = new File(['x'], nombre, { type: tipo });
    return Boolean(navigator.canShare?.({ files: [prueba] }));
  } catch {
    return false;
  }
}

/**
 * Abre el menú de compartir del sistema con el archivo. Si el navegador no permite
 * compartir este tipo de archivo (por ejemplo, Safari en ordenador con JSON y el
 * error «permiso denegado»), descarga el archivo en su lugar.
 * @returns {Promise<'compartido'|'descargado'|'cancelado'>}
 */
export async function compartirArchivo(nombre, contenido, tipo, titulo) {
  const archivo = new File([contenido], nombre, { type: tipo });
  if (!navigator.canShare?.({ files: [archivo] })) {
    descargarArchivo(nombre, contenido, tipo);
    return 'descargado';
  }
  try {
    await navigator.share({ files: [archivo], title: titulo });
    return 'compartido';
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelado';
    descargarArchivo(nombre, contenido, tipo);
    return 'descargado';
  }
}
