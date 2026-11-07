import { useEffect, useState } from 'react';
import { rutaPublica } from '../catalogos/catalogo.js';

/**
 * Plantillas de «unir los puntos» (public/data/plantillas.json), una por especie
 * del catálogo, con tres niveles. Las coordenadas están en un área de 300 x 300.
 * Se generan con scripts/generar-plantillas.py.
 */
export const NIVELES = {
  facil: 'Fácil',
  medio: 'Medio',
  dificil: 'Difícil',
};

function validar(datos) {
  if (!datos || !Array.isArray(datos.plantillas)) throw new Error('Las plantillas no tienen un formato válido.');
  const esLista = (l) => Array.isArray(l) && l.length >= 3 && l.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
  const mapa = new Map();
  for (const p of datos.plantillas) {
    if (typeof p?.especieId !== 'string' || !p.niveles) continue;
    const niveles = {};
    for (const nivel of Object.keys(NIVELES)) {
      const n = p.niveles[nivel];
      if (n && esLista(n.puntos) && esLista(n.etiquetas) && n.puntos.length === n.etiquetas.length) niveles[nivel] = n;
    }
    if (Object.keys(niveles).length) mapa.set(p.especieId, { especieId: p.especieId, parte: p.parte ?? '', niveles });
  }
  return { area: datos.area ?? 300, plantillas: mapa };
}

let promesa = null;
export function cargarPlantillas() {
  if (!promesa) {
    promesa = fetch(rutaPublica('data/plantillas.json'))
      .then((r) => {
        if (!r.ok) throw new Error('No se han podido cargar las plantillas.');
        return r.json();
      })
      .then(validar)
      .catch((error) => {
        promesa = null;
        throw error;
      });
  }
  return promesa;
}

export { validar as validarPlantillas };

export function usePlantillas() {
  const [estado, setEstado] = useState({ cargando: true, datos: null, error: null });
  useEffect(() => {
    let activo = true;
    cargarPlantillas().then(
      (datos) => activo && setEstado({ cargando: false, datos, error: null }),
      (error) => activo && setEstado({ cargando: false, datos: null, error }),
    );
    return () => {
      activo = false;
    };
  }, []);
  return estado;
}
