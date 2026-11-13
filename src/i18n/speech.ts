import { COLOR_MAP, colorAdjective } from '../core/colors';
import { getPart } from '../core/parts/catalog';
import type { ColorId, Gender, Print } from '../core/types';

const ARTICLE_ACC: Record<Gender, string> = { m: 'den', f: 'die', n: 'das' };

function declineAcc(stem: string, gender: Gender): string {
  return gender === 'm' ? `${stem}en` : `${stem}e`;
}

function declineNom(stem: string, gender: Gender, invariable = false): string {
  if (invariable) return stem;
  return gender === 'm' ? `${stem}er` : gender === 'f' ? `${stem}e` : `${stem}es`;
}

function nounFor(part: string, print?: Print | null): { noun: string; gender: Gender; adjectives: readonly string[] } {
  const def = getPart(part);
  let { noun, gender } = def.kid;
  let adjectives = def.kid.adjectives ?? [];
  if (print === 'eyes') {
    noun = 'Augenstein';
    gender = 'm';
    adjectives = def.kind === 'curved' ? ['rund'] : [];
  } else if (print === 'picture') {
    noun = 'Bildstein';
    gender = 'm';
  }
  return { noun, gender, adjectives };
}

/** „den großen roten Stein“ – für Sätze wie „Jetzt brauchen wir …“. */
export function partPhraseAcc(part: string, color: ColorId | null, print?: Print | null): string {
  const def = getPart(part);
  if (def.group === 'eigene') return def.name;
  const { noun, gender, adjectives } = nounFor(part, print);
  const words = [ARTICLE_ACC[gender], ...adjectives.map((a) => declineAcc(a, gender))];
  if (color && def.colorable) words.push(colorAdjective(color, gender));
  words.push(noun);
  return words.join(' ');
}

/** „großer roter Stein“ – Beschriftung ohne Artikel. */
export function partLabel(part: string, color: ColorId | null, print?: Print | null): string {
  const def = getPart(part);
  if (def.group === 'eigene') return def.name;
  const { noun, gender, adjectives } = nounFor(part, print);
  const words = adjectives.map((a) => declineNom(a, gender));
  const c = color ? COLOR_MAP.get(color) : undefined;
  if (c && def.colorable) words.push(declineNom(c.stem, gender, c.invariable));
  words.push(noun);
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const NUMBERS = [
  'null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn',
  'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig',
];

export function numberWord(n: number): string {
  return NUMBERS[n] ?? String(n);
}
