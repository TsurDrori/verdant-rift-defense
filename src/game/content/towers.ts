import type { TowerDefinition, TowerId } from './types';

export const TOWERS: Record<TowerId, TowerDefinition> = {
  thorn: {
    id: 'thorn', name: 'Thornwatch', role: 'Rapid physical',
    description: 'Fast precision shots excel against scouts and flyers.',
    color: 0x2f6b43, accent: 0xb7dc69, cost: 85, range: 176, damage: 14,
    fireRate: 0.62, projectileSpeed: 490, damageType: 'physical', splash: 0,
    upgrades: [
      { cost: 70, damage: 22, range: 187, fireRate: 0.55 },
      { cost: 110, damage: 34, range: 200, fireRate: 0.49 },
    ],
    branches: {
      left: { name: 'Gale Talon', description: 'Every fourth arrow splits into a fan of piercing leaves.', cost: 170, color: 0x7bd8a0, damageMultiplier: 1.3, rangeMultiplier: 1.08, fireRateMultiplier: 0.76 },
      right: { name: 'Briar Oath', description: 'Deliberate shots mark priority enemies for the whole alliance.', cost: 170, color: 0xe6ca62, damageMultiplier: 1.5, rangeMultiplier: 1.15, fireRateMultiplier: 1.12 },
    },
  },
  ember: {
    id: 'ember', name: 'Ember Foundry', role: 'Area bombardment',
    description: 'Slow shells punish tightly packed armored ranks.',
    color: 0x91432b, accent: 0xffa24c, cost: 125, range: 158, damage: 34,
    fireRate: 1.42, projectileSpeed: 330, damageType: 'physical', splash: 54,
    upgrades: [
      { cost: 95, damage: 53, range: 168, fireRate: 1.32 },
      { cost: 145, damage: 82, range: 182, fireRate: 1.2 },
    ],
    branches: {
      left: { name: 'Sunforge', description: 'Shells leave a burning crucible that scorches the road.', cost: 195, color: 0xff7b3d, damageMultiplier: 1.42, rangeMultiplier: 1.05, fireRateMultiplier: 0.9 },
      right: { name: 'Glacier Core', description: 'Frost shells slow every target caught in the blast.', cost: 195, color: 0x7be7ef, damageMultiplier: 1.12, rangeMultiplier: 1.12, fireRateMultiplier: 0.88 },
    },
  },
  aegis: {
    id: 'aegis', name: 'Aegis Grove', role: 'Control & support',
    description: 'Warding bolts pin ground enemies and protect nearby firing lines.',
    color: 0x3c6874, accent: 0xbde5d8, cost: 105, range: 126, damage: 10,
    fireRate: 0.78, projectileSpeed: 390, damageType: 'physical', splash: 0,
    defenders: {
      counts: { rank1: 2, rank2: 3, rank3: 3, left: 5, right: 2 },
      respawn: 8,
      leash: 112,
    },
    upgrades: [
      { cost: 80, damage: 17, range: 136, fireRate: 0.7 },
      { cost: 120, damage: 27, range: 146, fireRate: 0.62 },
    ],
    branches: {
      left: { name: 'Verdant Guard', description: 'Deep roots entangle foes while nearby towers gain attack speed.', cost: 180, color: 0x60c879, damageMultiplier: 1.08, rangeMultiplier: 1.16, fireRateMultiplier: 0.88 },
      right: { name: 'Mirror Bastion', description: 'Retaliatory lances punish enemies already stalled by control.', cost: 180, color: 0xa4d7ff, damageMultiplier: 1.42, rangeMultiplier: 1.05, fireRateMultiplier: 0.94 },
    },
  },
  astral: {
    id: 'astral', name: 'Astral Spire', role: 'Armor piercing',
    description: 'Arcane bolts bypass armor but struggle against warded enemies.',
    color: 0x563d82, accent: 0xcf9eff, cost: 115, range: 170, damage: 28,
    fireRate: 1.06, projectileSpeed: 440, damageType: 'arcane', splash: 0,
    upgrades: [
      { cost: 90, damage: 43, range: 183, fireRate: 0.98 },
      { cost: 135, damage: 66, range: 196, fireRate: 0.9 },
    ],
    branches: {
      left: { name: 'Starweaver', description: 'Bolts chain between nearby foes with diminishing force.', cost: 190, color: 0xe1b8ff, damageMultiplier: 1.3, rangeMultiplier: 1.18, fireRateMultiplier: 0.86 },
      right: { name: 'Null Oracle', description: 'Heavy beams expose resistance and briefly suspend foes.', cost: 190, color: 0x58e7e0, damageMultiplier: 1.85, rangeMultiplier: 1.06, fireRateMultiplier: 1.08 },
    },
  },
};
