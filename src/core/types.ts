export type ColorId =
  | 'rot'
  | 'orange'
  | 'gelb'
  | 'hellgruen'
  | 'gruen'
  | 'dunkelgruen'
  | 'tuerkis'
  | 'hellblau'
  | 'blau'
  | 'lila'
  | 'rosa'
  | 'pink'
  | 'braun'
  | 'beige'
  | 'weiss'
  | 'grau'
  | 'schwarz';

export type PartId = string;

/** Aufdruck auf einem Stein. */
export type Print = 'eyes' | 'picture';

/** Drehung um die senkrechte Achse in 90°-Schritten. */
export type Rot = 0 | 1 | 2 | 3;

export type Gender = 'm' | 'f' | 'n';

/** Ein Teil an einer Stelle im Bauwerk. x/z in Noppen (Ecke mit kleinsten Werten), y in Halb-Ebenen. */
export interface Placement {
  part: PartId;
  x: number;
  y: number;
  z: number;
  rot: Rot;
  /** null bei Teilen ohne Farbwahl (z. B. Figuren). */
  color: ColorId | null;
  print?: Print;
  /** Farbrolle aus dem Bauplan (Wand, Dach …). */
  role?: string;
}

/** Farbrolle: alle Teile einer Rolle bekommen dieselbe Farbe (außer bei `mixed`). */
export interface RoleDef {
  id: string;
  /** Lieblingsfarben in Reihenfolge. */
  prefer?: ColorId[];
  /** Jedes Teil darf eine eigene Farbe haben (bunt). */
  mixed?: boolean;
  /** Wunsch-Farbfolge für bunte Rollen (z. B. Regenbogen). */
  sequence?: ColorId[];
  /** Diese Rolle soll sich farblich von den genannten Rollen unterscheiden. */
  differentFrom?: string[];
}

export type Category = 'tuerme' | 'haeuser' | 'tiere' | 'fahrzeuge' | 'garten' | 'fantasie';

export interface Creation {
  /** Eindeutig für Bauplan + Seed + Größe. */
  id: string;
  recipeId: string;
  name: string;
  category: Category;
  emoji: string;
  seed: number;
  target: number;
  placements: Placement[];
  /** Indizes von `placements` in Bau-Reihenfolge. */
  order: number[];
  partCount: number;
  /** Höhe in Halb-Ebenen. */
  height: number;
  /** Hinweise für Eltern, z. B. „Am besten auf einer Grundplatte bauen“. */
  tips: string[];
}
