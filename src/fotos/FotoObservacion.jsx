import { useEffect, useRef, useState } from 'react';
import { obtenerFoto } from '../almacenamiento/repositorio.js';

/** URL temporal de una foto guardada en el dispositivo. */
export function useFoto(id) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return undefined;
    }
    let activo = true;
    let creada = null;
    obtenerFoto(id).then((registro) => {
      if (activo && registro?.blob) {
        creada = URL.createObjectURL(registro.blob);
        setUrl(creada);
      }
    });
    return () => {
      activo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [id]);
  return url;
}

/** Miniatura que abre la foto a pantalla completa. */
export function MiniaturaFoto({ id, descripcion, alAbrir }) {
  const url = useFoto(id);
  if (!url) return <span className="miniatura-especie" aria-hidden="true" />;
  return (
    <button type="button" className="boton-miniatura" onClick={() => alAbrir({ url, descripcion })}>
      <img className="miniatura-especie" src={url} alt="" />
      <span className="solo-lectores">Ver foto de {descripcion}</span>
    </button>
  );
}

/** Visor a pantalla completa con el elemento nativo <dialog>. */
export function VisorFoto({ foto, alCerrar }) {
  const dialogo = useRef(null);
  useEffect(() => {
    const d = dialogo.current;
    if (foto && d && !d.open) d.showModal();
    if (!foto && d?.open) d.close();
  }, [foto]);
  return (
    <dialog ref={dialogo} className="visor-foto" onClose={alCerrar} aria-label={foto ? `Foto de ${foto.descripcion}` : undefined}>
      {foto && (
        <>
          <img src={foto.url} alt={`Foto de ${foto.descripcion}`} />
          <div className="acciones" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="boton" onClick={() => dialogo.current?.close()}>
              Cerrar
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
