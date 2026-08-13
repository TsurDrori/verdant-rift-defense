import type { HeroId } from '../content/types';
import { HERO_MILESTONE_NAMES, HERO_PRIMARY_SPELL, heroSpellSpec } from '../content/heroProgression';
import { STAGE_CATALOG, type GeneratedStageId } from '../content/generated/stages';
import type { CampaignStageDefinition as BaseCampaignStageDefinition } from '../content/stages/types';

export type CampaignStageId = GeneratedStageId;
export type MenuHeroId = HeroId | 'seren' | 'orrik';
export type InsightUpgradeId = 'treasury' | 'command' | 'gate';
export type CampaignStageDefinition = Omit<BaseCampaignStageDefinition, 'id' | 'unlockAfter'> & {
  id: CampaignStageId;
  unlockAfter?: CampaignStageId;
};

export interface MenuHeroDefinition {
  id: MenuHeroId;
  name: string;
  epithet: string;
  role: string;
  summary: string;
  attack: number;
  defense: number;
  control: number;
  ability: string;
  abilityDescription: string;
  milestones: readonly string[];
  playable: boolean;
  unlockCopy: string;
}

export interface InsightUpgradeDefinition {
  id: InsightUpgradeId;
  glyph: string;
  name: string;
  discipline: string;
  effect: string;
}

export const CAMPAIGN_STAGES: readonly CampaignStageDefinition[] = STAGE_CATALOG;

export const MENU_HEROES: readonly MenuHeroDefinition[] = [
  {
    id: 'kael', name: 'Kael', epithet: 'Rift Warden', role: 'Vanguard / control',
    summary: 'A durable line-holder who pins ground threats and turns sustained melee into area control.',
    attack: 3, defense: 5, control: 4, ability: heroSpellSpec(HERO_PRIMARY_SPELL.kael).name,
    abilityDescription: heroSpellSpec(HERO_PRIMARY_SPELL.kael).description,
    milestones: [HERO_MILESTONE_NAMES.riftbrand, HERO_MILESTONE_NAMES['warden-pulse'], HERO_MILESTONE_NAMES['living-bulwark']], playable: true, unlockCopy: 'Alliance founder',
  },
  {
    id: 'lyra', name: 'Lyra', epithet: 'Astral Huntress', role: 'Ranged / air',
    summary: 'A mobile ranged striker who can contest flying enemies and snowball through precise last hits.',
    attack: 5, defense: 2, control: 3, ability: heroSpellSpec(HERO_PRIMARY_SPELL.lyra).name,
    abilityDescription: heroSpellSpec(HERO_PRIMARY_SPELL.lyra).description,
    milestones: [HERO_MILESTONE_NAMES['astral-echo'], HERO_MILESTONE_NAMES['falling-constellation'], HERO_MILESTONE_NAMES.starseed], playable: true, unlockCopy: 'Alliance founder',
  },
  {
    id: 'seren', name: 'Seren', epithet: 'Briar Oracle', role: 'Support / denial',
    summary: 'An expansion-ready support champion built around roots, healing, and route manipulation.',
    attack: 2, defense: 3, control: 5, ability: 'Not yet revealed', abilityDescription: 'Planned for a later campaign chapter.',
    milestones: ['Veiled', 'Veiled', 'Veiled'], playable: false, unlockCopy: 'Future chapter hero',
  },
  {
    id: 'orrik', name: 'Orrik', epithet: 'Cinder Oath', role: 'Bruiser / siege',
    summary: 'An expansion-ready bruiser designed to crack armor and pressure bosses at close range.',
    attack: 5, defense: 4, control: 2, ability: 'Not yet revealed', abilityDescription: 'Planned for a later campaign chapter.',
    milestones: ['Veiled', 'Veiled', 'Veiled'], playable: false, unlockCopy: 'Future chapter hero',
  },
] as const;

export const INSIGHT_UPGRADES: readonly InsightUpgradeDefinition[] = [
  { id: 'treasury', glyph: '◆', name: 'Sunseed Tithe', discipline: 'Stewardship', effect: '+25 starting sunshards' },
  { id: 'command', glyph: '✦', name: 'Twin Oath', discipline: 'Command', effect: 'Hero commands recharge 10% faster' },
  { id: 'gate', glyph: '⬟', name: 'Living Gate', discipline: 'Resilience', effect: '+2 starting gate integrity' },
] as const;

export const CODEX_TOPICS = [
  { id: 'battle', glyph: '⚔', name: 'Battle flow', copy: 'Build during the opening calm, call waves when ready, and preserve gate integrity. Calling a wave early grants bonus sunshards.' },
  { id: 'towers', glyph: '♜', name: 'Tower covenants', copy: 'Every tower has a distinct damage role. Raise a tower to rank III, then choose one of two final oaths that permanently changes its tactics.' },
  { id: 'heroes', glyph: '✦', name: 'Champion command', copy: 'Select a champion portrait, then click or tap a valid battlefield point. Champions gain run-specific XP only from enemies they personally defeat.' },
  { id: 'domains', glyph: '⌁', name: 'Ground and air', copy: 'Ground defenders cannot block or strike flying enemies. Lyra and anti-air towers must cover airborne routes while Kael holds the road.' },
  { id: 'controls', glyph: '⌘', name: 'Controls', copy: 'Q / E cycles foundations. Z / X selects champions. WASD moves the selected champion. 1 / 2 smart-casts. Space calls a wave. F changes speed. Esc pauses.' },
] as const;

export function stageById(id: CampaignStageId): CampaignStageDefinition {
  return CAMPAIGN_STAGES.find((stage) => stage.id === id) ?? CAMPAIGN_STAGES[0]!;
}

export function heroById(id: MenuHeroId): MenuHeroDefinition {
  return MENU_HEROES.find((hero) => hero.id === id) ?? MENU_HEROES[0]!;
}
