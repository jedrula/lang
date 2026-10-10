import { useEffect, useMemo, useRef, useState } from 'react';
import { placement, units } from '../content';
import { LEVELS, type Level, type PlacementQuestion } from '../content/types';
import { check } from '../engine/answer';
import { seedKnownLevels } from '../engine/scheduler';
import { dayIndex } from '../engine/state';
import { useStore } from '../store';
import { ProgressBar } from '../components/ui';

/**
 * Multistage placement: blocks of 6 questions per level, easiest first.
 * Pass a level with 4/6 (67%) and you move up; fail and the test stops.
 * "I don't know" is encouraged — guessing makes the result less accurate.
 */
const PER_LEVEL = 6;
const PASS = 4;

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function blockFor(level: Level): PlacementQuestion[] {
  const qs = placement.filter((q) => q.level === level);
  // keep at least one typed question per block: recall is harder to guess than choice
  const typed = shuffle(qs.filter((q) => q.type === 'type')).slice(0, 1);
  const rest = shuffle(qs.filter((q) => !typed.includes(q))).slice(0, PER_LEVEL - typed.length);
  return shuffle([...rest, ...typed]).map((q) => (q.options ? { ...q, options: shuffle(q.options) } : q));
}

export function Placement({ onDone }: { onDone: () => void }) {
  const { update } = useStore();
  const [levelIdx, setLevelIdx] = useState(0);
  const [block, setBlock] = useState(() => blockFor(LEVELS[0]));
  const [qIdx, setQIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ level: Level | null; scores: Record<string, number> } | null>(null);

  const q = block[qIdx];
  const totalAsked = levelIdx * PER_LEVEL + qIdx;

  function record(correct: boolean) {
    const lvl = LEVELS[levelIdx];
    const s = { ...scores, [lvl]: (scores[lvl] ?? 0) + (correct ? 1 : 0) };
    setScores(s);
    if (qIdx + 1 < block.length) return setQIdx(qIdx + 1);
    const passed = s[lvl] >= PASS;
    if (passed && levelIdx + 1 < LEVELS.length) {
      setLevelIdx(levelIdx + 1);
      setBlock(blockFor(LEVELS[levelIdx + 1]));
      setQIdx(0);
    } else {
      setResult({ level: passed ? lvl : levelIdx > 0 ? LEVELS[levelIdx - 1] : null, scores: s });
    }
  }

  function accept(level: Level | null) {
    const today = dayIndex();
    update((st) => ({
      ...st,
      onboarded: true,
      placement: {
        level,
        score: Object.fromEntries(Object.entries(result?.scores ?? {}).map(([k, v]) => [k, `${v}/${PER_LEVEL}`])),
        date: today,
      },
      cards: level ? seedKnownLevels(st, units, level, today) : st.cards,
    }));
    onDone();
  }

  if (result) return <Result result={result} onAccept={accept} />;

  return (
    <div className="session">
      <div className="session-top">
        <span className="mode-tag">Level check</span>
        <ProgressBar value={totalAsked / (PER_LEVEL * LEVELS.length)} label="Test progress" />
        <span className="muted small">Q{totalAsked + 1}</span>
      </div>
      <div className="card ex-card">
        <Question key={q.id} q={q} onAnswer={record} />
      </div>
      <p className="muted small center">
        Not sure? Choose “I don't know” — guessing makes the result less accurate. The test stops by itself when the questions get too hard.
      </p>
    </div>
  );
}

function Question({ q, onAnswer }: { q: PlacementQuestion; onAnswer: (correct: boolean) => void }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const parts = useMemo(() => q.prompt.split('___'), [q.prompt]);

  useEffect(() => {
    if (q.type !== 'choice') return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (q.options && n >= 1 && n <= q.options.length) onAnswer(q.answers.includes(q.options[n - 1]));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, onAnswer]);

  return (
    <div className="ex">
      <div className="eyebrow">{q.type === 'type' ? 'Translate into English' : q.skill === 'reading' ? 'Read and answer' : 'Choose the best answer'}</div>
      {q.promptPl && (
        <div className="prompt" lang="pl">
          {q.promptPl}
        </div>
      )}
      <div className={q.promptPl ? 'muted' : 'prompt placement-prompt'} lang="en">
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className="gap">_____</span>}
            {p}
          </span>
        ))}
      </div>
      {q.type === 'choice' ? (
        <div className="options">
          {q.options!.map((o, i) => (
            <button key={o} className="option" lang="en" onClick={() => onAnswer(q.answers.includes(o))}>
              <kbd>{i + 1}</kbd> {o}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="answer-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (v.trim()) onAnswer(check(v, q.answers).verdict !== 'wrong');
          }}
        >
          <input
            ref={ref}
            className="answer-input"
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="Type in English…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="en"
            aria-label="Your answer"
          />
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={!v.trim()}>
              Next <kbd>Enter</kbd>
            </button>
          </div>
        </form>
      )}
      <div className="actions left">
        <button className="btn btn-ghost" onClick={() => onAnswer(false)}>
          I don't know
        </button>
      </div>
    </div>
  );
}

const LEVEL_TEXT: Record<Level, string> = {
  A1: 'You can handle basic phrases and simple sentences about yourself.',
  A2: 'You can talk about everyday things, the past and plans in simple English.',
  B1: 'You can deal with most everyday situations and give opinions.',
  B2: 'You can understand complex ideas and speak fairly fluently.',
};

function Result({ result, onAccept }: { result: { level: Level | null; scores: Record<string, number> }; onAccept: (l: Level | null) => void }) {
  const { level } = result;
  const startUnit = level ? units.find((u) => LEVELS.indexOf(u.level) > LEVELS.indexOf(level)) : units[0];
  const known = level ? units.filter((u) => LEVELS.indexOf(u.level) <= LEVELS.indexOf(level)).reduce((n, u) => n + u.items.length, 0) : 0;
  return (
    <div className="session">
      <div className="card summary">
        <div className="eyebrow">Your result</div>
        <h1>{level ? `Level ${level}` : 'Beginner'}</h1>
        <p>{level ? LEVEL_TEXT[level] : 'No problem — we start from the very beginning.'}</p>
        <div className="stat-row">
          {LEVELS.filter((l) => result.scores[l] !== undefined).map((l) => (
            <div className="stat" key={l}>
              <b>
                {result.scores[l]}/{PER_LEVEL}
              </b>
              <span>{l} questions</span>
            </div>
          ))}
        </div>
        {level && (
          <p className="muted">
            We'll treat the {known} items up to {level} as “probably known”. They won't be taught again, but they'll show up in light reviews over the next
            four weeks. Anything you miss gets re-learned automatically.
          </p>
        )}
        {startUnit && (
          <p>
            New material starts at: <b>{startUnit.title}</b> ({startUnit.level})
          </p>
        )}
        <div className="actions">
          {level && (
            <button className="btn btn-ghost" onClick={() => onAccept(null)}>
              Start from the beginning instead
            </button>
          )}
          <button className="btn btn-primary" onClick={() => onAccept(level)}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
