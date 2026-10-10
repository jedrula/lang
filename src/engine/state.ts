import type { Level } from '../content/types';
import { store } from './storage';

export interface Card {
  id: string;
  /** FSRS stability (days) */
  s: number;
  /** FSRS difficulty 1..10 */
  d: number;
  /** day index when the item is next due */
  due: number;
  /** day index of the last scheduled review */
  last: number;
  reps: number;
  lapses: number;
  source: 'lesson' | 'placement';
}

export type PolishHelp = 'auto' | 'always' | 'never';

export interface Settings {
  dailyMinutes: number;
  /** auto = show Polish explanations after a mistake and on grammar intros */
  polishHelp: PolishHelp;
  autoplayAudio: boolean;
}

export interface DayLog {
  seconds: number;
  reviews: number;
  newItems: number;
  correct: number;
  answers: number;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  settings: Settings;
  placement: { level: Level | null; score: Record<string, string>; date: number } | null;
  cards: Record<string, Card>;
  log: Record<number, DayLog>;
}

const KEY = 'lingo.state.v1';

export const DEFAULT_STATE: AppState = {
  version: 1,
  onboarded: false,
  settings: { dailyMinutes: 15, polishHelp: 'auto', autoplayAudio: true },
  placement: null,
  cards: {},
  log: {},
};

/** Days roll over at 4am local time, so a late-night session counts as "today". */
export function dayIndex(ts = Date.now()): number {
  const d = new Date(ts - 4 * 3600_000);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function loadState(): AppState {
  const raw = store.get(KEY);
  if (!raw) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(raw) as AppState;
    return { ...structuredClone(DEFAULT_STATE), ...parsed, settings: { ...DEFAULT_STATE.settings, ...parsed.settings } };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(s: AppState) {
  store.set(KEY, JSON.stringify(s));
}

export function emptyDay(): DayLog {
  return { seconds: 0, reviews: 0, newItems: 0, correct: 0, answers: 0 };
}
