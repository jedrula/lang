import type { Grade } from './fsrs';
import type { Verdict } from './answer';

/**
 * A study session is a queue of tasks.
 *  - review:  one graded retrieval of a known item (updates FSRS).
 *  - learn:   new item — step 0 intro, 1 recognition, 2 production. Must succeed at each step.
 *  - relearn: an item failed in review is practised again until correct (no extra FSRS effect).
 * Failed tasks are re-inserted a few positions later, so retrieval happens after a short gap
 * rather than immediately (short spacing within a session beats massed repetition).
 */
export interface Task {
  uid: number;
  itemId: string;
  mode: 'review' | 'learn' | 'relearn';
  step: number;
}

export interface Session {
  queue: Task[];
  completed: number;
  /** mistakes per new item (decides its first FSRS grade) */
  errors: Record<string, number>;
  nextUid: number;
}

export type Outcome =
  | { kind: 'review'; itemId: string; grade: Grade }
  | { kind: 'learned'; itemId: string; errors: number }
  | null;

const STEPS = { review: 1, learn: 3, relearn: 2 } as const;
const REINSERT_GAP = 3;

export function createSession(reviewIds: string[], newIds: string[]): Session {
  let uid = 0;
  const queue: Task[] = [
    ...reviewIds.map((itemId) => ({ uid: uid++, itemId, mode: 'review' as const, step: 0 })),
    ...newIds.map((itemId) => ({ uid: uid++, itemId, mode: 'learn' as const, step: 0 })),
  ];
  return { queue, completed: 0, errors: {}, nextUid: uid };
}

export function remainingSteps(s: Session): number {
  return s.queue.reduce((n, t) => n + STEPS[t.mode] - t.step, 0);
}

export function progress(s: Session): number {
  const left = remainingSteps(s);
  return s.completed + left === 0 ? 1 : s.completed / (s.completed + left);
}

function insertAt(queue: Task[], task: Task, gap: number): Task[] {
  const q = [...queue];
  q.splice(Math.min(gap, q.length), 0, task);
  return q;
}

export function gradeFor(v: Verdict): Grade {
  return v === 'correct' ? 3 : v === 'typo' ? 2 : 1;
}

/** Advance the session after the current (first) task was answered. */
export function answer(s: Session, verdict: Verdict): { session: Session; outcome: Outcome } {
  const [task, ...rest] = s.queue;
  const ok = verdict !== 'wrong';
  let queue = rest;
  let outcome: Outcome = null;
  const errors = { ...s.errors };
  let nextUid = s.nextUid;
  const follow = (t: Omit<Task, 'uid'>, gap: number) => {
    queue = insertAt(queue, { ...t, uid: nextUid++ }, gap);
  };

  if (task.mode === 'review') {
    outcome = { kind: 'review', itemId: task.itemId, grade: gradeFor(verdict) };
    if (!ok) follow({ itemId: task.itemId, mode: 'relearn', step: 0 }, REINSERT_GAP);
  } else if (task.mode === 'relearn') {
    // failing again drops back to the easier recognition step
    if (!ok) follow({ ...task, step: 0 }, REINSERT_GAP);
    else if (task.step + 1 < STEPS.relearn) follow({ ...task, step: task.step + 1 }, REINSERT_GAP);
  } else {
    if (!ok) {
      errors[task.itemId] = (errors[task.itemId] ?? 0) + 1;
      follow({ ...task }, REINSERT_GAP);
    } else if (task.step + 1 < STEPS.learn) {
      // first retrieval soon after the intro, the next one after a slightly longer gap
      follow({ ...task, step: task.step + 1 }, task.step === 0 ? 2 : 4);
    } else {
      outcome = { kind: 'learned', itemId: task.itemId, errors: errors[task.itemId] ?? 0 };
    }
  }
  return { session: { queue, completed: s.completed + 1, errors, nextUid }, outcome };
}
