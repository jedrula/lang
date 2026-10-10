import { useRef, useState } from 'react';
import { DEFAULT_STATE, type AppState, type PolishHelp } from '../engine/state';
import { useStore } from '../store';
import { MinutesPicker } from './Onboarding';

export function Settings({ onRetakePlacement }: { onRetakePlacement: () => void }) {
  const { state, update } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<AppState['settings']>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lingo-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as AppState;
      if (data.version !== 1 || typeof data.cards !== 'object') throw new Error();
      update(() => ({ ...structuredClone(DEFAULT_STATE), ...data }));
      setMsg('Progress imported.');
    } catch {
      setMsg('That file does not look like an export from this app.');
    }
  };

  return (
    <div className="settings">
      <section className="card">
        <h2>Daily goal</h2>
        <MinutesPicker value={state.settings.dailyMinutes} onChange={(m) => set({ dailyMinutes: m })} />
      </section>

      <section className="card">
        <h2>Polish explanations</h2>
        <div className="chips" role="radiogroup">
          {(
            [
              ['auto', 'When I make a mistake'],
              ['always', 'Always show'],
              ['never', 'Hidden (tap to open)'],
            ] as [PolishHelp, string][]
          ).map(([v, label]) => (
            <button key={v} role="radio" aria-checked={state.settings.polishHelp === v} className={`chip ${state.settings.polishHelp === v ? 'is-on' : ''}`} onClick={() => set({ polishHelp: v })}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Audio</h2>
        <label className="toggle">
          <input type="checkbox" checked={state.settings.autoplayAudio} onChange={(e) => set({ autoplayAudio: e.target.checked })} />
          Play English audio automatically (and include listening exercises)
        </label>
      </section>

      <section className="card">
        <h2>Level</h2>
        <p className="muted">
          {state.placement ? `Placement result: ${state.placement.level ?? 'Beginner'}.` : 'You have not taken the level test.'} Retaking it never
          removes what you've learned.
        </p>
        <button className="btn btn-ghost" onClick={onRetakePlacement}>
          Take the level test
        </button>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="muted small">Progress is stored in this browser only. Export it to back it up or move it to another device.</p>
        <div className="actions left">
          <button className="btn btn-ghost" onClick={exportData}>
            Export progress
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          {!confirmReset ? (
            <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
              Reset everything
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={() => {
                update(() => structuredClone(DEFAULT_STATE));
                setConfirmReset(false);
              }}
            >
              Really delete all progress?
            </button>
          )}
        </div>
        {msg && <p className="small">{msg}</p>}
      </section>
    </div>
  );
}
