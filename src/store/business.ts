import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

export type BusinessUI = {
  id: string;
  name: string;
  nameCustomized: boolean;
  updatedAt?: string;
  [k: string]: any;
};

type BizStore = {
  business: BusinessUI | null;
  setBusinessFromServer: (b: BusinessUI) => void;
  setBusinessOptimistic: (patch: Partial<BusinessUI>) => void;
};

export const useBizStore = create<BizStore>()(
  persist(
    (set, get) => ({
      business: null,
      setBusinessFromServer: (incoming) => set((s) => ({ 
        business: { ...s.business, ...incoming } 
      })),
      setBusinessOptimistic: (patch) => set((s) => ({ 
        business: s.business ? { ...s.business, ...patch } : null 
      })),
    }),
    { name: 'tenfour:business' }
  )
);

// A tiny helper to avoid different components writing custom selectors
export const useBusinessNameCustomized = () =>
  useBizStore((s) => s.business?.nameCustomized ?? false);

export const useBusinessName = () =>
  useBizStore((s) => s.business?.name ?? '');