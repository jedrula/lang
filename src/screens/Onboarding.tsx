import { useState } from 'react';
import { useStore } from '../store';
import { maxNewPerDay } from '../engine/planner';

export const MINUTE_OPTIONS = [5, 10, 15, 20, 30, 45];

export function MinutesPicker({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  return (
    <div className="chips" role="radiogroup" aria-label="Daily minutes">
      {MINUTE_OPTIONS.map((m) => (
        <button key={m} role="radio" aria-checked={value === m} className={`chip ${value === m ? 'is-on' : ''}`} onClick={() => onChange(m)}>
          {m} min
        </button>
      ))}
    </div>
  );
}

export function Onboarding({ onPlacement, onSkip }: { onPlacement: () => void; onSkip: () => void }) {
  const { state, update } = useStore();
  const [step, setStep] = useState(0);
  const minutes = state.settings.dailyMinutes;
  const setMinutes = (m: number) => update((s) => ({ ...s, settings: { ...s.settings, dailyMinutes: m } }));

  return (
    <div className="onboarding">
      {step === 0 && (
        <div className="card">
          <div className="eyebrow">Welcome · Witaj</div>
          <h1>Learn English that sticks</h1>
          <p>A few minutes a day, built on what memory research says works best:</p>
          <ul className="principles">
            <li>
              <b>Recall, don't re-read.</b> You'll actively produce answers — that's what makes memories last.
            </li>
            <li>
              <b>Spaced reviews.</b> New words come back tomorrow, then after about a week, then at longer and longer gaps — each time just before
              you'd forget.
            </li>
            <li>
              <b>Words in sentences.</b> Everything comes with an example and audio.
            </li>
            <li>
              <b>Polish when it helps.</b> Grammar and tricky points are explained in Polish too.
            </li>
          </ul>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              Get started
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <div className="eyebrow">Step 1 of 2</div>
          <h1>How long do you want to learn each day?</h1>
          <p className="muted">Short and daily beats long and occasional. You can change this any time.</p>
          <MinutesPicker value={minutes} onChange={setMinutes} />
          <p className="muted small">
            With {minutes} minutes a day you'll learn about {maxNewPerDay(minutes)} new words or phrases daily — the rest of the time goes to
            reviews that keep the old ones fresh.
          </p>
          <div className="actions">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="eyebrow">Step 2 of 2</div>
          <h1>Let's find your level</h1>
          <p>
            A short test (about 5 minutes, up to 24 questions). It starts easy and stops once the questions get too hard, so you won't waste time on
            things you already know.
          </p>
          <div className="actions">
            <button
              className="btn btn-ghost"
              onClick={() => {
                update((s) => ({ ...s, onboarded: true }));
                onSkip();
              }}
            >
              I'm a complete beginner
            </button>
            <button className="btn btn-primary" onClick={onPlacement}>
              Take the level test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
