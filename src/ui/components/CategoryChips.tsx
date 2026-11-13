import type { Category } from '../../core/types';

export const CATEGORIES: { id: Category | 'alle'; emoji: string; label: string }[] = [
  { id: 'alle', emoji: '✨', label: 'Alles' },
  { id: 'tuerme', emoji: '🗼', label: 'Türme' },
  { id: 'haeuser', emoji: '🏠', label: 'Häuser' },
  { id: 'tiere', emoji: '🐶', label: 'Tiere' },
  { id: 'fahrzeuge', emoji: '🚗', label: 'Fahrzeuge' },
  { id: 'garten', emoji: '🌼', label: 'Garten' },
  { id: 'fantasie', emoji: '🚀', label: 'Fantasie' },
];

export function CategoryChips({ value, onChange }: { value: Category | 'alle'; onChange: (c: Category | 'alle') => void }) {
  return (
    <div className="chips" role="tablist">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          role="tab"
          aria-selected={value === c.id}
          className={`chip ${value === c.id ? 'active' : ''}`}
          onClick={() => onChange(c.id)}
          aria-label={c.label}
          data-testid={`chip-${c.id}`}
        >
          <span className="chip-emoji">{c.emoji}</span>
          <span className="chip-label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
