import { IconStar } from './icons';

/** Fortschritt als Raupe: wächst mit jedem Schritt, am Ende wartet ein Stern. */
export function Progress({ step, total }: { step: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (step / total) * 100) : 0;
  return (
    <div className="progress" aria-label={`Schritt ${step} von ${total}`} data-testid="progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }}>
          <span className="progress-head" />
        </div>
      </div>
      <IconStar size={30} className={`progress-star ${step >= total ? 'on' : ''}`} />
      <span className="progress-text">
        {Math.min(step, total)} / {total}
      </span>
    </div>
  );
}
