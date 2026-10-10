import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { itemById, items as allItems, unitOfItem, units } from '../content';
import { ExerciseView, type Submitted } from '../components/Exercise';
import { PolishHelp, ProgressBar, SpeakButton } from '../components/ui';
import { makeExercise, stageForStability, type Exercise } from '../engine/exercises';
import { answer, createSession, progress, type Session as SessionT, type Task } from '../engine/session';
import { applyReview, cardFromLesson, dueCards, recallNow } from '../engine/scheduler';
import { nextNewItems, planDay } from '../engine/planner';
import { dayIndex, emptyDay, type AppState } from '../engine/state';
import { speak } from '../engine/speech';
import { useStore } from '../store';

export type SessionKind = { kind: 'daily' } | { kind: 'new'; count: number; unitId?: string } | { kind: 'weakest'; count: number };

function buildQueue(state: AppState, k: SessionKind): SessionT {
  const today = dayIndex();
  if (k.kind === 'daily') {
    const plan = planDay(state, units, today, state.log[today]?.seconds ?? 0);
    return createSession(plan.reviewIds, plan.newItems.map((i) => i.id));
  }
  if (k.kind === 'new') return createSession([], nextNewItems(state, units, k.count, k.unitId).map((i) => i.id));
  // practise the items you're most likely to have forgotten (due or not)
  const due = dueCards(state, today).map((c) => c.id);
  const weakest = Object.values(state.cards)
    .filter((c) => !due.includes(c.id))
    .sort((a, b) => recallNow(a, today) - recallNow(b, today))
    .map((c) => c.id);
  return createSession([...due, ...weakest].slice(0, k.count), []);
}

interface Stats {
  reviews: number;
  learned: number;
  correct: number;
  answers: number;
  seconds: number;
  missed: Set<string>;
}

export function Session({ kind, onExit }: { kind: SessionKind; onExit: (next?: SessionKind) => void }) {
  const { state, update } = useStore();
  const [session, setSession] = useState<SessionT>(() => buildQueue(state, kind));
  const [answered, setAnswered] = useState<Submitted | null>(null);
  const [stats, setStats] = useState<Stats>({ reviews: 0, learned: 0, correct: 0, answers: 0, seconds: 0, missed: new Set() });
  const shownAt = useRef(Date.now());
  const pending = useRef<SessionT | null>(null);

  const task: Task | undefined = session.queue[0];
  const exercise: Exercise | null = useMemo(() => {
    if (!task) return null;
    const item = itemById.get(task.itemId)!;
    const unit = unitOfItem.get(task.itemId)!;
    // distractors from the same unit are plausible; unrelated words are too easy to rule out
    const pool = unit.items.length >= 6 ? unit.items : allItems.filter((i) => unitOfItem.get(i.id)?.level === unit.level);
    const audio = state.settings.autoplayAudio;
    if (task.mode === 'learn') {
      if (task.step === 0) return { type: 'intro', item };
      return makeExercise(item, task.step === 1 ? 'recognize' : 'produce', pool, audio);
    }
    if (task.mode === 'relearn') return makeExercise(item, task.step === 0 ? 'recognize' : 'produce', pool, audio);
    const card = state.cards[task.itemId];
    return makeExercise(item, stageForStability(card?.s ?? 0), pool, audio);
  }, [task?.uid]);

  useEffect(() => {
    shownAt.current = Date.now();
  }, [task?.uid]);

  const onSubmit = useCallback(
    (sub: Submitted) => {
      if (!task || answered) return;
      const today = dayIndex();
      const secs = Math.min(60, (Date.now() - shownAt.current) / 1000);
      const isIntro = task.mode === 'learn' && task.step === 0;
      const { session: next, outcome } = answer(session, sub.verdict);
      pending.current = next;

      update((s) => {
        const log = { ...emptyDay(), ...s.log[today] };
        log.seconds += secs;
        if (!isIntro) {
          log.answers++;
          if (sub.verdict !== 'wrong') log.correct++;
        }
        const cards = { ...s.cards };
        if (outcome?.kind === 'review' && cards[outcome.itemId]) {
          cards[outcome.itemId] = applyReview(cards[outcome.itemId], today, outcome.grade);
          log.reviews++;
        }
        if (outcome?.kind === 'learned') {
          cards[outcome.itemId] = cardFromLesson(outcome.itemId, today, outcome.errors);
          log.newItems++;
        }
        return { ...s, cards, log: { ...s.log, [today]: log } };
      });

      setStats((st) => ({
        reviews: st.reviews + (outcome?.kind === 'review' ? 1 : 0),
        learned: st.learned + (outcome?.kind === 'learned' ? 1 : 0),
        correct: st.correct + (!isIntro && sub.verdict !== 'wrong' ? 1 : 0),
        answers: st.answers + (isIntro ? 0 : 1),
        seconds: st.seconds + secs,
        missed: sub.verdict === 'wrong' ? new Set([...st.missed, task.itemId]) : st.missed,
      }));

      if (isIntro) {
        setSession(next);
        return;
      }
      if (state.settings.autoplayAudio && exercise?.type !== 'dictation') speak(exercise!.item.en);
      setAnswered(sub);
    },
    [task, answered, session, update, state.settings.autoplayAudio, exercise],
  );

  const advance = useCallback(() => {
    if (pending.current) setSession(pending.current);
    pending.current = null;
    setAnswered(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === ' ' && e.ctrlKey && exercise) speak(exercise.item.en);
      if (e.key === 'Enter' && answered) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, advance, onExit, exercise]);

  if (!task || !exercise) return <Summary stats={stats} onExit={onExit} />;

  const item = exercise.item;
  const unit = unitOfItem.get(item.id)!;
  const showUnitIntro = task.mode === 'learn' && task.step === 0 && unit.items[0].id === item.id;
  const polishOpen = state.settings.polishHelp === 'always';

  return (
    <div className="session">
      <div className="session-top">
        <button className="icon-btn" onClick={() => onExit()} aria-label="End session" title="End session (Esc)">
          ✕
        </button>
        <ProgressBar value={progress(session)} label="Session progress" />
        <span className="mode-tag">{task.mode === 'review' ? 'Review' : task.mode === 'relearn' ? 'Again' : 'New'}</span>
      </div>

      <div className="card ex-card">
        <ExerciseView
          key={task.uid}
          ex={exercise}
          answered={answered}
          onSubmit={onSubmit}
          autoplay={state.settings.autoplayAudio}
          polishOpen={polishOpen}
          unitIntro={showUnitIntro ? unit : undefined}
        />
      </div>

      {answered && (
        <Feedback
          sub={answered}
          ex={exercise}
          polishOpen={state.settings.polishHelp !== 'never' && (polishOpen || answered.verdict === 'wrong')}
          onNext={advance}
        />
      )}
    </div>
  );
}

