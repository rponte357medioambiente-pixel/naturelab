import { useEffect, useState } from 'react';
import { normalizarTexto } from '../calculos/biodiversidad.js';

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

export function useCatalogo() {
  const [estado, setEstado] = useState({ cargando: true, catalogo: null, error: null });
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

  const especies = estado.catalogo?.especies ?? [];
  const buscarEspecie = (id) => (id ? especies.find((e) => e.id === id) ?? null : null);
  return { ...estado, especies, buscarEspecie };
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
