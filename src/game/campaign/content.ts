import type { HeroId } from '../content/types';
import { HERO_MILESTONE_NAMES, HERO_PRIMARY_SPELL, heroSpellSpec } from '../content/heroProgression';

export type CampaignStageId = 'sunken-way' | 'rootbound-crossing' | 'glasswood' | 'cinder-grove' | 'hollow-crown';
export type MenuHeroId = HeroId | 'seren' | 'orrik';
export type InsightUpgradeId = 'treasury' | 'command' | 'gate';

export interface CampaignStageDefinition {
  id: CampaignStageId;
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
  unlockAfter?: CampaignStageId;
}

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

export const CAMPAIGN_STAGES: readonly CampaignStageDefinition[] = [
  {
    id: 'sunken-way', chapter: 1, order: 1, name: 'The Sunken Way', mission: 'Hold the Verdant Rift',
    description: 'The Hollow Bloom has poisoned the old crossing. Bind rival covenants to the stone circles and keep the golden gate alive.',
    objective: 'Defend the gate through 12 escalating waves', threat: 'Balanced assault', reward: 3, waves: 12,
    enemies: ['Marauders', 'Wisps', 'Brutes'], mapPosition: { x: 17, y: 70 }, playable: true,
  },
  {
    id: 'rootbound-crossing', chapter: 1, order: 2, name: 'Rootbound Crossing', mission: 'Break the Briar Host',
    description: 'Two roads knot around an ancient wardstone. Fast skirmishers punish defenses that commit to only one lane.',
    objective: 'Hold both crossings', threat: 'Split lanes', reward: 3, waves: 13,
    enemies: ['Skitter packs', 'Briar guards'], mapPosition: { x: 35, y: 53 }, playable: false, unlockAfter: 'sunken-way',
  },
  {
    id: 'glasswood', chapter: 1, order: 3, name: 'The Glasswood', mission: 'Silence the Sky Choir',
    description: 'Crystal canopies conceal a flight path above the road. Mixed damage and mobile champions will be essential.',
    objective: 'Counter an airborne incursion', threat: 'Heavy air', reward: 4, waves: 14,
    enemies: ['Wisp swarms', 'Crystal heralds'], mapPosition: { x: 53, y: 68 }, playable: false, unlockAfter: 'rootbound-crossing',
  },
  {
    id: 'cinder-grove', chapter: 1, order: 4, name: 'Cinder Grove', mission: 'Quench the Ember March',
    description: 'Armored warbands advance beneath a rain of ash. The route rewards armor breaking and deliberate stalling.',
    objective: 'Shatter the armored vanguard', threat: 'Heavy armor', reward: 4, waves: 15,
    enemies: ['Brutes', 'Cinder knights'], mapPosition: { x: 70, y: 45 }, playable: false, unlockAfter: 'glasswood',
  },
  {
    id: 'hollow-crown', chapter: 1, order: 5, name: 'The Hollow Crown', mission: 'Sever the Bloom',
    description: 'At the forest heart, the sovereign wakes. Every covenant and champion will be tested in the final siege.',
    objective: 'Defeat the chapter sovereign', threat: 'Boss siege', reward: 6, waves: 16,
    enemies: ['Elite host', 'The Hollow Bloom'], mapPosition: { x: 86, y: 25 }, playable: false, unlockAfter: 'cinder-grove',
  },
] as const;

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
