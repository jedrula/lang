import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { loadState, saveState, type AppState } from './engine/state';

type Update = (fn: (s: AppState) => AppState) => void;

const Ctx = createContext<{ state: AppState; update: Update } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const update = useCallback<Update>((fn) => {
    setState((prev) => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);
  return <Ctx.Provider value={{ state, update }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
