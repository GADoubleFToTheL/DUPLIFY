import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Creation } from '../core/types';
import type { StagePhase } from '../three/stageAnimator';

interface SessionState {
  current: Creation | null;
  phase: StagePhase;
  step: number;
  /** Schlüssel des gespeicherten Bauwerks (nach „Fertig“). */
  recordKey: string | null;
  ideasSeed: number;
  category: Category | 'alle';
  start: (c: Creation) => void;
  progress: (phase: StagePhase, step: number) => void;
  setRecordKey: (key: string | null) => void;
  newSeed: () => void;
  setCategory: (c: Category | 'alle') => void;
}

/** Laufender Bau – wird gespeichert, damit nach dem Neuladen weitergebaut werden kann. */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      current: null,
      phase: 'preview',
      step: 0,
      recordKey: null,
      ideasSeed: Math.floor(Math.random() * 1e9),
      category: 'alle',
      start: (c) => set({ current: c, phase: 'preview', step: 0, recordKey: null }),
      progress: (phase, step) => set({ phase, step }),
      setRecordKey: (recordKey) => set({ recordKey }),
      newSeed: () => set({ ideasSeed: Math.floor(Math.random() * 1e9) }),
      setCategory: (category) => set({ category }),
    }),
    { name: 'duplify-session', version: 1 },
  ),
);
