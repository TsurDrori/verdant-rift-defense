import type { EnemyId, HeroActiveSpellId, HeroArtifactId, HeroId, HeroMilestoneId, HeroSpellId } from './types';

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

export const HERO_MILESTONES: Readonly<Record<HeroId, Partial<Record<number, HeroMilestoneId>>>> = {
  kael: { 2: 'riftbrand', 4: 'warden-pulse', 6: 'living-bulwark' },
  lyra: { 2: 'astral-echo', 4: 'falling-constellation', 6: 'starseed' },
};

export const HERO_MILESTONE_NAMES: Readonly<Record<HeroMilestoneId, string>> = {
  riftbrand: 'Riftbrand',
  'warden-pulse': "Warden's Pulse",
  'living-bulwark': 'Living Bulwark',
  'astral-echo': 'Astral Echo',
  'falling-constellation': 'Falling Constellation',
  starseed: 'Starseed',
};

export interface HeroSpellSpec {
  id: HeroSpellId;
  hero: HeroId;
  name: string;
  description: string;
  kind: 'active' | 'passive';
  targeting: 'point' | 'self' | 'passive';
  unlockLevel: number;
  cooldown: number;
  castRange: number;
  effectRadius: number;
  damage: number;
  maxTargets: number;
}

/**
 * The compact spell book deliberately uses two actives and two passives per
 * hero. It borrows the readability of RTS heroes without importing a full RPG
 * action bar into tower-defense pacing.
 */
export const HERO_SPELLS: Readonly<Record<HeroSpellId, HeroSpellSpec>> = {
  'rift-quake': {
    id: 'rift-quake', hero: 'kael', name: 'Rift Quake', kind: 'active', targeting: 'point', unlockLevel: 1,
    description: 'Shatters a ground zone with true damage and a severe slow.',
    cooldown: 26, castRange: 138, effectRadius: 138, damage: 135, maxTargets: Number.POSITIVE_INFINITY,
  },
  riftbrand: {
    id: 'riftbrand', hero: 'kael', name: 'Riftbrand', kind: 'passive', targeting: 'passive', unlockLevel: 2,
    description: 'Every fourth strike tears armor with bonus true damage and a stronger slow.',
    cooldown: 0, castRange: 0, effectRadius: 0, damage: 20, maxTargets: 1,
  },
  'warden-pulse': {
    id: 'warden-pulse', hero: 'kael', name: "Warden's Pulse", kind: 'active', targeting: 'self', unlockLevel: 4,
    description: 'Restores nearby ground allies and exposes nearby ground enemies.',
    cooldown: 19, castRange: 0, effectRadius: 118, damage: 0, maxTargets: Number.POSITIVE_INFINITY,
  },
  'living-bulwark': {
    id: 'living-bulwark', hero: 'kael', name: 'Living Bulwark', kind: 'passive', targeting: 'passive', unlockLevel: 6,
    description: 'Personal kills restore health and accelerate both active spells.',
    cooldown: 0, castRange: 0, effectRadius: 0, damage: 0, maxTargets: 0,
  },
  starfall: {
    id: 'starfall', hero: 'lyra', name: 'Starfall', kind: 'active', targeting: 'point', unlockLevel: 1,
    description: 'Calls a bounded arcane bombardment that can strike ground and air.',
    cooldown: 31, castRange: 160, effectRadius: 160, damage: 145, maxTargets: 8,
  },
  'astral-echo': {
    id: 'astral-echo', hero: 'lyra', name: 'Astral Echo', kind: 'passive', targeting: 'passive', unlockLevel: 2,
    description: 'Every third basic strike echoes into a second nearby foe.',
    cooldown: 0, castRange: 0, effectRadius: 115, damage: 0, maxTargets: 1,
  },
  'falling-constellation': {
    id: 'falling-constellation', hero: 'lyra', name: 'Falling Constellation', kind: 'active', targeting: 'point', unlockLevel: 4,
    description: 'Brands up to three priority enemies, dealing damage and amplifying follow-up attacks.',
    cooldown: 18, castRange: 188, effectRadius: 112, damage: 72, maxTargets: 3,
  },
  starseed: {
    id: 'starseed', hero: 'lyra', name: 'Starseed', kind: 'passive', targeting: 'passive', unlockLevel: 6,
    description: 'Personal kills prime an empowered shot and accelerate both active spells.',
    cooldown: 0, castRange: 0, effectRadius: 0, damage: 0, maxTargets: 0,
  },
};

