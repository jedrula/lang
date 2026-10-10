import type { Item, Unit } from './types';
import { LEVELS } from './types';
import placement from './placement';

const modules = import.meta.glob<{ default: Unit }>('./units/[ab][12]-*.ts', { eager: true });

export const units: Unit[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id.localeCompare(b.id));

export const items: Item[] = units.flatMap((u) => u.items);
export const itemById = new Map(items.map((i) => [i.id, i]));
export const unitOfItem = new Map(units.flatMap((u) => u.items.map((i) => [i.id, u] as const)));

export { placement };
