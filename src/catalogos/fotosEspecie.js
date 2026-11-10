/**
 * Fotos de una especie: una principal y hasta dos más. Funciones puras sobre el
 * «registro de fotos», que tiene la misma forma en «Mi catálogo» y en las fotos
 * de campo de las especies publicadas:
 *   { foto, imagenAutor, imagenFuente, imagenLicencia, imagenModificaciones,
 *     partePrincipal, fotosExtra: [{ id, foto, parte, imagenAutor, … }] }
 * En las publicadas, sin foto principal propia se ve la imagen del catálogo.
 */
export const MAX_FOTOS = 3;
const CREDITOS = ['imagenAutor', 'imagenFuente', 'imagenLicencia', 'imagenModificaciones'];

export const fotosPropias = (r) => (r?.foto ? 1 : 0) + (r?.fotosExtra?.length ?? 0);
export const quedanHuecos = (r) => fotosPropias(r) < MAX_FOTOS;

function principalComoExtra(r, generarId) {
  return {
    id: generarId(),
    foto: r.foto,
    parte: r.partePrincipal ?? null,
    ...Object.fromEntries(CREDITOS.map((c) => [c, r[c] ?? ''])),
  };
}

function extraComoPrincipal(extra) {
  return {
    foto: extra.foto,
    partePrincipal: extra.parte ?? null,
    ...Object.fromEntries(CREDITOS.map((c) => [c, extra[c] ?? ''])),
  };
}

const sinPrincipal = { foto: null, partePrincipal: null, ...Object.fromEntries(CREDITOS.map((c) => [c, ''])) };

/**
 * Añade una foto. Como principal, la anterior (si la había) pasa a ser adicional.
 * @param {{foto, parte, imagenAutor, imagenFuente, imagenLicencia, imagenModificaciones}} nueva
 */
export function agregarFoto(r, nueva, { principal = false, generarId }) {
  if (!quedanHuecos(r)) throw new Error(`Una especie puede tener como mucho ${MAX_FOTOS} fotos.`);
  const extras = r.fotosExtra ?? [];
  if (principal) {
    return {
      ...extraComoPrincipal(nueva),
      fotosExtra: r.foto ? [principalComoExtra(r, generarId), ...extras] : extras,
    };
  }
  return { fotosExtra: [...extras, { id: generarId(), ...nueva }] };
}

/**
 * Quita una foto ('principal' o el id de una adicional). En «Mi catálogo», si se
 * quita la principal, la primera adicional pasa a principal; en las publicadas
 * vuelve a verse la imagen del catálogo.
 */
export function quitarFoto(r, id, { publicada = false } = {}) {
  const extras = r.fotosExtra ?? [];
  if (id !== 'principal') return { fotosExtra: extras.filter((x) => x.id !== id) };
  if (!publicada && extras.length) return { ...extraComoPrincipal(extras[0]), fotosExtra: extras.slice(1) };
  return { ...sinPrincipal, fotosExtra: extras };
}

/** Convierte una adicional en principal; la principal propia, si la hay, pasa a adicional en su lugar. */
export function hacerPrincipal(r, id, { generarId }) {
  const extras = r.fotosExtra ?? [];
  const elegida = extras.find((x) => x.id === id);
  if (!elegida) return {};
  const resto = extras.filter((x) => x.id !== id);
  return {
    ...extraComoPrincipal(elegida),
    fotosExtra: r.foto ? [principalComoExtra(r, generarId), ...resto] : resto,
  };
}
