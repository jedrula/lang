import type { Item, Unit } from '../content/types';
import { dueCards } from './scheduler';
import type { AppState } from './state';

/** Rough time costs measured in seconds, used to fit the session into the daily goal. */
export const REVIEW_SECONDS = 10;
export const NEW_ITEM_SECONDS = 50; // intro + recognition + production, incl. mistakes

export function maxNewPerDay(minutes: number): number {
  // ~10 reviews per daily new item at steady state => ~0.4 new items per minute of daily time
  return Math.min(20, Math.max(3, Math.round(minutes * 0.4)));
}

export interface DayPlan {
  reviewIds: string[];
  newItems: Item[];
  /** reviews due today that don't fit in today's time */
  reviewsLeftOver: number;
  estMinutes: number;
}

/** Next unseen items in course order (optionally limited to one unit). */
export function nextNewItems(state: AppState, units: Unit[], count: number, unitId?: string): Item[] {
  const out: Item[] = [];
  for (const u of units) {
    if (unitId && u.id !== unitId) continue;
    for (const it of u.items) {
      if (out.length >= count) return out;
      if (!state.cards[it.id]) out.push(it);
    }
  }
  return out;
}

export function planDay(state: AppState, units: Unit[], today: number, secondsDoneToday: number): DayPlan {
  const budget = Math.max(0, state.settings.dailyMinutes * 60 - secondsDoneToday);
  const due = dueCards(state, today);
  const reviewCap = Math.floor(budget / REVIEW_SECONDS);
  const reviewIds = due.slice(0, reviewCap).map((c) => c.id);

  const newToday = state.log[today]?.newItems ?? 0;
  const afterReviews = budget - reviewIds.length * REVIEW_SECONDS;
  // Reviews come first: when they eat most of the time, slow down on new material.
  const reviewShare = budget ? (due.length * REVIEW_SECONDS) / budget : 1;
  const maxNew = reviewShare > 1 ? 0 : reviewShare > 0.7 ? Math.ceil(maxNewPerDay(state.settings.dailyMinutes) / 2) : maxNewPerDay(state.settings.dailyMinutes);
  const newCount = Math.max(0, Math.min(maxNew - newToday, Math.floor(afterReviews / NEW_ITEM_SECONDS)));
  const newItems = nextNewItems(state, units, newCount);

  return {
    reviewIds,
    newItems,
    reviewsLeftOver: due.length - reviewIds.length,
    estMinutes: Math.ceil((reviewIds.length * REVIEW_SECONDS + newItems.length * NEW_ITEM_SECONDS) / 60),
  };
}
