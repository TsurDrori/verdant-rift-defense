# Hero Progression — Earned Mastery

## Design intent

Hero growth is an execution reward, not passive income. A hero earns experience
only when that hero lands the lethal authoritative hit. Tower kills, Aegis
defender kills, the other hero's kills, leaks, and wave completion grant no hero
experience. This creates a real tradeoff: towers are reliable, while actively
positioning a champion to secure dangerous kills accelerates that champion's
power curve.

The current slice is one twelve-wave map, so progression must become tactically
relevant during one run without turning the final waves into a victory lap.
Levels reset with the run. Campaign Insight remains the persistent layer.

Kingdom Rush establishes the useful surrounding conventions: controllable
heroes have HP, attack, armor, speed, respawn and level progression; Alliance
constrains ordinary heroes to path-valid standing positions while allowing
terrain-aware traversal. Verdant Rift uses those readability conventions but
keeps its own last-hit-only economy and ability kit.

- https://kingdomrushtd.fandom.com/wiki/Heroes/Kingdom_Rush
- https://kingdomrushtd.fandom.com/wiki/Heroes/Alliance

## XP contract

| Enemy | Hero XP on own lethal hit | Purpose |
|---|---:|---|
| Rift Skitter | 4 | predictable early training without swarm farming |
| Thorn Marauder | 10 | rewards committing into armor |
| Gloam Wisp | 12 | Lyra anti-air opportunity |
| Mossback Brute | 45 | contested, high-value execution |
| Hollow Bloom | 120 | end-of-run mastery/score recognition |

Cumulative thresholds are `0 / 40 / 220 / 500 / 850 / 1700` for levels 1–6.
The curve is intentionally convex: level 2 exposes the first piece of magic,
levels 3–4 reward sustained execution, and the last jump is a genuine carry
challenge rather than an automatic cap. Expected Warden outcomes are level 2–3
at the reserve posts, level 3–5 under deliberate split management, and level 5
with a rare level 6 for a focused carry.

Rules:

1. Credit is attached to the damage command, never inferred later from spatial
   proximity or the selected UI hero.
2. Direct attacks, a hero's ultimate, and damage caused by that hero's unlocked
   magic may credit that hero.
3. No shared XP and no assist XP in this slice.
4. Each enemy can pay XP exactly once even when splash hits resolve together.
5. Difficulty does not change XP values. Harder enemies already make last hits
   more costly to secure; adding a hidden XP penalty would punish the same
   decision twice.

## Guard-anchor contract

Heroes defend an assigned post; they do not acquire a target and then chase it
across the map.

- Kael's reserve/commanded acquisition radii are 90/108 route units.
- Lyra's reserve/commanded acquisition radii are 95/132 route units.
- Acquisition is measured from the guard anchor, not from a hero who may already
  have drifted toward a previous target.
- An engagement is released after the enemy clears the anchor radius plus legal
  contact distance. The hero returns to the anchor along the authored route.
- The first explicit movement command marks that hero as actively commanded for
  the run and enables the wider tactical radius.
- Kael remains ground-only. Lyra can shoot air inside her guard zone but cannot
  block or enter a melee engagement with it.

Default reserve posts are at 45% (Kael) and 68% (Lyra) of route arc length.
They provide a useful fallback without turning an ignored hero into global,
passive damage. Moving a champion forward is the action that creates the
last-hit opportunity.

## Level rewards

Every level grants a restrained stat step and a visible, audible level-up:

- maximum HP +5%; current HP gains the same absolute increase;
- attack damage +7%;
- movement speed +1.5%, capped at +7.5%;
- heal 12% of the new maximum HP;
- ultimate cooldown immediately reduced by 1.25 seconds.

The total level-6 multiplicative gain is intentionally below a tower's full
specialization jump. A hero becomes more flexible and durable, not a substitute
for the tower economy.

## Magic milestones

### Kael — ground control

- **Level 2, Riftbrand:** every fourth basic strike adds 20 true damage and a
  short 24% slow. It cannot target flying enemies.
- **Level 4, Warden's Pulse:** Rootbreak grows from 138 to 152 radius and from
  135 to 178 true damage.
- **Level 6, Living Bulwark:** Kael's own kills restore 6% maximum HP and reduce
  Rootbreak cooldown by another 0.65 seconds. This does not trigger on assists.

### Lyra — ranged arcane execution

- **Level 2, Astral Echo:** every third basic bolt chains for 55% damage to one
  second enemy within 115 units. Both ground and flying targets are valid.
- **Level 4, Falling Constellation:** Starfall grows from 160 to 176 radius,
  from 145 to 178 damage, and from eight to ten targets.
- **Level 6, Starseed:** Lyra's own kills reduce Starfall cooldown by 0.85
  seconds and prime the next basic bolt for +20% damage.

## UI/feedback requirements

- The hero dock shows `LV`, current HP/max HP, an XP bar and exact `current / next`
  progress without relying on hover.
- Level-up feedback is anchored to the hero and never covers the lane.
- Newly unlocked magic is named in a short toast and represented by a persistent
  milestone pip in the hero dock.
- Downed heroes retain their level and XP. Respawn does not erase growth.
- The result screen reports both hero levels and own-kill totals.

## Balance gates

- A tower or defender lethal hit leaves both heroes' XP byte-for-byte unchanged.
- A Kael lethal hit changes only Kael; a Lyra lethal hit changes only Lyra.
- A single splash/chain kill cannot award twice.
- Kael and all Aegis defenders have zero valid flying targets in every state.
- Lyra may shoot flying enemies but never blocks or enters a melee engagement
  with them.
- On Warden, a no-hero-command autoplay should be materially less successful
  than an intentional two-hero run, but the level cannot require farming a
  particular enemy for XP.
- The deterministic fixed-build gate is reserve heroes at level 2–3 with lives
  lost, split management at level 3–5 with a clean win, and a focused carry at
  level 5 with level 6 permitted but not required.
- Level-6 damage, healing and cooldown effects remain bounded under multi-kills.

## Warden pressure philosophy

Warden pressure is composition-led rather than a hidden global stat tax. Waves
8–12 add synchronized armored, swarm, air and brute groups that expose coverage
or target-priority gaps. Wanderer keeps the base teaching script; Mythic inherits
the tactical groups and then applies its explicit HP/speed modifiers. The fixed
seven-tower line therefore loses gate integrity when heroes are left in reserve,
while the same economy remains cleanly winnable with intentional hero commands.
