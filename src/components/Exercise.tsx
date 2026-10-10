import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../engine/exercises';
import { check, type Verdict } from '../engine/answer';
import { speak } from '../engine/speech';
import type { Unit } from '../content/types';
import { PolishHelp, Rich, SpeakButton } from './ui';

export interface Submitted {
  verdict: Verdict;
  given: string;
  /** the accepted answer closest to what was typed */
  closest?: string;
}

interface Props {
  ex: Exercise;
  answered: Submitted | null;
  onSubmit: (s: Submitted) => void;
  autoplay: boolean;
  polishOpen: boolean;
  /** shown above the first item of a unit */
  unitIntro?: Unit;
}

const enAnswers = (ex: Exercise) => [ex.item.en, ...(ex.item.enAlt ?? [])];

export function ExerciseView(props: Props) {
  const { ex, autoplay } = props;

  useEffect(() => {
    if (!autoplay) return;
    if (ex.type === 'intro' || ex.type === 'dictation' || (ex.type === 'choice' && ex.dir !== 'pl2en')) speak(ex.item.en);
  }, [ex, autoplay]);

  switch (ex.type) {
    case 'intro':
      return <Intro {...props} />;
    case 'choice':
      return <Choice {...props} ex={ex} />;
    case 'type':
      return <Typed {...props} />;
    case 'dictation':
      return <Typed {...props} dictation />;
    case 'cloze':
      return <Cloze {...props} ex={ex} />;
    case 'build':
      return <Build {...props} ex={ex} />;
  }
}

