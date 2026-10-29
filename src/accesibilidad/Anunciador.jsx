import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Mensajes de estado breves («Guardado en este dispositivo»…), visibles en pantalla
 * y anunciados por los lectores de pantalla mediante una región viva.
 */
const ContextoAnuncios = createContext(() => {});

export function ProveedorAnuncios({ children }) {
  const [anuncio, setAnuncio] = useState(null);
  const temporizador = useRef(null);

  const anunciar = useCallback((texto, { tipo = 'info', duracion = 3500 } = {}) => {
    clearTimeout(temporizador.current);
    setAnuncio({ texto, tipo, clave: Date.now() });
    temporizador.current = setTimeout(() => setAnuncio(null), duracion);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return (
    <ContextoAnuncios.Provider value={anunciar}>
      {children}
      <div className="anuncio" role="status" aria-live="polite" aria-atomic="true">
        {anuncio && (
          <p key={anuncio.clave} className={anuncio.tipo === 'error' ? 'error' : undefined}>
            {anuncio.texto}
          </p>
        )}
      </div>
    </ContextoAnuncios.Provider>
  );
}

export const useAnunciar = () => useContext(ContextoAnuncios);
