/**
 * Noppis „Gehirn“: was er beim Spielen tut und sagt – ohne 3D, damit es testbar bleibt.
 */

/** Kunststücke beim Antippen. */
export type Trick = 'hop' | 'flip' | 'spin' | 'dance' | 'giggle' | 'wave' | 'peekaboo';

/** Alle Bewegungen, die die 3D-Figur abspielen kann. */
export type NoppiAction = Trick | 'greet' | 'land' | 'wobble' | 'oops' | 'dizzy' | 'wake' | 'cheer' | 'sun' | 'flower';

export const TRICK_PHRASES: Record<Trick, readonly string[]> = {
  hop: ['Hopp!', 'Juhu!', 'Huiii!'],
  flip: ['Salto!', 'Schau mal, ein Salto!'],
  spin: ['Wirbelwind!', 'Ich dreh mich!'],
  dance: ['Tanz mit mir!', 'Lalala!'],
  giggle: ['Hihi!', 'Hihi, das kitzelt!'],
  wave: ['Hallo!', 'Huhu!'],
  peekaboo: ['Kuckuck!'],
};

const ALL_TRICKS: readonly Trick[] = ['hop', 'flip', 'spin', 'dance', 'giggle', 'wave', 'peekaboo'];
/** Mit Steinen auf dem Kopf macht Noppi nur vorsichtige Kunststücke. */
const CAREFUL_TRICKS: readonly Trick[] = ['hop', 'giggle', 'wave', 'peekaboo'];

export const TICKLE_PHRASES = ['Hihihi, nicht kitzeln!', 'Hihi, das kitzelt so!'];
export const STACK_PHRASES = ['Noch einer!', 'Ich bin ein Turm!', 'Hui, ganz schön wackelig!', 'So hoch!'];
export const TOPPLE_PHRASES = ['Hoppla!', 'Oh nein – alles umgefallen!', 'Huch! Nochmal?'];
export const DIZZY_PHRASES = ['Huiii! Mir ist ganz schwindelig!', 'Alles dreht sich!'];
export const WAKE_PHRASES = ['Oh! Hallo!', 'Gääähn … Ich bin wach!'];
export const SUN_PHRASES = ['Hallo, Sonne!', 'Die Sonne lacht!'];
export const FLOWER_PHRASES = ['Eine schöne Blume!', 'Mmh, die duftet!'];
/** Tipps in der Sprechblase, wenn gerade nichts passiert. */
export const HINTS = ['Tipp mich an!', 'Tipp in den Himmel – dann fällt ein Stein!', 'Dreh mich mit dem Finger!'];

export type Rng = () => number;

export function pick<T>(items: readonly T[], rnd: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rnd() * items.length))];
}

/** Nächstes Kunststück: nie zweimal dasselbe hintereinander, mit Steinen auf dem Kopf nur vorsichtige. */
export function nextTrick(prev: Trick | null, stack: number, rnd: Rng): Trick {
  const pool = (stack > 0 ? CAREFUL_TRICKS : ALL_TRICKS).filter((t) => t !== prev);
  return pick(pool, rnd);
}

/** Ab so vielen Steinen auf dem Kopf fällt der Turm um (4–7, damit es spannend bleibt). */
export function toppleAt(rnd: Rng): number {
  return 4 + Math.floor(rnd() * 4);
}

/** Höchstens so viele Steine gleichzeitig unterwegs bzw. auf dem Kopf. */
export const MAX_STACK = 7;

/** Kitzeln = mehrere schnelle Antipper hintereinander. */
export class TickleCounter {
  private taps: number[] = [];

  constructor(
    private readonly needed = 4,
    private readonly windowMs = 1600,
  ) {}

  /** Meldet true, sobald genug Antipper im Zeitfenster waren (und fängt dann von vorne an). */
  tap(now: number): boolean {
    this.taps = this.taps.filter((t) => now - t < this.windowMs);
    this.taps.push(now);
    if (this.taps.length >= this.needed) {
      this.taps = [];
      return true;
    }
    return false;
  }
}

/** Wer Noppi schnell genug herumwirbelt (mehr als 1½ Umdrehungen am Stück), macht ihn schwindelig. */
export const DIZZY_TURNS = 1.5;
