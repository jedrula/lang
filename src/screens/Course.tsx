import { useState } from 'react';
import { units } from '../content';
import { LEVELS } from '../content/types';
import { recallNow } from '../engine/scheduler';
import { dayIndex } from '../engine/state';
import { useStore } from '../store';
import { PolishHelp, ProgressBar, Rich, SpeakButton } from '../components/ui';
import type { SessionKind } from './Session';

export function Course({ start }: { start: (k: SessionKind) => void }) {
  const { state } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const today = dayIndex();
  const open = units.find((u) => u.id === openId);

  if (open) {
    const unseen = open.items.filter((i) => !state.cards[i.id]).length;
    return (
      <div className="course">
        <button className="btn btn-ghost" onClick={() => setOpenId(null)}>
          ← All units
        </button>
        <section className="card">
          <div className="eyebrow">{open.level}</div>
          <h1>{open.title}</h1>
          <p className="muted" lang="pl">
            {open.titlePl}
          </p>
          {open.intro && (
            <p>
              <Rich text={open.intro} />
            </p>
          )}
          <PolishHelp text={open.introPl} open={state.settings.polishHelp === 'always'} title="Wyjaśnienie po polsku" />
          <div className="actions left">
            <button className="btn btn-primary" disabled={!unseen} onClick={() => start({ kind: 'new', count: Math.min(unseen, 7), unitId: open.id })}>
              {unseen ? `Learn ${Math.min(unseen, 7)} new from this unit` : 'All items learned'}
            </button>
          </div>
        </section>
        <section className="card">
          <table className="items">
            <thead>
              <tr>
                <th>English</th>
                <th>Polish</th>
                <th>Memory</th>
              </tr>
            </thead>
            <tbody>
              {open.items.map((it) => {
                const c = state.cards[it.id];
                const r = c ? recallNow(c, today) : null;
                const due = c ? c.due - today : null;
                return (
                  <tr key={it.id}>
                    <td lang="en">
                      {it.en} <SpeakButton text={it.en} small />
                    </td>
                    <td lang="pl">{it.pl}</td>
                    <td className="small">
                      {c ? (
                        <span title={`Estimated recall now: ${Math.round(r! * 100)}%. Stability ${c.s.toFixed(1)} days.`}>
                          {Math.round(r! * 100)}% · {due! <= 0 ? 'due now' : `next in ${due}d`}
                        </span>
                      ) : (
                        <span className="muted">new</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    );
  }

  return (
    <div className="course">
      {LEVELS.map((level) => {
        const us = units.filter((u) => u.level === level);
        if (!us.length) return null;
        return (
          <section key={level} className="card">
            <h2>
              <span className="level-badge">{level}</span>
            </h2>
            <ul className="unit-list">
              {us.map((u) => {
                const n = u.items.filter((i) => state.cards[i.id]).length;
                return (
                  <li key={u.id}>
                    <button className="unit-row" onClick={() => setOpenId(u.id)}>
                      <span className="unit-title">
                        {u.title}
                        <span className="muted small" lang="pl">
                          {u.titlePl}
                        </span>
                      </span>
                      <span className="unit-progress">
                        <ProgressBar value={n / u.items.length} label={`${u.title} progress`} />
                        <span className="muted small">
                          {n}/{u.items.length}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