function Intro({ ex, onSubmit, answered, polishOpen, unitIntro }: Props) {
  const it = ex.item;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="ex">
      {unitIntro && (unitIntro.intro || unitIntro.introPl) && (
        <div className="unit-intro">
          <div className="eyebrow">
            New unit · {unitIntro.level} · {unitIntro.title}
          </div>
          {unitIntro.intro && (
            <p>
              <Rich text={unitIntro.intro} />
            </p>
          )}
          <PolishHelp text={unitIntro.introPl} open={polishOpen} title="Wyjaśnienie po polsku" />
        </div>
      )}
      <div className="eyebrow">New {it.kind}</div>
      <div className="intro-term">
        <span className="term-en" lang="en">
          {it.en}
        </span>
        <SpeakButton text={it.en} small />
      </div>
      <div className="term-pl" lang="pl">
        {it.pl}
      </div>
      {it.example && (
        <div className="example">
          <div lang="en">
            {it.example.en} <SpeakButton text={it.example.en} small />
          </div>
          <div className="muted" lang="pl">
            {it.example.pl}
          </div>
        </div>
      )}
      {it.note && <p className="note">{it.note}</p>}
      <PolishHelp text={it.notePl} open={polishOpen} />
      {!answered && (
        <div className="actions">
          <button ref={ref} className="btn btn-primary" onClick={() => onSubmit({ verdict: 'correct', given: '' })}>
            Got it <kbd>Enter</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

function Choice({ ex, onSubmit, answered }: Props & { ex: Extract<Exercise, { type: 'choice' }> }) {
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= ex.options.length) {
        const opt = ex.options[n - 1];
        onSubmit({ verdict: opt === ex.answer ? 'correct' : 'wrong', given: opt });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ex, answered, onSubmit]);

  const prompt =
    ex.dir === 'listen2pl' ? (
      <>
        <div className="eyebrow">Listen — what does it mean?</div>
        <div className="listen-big">
          <SpeakButton text={ex.item.en} label="Play again" />
        </div>
      </>
    ) : ex.dir === 'en2pl' ? (
      <>
        <div className="eyebrow">What does this mean?</div>
        <div className="prompt" lang="en">
          {ex.item.en} <SpeakButton text={ex.item.en} small />
        </div>
      </>
    ) : (
      <>
        <div className="eyebrow">Choose the English</div>
        <div className="prompt" lang="pl">
          {ex.item.pl}
        </div>
      </>
    );

  return (
    <div className="ex">
      {prompt}
      <div className="options" role="list">
        {ex.options.map((o, i) => {
          let cls = 'option';
          if (answered) {
            if (o === ex.answer) cls += ' is-correct';
            else if (o === answered.given) cls += ' is-wrong';
          }
          return (
            <button
              key={o}
              className={cls}
              disabled={!!answered}
              lang={ex.dir === 'pl2en' ? 'en' : 'pl'}
              onClick={() => onSubmit({ verdict: o === ex.answer ? 'correct' : 'wrong', given: o })}
            >
              <kbd>{i + 1}</kbd> {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AnswerInput({
  answered,
  onDone,
  placeholder,
}: {
  answered: Submitted | null;
  onDone: (v: string) => void;
  placeholder: string;
}) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!answered && v.trim()) onDone(v);
      }}
    >
      <input
        ref={ref}
        className={`answer-input ${answered ? `is-${answered.verdict}` : ''}`}
        value={v}
        onChange={(e) => setV(e.target.value)}
        readOnly={!!answered}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        lang="en"
        aria-label="Your answer"
      />
      {!answered && (
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => onDone('')}>
            I don't know
          </button>
          <button type="submit" className="btn btn-primary" disabled={!v.trim()}>
            Check <kbd>Enter</kbd>
          </button>
        </div>
      )}
    </form>
  );
}

function Typed({ ex, onSubmit, answered, dictation }: Props & { dictation?: boolean }) {
  const submit = (v: string) => {
    const { verdict, closest } = check(v, enAnswers(ex));
    onSubmit({ verdict, given: v, closest });
  };
  return (
    <div className="ex">
      {dictation ? (
        <>
          <div className="eyebrow">Type what you hear</div>
          <div className="listen-big">
            <SpeakButton text={ex.item.en} label="Play again" />
            <button type="button" className="btn btn-ghost" onClick={() => speak(ex.item.en, 0.7)}>
              Slower
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="eyebrow">Write in English</div>
          <div className="prompt" lang="pl">
            {ex.item.pl}
          </div>
        </>
      )}
      <AnswerInput answered={answered} onDone={submit} placeholder="Type in English…" />
    </div>
  );
}

function Cloze({ ex, onSubmit, answered }: Props & { ex: Extract<Exercise, { type: 'cloze' }> }) {
  const submit = (v: string) => {
    const { verdict, closest } = check(v, [ex.gap, ...enAnswers(ex)]);
    onSubmit({ verdict, given: v, closest });
  };
  return (
    <div className="ex">
      <div className="eyebrow">Fill the gap</div>
      <div className="prompt cloze" lang="en">
        {ex.before}
        <span className="gap">{answered ? ex.gap : '_'.repeat(Math.max(4, ex.gap.length))}</span>
        {ex.after}
      </div>
      <div className="muted" lang="pl">
        {ex.item.example?.pl} <span className="hint">({ex.item.pl})</span>
      </div>
      <AnswerInput answered={answered} onDone={submit} placeholder="Missing word(s)…" />
    </div>
  );
}

function Build({ ex, onSubmit, answered }: Props & { ex: Extract<Exercise, { type: 'build' }> }) {
  const [picked, setPicked] = useState<number[]>([]);
  const sentence = picked.map((i) => ex.tiles[i]).join(' ');
  const submit = () => {
    const { verdict } = check(sentence, enAnswers(ex));
    // word order is the whole point here — no typo credit
    onSubmit({ verdict: verdict === 'correct' ? 'correct' : 'wrong', given: sentence });
  };
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') setPicked((p) => p.slice(0, -1));
      if (e.key === 'Enter' && picked.length) submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="ex">
      <div className="eyebrow">Build the sentence in English</div>
      <div className="prompt" lang="pl">
        {ex.item.pl}
      </div>
      <div className={`build-line ${answered ? `is-${answered.verdict}` : ''}`} lang="en">
        {picked.length === 0 && <span className="muted">Tap the words in order</span>}
        {picked.map((ti, k) => (
          <button key={k} className="tile" disabled={!!answered} onClick={() => setPicked((p) => p.filter((_, j) => j !== k))}>
            {ex.tiles[ti]}
          </button>
        ))}
      </div>
      <div className="tiles" lang="en">
        {ex.tiles.map((t, i) => (
          <button key={i} className="tile" disabled={!!answered || picked.includes(i)} onClick={() => setPicked((p) => [...p, i])}>
            {t}
          </button>
        ))}
      </div>
      {!answered && (
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => onSubmit({ verdict: 'wrong', given: '' })}>
            I don't know
          </button>
          <button className="btn btn-primary" disabled={!picked.length} onClick={submit}>
            Check <kbd>Enter</kbd>
          </button>
        </div>
      )}
    </div>
  );
}
