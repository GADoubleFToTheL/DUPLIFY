import { useEffect, useRef, useState } from 'react';
import type { ColorId, Print } from '../../core/types';
import { useThumbnail } from '../../three/useThumbnail';

/** true, solange das Element (fast) sichtbar ist – für spätes Laden langer Listen. */
export function useInView<T extends Element>(rootMargin = '150px'): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, visible];
}

interface Props {
  part: string;
  color: ColorId | null;
  print?: Print;
  size?: number;
  className?: string;
}

/** 3D-Vorschaubild eines Teils – wird erst gerendert, wenn es sichtbar ist. */
export function PartThumbnail({ part, color, print, size = 160, className }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const key = inView ? `part:${part}:${color}:${print ?? ''}` : null;
  const url = useThumbnail(key, () => [{ part, x: 0, y: 0, z: 0, rot: 0, color, print }], { size });
  return (
    <div ref={ref} className={`part-thumb ${className ?? ''}`}>
      {url ? <img src={url} alt="" draggable={false} /> : <div className="thumb-wait" />}
    </div>
  );
}
