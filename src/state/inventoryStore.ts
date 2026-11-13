import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addCount, cleanCounts, sampleCounts, type Counts, type VariantKey } from '../core/inventory';
import { setCustomParts, type CustomPartSpec } from '../core/parts/catalog';

interface InventoryState {
  counts: Counts;
  custom: CustomPartSpec[];
  add: (key: VariantKey, delta: number) => void;
  setCount: (key: VariantKey, n: number) => void;
  loadSample: () => void;
  clear: () => void;
  replaceAll: (counts: Counts, custom: CustomPartSpec[]) => void;
  saveCustom: (spec: CustomPartSpec) => void;
  removeCustom: (id: string) => void;
}

export const useInventory = create<InventoryState>()(
  persist(
    (set, get) => ({
      counts: {},
      custom: [],
      add: (key, delta) => set({ counts: addCount(get().counts, key, delta) }),
      setCount: (key, n) => set({ counts: addCount(get().counts, key, n - (get().counts[key] ?? 0)) }),
      loadSample: () => set({ counts: sampleCounts() }),
      clear: () => set({ counts: {} }),
      replaceAll: (counts, custom) => {
        setCustomParts(custom);
        set({ custom, counts: cleanCounts(counts) });
      },
      saveCustom: (spec) => {
        const custom = [...get().custom.filter((c) => c.id !== spec.id), spec];
        setCustomParts(custom);
        set({ custom });
      },
      removeCustom: (id) => {
        const custom = get().custom.filter((c) => c.id !== id);
        const counts = Object.fromEntries(Object.entries(get().counts).filter(([k]) => !k.startsWith(`${id}|`)));
        set({ counts });
        setCustomParts(custom);
        set({ custom });
      },
    }),
    {
      name: 'duplify-inventory',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) setCustomParts(state.custom ?? []);
      },
    },
  ),
);
