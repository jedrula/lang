import { useState, type ReactNode } from 'react';
import { canSpeak, speak } from '../engine/speech';

/** Renders **bold** and line breaks from content strings. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : part,
          )}
        </span>
      ))}
    </>
  );
}

export function SpeakButton({ text, label = 'Listen', small }: { text: string; label?: string; small?: boolean }) {
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      className={small ? 'icon-btn' : 'btn btn-ghost'}
      onClick={() => speak(text)}
      title="Listen (Ctrl+Space)"
      aria-label={`Listen: ${text}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M19 5a10 10 0 0 1 0 14" />
      </svg>
      {!small && <span>{label}</span>}
    </button>
  );
}

/** A Polish explanation — collapsed behind "Po polsku" unless `open`. */
export function PolishHelp({ text, open = false, title = 'Po polsku' }: { text?: string; open?: boolean; title?: string }) {
  const [shown, setShown] = useState(open);
  if (!text) return null;
  return (
    <div className="pl-help">
      <button type="button" className="pl-toggle" onClick={() => setShown((s) => !s)} aria-expanded={shown}>
        <span className="flag" aria-hidden>PL</span> {title} {shown ? '▴' : '▾'}
      </button>
      {shown && (
        <p className="pl-text" lang="pl">
          <Rich text={text} />
        </p>
      )}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div className="progress-fill" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}
