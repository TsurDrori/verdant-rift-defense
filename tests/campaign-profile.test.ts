import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PROFILE_KEY, CampaignProfileStore, normalizeCampaignProfile } from '../src/game/campaign/CampaignProfile';
import { CAMPAIGN_STAGES, INSIGHT_UPGRADES, MENU_HEROES } from '../src/game/campaign/content';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('campaign profile', () => {
  it('normalizes corrupt and over-budget progression data', () => {
    const profile = normalizeCampaignProfile({
      insightEarned: 1,
      insightLoadout: ['treasury', 'treasury', 'command', 'unknown'],
      selectedStageId: 'missing-stage',
      stages: { 'sunken-way': { cleared: true, stars: 99, bestScore: -50, bestDifficulty: 'impossible' } },
    });

    expect(profile.selectedStageId).toBe('sunken-way');
    expect(profile.insightLoadout).toEqual(['treasury']);
    expect(profile.stages['sunken-way']).toEqual({ cleared: true, stars: 3, bestScore: 0, bestDifficulty: 'warden' });
  });

  it('migrates the legacy first-clear keys once into the versioned profile', () => {
    const storage = new MemoryStorage();
    storage.setItem('verdant-rift:first-clear', 'true');
    storage.setItem('verdant-rift:insight', '3');
    storage.setItem('verdant-rift:insight-loadout', JSON.stringify(['gate', 'command']));

    const store = new CampaignProfileStore(storage);
    expect(store.snapshot()).toMatchObject({
      version: 1,
      insightEarned: 3,
      insightLoadout: ['gate', 'command'],
      stages: { 'sunken-way': { cleared: true } },
    });
    expect(JSON.parse(storage.getItem(CAMPAIGN_PROFILE_KEY)!)).toMatchObject({ version: 1, insightEarned: 3 });
  });

  it('awards first-clear insight once and preserves best stage results', () => {
    const store = new CampaignProfileStore(new MemoryStorage());
    const first = store.recordStageClear('sunken-way', 2, 1200, 'warden');
    const replay = store.recordStageClear('sunken-way', 1, 900, 'wanderer');
    const mythic = store.recordStageClear('sunken-way', 3, 1800, 'mythic');

    expect(first).toMatchObject({ firstClear: true, insightAwarded: 3 });
    expect(replay).toMatchObject({ firstClear: false, insightAwarded: 0 });
    expect(mythic).toMatchObject({ firstClear: false, insightAwarded: 0 });
    expect(store.snapshot()).toMatchObject({
      insightEarned: 3,
      stages: { 'sunken-way': { stars: 3, bestScore: 1800, bestDifficulty: 'mythic' } },
    });
  });

  it('keeps campaign content identifiers unique and all dependencies ordered', () => {
    expect(new Set(CAMPAIGN_STAGES.map((stage) => stage.id)).size).toBe(CAMPAIGN_STAGES.length);
    expect(new Set(MENU_HEROES.map((hero) => hero.id)).size).toBe(MENU_HEROES.length);
    expect(new Set(INSIGHT_UPGRADES.map((upgrade) => upgrade.id)).size).toBe(INSIGHT_UPGRADES.length);
    CAMPAIGN_STAGES.forEach((stage, index) => {
      if (!stage.unlockAfter) return;
      expect(CAMPAIGN_STAGES.findIndex((candidate) => candidate.id === stage.unlockAfter)).toBeLessThan(index);
    });
  });
});
