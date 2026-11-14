import type { Print } from '../types';
import { GROUP_LABELS, allParts, partNumber, type PartDef } from './catalog';

/** Ein Eintrag der Steine-Kiste: Teil, ggf. mit Duplify-Aufdruck (Augen/Bild). */
export interface CatalogVariant {
  def: PartDef;
  print?: Print;
  /** Normalisierter Suchtext (deutsch, englisch, Teilenummer, Kategorie). */
  search: string;
}

/** Kleinbuchstaben, Umlaute ausgeschrieben, „2 x 4“ → „2x4“, Satzzeichen weg. */
export function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/(\d)\s*[x×]\s*(?=\d)/g, '$1x')
    .replace(/[^a-z0-9.]+/g, ' ')
    .trim();
}

export function variantName(v: { def: PartDef; print?: Print | null }): string {
  if (v.print === 'eyes') return `${v.def.name} mit Augen`;
  if (v.print === 'picture') return `${v.def.name} mit Bild`;
  return v.def.name;
}

/**
 * Alle Einträge für die Steine-Kiste: häufige Teile zuerst (in gewohnter Reihenfolge),
 * dann ohne Aufdruck vor mit Aufdruck, jeweils nach Name („2 x 4“ vor „2 x 10“).
 */
export function catalogVariants(): CatalogVariant[] {
  const out: CatalogVariant[] = [];
  for (const def of allParts()) {
    const base = [def.name, def.en, partNumber(def), def.id, GROUP_LABELS[def.group], def.kid.noun].filter(Boolean).join(' ');
    out.push({ def, search: normalizeSearch(base) });
    for (const print of def.prints ?? []) out.push({ def, print, search: normalizeSearch(`${base} ${variantName({ def, print })}`) });
  }
  const coll = new Intl.Collator('de', { numeric: true });
  const rank = (v: CatalogVariant) => (v.def.common ? 0 : 2) + (v.def.printed || v.print ? 1 : 0);
  return out.sort(
    (a, b) => rank(a) - rank(b) || (a.def.common && b.def.common ? a.def.order - b.def.order : coll.compare(a.def.name, b.def.name)),
  );
}

/** Treffer einer Suche: jedes Suchwort muss vorkommen; Treffer am Wortanfang („Bogen“) vor solchen im Wort („gebogen“). */
export function searchVariants<T extends CatalogVariant>(all: readonly T[], query: string): T[] {
  const tokens = normalizeSearch(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];
  const atWordStart = (s: string, t: string) => s.startsWith(t) || s.includes(` ${t}`);
  return all
    .filter((v) => tokens.every((t) => v.search.includes(t)))
    .map((v) => ({ v, r: tokens.reduce((n, t) => n + (atWordStart(v.search, t) ? 0 : 1), 0) }))
    .sort((a, b) => a.r - b.r)
    .map(({ v }) => v);
}
