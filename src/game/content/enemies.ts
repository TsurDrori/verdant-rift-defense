import type { EnemyDefinition, EnemyId } from './types';

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  skitter: { id: 'skitter', name: 'Rift Skitter', role: 'Fast swarm', hp: 52, speed: 70, bounty: 8, armor: 0, resistance: 0, leak: 1, color: 0x5f364c, accent: 0xffcf6b, radius: 11, attackDamage: 10, attackRate: 0.78, blockable: true },
  marauder: { id: 'marauder', name: 'Thorn Marauder', role: 'Armored infantry', hp: 152, speed: 43, bounty: 13, armor: 0.42, resistance: 0, leak: 1, color: 0x73523b, accent: 0xd4c18c, radius: 14, attackDamage: 22, attackRate: 0.95, blockable: true },
  wisp: { id: 'wisp', name: 'Gloam Wisp', role: 'Flying & warded', hp: 94, speed: 61, bounty: 14, armor: 0, resistance: 0.48, leak: 1, color: 0x754ab3, accent: 0x8ff7ed, radius: 12, attackDamage: 10, attackRate: 0.95, blockable: false, flying: true },
  brute: { id: 'brute', name: 'Mossback Brute', role: 'Slow juggernaut', hp: 570, speed: 28, bounty: 32, armor: 0.58, resistance: 0.08, leak: 3, color: 0x2d5948, accent: 0xe9a84e, radius: 21, attackDamage: 48, attackRate: 1.18, blockable: true },
  bloomlord: { id: 'bloomlord', name: 'The Hollow Bloom', role: 'Rift sovereign', hp: 3900, speed: 20, bounty: 250, armor: 0.3, resistance: 0.28, leak: 20, color: 0x41264d, accent: 0xff5f8f, radius: 34, attackDamage: 70, attackRate: 1.45, blockable: false },
};
