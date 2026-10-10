import { parse } from 'yaml';
import type { Item, PlacementQuestion, Unit } from './types';
import { LEVELS } from './types';
import { formatProblems, validatePlacement, validateUnits } from './validate';

/** Course content lives in /content/courses/<from>-<to>/ as YAML so anyone can edit it on GitHub. */
export const COURSE_DIR = 'content/courses/pl-en';

const unitFiles = import.meta.glob<string>('/content/courses/pl-en/units/*.yaml', { query: '?raw', import: 'default', eager: true });
const placementFile = import.meta.glob<string>('/content/courses/pl-en/placement.yaml', { query: '?raw', import: 'default', eager: true });

const parsed = Object.entries(unitFiles).map(([path, raw]) => ({ file: path.slice(1), unit: parse(raw) as Unit }));
const placementParsed = Object.entries(placementFile).map(([path, raw]) => ({ file: path.slice(1), questions: (parse(raw) as { questions: PlacementQuestion[] }).questions }))[0];

if (import.meta.env.DEV) {
  const problems = [...validateUnits(parsed), ...validatePlacement(placementParsed.file, placementParsed.questions)];
  if (problems.length) console.warn(`Content problems:\n${formatProblems(problems)}`);
}

export const units: Unit[] = parsed
  .map((p) => p.unit)
  .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id.localeCompare(b.id));

/** Repo path of the file each unit came from (used by "Report a problem"). */
export const unitFile = new Map(parsed.map((p) => [p.unit.id, p.file]));

export const items: Item[] = units.flatMap((u) => u.items);
export const itemById = new Map(items.map((i) => [i.id, i]));
export const unitOfItem = new Map(units.flatMap((u) => u.items.map((i) => [i.id, u] as const)));

export const placement: PlacementQuestion[] = placementParsed.questions;
export const placementFilePath = placementParsed.file;
