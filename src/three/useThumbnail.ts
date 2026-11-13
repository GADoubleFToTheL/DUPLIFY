import { useEffect, useState } from 'react';
import type { Placement } from '../core/types';
import { cachedThumbnail, renderThumbnail, type ThumbOptions } from './thumbnails';

/** Vorschaubild als Data-URL (null, solange es gerendert wird). */
export function useThumbnail(key: string | null, placements: () => readonly Placement[], opts: ThumbOptions = {}): string | null {
  const size = opts.size ?? 256;
  const [url, setUrl] = useState<string | null>(() => (key ? (cachedThumbnail(key, size) ?? null) : null));
  useEffect(() => {
    if (!key) return;
    let alive = true;
    const hit = cachedThumbnail(key, size);
    if (hit) {
      setUrl(hit);
      return;
    }
    setUrl(null);
    renderThumbnail(key, placements(), opts)
      .then((u) => alive && setUrl(u))
      .catch((e) => console.warn('Vorschaubild fehlgeschlagen', e));
    return () => {
      alive = false;
    };
    // placements/opts werden bewusst nur über den Schlüssel gesteuert
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size]);
  return url;
}
