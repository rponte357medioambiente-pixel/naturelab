/**
 * Recuperación ante módulos que no cargan.
 *
 * Si la app se actualiza (o, en desarrollo, Vite reorganiza sus módulos)
 * mientras la página está abierta, cargar una parte bajo demanda —por ejemplo,
 * el generador del PDF— puede fallar con «Failed to fetch dynamically imported
 * module». La solución es recargar la página; se hace una sola vez por sesión
 * para no entrar en un bucle.
 */
const CLAVE = 'naturelab-recarga-modulos';

export function esErrorDeModulo(error) {
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    String(error?.message ?? error ?? ''),
  );
}

/** Recarga la página si no se ha hecho ya en esta sesión. Devuelve true si va a recargar. */
export function recargarUnaVez() {
  try {
    if (sessionStorage.getItem(CLAVE)) return false;
    sessionStorage.setItem(CLAVE, new Date().toISOString());
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Carga un módulo bajo demanda; si falla por estar desactualizado, recarga la página una vez. */
export async function importarModulo(cargar) {
  try {
    const modulo = await cargar();
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      /* sin almacenamiento de sesión */
    }
    return modulo;
  } catch (error) {
    if (esErrorDeModulo(error) && recargarUnaVez()) return new Promise(() => {});
    throw error;
  }
}

/** Para los módulos que precarga Vite al compilar. */
export function vigilarPrecargas() {
  window.addEventListener('vite:preloadError', (evento) => {
    if (recargarUnaVez()) evento.preventDefault();
  });
}
