/** `npm run validate` — checks every course's YAML content. Runs in CI on each pull request. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { PlacementQuestion, Unit } from '../src/content/types';
import { formatProblems, validatePlacement, validateUnits, type Problem } from '../src/content/validate';

const root = join(import.meta.dirname, '..');
const coursesDir = join(root, 'content/courses');
const problems: Problem[] = [];
let unitCount = 0;
let itemCount = 0;

function load<T>(rel: string): T | undefined {
  try {
    return parse(readFileSync(join(root, rel), 'utf8')) as T;
  } catch (e) {
    problems.push({ file: rel, where: 'file', message: `Not valid YAML: ${(e as Error).message.split('\n')[0]}` });
  }
}

for (const course of readdirSync(coursesDir)) {
  const dir = `content/courses/${course}`;
  const units = readdirSync(join(root, dir, 'units'))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => ({ file: `${dir}/units/${f}`, unit: load<Unit>(`${dir}/units/${f}`)! }))
    .filter((u) => u.unit);
  unitCount += units.length;
  itemCount += units.reduce((n, u) => n + (u.unit.items?.length ?? 0), 0);
  problems.push(...validateUnits(units));
  const placementPath = `${dir}/placement.yaml`;
  if (existsSync(join(root, placementPath))) {
    const p = load<{ questions: PlacementQuestion[] }>(placementPath);
    if (p) problems.push(...validatePlacement(placementPath, p.questions));
  }
}

if (problems.length) {
  console.error(formatProblems(problems));
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log(`✓ Content OK — ${unitCount} units, ${itemCount} items.`);
