import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Settings {
  sound: boolean;
  voice: boolean;
  /** Stimme zählt die Steine mit. */
  countAloud: boolean;
  /** Ein Teil pro Schritt oder ganze Schicht. */
  stepMode: 'single' | 'layer';
  /** Grundplatte (Noppen) – oder null für Boden/Teppich. */
  baseplate: { w: number; l: number } | null;
  /** Farben dürfen getauscht werden. */
  allowSwap: boolean;
  /** Zuletzt gewählte Größe (ungefähre Anzahl Steine). */
  target: number;
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      voice: true,
      countAloud: true,
      stepMode: 'single',
      baseplate: null,
      allowSwap: true,
      target: 12,
      set: (patch) => set(patch),
    }),
    { name: 'duplify-settings', version: 1 },
  ),
);
