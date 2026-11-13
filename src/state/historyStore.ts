import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Creation } from '../core/types';

export interface BuildRecord {
  key: string;
  date: number;
  sticker: string;
  photoId?: string;
  creation: Creation;
}

interface HistoryState {
  builds: BuildRecord[];
  picks: Partial<Record<Category, number>>;
  stickers: string[];
  addBuild: (creation: Creation, sticker: string) => string;
  setPhoto: (key: string, photoId: string | undefined) => void;
  removeBuild: (key: string) => void;
  addPick: (category: Category) => void;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      builds: [],
      picks: {},
      stickers: [],
      addBuild: (creation, sticker) => {
        const key = `${creation.id}-${Date.now()}`;
        set({
          builds: [{ key, date: Date.now(), sticker, creation }, ...get().builds].slice(0, 60),
          stickers: [...get().stickers, sticker],
        });
        return key;
      },
      setPhoto: (key, photoId) =>
        set({ builds: get().builds.map((b) => (b.key === key ? { ...b, photoId } : b)) }),
      removeBuild: (key) => set({ builds: get().builds.filter((b) => b.key !== key) }),
      addPick: (category) => set({ picks: { ...get().picks, [category]: (get().picks[category] ?? 0) + 1 } }),
    }),
    { name: 'duplify-history', version: 1 },
  ),
);
