import { useEffect, useState } from 'react';
import { loadPhoto } from '../state/photoDb';

/** Lädt ein gespeichertes Foto als Objekt-URL. */
export function usePhoto(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let alive = true;
    let objectUrl: string | null = null;
    loadPhoto(id)
      .then((blob) => {
        if (!alive || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return url;
}
