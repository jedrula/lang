# Contributing

Thanks for helping! Lingo aims to be a simple, honest, research-based way to learn a language —
no gems, no guilt-trip notifications, just what actually helps you remember.

## The most valuable contribution: content

Courses are plain YAML files in `content/courses/<from>-<to>/` — you can edit them right on github.com,
no setup needed.

### Fix or improve existing content
Found an unnatural sentence, a wrong translation, or a missing accepted answer? Edit the unit file in
`content/courses/pl-en/units/` and open a PR. Native-speaker review of the Polish and English is very welcome.

- Add accepted alternatives to `enAlt` / `plAlt` rather than changing `en` / `pl`.
- **Never change an item's `id`** — learners' progress is stored by id.

### Add a unit
1. Copy an existing unit, e.g. `content/courses/pl-en/units/a2-01-past-simple.yaml`, to a new file named
   `<level>-<nn>-<slug>.yaml` (e.g. `b1-05-relative-clauses.yaml`) and set its `id` to the same name.
   It is picked up automatically.
2. Follow the fields used in existing units (full schema: `src/content/types.ts`):
   - 10–14 items, mixing `word`, `phrase` and a few short `sentence`s that reuse the unit's words.
   - Words/phrases need an `example` whose English contains the item verbatim (used for fill-the-gap).
   - `intro` in English; `introPl` in Polish for anything grammatical.
   - `note` / `notePl` only for real pitfalls (false friends, irregular forms…).
   - Prefer high-frequency, useful vocabulary over rare words.
3. Run `npm run validate` — it explains any problem in plain words (also runs as part of `npm run build`).

### New language pairs
The engine is language-agnostic, but content and some UI strings currently assume Polish → English.
If you want to start another pair, open an issue first so we can agree on the structure.

## Code

```bash
npm install
npm run dev
npm run build   # type-check + production build
```

- Learning engine (scheduling, answer checking, session logic) lives in `src/engine/` and has no React
  dependency — keep it that way.
- Changes to learning behaviour (scheduling, exercise order, grading) should cite evidence or reasoning;
  see `docs/RESEARCH.md`.
- Keep it calm: we deliberately avoid gamification mechanics (streak pressure, points, leaderboards).

## Licence
By contributing you agree your contributions are licensed under the MIT licence (see `LICENSE`).
