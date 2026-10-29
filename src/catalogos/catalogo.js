import { useEffect, useMemo, useState } from 'react';
import { listarEspeciesPropias } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { normalizarTexto } from '../calculos/biodiversidad.js';
import { prepararEspeciesPropias } from './especiesPropias.js';

/**
 * El catálogo es un archivo estático (public/data/especies.json) que se publica
 * con la web y el service worker guarda para usarlo sin conexión.
 * Las rutas se resuelven con la base del despliegue (p. ej. /naturelab/ en GitHub Pages).
 */
export function rutaPublica(ruta) {
  if (!ruta) return null;
  return `${import.meta.env.BASE_URL}${String(ruta).replace(/^\/+/, '')}`;
}

function validarCatalogo(datos) {
  if (!datos || !Array.isArray(datos.especies)) throw new Error('El catálogo no tiene un formato válido.');
  const ids = new Set();
  const especies = datos.especies.filter((e) => {
    const valida =
      e && typeof e.id === 'string' && typeof e.nombreComun === 'string' && !ids.has(e.id);
    if (valida) ids.add(e.id);
    return valida;
  });
  return { ...datos, especies };
}

let promesaCatalogo = null;

export function cargarCatalogo() {
  if (!promesaCatalogo) {
    promesaCatalogo = fetch(rutaPublica('data/especies.json'))
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error('No se ha podido cargar el catálogo.');
        return respuesta.json();
      })
      .then(validarCatalogo)
      .catch((error) => {
        promesaCatalogo = null;
        throw error;
      });
  }
  return promesaCatalogo;
}

/**
 * Catálogo completo: el publicado con la web más «Mi catálogo» (especies propias,
 * guardadas en este dispositivo). `catalogo` es solo el publicado; `especies` y
 * `buscarEspecie` incluyen también las propias, marcadas con `propia: true`.
 */
export function useCatalogo() {
  const [estado, setEstado] = useState({ cargando: true, catalogo: null, error: null });
  const propias = useConsulta(() => listarEspeciesPropias().then(prepararEspeciesPropias), []);
  useEffect(() => {
    let activo = true;
    cargarCatalogo().then(
      (catalogo) => activo && setEstado({ cargando: false, catalogo, error: null }),
      (error) => activo && setEstado({ cargando: false, catalogo: null, error }),
    );
    return () => {
      activo = false;
    };
  }, []);

  const especiesPropias = useMemo(() => propias.datos ?? [], [propias.datos]);
  const especies = useMemo(
    () => [...(estado.catalogo?.especies ?? []), ...especiesPropias],
    [estado.catalogo, especiesPropias],
  );
  const buscarEspecie = (id) => (id ? especies.find((e) => e.id === id) ?? null : null);
  return {
    ...estado,
    // Si el catálogo publicado no carga (primera visita sin conexión), las propias siguen disponibles.
    cargando: estado.cargando || propias.cargando,
    especies,
    especiesPropias,
    buscarEspecie,
  };
}

/** URL de la imagen de una especie: la foto guardada (propias) o la publicada con licencia verificada. */
export function urlImagenEspecie(especie) {
  if (!especie) return null;
  if (especie.propia) return especie.imagenUrl ?? null;
  return especie.imagen && especie.imagenLicencia ? rutaPublica(especie.imagen) : null;
}

export const tieneImagen = (especie) => Boolean(urlImagenEspecie(especie));

/** Texto alternativo de la imagen: nombre común y, si existe, el científico. */
export function textoAlternativoEspecie(especie) {
  return especie?.nombreCientifico ? `${especie.nombreComun} (${especie.nombreCientifico})` : especie?.nombreComun ?? '';
}

/** Busca por nombre común, científico o familia, sin distinguir tildes ni mayúsculas. */
export function buscarEspecies(especies, consulta) {
  const texto = normalizarTexto(consulta);
  if (!texto) return especies;
  return especies.filter((e) =>
    [e.nombreComun, e.nombreCientifico, e.familia].some((campo) => normalizarTexto(campo).includes(texto)),
  );
}

/** Nombre a mostrar de una observación: datos actuales del catálogo o, si no existe, los guardados. */
export function nombresDeObservacion(observacion, buscarEspecie) {
  const especie = buscarEspecie(observacion.especieId);
  return {
    nombreComun: especie?.nombreComun ?? observacion.nombreComun,
    nombreCientifico: especie?.nombreCientifico ?? observacion.nombreCientifico,
  };
}
