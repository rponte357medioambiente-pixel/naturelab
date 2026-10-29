import { useEffect, useState } from 'react';
import { cambios } from './repositorio.js';

/**
 * Ejecuta una consulta asíncrona y la repite cada vez que cambian los datos locales.
 * @param {() => Promise<any>} consulta
 * @param {any[]} dependencias
 */
export function useConsulta(consulta, dependencias = []) {
  const [estado, setEstado] = useState({ cargando: true, datos: undefined, error: null });

  useEffect(() => {
    let activo = true;
    const cargar = () => {
      consulta().then(
        (datos) => activo && setEstado({ cargando: false, datos, error: null }),
        (error) => activo && setEstado({ cargando: false, datos: undefined, error }),
      );
    };
    cargar();
    cambios.addEventListener('cambio', cargar);
    return () => {
      activo = false;
      cambios.removeEventListener('cambio', cargar);
    };
    // La consulta se recrea en cada render; las dependencias explícitas controlan la recarga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return estado;
}
