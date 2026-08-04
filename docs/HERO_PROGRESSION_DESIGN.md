# Hero Progression: Commanders, Not Inventory Screens

## Decision

Verdant Rift uses the readable grammar of classic RTS heroes—personal levels,
distinct active and passive abilities, and build-defining equipment—but keeps
the interaction budget appropriate for tower defense.

Each hero has:

- Six run levels earned only from enemies the hero personally kills.
- Two active spells and two passive spells, unlocked at levels 1, 2, 4 and 6.
- One optional artifact selected before the stage.
- No random drops, rarity tiers, consumables, trading, crafting or permanent
  statistical grind.

The one-artifact limit is intentional. Towers remain the primary economic and
strategic system; heroes provide local crisis management and expressive micro.

Kingdom Rush establishes the useful surrounding conventions: controllable
heroes have HP, attack, armor, speed, respawn and level progression; Alliance
constrains ordinary heroes to path-valid positions while allowing authored
terrain traversal. Verdant Rift uses those readability conventions but keeps
its own last-hit-only economy and compact spell book.

- https://kingdomrushtd.fandom.com/wiki/Heroes/Kingdom_Rush
- https://kingdomrushtd.fandom.com/wiki/Heroes/Alliance

## XP contract

Hero growth is an execution reward, not passive income. Credit is attached to
the authoritative lethal damage command, never inferred from selection,
proximity or assists.

| Enemy | Hero XP on own lethal hit | Purpose |
|---|---:|---|
| Rift Skitter | 4 | Predictable early training without swarm farming |
| Thorn Marauder | 10 | Rewards committing into armor |
| Gloam Wisp | 12 | Lyra anti-air opportunity |
| Mossback Brute | 45 | Contested, high-value execution |
| Hollow Bloom | 120 | End-of-run mastery recognition |

Cumulative thresholds are `0 / 40 / 220 / 500 / 850 / 1700` for levels 1–6.
The curve is intentionally convex: level 2 exposes a first passive, level 4
earns a second active and level 6 remains a carry achievement rather than an
automatic cap.

Rules:

1. Direct attacks and damage caused by that hero's spells may credit the hero.
2. Towers, defenders, the other hero, leaks and environmental damage grant no
   hero XP.
3. There is no shared XP or assist XP in this chapter.
4. Each enemy can pay XP exactly once, including queued splash and chain hits.
5. Difficulty does not alter XP values.

## Guard-anchor contract

Heroes defend an assigned post; they do not chase a target across the map.

- Kael's reserve/commanded acquisition radii are 90/108 route units.
- Lyra's reserve/commanded acquisition radii are 95/132 route units.
- Acquisition is measured from the guard anchor, not the hero's drifted combat
  position.
- An engagement releases after the enemy clears the anchor radius plus legal
  contact distance; the hero then returns along authored route geometry.
- The first movement command enables the wider commanded radius for that run.
- Kael remains ground-only. Lyra may shoot air but cannot block it or enter an
  airborne melee engagement.

Default reserve posts are at 45% (Kael) and 68% (Lyra) of route arc length.
Moving a champion forward is what creates last-hit opportunities; ignored heroes
must never become map-wide passive damage.

## Universal level rewards

Every level grants a restrained stat step in addition to spell milestones:

- Maximum HP +5%, with the same absolute increase applied to current HP.
- Basic damage +7%.
- Movement speed +1.5%, capped at +7.5% from run levels.
- A heal worth 12% of new maximum HP.
- All unlocked active cooldowns immediately reduced by 1.25 seconds.

The total level-6 multiplicative gain remains below a tower's specialization
jump. A hero becomes more flexible and durable, not a replacement for the tower
economy.

## Kits

### Kael — Rift Warden

| Level | Spell | Type | Tactical purpose |
|---:|---|---|---|
| 1 | Rift Quake | Targeted active | Ground-only burst and severe slow |
| 2 | Riftbrand | Passive | Every fourth strike adds true damage and control |
| 4 | Warden's Pulse | Self active | Sustain allies and expose a contested ground zone |
| 6 | Living Bulwark | Passive | Personal kills restore health and active cooldowns |

Kael chooses between staying power, personal damage and spell tempo:

- **Bastion Seal:** +14% health, -9% basic damage.
- **Riftglass Edge:** +16% basic damage, -8 percentage points armor.
- **Oathstone Standard:** 18% faster active recovery, -8% movement speed.

### Lyra — Star Seer

| Level | Spell | Type | Tactical purpose |
|---:|---|---|---|
| 1 | Starfall | Targeted active | Bounded ground-and-air area burst |
| 2 | Astral Echo | Passive | Every third strike chains to another target |
| 4 | Falling Constellation | Targeted active | Marks up to three durable priority enemies |
| 6 | Starseed | Passive | Personal kills prime a shot and recover actives |

Lyra chooses between reach, spell burst and sustained chaining:

- **Far-Star Lens:** +16% range, -10% health.
- **Comet Prism:** +20% spell damage, +12% active cooldown duration.
- **Echo Charm:** stronger Astral Echo, -9% basic damage.

## Deterministic contract

`GameSimulation` is the sole authority for unlocks, targeting validation,
cooldowns, damage, marks, healing and artifact modifiers. Presentation reads the
spell registry and reacts to `hero-spell-cast`; it does not apply gameplay.

Public integration surface:

- `setHeroArtifactLoadout(loadout)` — atomic, briefing-only validation.
- `getHeroSpellTargeting(heroId, spellId)` — artifact- and level-adjusted range.
- `canUseHeroSpell(heroId, spellId, point)` — exact authoritative preview gate.
- `useHeroSpell(heroId, spellId, point)` — authoritative cast.
- `useAbility(heroId, point)` — compatibility alias for the primary spell.

`HeroState` exposes the selected artifact, unlocked spell IDs and authoritative
active cooldowns. Primary spell cooldown is mirrored to the legacy ultimate
fields until the old HUD contract is retired.

Downed heroes retain XP, levels, spell unlocks, artifact and own-kill count.
Respawn restores combat presence; it does not reset run mastery.

## Balance guardrails

- Artifacts always pair an upside with a measurable cost.
- No artifact changes gold, XP, bounty, tower statistics or enemy rules.
- Health, damage and spell modifiers stay roughly within ±20%.
- Area spells have bounded ranges and Lyra's bursts have target caps.
- Kael's direct damage remains ground-only.
- Run XP remains capped and last-hit-only; tower, defender and environmental
  kills never advance heroes.
- Secondary active spells arrive at level 4, preventing early-wave action-bar
  overload and making personal-kill allocation a strategic decision.
- A single splash, chain or queued lethal cannot award XP twice.
- A Kael lethal changes only Kael; a Lyra lethal changes only Lyra.
- On Warden, reserve heroes should end around level 2–3, deliberate split
  management around level 3–5, and a focused carry may reach level 6.
- A no-command fixed build should lose more integrity than intentional two-hero
  play, without requiring XP farming to clear the stage.

## Presentation requirements

- The hero dock exposes level, HP, exact XP progress, unlocked actives and their
  cooldowns without relying on hover.
- Newly unlocked magic receives an anchored level-up cue and a short named toast.
- Downed heroes retain visible mastery progress.
- Cast previews use `getHeroSpellTargeting`, so visual range always agrees with
  level and artifact modifiers.
- Results report each hero's level and own-kill total.

## Expansion rule

Future heroes should follow the same budget: two actives, two passives, three
paired-tradeoff artifacts and no more than one equipped artifact. A new mechanic
must justify itself through a tower-defense decision—position, timing, target
domain, blocking, sustain or damage conversion—not through RPG collection.
