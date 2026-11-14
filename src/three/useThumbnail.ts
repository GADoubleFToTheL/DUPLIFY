import { useEffect, useState } from 'react';
import type { Placement } from '../core/types';
import { cachedThumbnail, renderThumbnail, ThumbnailCancelled, type ThumbOptions } from './thumbnails';

/**
 * Vorschaubild als Data-URL (null, solange es gerendert wird).
 * `key = null` pausiert: ein schon gezeigtes Bild bleibt stehen, eine offene Anfrage wird zurückgezogen.
 */
export function useThumbnail(key: string | null, placements: () => readonly Placement[], opts: ThumbOptions = {}): string | null {
  const size = opts.size ?? 256;
  const [url, setUrl] = useState<string | null>(() => (key ? (cachedThumbnail(key, size) ?? null) : null));
  useEffect(() => {
    if (!key) return;
    const hit = cachedThumbnail(key, size);
    if (hit) {
      setUrl(hit);
      return;
    }
    setUrl(null);
    const ctrl = new AbortController();
    renderThumbnail(key, placements(), opts, ctrl.signal)
      .then((u) => {
        if (!ctrl.signal.aborted) setUrl(u);
      })
      .catch((e) => {
        if (!(e instanceof ThumbnailCancelled)) console.warn('Vorschaubild fehlgeschlagen', e);
      });
    return () => ctrl.abort();
    // placements/opts werden bewusst nur über den Schlüssel gesteuert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size]);
  return url;
}
