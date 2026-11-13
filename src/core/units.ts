/**
 * Maßsystem der App.
 * 1 Einheit = 1 Noppenabstand eines großen Bausteins (16 mm).
 * Höhen werden in halben Steinhöhen gezählt (9,6 mm), damit auch Teile mit
 * ungewöhnlicher Höhe (Figuren, Blumen) exakt sitzen. Ein normaler Stein ist 2 Halb-Ebenen hoch.
 */
export const STUD_MM = 16;
export const HALF_MM = 9.6;
/** Höhe einer Halb-Ebene in 3D-Einheiten. */
export const HALF = HALF_MM / STUD_MM;
/** Halb-Ebenen pro normalem Stein. */
export const BRICK_HALVES = 2;
export const STUD_RADIUS = 9.4 / 2 / STUD_MM;
export const STUD_HEIGHT = 4.5 / STUD_MM;
/** Kleine sichtbare Fuge zwischen benachbarten Steinen. */
export const SEAM = 0.014;
