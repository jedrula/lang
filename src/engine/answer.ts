/** Answer checking: forgiving about case, punctuation, contractions and small typos — not about grammar words. */

export type Verdict = 'correct' | 'typo' | 'wrong';

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'cannot'],
  [/\bcan not\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'],
  [/'m\b/g, ' am'],
  [/'re\b/g, ' are'],
  [/'ll\b/g, ' will'],
  [/'ve\b/g, ' have'],
];

export function normalize(s: string, lang: 'en' | 'pl' = 'en'): string {
  let t = s
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"');
  if (lang === 'en') for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/(^|\s)'|'(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Short grammar words: getting these wrong is a real mistake, not a typo. */
const FUNCTION_WORDS = new Set(
  'a an the is are am was were be been do does did have has had will would can could to of in on at for this that these those he she it they we you i his her its their my your our not'.split(
    ' ',
  ),
);

function compareOne(given: string, target: string, lang: 'en' | 'pl'): Verdict {
  const g = normalize(given, lang);
  const t = normalize(target, lang);
  if (!g) return 'wrong';
  if (g === t) return 'correct';
  if (lang === 'pl' && stripDiacritics(g) === stripDiacritics(t)) return 'typo';

  const gw = g.split(' ');
  const tw = t.split(' ');
  if (gw.length !== tw.length) return 'wrong';
  let typos = 0;
  for (let i = 0; i < gw.length; i++) {
    if (gw[i] === tw[i]) continue;
    if (FUNCTION_WORDS.has(gw[i]) || FUNCTION_WORDS.has(tw[i])) return 'wrong';
    const a = lang === 'pl' ? stripDiacritics(gw[i]) : gw[i];
    const b = lang === 'pl' ? stripDiacritics(tw[i]) : tw[i];
    const dist = levenshtein(a, b);
    const allowed = b.length >= 8 ? 2 : b.length >= 4 ? 1 : 0;
    if (dist > allowed) return 'wrong';
    typos++;
  }
  return typos <= 2 ? 'typo' : 'wrong';
}

export function check(given: string, accepted: string[], lang: 'en' | 'pl' = 'en'): { verdict: Verdict; closest: string } {
  let best: Verdict = 'wrong';
  let closest = accepted[0];
  for (const a of accepted) {
    const v = compareOne(given, a, lang);
    if (v === 'correct') return { verdict: 'correct', closest: a };
    if (v === 'typo' && best === 'wrong') {
      best = 'typo';
      closest = a;
    }
  }
  return { verdict: best, closest };
}
