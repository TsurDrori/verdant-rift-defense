/** Authoritative lane and allied recovery rules, kept data-driven for tests. */
export const COMBAT_BALANCE = {
  lanes: {
    /** Normal marching bands stay close enough for centerline blockers. */
    spawnOffsets: [-18, 18] as const,
    /** Reserved melee targets converge here, preserving the positive flow band. */
    combatOffset: -18,
    /** Outer offsets are temporary passing bands, never blocker targets. */
    offsets: [-36, -18, 18, 36] as const,
    halfWidth: 36,
    lateralSpeed: 48,
    footprintPadding: 11,
  },
  recovery: {
    defender: { delay: 3, maxHpPerSecond: 0.04 },
    hero: { delay: 4, maxHpPerSecond: 0.07 },
  },
  blockCapacity: 1,
} as const;
