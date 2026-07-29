# Blocker throughput, durability and recovery

## Reference scale

This pass uses the Kingdom Rush combat vocabulary without copying its absolute
numbers. The useful reference ratios are:

- Kingdom Rush heroes expose HP, heal rate, armor and respawn as separate tuning
  axes. Alliance heroes span roughly 215–580 HP, 17–51 healing per second and
  15–38 second respawns: https://kingdomrushtd.fandom.com/wiki/Heroes/Alliance
- Frontiers heroes commonly heal about 4–13% maximum HP per second and respawn
  in 15–30 seconds: https://kingdomrushtd.fandom.com/wiki/Heroes/Frontiers
- Footmen recover while out of combat; the Courage upgrade adds a distinct
  combat-regeneration rule: https://kingdomrushtd.fandom.com/wiki/Footmen_Barracks
- Holy Order Paladins regenerate 25 HP/s while idle and respawn in roughly
  11–14 seconds: https://kingdomrushtd.fandom.com/wiki/Holy_Order
- Ordinary and elite enemy attacks occupy very different lethality bands:
  https://kingdomrushtd.fandom.com/wiki/Bandit,
  https://kingdomrushtd.fandom.com/wiki/Marauder,
  https://kingdomrushtd.fandom.com/wiki/Troop_Captain and
  https://kingdomrushtd.fandom.com/wiki/Frost_Giant
- Physical armor is percentage mitigation, so effective durability must be
  evaluated after armor rather than from HP alone:
  https://kingdomrushtd.fandom.com/wiki/Armor_and_Magic_resistance

The implementation deliberately heals more slowly than the cited heroes and
Paladins. The goal is recoverable tactical withdrawal, not permanent stalling.

## Authoritative blocker contract

1. Every Kael/Aegis blocker has capacity one. An engagement is a one-to-one
   reservation between one living ground enemy and one living blocker.
2. Route progress remains authoritative. Ground enemies render inside a road
   corridor with ordinary bands at −18/+18 and temporary passing bands up to
   −36/+36 world units.
3. Lateral speed is capped at 48 units/s. A continuous interpolated path normal
   removes corner jumps.
4. Collision uses body radii, with eleven extra units of same-band following
   padding. Cross-band weaving still enforces non-overlapping body radii. Followers may change
   bands and overtake a stationary engaged creep; a blocked creep is not a
   global queue barrier.
5. Aegis formation posts are 52 route units apart. This leaves a physical weave
   pocket while the five-unit branch remains within its 112-unit leash.
6. Melee contact is Euclidean. A blocker stops at
   `sqrt(contactRadius² − laneOffset²)` longitudinal separation, so presentation
   and authoritative damage agree.
7. Outer passing bands are traffic-only. Centerline blockers cannot reserve an
   enemy until it returns to an ordinary band.
8. Reserved ground enemies converge smoothly to the −18 combat band. The +36
   outer band therefore remains a continuous flow channel even across several
   simultaneous one-to-one engagements.
9. Kael and all Aegis defenders remain unable to engage air.

Lyra is non-blocking, not invulnerable. An enemy in physical contact can make an
opportunistic strike without reserving Lyra or stopping its own route progress.

## Damage telemetry

Raw enemy DPS:

| Enemy | Before | After | Change |
|---|---:|---:|---:|
| Rift Skitter | 8.54 | 12.82 | +50% |
| Thorn Marauder | 13.89 | 23.16 | +67% |
| Mossback Brute | 22.46 | 40.68 | +81% |

Armor-adjusted continuous TTK benchmarks:

| Matchup | Before | After |
|---|---:|---:|
| Brute → Kael level 1 (420 HP, 28% armor) | 25.97s | 14.34s |
| Brute → Kael level 5 (510.5 HP, 28% armor) | 31.57s | 17.43s |
| Marauder → rank-1 defender (105 HP, 18% armor) | 9.22s | 5.53s |
| Marauder → Mirror defender (315 HP, 42% armor) | 38.10s | 23.45s |

The deterministic test uses discrete attack cadence rather than assuming the
continuous approximation. It verifies exact armor-adjusted damage on every hit,
finite level-1/level-5 deaths and full-health respawn.

## Recovery contract

- Defender: after three uninterrupted seconds with no engagement and no damage,
  recover 4% maximum HP/s.
- Hero: after four uninterrupted seconds with no engagement/attack and no
  damage, recover 7% maximum HP/s.
- Any hit immediately restores the full delay. Remaining engaged also pins the
  delay at its maximum.
- Recovery is capped at maximum HP and never operates while down.
- Respawn remains a separate full-health lifecycle.

At rank 1, defender recovery is 4.2 HP/s. Kael recovers 29.4 HP/s at level 1
and about 35.7 HP/s at level 5. Neither value offsets the corresponding tuned
enemy DPS during combat because combat recovery is disabled.

## Ability locality

The same level-aware ability specification now drives both simulation and the
BattleScene range ring. Level-1 Kael/Lyra ranges are 138/160; level-4 milestone
ranges are 152/176. A click beyond the displayed cast range is rejected without
consuming cooldown or granting damage/XP.

## Executable gates

`tests/blocker-combat-balance.test.ts` covers:

- two same-band followers overtaking one indefinitely blocked Brute;
- N defenders reserving at most N enemies while all N+1 traffic passes;
- bounded, continuous lateral motion and non-overlapping body radii;
- armor-adjusted ten-second Kael/defender damage;
- regeneration onset, rate, cap, hit interruption and down-state exclusion;
- level-1 versus level-5 Kael mortality and respawn;
- Lyra opportunistic damage without engagement; and
- map-wide and level-4 ability-range boundaries.
