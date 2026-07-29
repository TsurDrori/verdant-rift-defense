export type DamageType = 'physical' | 'arcane' | 'true';
export type TowerId = 'thorn' | 'ember' | 'aegis' | 'astral';
export type TowerBranch = 'left' | 'right';
export type EnemyId = 'skitter' | 'marauder' | 'wisp' | 'brute' | 'bloomlord';
export type HeroId = 'kael' | 'lyra';

export interface TowerDefinition {
  id: TowerId;
  name: string;
  role: string;
  description: string;
  color: number;
  accent: number;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  damageType: DamageType;
  splash: number;
  defenders?: {
    counts: { rank1: number; rank2: number; rank3: number; left: number; right: number };
    respawn: number;
    leash: number;
  };
  upgrades: readonly { cost: number; damage: number; range: number; fireRate: number }[];
  branches: Record<TowerBranch, {
    name: string;
    description: string;
    cost: number;
    color: number;
    damageMultiplier: number;
    rangeMultiplier: number;
    fireRateMultiplier: number;
  }>;
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  role: string;
  hp: number;
  speed: number;
  bounty: number;
  armor: number;
  resistance: number;
  leak: number;
  color: number;
  accent: number;
  radius: number;
  attackDamage: number;
  attackRate: number;
  blockable: boolean;
  flying?: boolean;
}

export interface WaveGroup {
  enemy: EnemyId;
  count: number;
  interval: number;
  delay: number;
}

export interface WaveDefinition {
  label: string;
  intel: string;
  groups: readonly WaveGroup[];
}
