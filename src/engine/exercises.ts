import type { Item } from '../content/types';

export type Exercise =
  | { type: 'intro'; item: Item }
  | { type: 'choice'; item: Item; dir: 'en2pl' | 'pl2en' | 'listen2pl'; options: string[]; answer: string }
  | { type: 'type'; item: Item }
  | { type: 'dictation'; item: Item }
  | { type: 'cloze'; item: Item; before: string; gap: string; after: string }
  | { type: 'build'; item: Item; tiles: string[]; target: string[] };

export type Stage = 'recognize' | 'produce' | 'master';

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** Distractors: prefer the same kind of item (word vs sentence) and similar length. */
function distractors(item: Item, pool: Item[], field: 'en' | 'pl', n = 3): string[] {
  const target = item[field].toLowerCase();
  const candidates = pool.filter((p) => p.id !== item.id && p[field].toLowerCase() !== target);
  const sameKind = candidates.filter((p) => p.kind === item.kind);
  const ranked = shuffle(sameKind.length >= n ? sameKind : candidates).sort(
    (a, b) => Math.abs(a[field].length - item[field].length) - Math.abs(b[field].length - item[field].length),
  );
  const seen = new Set<string>([target]);
  const out: string[] = [];
  for (const c of ranked.slice(0, n * 3)) {
    const v = c[field];
    if (seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return shuffle(out).slice(0, n);
}

export function tokens(s: string): string[] {
  return s
    .replace(/[.!?]+$/, '')
    .split(/\s+/)
    .filter(Boolean);
}

function clozeFor(item: Item): Exercise | null {
  if (!item.example || item.kind === 'sentence') return null;
  const ex = item.example.en;
  const idx = ex.toLowerCase().indexOf(item.en.toLowerCase());
  if (idx < 0) return null;
  return {
    type: 'cloze',
    item,
    before: ex.slice(0, idx),
    gap: ex.slice(idx, idx + item.en.length),
    after: ex.slice(idx + item.en.length),
  };
}

function buildFor(item: Item, pool: Item[]): Exercise | null {
  const target = tokens(item.en);
  if (target.length < 3) return null;
  const extra = shuffle(
    pool
      .filter((p) => p.id !== item.id)
      .flatMap((p) => tokens(p.en))
      .filter((w) => !target.some((t) => t.toLowerCase() === w.toLowerCase())),
  );
  const uniqueExtra = [...new Set(extra)].slice(0, Math.min(3, Math.ceil(target.length / 3)));
  return { type: 'build', item, target, tiles: shuffle([...target, ...uniqueExtra]) };
}

function choice(item: Item, pool: Item[], dir: 'en2pl' | 'pl2en' | 'listen2pl'): Exercise {
  const field = dir === 'pl2en' ? 'en' : 'pl';
  const answer = item[field];
  return { type: 'choice', item, dir, answer, options: shuffle([answer, ...distractors(item, pool, field)]) };
}

/**
 * Pick an exercise matching memory strength: recognition while the trace is new,
 * then cued production, then free recall. (Harder retrieval = stronger memory,
 * as long as it still mostly succeeds.)
 */
export function makeExercise(item: Item, stage: Stage, pool: Item[], audio: boolean): Exercise {
  const options: (Exercise | null)[] = [];
  if (stage === 'recognize') {
    options.push(choice(item, pool, 'en2pl'), choice(item, pool, 'pl2en'));
    if (audio) options.push(choice(item, pool, 'listen2pl'));
  } else if (stage === 'produce') {
    options.push(clozeFor(item), buildFor(item, pool), clozeFor(item));
    if (audio && item.kind !== 'word') options.push({ type: 'dictation', item });
    if (item.kind === 'word') options.push({ type: 'type', item });
  } else {
    options.push({ type: 'type', item }, { type: 'type', item });
    if (item.kind === 'sentence') options.push(buildFor(item, pool));
    if (audio) options.push({ type: 'dictation', item });
  }
  const valid = options.filter((o): o is Exercise => o !== null);
  return valid.length ? pick(valid) : { type: 'type', item };
}

export function stageForStability(s: number): Stage {
  if (s < 2) return 'recognize';
  if (s < 15) return 'produce';
  return 'master';
}
