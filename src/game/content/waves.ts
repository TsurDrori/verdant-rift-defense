import type { WaveDefinition } from './types';

export const WAVES: readonly WaveDefinition[] = [
  { label: 'First Rustle', intel: 'Light skitter packs. Establish overlapping fire.', groups: [
    { enemy: 'skitter', count: 9, interval: 0.82, delay: 0 },
  ] },
  { label: 'Bark & Blade', intel: 'Armored marauders resist arrows. Arcane damage is efficient.', groups: [
    { enemy: 'skitter', count: 8, interval: 0.62, delay: 0 },
    { enemy: 'marauder', count: 5, interval: 1.35, delay: 2.4 },
  ] },
  { label: 'Over the Canopy', intel: 'Gloam Wisps fly beyond ground-only towers and resist magic.', groups: [
    { enemy: 'wisp', count: 6, interval: 0.9, delay: 0 },
    { enemy: 'skitter', count: 10, interval: 0.55, delay: 3.2 },
  ] },
  { label: 'Heavy Footfall', intel: 'Mossbacks are heavily armored. Stall them inside blast zones.', groups: [
    { enemy: 'marauder', count: 6, interval: 0.9, delay: 0 },
    { enemy: 'brute', count: 1, interval: 2.4, delay: 3.5 },
  ] },
  { label: 'Twilight Pincer', intel: 'Mixed ranks create conflicting target priorities.', groups: [
    { enemy: 'skitter', count: 16, interval: 0.42, delay: 0 },
    { enemy: 'wisp', count: 9, interval: 0.72, delay: 2.6 },
    { enemy: 'marauder', count: 7, interval: 1.0, delay: 4.2 },
  ] },
  { label: 'Rootbreakers', intel: 'A disciplined armored column. Upgrade before expanding.', groups: [
    { enemy: 'brute', count: 3, interval: 1.9, delay: 0 },
    { enemy: 'marauder', count: 8, interval: 0.68, delay: 1.1 },
    { enemy: 'skitter', count: 10, interval: 0.35, delay: 2.2 },
  ] },
  { label: 'Violet Rain', intel: 'A broad aerial assault tests your physical coverage.', groups: [
    { enemy: 'wisp', count: 12, interval: 0.55, delay: 0 },
    { enemy: 'skitter', count: 12, interval: 0.45, delay: 3.4 },
  ] },
  { label: 'Splinterhost', intel: 'Dense swarms screen durable brutes. Area damage is decisive.', groups: [
    { enemy: 'skitter', count: 28, interval: 0.27, delay: 0 },
    { enemy: 'brute', count: 5, interval: 1.7, delay: 1.2 },
  ] },
  { label: 'The Long Gloam', intel: 'Sustained mixed pressure. Save hero ultimates for the overlap.', groups: [
    { enemy: 'marauder', count: 14, interval: 0.6, delay: 0 },
    { enemy: 'wisp', count: 15, interval: 0.54, delay: 2 },
    { enemy: 'brute', count: 6, interval: 1.55, delay: 4 },
  ] },
  { label: 'Rift Tremor', intel: 'Veterans march beneath a warded sky.', groups: [
    { enemy: 'brute', count: 6, interval: 1.45, delay: 0 },
    { enemy: 'wisp', count: 14, interval: 0.48, delay: 1.5 },
    { enemy: 'marauder', count: 12, interval: 0.58, delay: 3.2 },
  ] },
  { label: 'Last Green Dawn', intel: 'All enemy types commit. Refit weak sectors by selling at 70%.', groups: [
    { enemy: 'skitter', count: 20, interval: 0.27, delay: 0 },
    { enemy: 'marauder', count: 12, interval: 0.55, delay: 1.4 },
    { enemy: 'wisp', count: 12, interval: 0.48, delay: 3 },
    { enemy: 'brute', count: 4, interval: 1.4, delay: 4.6 },
  ] },
  { label: 'The Hollow Bloom', intel: 'The sovereign advances with a final escort. Break the bloom.', groups: [
    { enemy: 'bloomlord', count: 1, interval: 0, delay: 0 },
    { enemy: 'marauder', count: 14, interval: 0.62, delay: 2 },
    { enemy: 'wisp', count: 16, interval: 0.46, delay: 4 },
    { enemy: 'brute', count: 6, interval: 1.4, delay: 7 },
  ] },
] as const;

/**
 * Extra composition pressure for the two tactical difficulties. These groups
 * attack coverage and target-priority gaps instead of hiding difficulty in a
 * blanket HP multiplier. Wanderer intentionally keeps the teaching script.
 */
export const TACTICAL_PRESSURE_GROUPS: Readonly<Partial<Record<number, readonly WaveDefinition['groups'][number][]>>> = {
  8: [
    { enemy: 'marauder', count: 8, interval: 0.58, delay: 2.5 },
  ],
  9: [
    { enemy: 'skitter', count: 12, interval: 0.3, delay: 5.6 },
  ],
  10: [
    { enemy: 'skitter', count: 8, interval: 0.28, delay: 4.8 },
    { enemy: 'wisp', count: 5, interval: 0.48, delay: 5.4 },
  ],
  11: [
    { enemy: 'brute', count: 3, interval: 1.12, delay: 3.1 },
    { enemy: 'wisp', count: 8, interval: 0.43, delay: 5.7 },
  ],
  12: [
    { enemy: 'skitter', count: 10, interval: 0.24, delay: 1.1 },
    { enemy: 'marauder', count: 4, interval: 0.52, delay: 5.2 },
  ],
} as const;
