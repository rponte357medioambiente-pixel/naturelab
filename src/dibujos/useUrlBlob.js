import { useEffect, useMemo } from 'react';

/** URL temporal de un Blob guardado, liberada al cambiarlo o al salir. */
export function useUrlBlob(blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return url;
}
