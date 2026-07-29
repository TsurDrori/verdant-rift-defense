import type { EnemyId, HeroId, TowerId } from '../../game/content/types';

export interface LocomotionProfile {
  /** Radians accumulated per world-space pixel travelled. */
  stride: number;
  bob: number;
  sway: number;
  stretch: number;
  idleBreath: number;
  idleSway: number;
  idlePeriod: number;
}

export interface CombatMotionProfile {
  anticipationFrame: number;
  impactFrame: number;
  recoveryFrame: number;
  windup: number;
  impact: number;
  recovery: number;
  pull: number;
  travel: number;
  lift: number;
  anticipationAngle: number;
  impactAngle: number;
  hitWeight: number;
}

export interface CharacterMotionProfile {
  locomotion: LocomotionProfile;
  combat: CombatMotionProfile;
}

export interface TowerMotionProfile {
  windup: number;
  impact: number;
  recovery: number;
  chargeScale: number;
  recoilX: number;
  recoilY: number;
  recoilAngle: number;
}

export type AnimationState = 'idle' | 'locomotion' | 'attack' | 'hit' | 'death' | 'respawn';

export const ANIMATION_PRIORITY: Readonly<Record<AnimationState, number>> = {
  idle: 0,
  locomotion: 1,
  respawn: 2,
  attack: 3,
  hit: 4,
  death: 5,
};

export function canInterruptAnimation(
  current: AnimationState,
  next: AnimationState,
  currentUntil: number,
  now: number,
): boolean {
  if (current === 'death') return next === 'respawn';
  if (next === 'death') return true;
  if (currentUntil <= now) return true;
  return ANIMATION_PRIORITY[next] >= ANIMATION_PRIORITY[current];
}

export const ENEMY_MOTION: Record<EnemyId, CharacterMotionProfile> = {
  skitter: {
    locomotion: { stride: 0.31, bob: 2.8, sway: 3.6, stretch: 0.055, idleBreath: 0.018, idleSway: 1.8, idlePeriod: 910 },
    combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 72, impact: 74, recovery: 142, pull: 4, travel: 13, lift: 4, anticipationAngle: 5, impactAngle: 9, hitWeight: 4.5 },
  },
  marauder: {
    locomotion: { stride: 0.22, bob: 2.2, sway: 2.2, stretch: 0.035, idleBreath: 0.014, idleSway: 0.9, idlePeriod: 1480 },
    combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 128, impact: 86, recovery: 188, pull: 6, travel: 11, lift: 1, anticipationAngle: 5, impactAngle: 7, hitWeight: 5.5 },
  },
  wisp: {
    locomotion: { stride: 0.17, bob: 3.8, sway: 4.6, stretch: 0.045, idleBreath: 0.055, idleSway: 2.8, idlePeriod: 1220 },
    combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 210, impact: 96, recovery: 228, pull: 2, travel: 3, lift: 5, anticipationAngle: 2, impactAngle: 4, hitWeight: 3.8 },
  },
  brute: {
    locomotion: { stride: 0.13, bob: 3.4, sway: 1.7, stretch: 0.045, idleBreath: 0.019, idleSway: 0.45, idlePeriod: 1940 },
    combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 260, impact: 98, recovery: 285, pull: 7, travel: 9, lift: 7, anticipationAngle: 4, impactAngle: 8, hitWeight: 8.5 },
  },
  bloomlord: {
    locomotion: { stride: 0.075, bob: 2.1, sway: 1.1, stretch: 0.026, idleBreath: 0.028, idleSway: 0.7, idlePeriod: 2480 },
    combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 370, impact: 150, recovery: 390, pull: 3, travel: 5, lift: 10, anticipationAngle: 2, impactAngle: 4, hitWeight: 11 },
  },
};

export const HERO_MOTION: Record<HeroId, CharacterMotionProfile> = {
  kael: {
    locomotion: { stride: 0.18, bob: 2.7, sway: 1.5, stretch: 0.032, idleBreath: 0.013, idleSway: 0.55, idlePeriod: 1680 },
    combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 165, impact: 82, recovery: 215, pull: 7, travel: 12, lift: 2, anticipationAngle: 3.5, impactAngle: 7, hitWeight: 6.5 },
  },
  lyra: {
    locomotion: { stride: 0.21, bob: 2.4, sway: 2.4, stretch: 0.026, idleBreath: 0.02, idleSway: 1.25, idlePeriod: 1460 },
    combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 235, impact: 112, recovery: 245, pull: 5, travel: 6, lift: 5, anticipationAngle: 5, impactAngle: 4, hitWeight: 5 },
  },
};

export const DEFENDER_MOTION: CharacterMotionProfile = {
  locomotion: { stride: 0.2, bob: 2.2, sway: 1.4, stretch: 0.03, idleBreath: 0.014, idleSway: 0.65, idlePeriod: 1320 },
  combat: { anticipationFrame: 4, impactFrame: 5, recoveryFrame: 6, windup: 145, impact: 82, recovery: 190, pull: 6, travel: 11, lift: 1, anticipationAngle: 4, impactAngle: 6, hitWeight: 5.5 },
};

export const TOWER_MOTION: Record<TowerId, TowerMotionProfile> = {
  thorn: { windup: 132, impact: 66, recovery: 210, chargeScale: 1.16, recoilX: -3.8, recoilY: 1, recoilAngle: -1.4 },
  ember: { windup: 220, impact: 82, recovery: 270, chargeScale: 1.34, recoilX: 0, recoilY: 3.5, recoilAngle: 0.7 },
  aegis: { windup: 175, impact: 78, recovery: 240, chargeScale: 1.22, recoilX: -2.2, recoilY: 1.5, recoilAngle: -0.7 },
  astral: { windup: 265, impact: 96, recovery: 310, chargeScale: 1.38, recoilX: 2.4, recoilY: -2.5, recoilAngle: 1.8 },
};

export function phaseFrame(phase: number): 2 | 3 {
  return Math.sin(phase) >= 0 ? 2 : 3;
}

/** Stable pseudo-random 0..1 value used only to offset presentation cycles. */
export function presentationSeed(identity: number | string): number {
  const text = String(identity);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}
