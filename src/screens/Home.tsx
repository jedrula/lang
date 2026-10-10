import { units } from '../content';
import { LEVELS } from '../content/types';
import { planDay } from '../engine/planner';
import { forecast } from '../engine/scheduler';
import { dayIndex } from '../engine/state';
import { useStore } from '../store';
import { ProgressBar } from '../components/ui';
import type { SessionKind } from './Session';

function Bars({ values, labels, title }: { values: number[]; labels: string[]; title: string }) {
  const max = Math.max(1, ...values);
  return (
    <figure className="bars" aria-label={title}>
      <figcaption>{title}</figcaption>
      <div className="bars-row">
        {values.map((v, i) => (
          <div className="bar-col" key={i} title={`${labels[i]}: ${v}`}>
            <span className="bar-val">{v || ''}</span>
            <div className="bar" style={{ height: `${(v / max) * 100}%` }} />
            <span className="bar-label">{labels[i]}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

const WEEKDAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const dayLabel = (offset: number) => WEEKDAY[new Date(Date.now() + offset * 86_400_000).getDay()];

export function Home({ start }: { start: (k: SessionKind) => void }) {
  const { state } = useStore();
  const today = dayIndex();
  const log = state.log[today];
  const secondsToday = log?.seconds ?? 0;
  const goal = state.settings.dailyMinutes;
  const plan = planDay(state, units, today, secondsToday);
  const goalDone = secondsToday >= goal * 60;
  const nothingLeft = plan.reviewIds.length === 0 && plan.newItems.length === 0;

  const cards = Object.values(state.cards);
  const learned = cards.length;
  const strong = cards.filter((c) => c.s >= 21).length;
  const fc = forecast(state, today, 7);

  const current = units.find((u) => u.items.some((i) => !state.cards[i.id]));
  const currentDone = current ? current.items.filter((i) => state.cards[i.id]).length : 0;

  const last7 = Array.from({ length: 7 }, (_, i) => Math.round((state.log[today - 6 + i]?.seconds ?? 0) / 60));
  const activeDays = last7.filter((m) => m > 0).length;

  return (
    <div className="home">
      <section className="card today">
        <div className="eyebrow">Today</div>
        {nothingLeft ? (
          <>
            <h1>{goalDone ? 'Daily goal reached' : 'All caught up'}</h1>
            <p className="muted">
              {goalDone
                ? 'Stopping here is fine — spacing works best when you come back tomorrow.'
                : 'No reviews are due. You can learn something new or practise your weakest items.'}
            </p>
            <div className="actions left">
              <button className="btn btn-ghost" onClick={() => start({ kind: 'new', count: 5 })} disabled={!current}>
                Learn 5 new
              </button>
              <button className="btn btn-ghost" onClick={() => start({ kind: 'weakest', count: 15 })} disabled={learned === 0}>
                Practise weakest
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>
              {plan.reviewIds.length > 0 && `${plan.reviewIds.length} review${plan.reviewIds.length > 1 ? 's' : ''}`}
              {plan.reviewIds.length > 0 && plan.newItems.length > 0 && ' + '}
              {plan.newItems.length > 0 && `${plan.newItems.length} new`}
            </h1>
            <p className="muted">
              About {plan.estMinutes} min
              {plan.reviewsLeftOver > 0 && ` · ${plan.reviewsLeftOver} more reviews wait for tomorrow (no new items until the backlog clears)`}
            </p>
            <div className="actions left">
              <button className="btn btn-primary btn-lg" onClick={() => start({ kind: 'daily' })} autoFocus>
                Start session
              </button>
            </div>
          </>
        )}
        <div className="goal">
          <ProgressBar value={secondsToday / (goal * 60)} label="Daily goal" />
          <span className="muted small">
            {Math.round(secondsToday / 60)} / {goal} min today
          </span>
        </div>
      </section>

      {current && (
        <section className="card">
          <div className="eyebrow">Course position</div>
          <h2>
            {current.level} · {current.title}
          </h2>
          <p className="muted" lang="pl">
            {current.titlePl}
          </p>
          <ProgressBar value={currentDone / current.items.length} label="Unit progress" />
          <span className="muted small">
            {currentDone} / {current.items.length} items
          </span>
        </section>
      )}

      <section className="card stats">
        <div className="stat-row">
          <div className="stat">
            <b>{learned}</b>
            <span>items in memory</span>
          </div>
          <div className="stat">
            <b>{strong}</b>
            <span>well known (3+ weeks)</span>
          </div>
          <div className="stat">
            <b>{activeDays}/7</b>
            <span>days studied this week</span>
          </div>
          <div className="stat">
            <b>{state.placement?.level ?? (learned ? '—' : 'new')}</b>
            <span>placement level</span>
          </div>
        </div>
        <div className="charts">
          <Bars title="Reviews coming up" values={fc} labels={fc.map((_, i) => (i === 0 ? 'Now' : dayLabel(i)))} />
          <Bars title="Minutes studied" values={last7} labels={last7.map((_, i) => (i === 6 ? 'Today' : dayLabel(i - 6)))} />
        </div>
        <LevelProgress />
      </section>
    </div>
  );
}

function LevelProgress() {
  const { state } = useStore();
  return (
    <div className="level-progress">
      {LEVELS.map((l) => {
        const its = units.filter((u) => u.level === l).flatMap((u) => u.items);
        if (!its.length) return null;
        const n = its.filter((i) => state.cards[i.id]).length;
        return (
          <div key={l} className="level-row">
            <span className="level-badge">{l}</span>
            <ProgressBar value={n / its.length} label={`${l} progress`} />
            <span className="muted small">
              {n}/{its.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}
