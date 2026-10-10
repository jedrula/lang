# Lingo — English for Polish speakers

A deliberately simple, non-gamified language app built around how memory works.
Web first (Vite + React + TypeScript); designed to be wrapped with Capacitor later.
Free and open source (MIT) — contributions, especially content and native-speaker review, are very welcome:
see [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```

## How it works

- **Onboarding** — pick daily minutes (5–45), then a level test or start from zero.
- **Placement test** (`src/screens/Placement.tsx`) — blocks of 6 questions per level, A1 → B2. Pass a block with 4/6
  and you move up; fail and it stops. Items in passed levels are added as "probably known" and spread over light
  reviews in the next 4 weeks rather than taught again.
- **Daily session** (`src/engine/planner.ts`) — reviews first, then new items, sized to your daily minutes
  (~0.4 new items per minute of daily time; halved when reviews take >70% of the time, paused when they exceed it).
- **Lessons** (`src/engine/session.ts`) — each new item: intro → recognition (multiple choice / listening) →
  production (fill the gap, build the sentence, dictation, type it). Mistakes come back a few steps later.
- **Spaced repetition** (`src/engine/fsrs.ts`, `scheduler.ts`) — FSRS-6 with default weights, 90% target retention.
  First review is always the next day; after that intervals grow (typically ~1, ~8, ~40 days…). Grades are
  automatic: correct = Good, typo = Hard, wrong = Again.
- **Exercise difficulty grows with memory strength** (`src/engine/exercises.ts`): recognition while weak,
  cued production while medium, free recall when strong.
- **Polish help** — UI is English; grammar intros and tricky-point notes have Polish versions, shown
  automatically after a mistake (configurable in Settings).
- **Answer checking** (`src/engine/answer.ts`) — ignores case, punctuation and contractions; small spelling slips
  count as "almost", but wrong grammar words (a/an/the, is/are, do/does…) are always wrong.

See [docs/RESEARCH.md](docs/RESEARCH.md) for the evidence behind these choices.

## Content

`src/content/units/*.ts` — one file per unit (A1–B2), schema in `src/content/types.ts`. Units are picked up
automatically (files named `a1-…`, `b2-…`). Placement questions live in `src/content/placement.ts`.
Item ids are the progress keys — don't rename them once people are learning.

## Data & Capacitor later

All progress is one JSON blob in `localStorage` behind `src/engine/storage.ts`; export/import is in Settings.
For Capacitor: swap that adapter for `@capacitor/preferences` (or SQLite) and `src/engine/speech.ts` for
`@capacitor-community/text-to-speech`.

## Licence

[MIT](LICENSE)