function Feedback({ sub, ex, polishOpen, onNext }: { sub: Submitted; ex: Exercise; polishOpen: boolean; onNext: () => void }) {
  const it = ex.item;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const title = sub.verdict === 'correct' ? 'Correct' : sub.verdict === 'typo' ? 'Almost — watch the spelling' : 'Not quite';
  return (
    <div className={`feedback is-${sub.verdict}`} role="status">
      <div className="feedback-title">{title}</div>
      <div className="feedback-answer">
        <span lang="en">{sub.verdict === 'typo' && sub.closest ? sub.closest : it.en}</span>
        <SpeakButton text={it.en} small />
        <span className="muted" lang="pl">
          {' '}
          — {it.pl}
        </span>
      </div>
      {sub.verdict === 'wrong' && sub.given && (
        <div className="muted">
          You answered: <s>{sub.given}</s>
        </div>
      )}
      {it.example && sub.verdict !== 'correct' && ex.type !== 'cloze' && (
        <div className="muted small">
          e.g. {it.example.en} — {it.example.pl}
        </div>
      )}
      {it.note && sub.verdict !== 'correct' && <p className="note">{it.note}</p>}
      {sub.verdict !== 'correct' && <PolishHelp text={it.notePl} open={polishOpen} />}
      <div className="actions">
        <button ref={ref} className="btn btn-primary" onClick={onNext}>
          Continue <kbd>Enter</kbd>
        </button>
      </div>
    </div>
  );
}

function Summary({ stats, onExit }: { stats: Stats; onExit: (next?: SessionKind) => void }) {
  const { state } = useStore();
  const today = dayIndex();
  const goal = state.settings.dailyMinutes;
  const minutes = Math.round((state.log[today]?.seconds ?? 0) / 60);
  const acc = stats.answers ? Math.round((stats.correct / stats.answers) * 100) : null;
  const missed = [...stats.missed].map((id) => itemById.get(id)!).filter(Boolean);
  return (
    <div className="session">
      <div className="card summary">
        <h1>{stats.answers + stats.learned === 0 ? 'Nothing to do right now' : 'Session done'}</h1>
        {stats.answers + stats.learned > 0 && (
          <div className="stat-row">
            <div className="stat">
              <b>{stats.learned}</b>
              <span>new items</span>
            </div>
            <div className="stat">
              <b>{stats.reviews}</b>
              <span>reviews</span>
            </div>
            <div className="stat">
              <b>{acc ?? '–'}%</b>
              <span>first-try correct</span>
            </div>
            <div className="stat">
              <b>
                {minutes}/{goal}
              </b>
              <span>min today</span>
            </div>
          </div>
        )}
        {missed.length > 0 && (
          <div className="missed">
            <h2>Worth another look</h2>
            <ul>
              {missed.map((m) => (
                <li key={m.id}>
                  <span lang="en">{m.en}</span> <SpeakButton text={m.en} small /> <span className="muted">— {m.pl}</span>
                </li>
              ))}
            </ul>
            <p className="muted small">These come back sooner in your reviews.</p>
          </div>
        )}
        <p className="muted">
          {stats.learned > 0
            ? 'New items will come back tomorrow, then at growing intervals — each time just before you would forget them.'
            : 'Reviews are scheduled just before you would forget each item.'}
        </p>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => onExit({ kind: 'weakest', count: 15 })}>
            Practise weakest
          </button>
          <button className="btn btn-ghost" onClick={() => onExit({ kind: 'new', count: 5 })}>
            Learn 5 more
          </button>
          <button className="btn btn-primary" onClick={() => onExit()}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
