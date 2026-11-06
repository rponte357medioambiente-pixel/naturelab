import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';

/**
 * Registro del service worker. La app no se recarga sola: avisa cuando hay
 * una versión nueva para no interrumpir un registro en curso.
 */
export function AvisoActualizacion() {
  const anunciar = useAnunciar();
  const {
    needRefresh: [hayVersion, setHayVersion],
    offlineReady: [listaSinConexion, setListaSinConexion],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (listaSinConexion) {
      anunciar('NatureLab ya puede usarse sin conexión en este dispositivo.', { duracion: 5000 });
      setListaSinConexion(false);
    }
  }, [listaSinConexion, anunciar, setListaSinConexion]);

  if (!hayVersion) return null;
  return (
    <div className="banda-sistema">
      <div className="aviso" role="status">
        <p>Hay una versión nueva de NatureLab. Tus datos se conservan al actualizar.</p>
        <button type="button" className="boton" onClick={() => updateServiceWorker(true)}>
          Actualizar ahora
        </button>
        <button type="button" className="boton boton--sencillo" onClick={() => setHayVersion(false)}>
          Más tarde
        </button>
      </div>
    </div>
  );
}
