import type { HeroId } from '../content/types';
import type { DifficultyId } from '../simulation/state';
import { CAMPAIGN_STAGES, INSIGHT_UPGRADES, type CampaignStageId, type InsightUpgradeId } from './content';

export const CAMPAIGN_PROFILE_KEY = 'verdant-rift:campaign-profile';
export const CAMPAIGN_PROFILE_VERSION = 1 as const;

export interface StageResult {
  cleared: boolean;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  bestDifficulty: DifficultyId;
}

export interface CampaignProfile {
  version: typeof CAMPAIGN_PROFILE_VERSION;
  insightEarned: number;
  insightLoadout: InsightUpgradeId[];
  selectedStageId: CampaignStageId;
  selectedHeroes: HeroId[];
  stages: Partial<Record<CampaignStageId, StageResult>>;
}

export interface StageClearResult {
  firstClear: boolean;
  insightAwarded: number;
  stage: StageResult;
}

const difficulties: readonly DifficultyId[] = ['wanderer', 'warden', 'mythic'];
const stageIds = new Set(CAMPAIGN_STAGES.map((stage) => stage.id));
const upgradeIds = new Set(INSIGHT_UPGRADES.map((upgrade) => upgrade.id));

function defaultProfile(): CampaignProfile {
  return {
    version: CAMPAIGN_PROFILE_VERSION,
    insightEarned: 0,
    insightLoadout: [],
    selectedStageId: 'sunken-way',
    selectedHeroes: ['kael', 'lyra'],
    stages: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function finiteNonNegative(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function normalizeStageResult(value: unknown): StageResult | undefined {
  if (!isRecord(value) || value.cleared !== true) return undefined;
  const stars = Math.max(0, Math.min(3, Math.floor(finiteNonNegative(value.stars)))) as StageResult['stars'];
  const difficulty = difficulties.includes(value.bestDifficulty as DifficultyId) ? value.bestDifficulty as DifficultyId : 'warden';
  return { cleared: true, stars, bestScore: Math.floor(finiteNonNegative(value.bestScore)), bestDifficulty: difficulty };
}

export function normalizeCampaignProfile(value: unknown): CampaignProfile {
  const base = defaultProfile();
  if (!isRecord(value)) return base;
  const selectedStageId = stageIds.has(value.selectedStageId as CampaignStageId) ? value.selectedStageId as CampaignStageId : base.selectedStageId;
  const insightEarned = Math.floor(finiteNonNegative(value.insightEarned));
  const requestedLoadout = Array.isArray(value.insightLoadout)
    ? value.insightLoadout.filter((id): id is InsightUpgradeId => upgradeIds.has(id as InsightUpgradeId))
    : [];
  const insightLoadout = [...new Set(requestedLoadout)].slice(0, insightEarned);
  const requestedHeroes = Array.isArray(value.selectedHeroes)
    ? [...new Set(value.selectedHeroes.filter((id): id is HeroId => id === 'kael' || id === 'lyra'))].slice(0, 2)
    : [];
  const selectedHeroes = requestedHeroes.length > 0 ? requestedHeroes : base.selectedHeroes;
  const stages: CampaignProfile['stages'] = {};
  if (isRecord(value.stages)) {
    const storedStages = value.stages;
    CAMPAIGN_STAGES.forEach((stage) => {
      const result = normalizeStageResult(storedStages[stage.id]);
      if (result) stages[stage.id] = result;
    });
  }
  return { ...base, insightEarned, insightLoadout, selectedStageId, selectedHeroes, stages };
}

function migrateLegacy(storage: Storage): CampaignProfile {
  const profile = defaultProfile();
  const legacyInsight = Math.floor(finiteNonNegative(storage.getItem('verdant-rift:insight')));
  const firstClear = storage.getItem('verdant-rift:first-clear') === 'true';
  profile.insightEarned = legacyInsight;
  if (firstClear) {
    profile.stages['sunken-way'] = { cleared: true, stars: 0, bestScore: 0, bestDifficulty: 'warden' };
    profile.insightEarned = Math.max(3, profile.insightEarned);
  }
  try {
    const loadout = JSON.parse(storage.getItem('verdant-rift:insight-loadout') ?? '[]') as unknown;
    if (Array.isArray(loadout)) profile.insightLoadout = loadout.filter((id): id is InsightUpgradeId => upgradeIds.has(id as InsightUpgradeId)).slice(0, profile.insightEarned);
  } catch { /* A malformed legacy key should never prevent the game from booting. */ }
  return profile;
}

export class CampaignProfileStore extends EventTarget {
  private value: CampaignProfile;

  constructor(private readonly storage: Storage = localStorage) {
    super();
    let parsed: unknown;
    try { parsed = JSON.parse(storage.getItem(CAMPAIGN_PROFILE_KEY) ?? 'null'); }
    catch { parsed = null; }
    this.value = parsed ? normalizeCampaignProfile(parsed) : migrateLegacy(storage);
    this.persist();
  }

  snapshot(): Readonly<CampaignProfile> {
    return structuredClone(this.value);
  }

  selectStage(id: CampaignStageId): void {
    if (!stageIds.has(id) || this.value.selectedStageId === id) return;
    this.value.selectedStageId = id;
    this.commit();
  }

  toggleInsight(id: InsightUpgradeId): boolean {
    if (!upgradeIds.has(id)) return false;
    const active = this.value.insightLoadout.includes(id);
    if (active) this.value.insightLoadout = this.value.insightLoadout.filter((candidate) => candidate !== id);
    else {
      if (this.value.insightLoadout.length >= this.value.insightEarned) return false;
      this.value.insightLoadout = [...this.value.insightLoadout, id];
    }
    this.commit();
    return true;
  }

  resetInsight(): void {
    if (this.value.insightLoadout.length === 0) return;
    this.value.insightLoadout = [];
    this.commit();
  }

  recordStageClear(id: CampaignStageId, stars: 1 | 2 | 3, score: number, difficulty: DifficultyId): StageClearResult {
    const definition = CAMPAIGN_STAGES.find((stage) => stage.id === id);
    if (!definition) throw new Error(`Unknown campaign stage: ${id}`);
    const previous = this.value.stages[id];
    const firstClear = !previous?.cleared;
    const result: StageResult = {
      cleared: true,
      stars: Math.max(previous?.stars ?? 0, stars) as StageResult['stars'],
      bestScore: Math.max(previous?.bestScore ?? 0, Math.floor(finiteNonNegative(score))),
      bestDifficulty: previous && difficulties.indexOf(previous.bestDifficulty) > difficulties.indexOf(difficulty) ? previous.bestDifficulty : difficulty,
    };
    this.value.stages[id] = result;
    const insightAwarded = firstClear ? definition.reward : 0;
    this.value.insightEarned += insightAwarded;
    this.commit();
    return { firstClear, insightAwarded, stage: result };
  }

  private commit(): void {
    this.value = normalizeCampaignProfile(this.value);
    this.persist();
    this.dispatchEvent(new Event('change'));
  }

  private persist(): void {
    try { this.storage.setItem(CAMPAIGN_PROFILE_KEY, JSON.stringify(this.value)); }
    catch { /* Storage denial must degrade to a session-only profile, not block boot. */ }
  }
}