export const HERO_PRIMARY_SPELL: Readonly<Record<HeroId, HeroActiveSpellId>> = {
  kael: 'rift-quake',
  lyra: 'starfall',
};

export function heroSpellSpec(id: HeroSpellId): HeroSpellSpec {
  return HERO_SPELLS[id];
}

export function isHeroActiveSpell(id: HeroSpellId): id is HeroActiveSpellId {
  return HERO_SPELLS[id].kind === 'active';
}

export function heroSpellsForHero(hero: HeroId): readonly HeroSpellSpec[] {
  return Object.values(HERO_SPELLS).filter((spell) => spell.hero === hero);
}

export function heroUnlockedSpells(hero: HeroId, level: number): HeroSpellId[] {
  return heroSpellsForHero(hero).filter((spell) => spell.unlockLevel <= level).map((spell) => spell.id);
}

export interface HeroArtifactSpec {
  id: HeroArtifactId;
  hero: HeroId;
  name: string;
  upside: string;
  tradeoff: string;
  modifiers: {
    maxHp?: number;
    damage?: number;
    armor?: number;
    range?: number;
    speed?: number;
    spellDamage?: number;
    spellCooldown?: number;
    echoDamage?: number;
  };
}

/** One mutually exclusive artifact per hero; no drops, rarity or grind. */
export const HERO_ARTIFACTS: Readonly<Record<HeroArtifactId, HeroArtifactSpec>> = {
  'bastion-seal': { id: 'bastion-seal', hero: 'kael', name: 'Bastion Seal', upside: '+14% maximum health.', tradeoff: '-9% basic damage.', modifiers: { maxHp: 1.14, damage: 0.91 } },
  'riftglass-edge': { id: 'riftglass-edge', hero: 'kael', name: 'Riftglass Edge', upside: '+16% basic damage.', tradeoff: '-8 percentage points armor.', modifiers: { damage: 1.16, armor: -0.08 } },
  'oathstone-standard': { id: 'oathstone-standard', hero: 'kael', name: 'Oathstone Standard', upside: 'Active spells recover 18% faster.', tradeoff: '-8% movement speed.', modifiers: { spellCooldown: 0.82, speed: 0.92 } },
  'far-star-lens': { id: 'far-star-lens', hero: 'lyra', name: 'Far-Star Lens', upside: '+16% basic and spell range.', tradeoff: '-10% maximum health.', modifiers: { range: 1.16, maxHp: 0.9 } },
  'comet-prism': { id: 'comet-prism', hero: 'lyra', name: 'Comet Prism', upside: '+20% active spell damage.', tradeoff: 'Active cooldowns are 12% longer.', modifiers: { spellDamage: 1.2, spellCooldown: 1.12 } },
  'echo-charm': { id: 'echo-charm', hero: 'lyra', name: 'Echo Charm', upside: 'Astral Echo deals 72% strike damage.', tradeoff: '-9% basic damage.', modifiers: { echoDamage: 0.72, damage: 0.91 } },
};

export function heroArtifactsForHero(hero: HeroId): readonly HeroArtifactSpec[] {
  return Object.values(HERO_ARTIFACTS).filter((artifact) => artifact.hero === hero);
}

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
    const base = HERO_SPELLS['rift-quake'];
    const radius = empowered ? 152 : base.effectRadius;
    return { castRange: radius, effectRadius: radius, damage: empowered ? 178 : base.damage, maxTargets: base.maxTargets };
  }
  const base = HERO_SPELLS.starfall;
  const radius = empowered ? 176 : base.effectRadius;
  return { castRange: radius, effectRadius: radius, damage: empowered ? 178 : base.damage, maxTargets: empowered ? 10 : base.maxTargets };
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
