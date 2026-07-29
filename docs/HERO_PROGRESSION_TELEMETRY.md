# Hero progression balance telemetry

## Deterministic Warden scenario

- Runtime: authoritative 60 Hz simulation; no random stream.
- Difficulty: Warden; waves advance on the ordinary intermission timer.
- Fixed build order: Thornwatch pad 0, Ember Foundry pad 1, Astral Spire pad 2,
  Aegis Grove pad 4, Thornwatch pad 7, Ember Foundry pad 8 and Astral Spire pad
  10. The policy buys the next legal build, then rank upgrades and the fixed
  left/right branch plan as income permits.
- Every policy uses the same tower economy and wave schedule. Only hero movement
  and ultimate use differ.
- Executable gate: `tests/hero-balance.test.ts`.

Policies:

1. **Reserve:** no movement commands and no hero ultimates.
2. **Split:** every five seconds Kael guards the densest ground cluster and Lyra
   guards the densest air/overall cluster. A ready ultimate is used only when a
   valid cluster is already inside that hero's level-specific cast range.
3. **Kael carry:** every four seconds Kael receives ground commands and legal
   in-range Rootbreak uses while Lyra is assigned to the late reserve post. The
   tighter cadence represents the extra attention required to feed one carry.

## Before/after outcome

The historical v1 sample used the old passive acquisition and `440` XP cap.
Both passive heroes capped even though the unattended tower line took no damage:

| Revision / policy | Result | Gate | Kael | Lyra |
|---|---|---:|---|---|
| v1 reserve | victory | 20/20 | LV6, 51 kills, 440 XP | LV6, 24 kills, 440 XP |
| v1 intentional feeding | victory | 20/20 | LV6, 179 kills, 440 XP | LV6, 79 kills, 440 XP |
| v2 reserve | victory | 17/20 | LV3, 21 kills, 273 XP | LV2, 7 kills, 84 XP |
| v2 deliberate split | victory | 20/20 | LV5, 171 kills, 1,348 XP | LV5, 73 kills, 975 XP |
| v2 Kael carry | victory | 20/20 | LV6, 207 kills, 1,700 XP | LV1, 2 kills, 24 XP |
| **current reserve** | victory | **16/20** | **LV3, 22 kills, 318 XP** | **LV2, 5 kills, 56 XP** |
| **current deliberate split** | victory | **20/20** | **LV4, 106 kills, 698 XP** | **LV4, 43 kills, 802 XP** |
| **current Kael carry** | victory | **20/20** | **LV5, 103 kills, 939 XP** | **LV1, 3 kills, 36 XP** |

Current completion times are 423.7 seconds for reserve, 410.3 seconds for split
and 405.8 seconds for Kael carry.

## Interpretation

The result now exposes the intended skill gradient instead of merely inflating
the kill counter after both bars are full:

- reserve heroes remain useful, but do not passively unlock the full kit;
- the unattended fixed tower line loses four lives under late mixed pressure;
- split management converts those four leaks into a clean win and earns both
  heroes' level-4 milestone kits;
- concentrating kills can still produce a level-5 carry, but starves the other
  hero and therefore has a real coverage/opportunity cost;
- last-hit ownership remains unchanged: towers, defenders, the other hero and
  environment damage grant zero XP.

This is not proof that every possible build is balanced. It is a deterministic
regression gate for the specific failure that motivated the pass. Future tuning
should add representative weak, air-light and control-heavy builds rather than
loosening this gate or compensating with global enemy HP.
