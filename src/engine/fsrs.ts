/**
 * FSRS (Free Spaced Repetition Scheduler), version 6 formulas with default weights.
 * https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 *
 * Stability S = days until recall probability drops to 90%.
 * Difficulty D in [1, 10].
 */
export type Grade = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835,
  0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
];

const DECAY = -W[20];
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // makes R(S, S) = 0.9

export const DESIRED_RETENTION = 0.9;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Probability of recall after `days` elapsed with stability `s`. */
export function retrievability(days: number, s: number): number {
  return Math.pow(1 + (FACTOR * Math.max(0, days)) / s, DECAY);
}

/** Days until retrievability falls to `r`. */
export function intervalFor(s: number, r = DESIRED_RETENTION): number {
  return (s / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
}

export function initStability(g: Grade): number {
  return Math.max(W[g - 1], 0.1);
}

export function initDifficulty(g: Grade): number {
  return clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
}

export function nextDifficulty(d: number, g: Grade): number {
  const delta = -W[6] * (g - 3);
  const damped = d + (delta * (10 - d)) / 9;
  const reverted = W[7] * initDifficulty(4) + (1 - W[7]) * damped;
  return clamp(reverted, 1, 10);
}

function stabilityAfterSuccess(s: number, d: number, r: number, g: Grade): number {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy)
  );
}

function stabilityAfterLapse(s: number, d: number, r: number): number {
  const sf = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(sf, s / Math.exp(W[17] * W[18])); // forgetting never increases stability
}

export interface Memory {
  s: number;
  d: number;
}

/** Same-day review (e.g. relearning right after a lapse). */
export function shortTerm(m: Memory, g: Grade): Memory {
  let s = m.s * Math.exp(W[17] * (g - 3 + W[18])) * Math.pow(m.s, -W[19]);
  if (g >= 3) s = Math.max(s, m.s);
  return { s, d: nextDifficulty(m.d, g) };
}

/** Update memory state after a review `elapsedDays` after the previous one. */
export function review(m: Memory, elapsedDays: number, g: Grade): Memory {
  const r = retrievability(elapsedDays, m.s);
  const s = g === 1 ? stabilityAfterLapse(m.s, m.d, r) : stabilityAfterSuccess(m.s, m.d, r, g);
  return { s: Math.max(s, 0.1), d: nextDifficulty(m.d, g) };
}

export function firstMemory(g: Grade): Memory {
  return { s: initStability(g), d: initDifficulty(g) };
}
