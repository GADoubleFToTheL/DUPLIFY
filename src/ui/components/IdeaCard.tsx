import type { Creation } from '../../core/types';
import { useThumbnail } from '../../three/useThumbnail';
import { IconStar } from './icons';

export function difficulty(parts: number): number {
  return parts < 12 ? 1 : parts < 35 ? 2 : 3;
}

export function IdeaCard({ creation, onSelect, index }: { creation: Creation; onSelect: () => void; index: number }) {
  const url = useThumbnail(creation.id, () => creation.placements, { size: 320 });
  const stars = difficulty(creation.partCount);
  return (
    <button
      className="idea-card card"
      onClick={onSelect}
      style={{ animationDelay: `${index * 70}ms` }}
      data-testid="idea-card"
      aria-label={creation.name}
    >
      <div className="idea-thumb">
        {url ? <img src={url} alt="" draggable={false} /> : <div className="thumb-loading">{creation.emoji}</div>}
      </div>
      <div className="idea-name">{creation.name}</div>
      <div className="idea-meta">
        <span className="idea-count">
          <span className="mini-brick" aria-hidden="true" />
          {creation.partCount}
        </span>
        <span className="idea-stars" aria-label={`${stars} von 3 Sternen`}>
          {[1, 2, 3].map((s) => (
            <IconStar key={s} size={18} className={s <= stars ? 'on' : 'off'} />
          ))}
        </span>
      </div>
    </button>
  );
}
