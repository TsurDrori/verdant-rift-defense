import type { EnemyId, HeroId } from './types';
import type { HeroMilestone } from '../simulation/state';

/**
 * Run-scoped cumulative mastery thresholds. The back half is deliberately
 * convex: levels 2–3 establish a hero's kit, while levels 5–6 require the
 * player to keep engineering last hits instead of arriving passively.
 */
export const HERO_LEVEL_THRESHOLDS = [0, 40, 220, 500, 850, 1700] as const;

export const HERO_XP_BY_ENEMY: Readonly<Record<EnemyId, number>> = {
  skitter: 4,
  marauder: 10,
  wisp: 12,
  brute: 45,
  bloomlord: 120,
};

export const HERO_MILESTONES: Readonly<Record<HeroId, Partial<Record<number, HeroMilestone>>>> = {
  kael: { 2: 'riftbrand', 4: 'warden-pulse', 6: 'living-bulwark' },
  lyra: { 2: 'astral-echo', 4: 'falling-constellation', 6: 'starseed' },
};

export const HERO_MILESTONE_NAMES: Readonly<Record<HeroMilestone, string>> = {
  riftbrand: 'Riftbrand',
  'warden-pulse': "Warden's Pulse",
  'living-bulwark': 'Living Bulwark',
  'astral-echo': 'Astral Echo',
  'falling-constellation': 'Falling Constellation',
  starseed: 'Starseed',
};

export interface HeroAbilitySpec {
  castRange: number;
  effectRadius: number;
  damage: number;
  maxTargets: number;
}

/** Shared by simulation validation and the targeting ring. */
export function heroAbilitySpec(id: HeroId, level: number): HeroAbilitySpec {
  const empowered = level >= 4;
  if (id === 'kael') {
    const radius = empowered ? 152 : 138;
    return { castRange: radius, effectRadius: radius, damage: empowered ? 178 : 135, maxTargets: Number.POSITIVE_INFINITY };
  }
  const radius = empowered ? 176 : 160;
  return { castRange: radius, effectRadius: radius, damage: empowered ? 178 : 145, maxTargets: empowered ? 10 : 8 };
}

export function heroLevelForXp(xp: number): number {
  let level = 1;
  while (level < HERO_LEVEL_THRESHOLDS.length && xp >= HERO_LEVEL_THRESHOLDS[level]!) level += 1;
  return level;
}

export function heroXpProgress(level: number, xp: number): { floor: number; next: number; current: number; required: number; ratio: number } {
  const boundedLevel = Math.max(1, Math.min(HERO_LEVEL_THRESHOLDS.length, Math.floor(level)));
  const floor = HERO_LEVEL_THRESHOLDS[boundedLevel - 1]!;
  const next = HERO_LEVEL_THRESHOLDS[Math.min(boundedLevel, HERO_LEVEL_THRESHOLDS.length - 1)]!;
  const required = Math.max(0, next - floor);
  const current = Math.max(0, Math.min(required, xp - floor));
  return { floor, next, current, required, ratio: required === 0 ? 1 : current / required };
}
