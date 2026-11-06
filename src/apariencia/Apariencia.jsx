import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { esPaletaValida, PALETA_GENERAL, PALETAS } from './paletas.js';

/**
 * Apariencia de la app: paleta general y tamaño del texto (se guardan en este
 * navegador) y la paleta que toca en cada momento:
 *   vista previa (al elegir paleta en un formulario)
 *   > paleta de la investigación abierta
 *   > paleta general.
 */
const CLAVE = 'naturelab-apariencia';
export const TAMANOS_TEXTO = { normal: 'Normal', grande: 'Grande' };

function leerAjustes() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '{}');
    return {
      paletaGeneral: esPaletaValida(guardado.paletaGeneral) ? guardado.paletaGeneral : PALETA_GENERAL,
      texto: Object.hasOwn(TAMANOS_TEXTO, guardado.texto) ? guardado.texto : 'normal',
    };
  } catch {
    return { paletaGeneral: PALETA_GENERAL, texto: 'normal' };
  }
}

const Contexto = createContext(null);

export function ProveedorApariencia({ children }) {
  const [ajustes, setAjustes] = useState(leerAjustes);
  const [paletaRuta, setPaletaRuta] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const paleta = [vistaPrevia, paletaRuta, ajustes.paletaGeneral].find(esPaletaValida) ?? PALETA_GENERAL;

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.paleta = paleta;
    raiz.dataset.texto = ajustes.texto;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PALETAS[paleta].principal);
  }, [paleta, ajustes.texto]);

  const cambiarAjustes = useCallback((cambios) => {
    setAjustes((actual) => {
      const nuevos = { ...actual, ...cambios };
      try {
        localStorage.setItem(CLAVE, JSON.stringify(nuevos));
      } catch {
        /* sin almacenamiento: el cambio dura hasta cerrar la app */
      }
      return nuevos;
    });
  }, []);

  const valor = useMemo(
    () => ({ ajustes, cambiarAjustes, paleta, setPaletaRuta, setVistaPrevia }),
    [ajustes, cambiarAjustes, paleta],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApariencia() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useApariencia debe usarse dentro de ProveedorApariencia.');
  return contexto;
}

/**
 * Muestra una paleta mientras el componente está en pantalla (por ejemplo, la que
 * se está eligiendo en un formulario). Con null se vuelve a la que toque.
 */
export function useVistaPreviaPaleta(paleta) {
  const { setVistaPrevia } = useApariencia();
  useEffect(() => {
    setVistaPrevia(esPaletaValida(paleta) ? paleta : null);
    return () => setVistaPrevia(null);
  }, [paleta, setVistaPrevia]);
}
