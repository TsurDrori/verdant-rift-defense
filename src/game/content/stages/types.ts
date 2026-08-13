import type { EnemyId, HeroId, WaveDefinition, WaveGroup } from '../types';
import type { BattleMapDefinition } from '../maps/types';

export type StageObjective =
  | { type: 'protect-gate' }
  | { type: 'survive-waves'; count: number };

export type StageModifierId = 'alternating-approaches';

export interface DifficultyEconomy {
  startingGold: number;
  startingLives: number;
  enemyHp: number;
  enemySpeed: number;
}

export interface EconomyDefinition {
  difficulties: Readonly<Record<'wanderer' | 'warden' | 'mythic', DifficultyEconomy>>;
  earlyCall: { goldPerSecond: number; maximumBonus: number; heroCooldownRefund: number };
  intermissions: readonly { throughWave: number; seconds: number }[];
}

export interface StageAssetImage {
  key: string;
  path: string;
}

export interface RunDefinition {
  stageId: string;
  map: BattleMapDefinition;
  waves: readonly WaveDefinition[];
  tacticalPressure: Readonly<Partial<Record<number, readonly WaveGroup[]>>>;
  economy: EconomyDefinition;
  objectives: readonly StageObjective[];
  modifiers: readonly StageModifierId[];
  assets: { images: readonly StageAssetImage[] };
  heroSpawns: Readonly<Record<HeroId, { routeId: string; progress: number }>>;
}

export interface CampaignStageDefinition {
  id: string;
  chapter: number;
  order: number;
  name: string;
  mission: string;
  description: string;
  objective: string;
  threat: string;
  reward: number;
  waves: number;
  enemies: readonly string[];
  mapPosition: Readonly<{ x: number; y: number }>;
  playable: boolean;
  unlockAfter?: string;
}

export interface StageCatalogEntry extends CampaignStageDefinition {
  run?: RunDefinition;
}

export interface StageSourceFile {
  schemaVersion: 1;
  campaign: CampaignStageDefinition;
  run?: {
    economy: EconomyDefinition;
    objectives: readonly StageObjective[];
    modifiers: readonly StageModifierId[];
    heroSpawns: Readonly<Record<HeroId, { routeId: string; progress: number }>>;
  };
}

export const KNOWN_ENEMY_IDS = ['skitter', 'marauder', 'wisp', 'brute', 'bloomlord'] as const satisfies readonly EnemyId[];
