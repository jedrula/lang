import type { Level, Unit } from '../content/types';
import { LEVELS } from '../content/types';
import { firstMemory, intervalFor, retrievability, review, shortTerm, type Grade } from './fsrs';
import type { AppState, Card } from './state';

const MAX_INTERVAL = 365;

/** ±5% fuzz so items learned together don't stay clumped together forever. */
function fuzz(days: number): number {
  if (days < 3) return days;
  const f = 1 + (Math.random() - 0.5) * 0.1;
  return days * f;
}

export function nextInterval(s: number): number {
  return Math.min(MAX_INTERVAL, Math.max(1, Math.round(fuzz(intervalFor(s)))));
}

/**
 * Lesson finished: the item was retrieved to criterion in-session.
 * Grade reflects how hard that was. First review is always the next day
 * (sleep consolidation + early retrieval catches weak items).
 */
export function cardFromLesson(id: string, today: number, errors: number): Card {
  const g: Grade = errors === 0 ? 3 : errors === 1 ? 2 : 1;
  const m = firstMemory(g);
  return { id, ...m, due: today + 1, last: today, reps: 1, lapses: 0, source: 'lesson' };
}

/** Apply a graded review. Same-day repeats don't change the long-term schedule. */
export function applyReview(card: Card, today: number, g: Grade): Card {
  const elapsed = today - card.last;
  if (elapsed <= 0 && g > 1) return card;
  const m = elapsed <= 0 ? shortTerm(card, g) : review(card, elapsed, g);
  const interval = g === 1 ? 1 : nextInterval(m.s);
  return {
    ...card,
    ...m,
    last: today,
    due: today + interval,
    reps: card.reps + 1,
    lapses: card.lapses + (g === 1 ? 1 : 0),
  };
}

export function recallNow(card: Card, today: number): number {
  return retrievability(today - card.last, card.s);
}

export function dueCards(state: AppState, today: number): Card[] {
  return Object.values(state.cards)
    .filter((c) => c.due <= today)
    .sort((a, b) => recallNow(a, today) - recallNow(b, today));
}

/** Placement test said the learner already knows these levels: add their items as "probably known", spread over 4 weeks so they get confirmed without a review flood. */
export function seedKnownLevels(state: AppState, units: Unit[], level: Level, today: number): Record<string, Card> {
  const below = LEVELS.slice(0, LEVELS.indexOf(level) + 1);
  const cards = { ...state.cards };
  const items = units.filter((u) => below.includes(u.level)).flatMap((u) => u.items);
  items.forEach((it, i) => {
    if (cards[it.id]) return;
    const s = 8 + Math.random() * 10;
    cards[it.id] = {
      id: it.id,
      s,
      d: 5,
      last: today,
      due: today + 2 + Math.floor((i / items.length) * 26 + Math.random() * 3),
      reps: 0,
      lapses: 0,
      source: 'placement',
    };
  });
  return cards;
}

/** Number of reviews falling due on each of the next `days` days (index 0 = today incl. overdue). */
export function forecast(state: AppState, today: number, days = 7): number[] {
  const out = new Array(days).fill(0);
  for (const c of Object.values(state.cards)) {
    const k = Math.max(0, c.due - today);
    if (k < days) out[k]++;
  }
  return out;
}
