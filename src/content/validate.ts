import type { Item, PlacementQuestion, Unit } from './types';
import { LEVELS } from './types';

/**
 * Content checks shared by the app (dev warnings) and `npm run validate` (CI).
 * Messages are written for content contributors, not programmers.
 */
export interface Problem {
  file: string;
  where: string;
  message: string;
}

const KINDS = ['word', 'phrase', 'sentence'];
const isText = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const isTextList = (v: unknown) => v === undefined || (Array.isArray(v) && v.every(isText));

export function validateUnits(units: { file: string; unit: Unit }[]): Problem[] {
  const problems: Problem[] = [];
  const unitIds = new Map<string, string>();
  const itemIds = new Map<string, string>();

  for (const { file, unit } of units) {
    const p = (where: string, message: string) => problems.push({ file, where, message });
    if (!unit || typeof unit !== 'object') {
      p('file', 'The file is empty or is not a unit.');
      continue;
    }
    for (const key of ['id', 'title', 'titlePl'] as const) if (!isText(unit[key])) p('unit', `Missing "${key}".`);
    if (!LEVELS.includes(unit.level)) p('unit', `"level" must be one of ${LEVELS.join(', ')} (got "${unit.level}").`);
    if (isText(unit.id)) {
      if (unitIds.has(unit.id)) p('unit', `Unit id "${unit.id}" is also used in ${unitIds.get(unit.id)}.`);
      unitIds.set(unit.id, file);
      const expected = file.split('/').pop()!.replace(/\.ya?ml$/, '');
      if (unit.id !== expected) p('unit', `Unit id "${unit.id}" should match the file name "${expected}".`);
    }
    if (!Array.isArray(unit.items) || unit.items.length === 0) {
      p('unit', 'A unit needs a list of "items".');
      continue;
    }
    if (unit.items.length < 5) p('unit', `Only ${unit.items.length} items — aim for 10–14.`);

    unit.items.forEach((it: Item, i) => {
      const where = `item ${i + 1}${isText(it?.id) ? ` (${it.id})` : ''}`;
      const ip = (m: string) => p(where, m);
      if (!it || typeof it !== 'object') return ip('Item is empty.');
      if (!isText(it.id)) ip('Missing "id".');
      else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.id)) ip(`id "${it.id}" may only use lowercase letters, digits and dashes.`);
      else if (itemIds.has(it.id)) ip(`id "${it.id}" is also used in ${itemIds.get(it.id)}. Ids must be unique.`);
      else itemIds.set(it.id, file);
      if (!KINDS.includes(it.kind)) ip(`"kind" must be word, phrase or sentence (got "${it.kind}").`);
      if (!isText(it.en)) ip('Missing "en" (the English answer).');
      if (!isText(it.pl)) ip('Missing "pl" (the Polish meaning).');
      if (!isTextList(it.enAlt)) ip('"enAlt" must be a list of texts.');
      if (!isTextList(it.plAlt)) ip('"plAlt" must be a list of texts.');
      if (it.example !== undefined) {
        if (!isText(it.example?.en) || !isText(it.example?.pl)) ip('"example" needs both "en" and "pl".');
        else if (it.kind !== 'sentence' && isText(it.en) && !it.example.en.toLowerCase().includes(it.en.toLowerCase()))
          ip(`The example "${it.example.en}" must contain "${it.en}" exactly (it is used for fill-in-the-gap).`);
      } else if (it.kind === 'word') ip('Words should have an "example" sentence.');
    });
  }
  return problems;
}

export function validatePlacement(file: string, questions: PlacementQuestion[]): Problem[] {
  const problems: Problem[] = [];
  if (!Array.isArray(questions)) return [{ file, where: 'file', message: 'Expected a "questions" list.' }];
  const ids = new Set<string>();
  questions.forEach((q, i) => {
    const p = (m: string) => problems.push({ file, where: `question ${i + 1}${q?.id ? ` (${q.id})` : ''}`, message: m });
    if (!isText(q.id)) p('Missing "id".');
    else if (ids.has(q.id)) p(`Duplicate id "${q.id}".`);
    else ids.add(q.id);
    if (!LEVELS.includes(q.level)) p(`"level" must be one of ${LEVELS.join(', ')}.`);
    if (!['vocab', 'grammar', 'reading'].includes(q.skill)) p('"skill" must be vocab, grammar or reading.');
    if (!isText(q.prompt)) p('Missing "prompt".');
    if (!Array.isArray(q.answers) || !q.answers.every(isText) || !q.answers.length) p('"answers" must list at least one accepted answer.');
    if (q.type === 'choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) p('Choice questions need at least 2 "options".');
      else if (q.answers?.some((a) => !q.options!.includes(a))) p('Every answer must be one of the options (exact spelling).');
    } else if (q.type !== 'type') p('"type" must be choice or type.');
  });
  for (const l of LEVELS) {
    const n = questions.filter((q) => q.level === l).length;
    if (n < 6) problems.push({ file, where: l, message: `The placement test needs at least 6 questions per level (${l} has ${n}).` });
  }
  return problems;
}

export function formatProblems(problems: Problem[]): string {
  return problems.map((p) => `✗ ${p.file} › ${p.where}: ${p.message}`).join('\n');
}
