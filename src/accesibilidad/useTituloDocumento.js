import { useEffect } from 'react';

/** Título de la pestaña o ventana, útil también para lectores de pantalla. */
export function useTituloDocumento(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | NatureLab` : 'NatureLab';
  }, [titulo]);
}
