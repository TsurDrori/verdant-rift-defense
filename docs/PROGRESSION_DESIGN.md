# Progression and Encounter Design — *Moonroot Bastion* Vertical Slice

**Status:** implementation-ready design target
**Research date:** 2026-07-28
**Overall confidence:** **high** on the official feature set and on the design conclusions supported by Ironhide's patch notes; **moderate** on exact Kingdom Rush Alliance internals reported only by the community-maintained wiki. All proposed names, numbers, mechanics, text, and content below are original.

## 1. Executive decision

The vertical slice should not attempt to win by raw content count. It should deliver one 12–16 minute stage in which almost every purchase, target priority, hero move, and wave call has a legible opportunity cost. The scalable core is:

- four tower chassis, each with three common levels and two mutually exclusive level-IV specializations;
- two simultaneously controlled heroes whose roles overlap just enough to enable combinations but not substitution;
- seven regular enemy archetypes plus one boss, introduced through a teach → twist → test wave cadence;
- one stage mechanic with a shared cooldown and two opposing uses, forcing a choice between sustain and burst;
- run-only gold, fixed first-clear progression points, free respec, and no consumable power currency;
- a data-driven content model in which stages compose reusable routes, spawn groups, modifiers, enemies, towers, heroes, and upgrade effects rather than embedding balance in scene code.

This is inspired by the strategic grammar of modern Kingdom Rush, not by its protected expression. Do not reuse its characters, lore, silhouettes, icons, dialogue, maps, sound, animation, or numerical tables.

## 2. What the references actually establish

**Currency note:** as of 2026-07-28, Kingdom Rush 6: Genesis is announced/upcoming, while Alliance is the latest released mainline reference. Genesis demo documentation describing individual tower leveling is now stale: Ironhide officially removed that system on 2026-07-24. This document uses the reversal itself as evidence and does not treat the superseded demo tree as a shipping feature.

### 2.1 Strongest transferable patterns

1. **A limited pre-stage loadout makes roster growth meaningful.** Alliance asks players to bring five specialized towers, and each tower advances through four in-stage levels. A growing collection therefore expands the decision space without placing every answer on the field at once. For the slice, four chassis are available; the shipping framework should support a five-slot loadout once the roster exceeds five.

2. **Two heroes create simultaneous local problems.** Alliance's distinctive change is two controllable heroes and two hero-linked ultimate abilities. One hero cannot simply be a second cursor for the other: speed, block count, survivability, damage type, range, and ultimate use must create different optimal positions.

3. **Branches are valuable only when they change the problem a tower solves.** A `+15% damage` branch is not a strategic branch. The proposed level-IV choices change targeting, control, damage shape, or blocking behavior. Their costs are close enough that the choice is contextual rather than a disguised power ranking.

4. **Wave calls are a risk economy.** Calling early converts readiness and uncluttered lanes into gold plus partial command-power recharge. The wave-preview UI is therefore part of the strategy system, not optional polish.

5. **Permanent progression should widen tactics without making an unupgraded clear unreasonable.** Alliance separates fixed campaign-earned upgrade points from the life-based result. That prevents a weak clear from directly granting less permanent power and worsening the player's position. This slice follows that principle.

6. **Stage mechanics must create counterplay, not confiscate investment.** Ironhide changed Abominor from outright tower destruction to repairable rubble, explicitly citing fairness while preserving tension. Its 2026 Dragon Wars balance notes similarly added tower holders, removed or reduced holder costs, increased rewards for threatening enemies, and shortened oppressive disables. The actionable rule is: disruption must be forecast, bounded, and recoverable.

7. **Economy is part of enemy identity.** Official Dragon Wars notes raised gold rewards for special/alpha enemies because reward was too low relative to threat. A dangerous support unit is not merely extra pressure; killing it should create a meaningful buy window.

8. **Difficulty should preserve more strategies, not merely create health sponges.** Alliance primarily scales enemy HP by difficulty, but Ironhide's later per-stage/per-enemy tuning shows the limitation of one global multiplier. Our profiles use restrained global multipliers plus explicit archetype overrides and behavior timing.

9. **Do not attach permanent power progression to tower usage.** The most recent relevant official statement is Ironhide's 2026-07-24 reversal of Genesis's individual tower-leveling system. Ironhide identified unavoidable grinding and conflict with strategy/experimentation, removed the system, and announced a return to global upgrades. This is strong evidence for stage-earned, freely reallocatable global Insight rather than per-tower XP.

### 2.2 Facts used as reference, with confidence

| Observation | Confidence | Design implication |
|---|---:|---|
| Official Steam description lists specialized towers with skills, two heroes per stage, multiple environments/stages, three game modes, and many enemy types. Counts change with updates/DLC. | High | Treat roster, stage, and mode counts as expandable content, never enum assumptions. |
| Alliance uses five selected towers per battle, four in-stage tower levels, and two advanced skills on most towers. | Moderate (community wiki) | Build loadout and tower-level data as configurable collections. |
| Alliance fields two heroes, each with autonomous skills and a player-triggered ultimate; heroes revive after a delay. | High for two heroes; moderate for detailed mechanics | Create two complementary heroes with movement, passive combat logic, an ultimate, and recovery rather than permanent loss. |
| Campaign clears award fixed upgrade points independent of lives; the global tree includes tower, hero, reinforcement, and faction interactions, including mutually exclusive reinforcement branches. | Moderate (community wiki) | Award fixed Insight on first clear, use free respec, and include real exclusivity choices. |
| Typical campaign starts at 20 lives; classic star bands are 18–20, 6–17, and 1–5 lives. | Moderate (community wiki) | Use 20 integrity and preserve familiar 3/2/1-star bands as performance medals, not upgrade currency. |
| Early wave calls grant gold and partially recharge player abilities, but not tower abilities. | Moderate (community wiki; supported by long-standing series analysis) | Make early call value visible and restrict recharge to hero/reinforcement/stage-command systems. |
| Ironhide explicitly reworked permanent tower destruction into repairable rubble. | High (official) | Boss disruption is recoverable, clearly telegraphed, and never deletes a build site permanently. |
| Ironhide added build holders and adjusted enemy rewards/costs to restore strategic options in Dragon Wars. | High (official) | Holder geometry and gold liquidity are first-class balance levers. |
| Four days before this research, Ironhide announced that the upcoming Genesis would remove individual tower leveling, restore global upgrades, and rework its UI after demo feedback. | High (official, 2026-07-24) | No per-tower grind; permanent progression should preserve experimentation and presentation should privilege tactical clarity. |

## 3. Vertical-slice player promise

**Fantasy:** defend the living Moonroot Heart from a corrupted forest court while two rival champions learn to fight together.

**Target session:** 12–16 minutes on Standard, 14 waves, 20 Bastion Integrity, no consumable items.

**The player should feel:**

- clever for reading the next wave and changing one part of the defense;
- busy but not frantic, with a consequential input approximately every 6–12 seconds;
- responsible for failure because threats were previewed and counters were available;
- rewarded for aggression through early calls without early calling becoming mandatory;
- excited to replay because each tower has a credible alternate specialization.

**Failure must never feel caused by:** off-screen spawns, untelegraphed immunity, random tower loss, an unknown path change, ambiguous damage types, or a boss ignoring the game's established rules.

## 4. Stage: Moonroot Causeway

### 4.1 Geography

- Canvas/playfield reference: 1920×1080 logical landscape space, camera-safe for 16:10 through 21:9.
- Two entrances, **Briar Gate** (northwest) and **Mire Gate** (southwest).
- The routes remain separate for roughly 38% of their travel time, cross the range of two central holders, then merge at **Moonwell Bend** for the final 32% to a single exit.
- Ten tower holders:
  - 3 cover only the north route;
  - 3 cover only the south route;
  - 2 central premium positions can cover both but have shorter exposure time;
  - 2 late holders protect the final bend.
- Two of the central/premium holders begin **rootbound**. Clearing one costs 90 gold. This creates an early width-versus-depth decision; neither is required for a Standard clear.
- Barracks rally zones reach paths but never overlap entrances. All targeting bounds and rally bounds must be visible while a tower is selected.

### 4.2 Stage command: the Moonwell

After wave 3, the player gains a shared 55-second **Moonwell** cooldown with two mutually exclusive activations:

- **Bloom:** all allied units and heroes in a 150-radius target area heal for 35% max HP; defeated barracks units in the area respawn immediately. Does not affect towers.
- **Wither:** enemies in a 150-radius target area take 180 true damage over 6 seconds and are slowed 25%. Bosses take 50% damage and 40% of the slow.

Choosing one starts the shared cooldown for both. The choice creates a clean sustain-versus-burst tradeoff and couples naturally with the two hero roles. The target decal previews radius and displays estimated affected unit count before confirmation.

### 4.3 Boss interaction: recoverable disruption

The **Hollow Regent** marks a tower at 70% and 35% HP. The mark is visible for 4.5 seconds and never selects the same holder twice. At the end of the telegraph, thorn roots disable that tower for 12 seconds. The player can:

- wait out the disable;
- clear it immediately for `max(45, floor(0.18 × towerGoldInvested))` gold; or
- sell during the telegraph at the normal refund rate and rebuild elsewhere.

The attack does not destroy the tower, remove the holder, or erase upgrades. The boss cannot mark a tower while another mark/disable is active. A settings toggle provides a high-contrast purple outline in addition to the animated roots.

## 5. Combat rules

### 5.1 Damage and resistance

- **Physical:** reduced by Armor.
- **Arcane:** reduced by Ward.
- **True:** ignores Armor and Ward; reserved for costly active skills, boss-safe damage caps, and clearly described effects.
- Resistance is a fraction clamped to `[0, 0.8]` for normal units.
- `effectiveDamage = max(1, rawDamage × (1 - resistance))` before shields and per-hit caps.
- Damage-over-time snapshots the source's damage modifiers at application but evaluates the target's current resistance per tick.
- Splash damage uses a 100% inner radius and linearly falls to 55% at its outer edge. The UI shows the outer radius.

### 5.2 Blocking

- Each ground enemy consumes one block slot unless its data says otherwise.
- Flying enemies cannot be blocked by ground units.
- A blocker and enemy commit to melee only after both reach valid contact nodes; no long-distance snapping.
- When a soldier dies, an enemy receives 0.25 seconds of re-path grace before advancing, preventing animation jitter but not adding hidden stall power.

### 5.3 Target policies

Every attacking tower exposes a player-selectable priority: **First**, **Last**, **Strongest**, **Special** (support/elite units), or **Flying** (if it can hit air). Default is First. Skills may have separate policies. Target selection must be deterministic; equal candidates resolve by greatest route progress, then stable entity ID.

## 6. Tower roster and real branch tradeoffs

All costs below are incremental except the total shown for specializations. Statistics are Standard difficulty before meta upgrades. Values are starting balance targets, not promises; simulation and playtest own the final numbers.

### 6.1 Windlass Roost — physical precision / anti-air

| Tier | Increment | Total | Damage / interval | Range | Role |
|---|---:|---:|---:|---:|---|
| I | 70 | 70 | 5–7 / 0.75s | 175 | Cheap coverage, hits air |
| II | 100 | 170 | 10–14 / 0.75s | 185 | Stable physical DPS |
| III | 160 | 330 | 20–28 / 0.75s | 195 | Pre-branch anchor |
| IV-A **Falconer Gallery** | 250 | 580 | 31–43 / 0.75s | 215 | Long-range execution and air control |
| IV-B **Thornshot Lodge** | 250 | 580 | 25–35 / 0.62s | 195 | Sustained damage and debuff application |

**Falconer skills**

- `Predator Mark` (150/120/120 gold): every 14s marks the strongest valid enemy for 4/5/6s; all sources deal 12/17/22% more damage to it. Does not stack; refresh uses the stronger value.
- `Skydive` (180/140/140): every 18s the falcon strikes the leading flying enemy for 100/170/240 true damage. If no flyer exists, it waits rather than consuming cooldown.

**Thornshot skills**

- `Barbed Quarrels` (130/110/110): attacks apply 4/7/10 physical DPS for 3s; applications refresh, not stack.
- `Pinning Volley` (170/140/140): every 13/12/11s, fire three arrows across a small lane area, dealing 45 physical each and slowing ground enemies 30% for 2s.

**Tradeoff:** Falconer is the better sparse-threat and air answer; Thornshot wins into dense, lightly armored ground waves but loses efficiency into Armor.

### 6.2 Arclight Spire — arcane armor counter / control

| Tier | Increment | Total | Damage / interval | Range | Role |
|---|---:|---:|---:|---:|---|
| I | 110 | 110 | 14–20 / 1.80s | 155 | Arcane single target |
| II | 150 | 260 | 30–42 / 1.75s | 165 | Armor counter |
| III | 220 | 480 | 52–68 / 1.65s | 175 | High-value focus |
| IV-A **Rift Lens** | 280 | 760 | 86–110 / 1.75s | 195 | Boss/elite removal |
| IV-B **Stormglass Array** | 280 | 760 | 58–76 / 1.40s | 175 | Chains and soft control |

**Rift skills**

- `Fracture` (190/150/150): every 16s deals 130/220/310 arcane damage and reduces Ward by 15/25/35 percentage points for 6s.
- `Event Step` (220/170/170): every 22/20/18s teleports the leading non-boss ground enemy 90 path units backward; elites move 45. Invalid targets do not consume cooldown.

**Stormglass skills**

- `Forked Current` (160/130/130): every fourth attack chains to 2/3/4 extra targets for 55% damage.
- `Static Cage` (210/160/160): every 20/18/16s traps up to four non-boss enemies for 2.0/2.5/3.0s; trapped enemies cannot be trapped again for 6s.

**Tradeoff:** Rift creates a high-cost elite kill zone and improves other arcane sources; Stormglass gives lower focused damage but prevents mixed waves from overflowing a choke.

### 6.3 Hearthguard Lodge — blocking / local support

| Tier | Increment | Total | Squad | Per-unit stats | Rally |
|---|---:|---:|---:|---|---:|
| I | 80 | 80 | 2 | 95 HP, 6–9 physical / 1.0s, 10% Armor | 120 |
| II | 110 | 190 | 2 | 145 HP, 9–13 / 1.0s, 18% Armor | 130 |
| III | 170 | 360 | 2 | 220 HP, 13–19 / 1.0s, 26% Armor | 140 |
| IV-A **Oathwall Hall** | 260 | 620 | 3 | 265 HP, 14–20 / 1.0s, 38% Armor | 150 |
| IV-B **Wildblade Camp** | 260 | 620 | 2 | 245 HP, 23–33 / 0.85s, 18% Armor | 165 |

Base respawn is 8 seconds per unit, independently staggered.

**Oathwall skills**

- `Stand Together` (150/120/120): each living squad member gains 6/10/14% Armor per other living member.
- `Shield Bell` (190/150/150): every 22/20/18s grants nearby allies a 70/120/170 shield for 6s.

**Wildblade skills**

- `Challenge` (140/110/110): once per 13/12/11s, a unit forces an elite ground target to engage it for up to 3s; bosses are immune.
- `Riposte` (170/130/130): 20/28/36% chance after evading a melee hit to deal 38 true damage. Proc is capped at once per 1.2s per unit.

**Tradeoff:** Oathwall holds swarms and enables ranged towers; Wildblade has wider rally reach and can isolate/damage an elite, but two casualties collapse it quickly.

### 6.4 Cinder Mortar — physical splash / zone shaping

| Tier | Increment | Total | Damage / interval | Outer radius | Range |
|---|---:|---:|---:|---:|---:|
| I | 120 | 120 | 16–24 / 2.10s | 54 | 165 |
| II | 170 | 290 | 34–48 / 2.10s | 58 | 175 |
| III | 240 | 530 | 64–88 / 2.05s | 64 | 185 |
| IV-A **Furnace Cartel** | 290 | 820 | 84–112 / 1.95s | 68 | 190 |
| IV-B **Quake Foundry** | 290 | 820 | 104–140 / 2.35s | 78 | 180 |

Mortars cannot target flying enemies. Their explosions can only affect flying enemies if a skill explicitly says so; the base shell does not.

**Furnace skills**

- `Cinderbed` (180/140/140): impacts leave a 4s field dealing 10/17/24 true DPS. Fields from the same tower refresh duration rather than stack.
- `Overpressure` (190/150/150): after three attacks within 8s, the next shell fires 35% faster and has 25/35/45% larger inner radius.

**Quake skills**

- `Fault Line` (190/150/150): every 17/15/13s, the shell sends a narrow shockwave 80 path units forward, dealing 55% shell damage.
- `Concussion` (200/160/160): direct-center targets are stunned 0.7/1.0/1.3s; the same enemy has a 5s stun immunity.

**Tradeoff:** Furnace is superior when blockers hold enemies in persistent ground fire; Quake is a slower independent control piece with greater reach along the path.

### 6.5 Economy guardrails

- Sell refund: 65% of invested gold by default; 100% before wave 1.
- Rootbound-holder clearing is not refunded.
- Specialization switch requires selling/rebuilding. Because refund is meaningful, adaptation is viable but never free.
- A tower upgrade completes instantly and retargets after at most 0.15s; it does not reset an ability cooldown.
- No branch should exceed 125% of its sibling's median win contribution across its intended matchups. If it does, fix mechanics/encounters before flattening identity.

## 7. Hero pair

Heroes use an account-wide **Training Rank** from 1–10, raised by campaign milestones rather than per-hero usage. Every unlocked hero immediately matches the account rank; skill allocations are per hero and freely reset between stages. This preserves attachment and buildcraft without punishing roster experimentation or requiring old-stage grinding. In the slice the account begins at rank 5 so both heroes show their signature loop. Defeat starts a visible 22-second recovery timer; retreating out of combat heals 6% max HP per second after a 3-second delay.

### 7.1 Nara, Bastion Warden — tank / sustain

- Level-5 stats: 390 HP, 40% Armor, 20–28 physical damage every 1.35s, speed 62, block 1.
- `Interpose` (auto, 13s): leaps up to 90 units to the allied ground unit with the lowest health in range, granting both a 65 shield for 4s.
- `Shield Arc` (auto, 10s): 55 physical damage in a frontal arc and a 1s stun; requires two targets.
- `Unbowed` (passive): below 35% HP, gains 15% Armor and cannot be displaced.
- **Ultimate — Beacon of Dawn** (player targeted, 52s): creates a 140-radius sanctuary for 7s. Allies gain 25% damage reduction and heal 18 HP/s. Nara immediately moves to its center if reachable.

**Player use:** lock a dangerous ground enemy, stabilize the merge, or temporarily hold a route while spending elsewhere. Nara cannot attack air and crosses the map slowly.

### 7.2 Quill, Stormrunner — ranged / mobility

- Level-5 stats: 230 HP, 8% Armor, 16–22 physical damage every 0.75s at range 150, speed 105, block 1.
- `Vault Shot` (auto, 11s): jumps backward from melee and fires for 80 physical damage; cannot trigger from area damage.
- `Conductive Pin` (auto, 12s): deals 55 arcane damage and makes the target take 20% more damage from the next three tower hits within 5s.
- `High Ground` (passive): after remaining stationary for 3s, gains 15% range; lost on moving.
- **Ultimate — Tempest Thread** (player-drawn line, 48s): strikes along a line for 220 arcane damage and 35% slow for 3s. One clear preview shows line width and affected enemies.

**Player use:** reinforce the weak route, answer flyers, and set up burst on a support unit. Quill folds in sustained melee and rewards planned positioning.

### 7.3 Command ability: Wayfarer Reserves

The player can deploy two temporary volunteers to any valid ground-path point every 15 seconds. Each has 90 HP, 5% Armor, 7–10 physical damage per second, one block slot, and a 12-second duration. They are deliberately too weak to replace a Hearthguard but strong enough to split a pack, catch a leak, or hold a Sapper for a hero. Casting on an invalid point does not consume cooldown. Early wave calls partially recharge this ability under the same command-recharge rule as hero ultimates and the Moonwell.

### 7.4 Hero interaction rule

When the heroes are within 110 units, both gain `Concord`: +10% recovery from healing, but Quill loses High Ground's range bonus. This produces a real choice between combined safety and split-map coverage. It is a local combat rule, not a faction percentage stack.

## 8. Enemy roster and counter matrix

| Enemy | HP | Speed | Armor | Ward | Gold | Lives | Mechanic / intended answer |
|---|---:|---:|---:|---:|---:|---:|---|
| Briarling | 70 | 38 | 0 | 0 | 7 | 1 | Dense basic unit; mortar, blocking, chain damage |
| Mirehound | 95 | 72 | 0 | 0 | 9 | 1 | Fast and 20% slow-resistant; coverage, hero mobility, late holders |
| Ironbark Bruiser | 520 | 28 | 35% | 0 | 32 | 2 | Physical armor; Arclight, Fracture, isolate with Wildblade |
| Mistwing | 160 | 48 | 0 | 10% | 12 | 1 | Flying/unblockable; Windlass, Quill, lane coverage |
| Hexweaver | 260 | 32 | 0 | 45% | 26 | 1 | Every 8s grants nearest ally a 90 shield; physical focus and target priority |
| Sap Sapper | 360 | 30 | 10% | 0 | 30 | 1 | At 165 range, telegraphs 1.5s then slows a tower 35% for 5s; hero interception |
| Thornmother | 1,500 | 22 | 20% | 20% | 110 | 3 | Elite; at 66/33% HP spawns 3 Briarlings behind itself; focused damage plus splash |
| Hollow Regent | 6,800 | 18 | 15% | 15% | — | 20 | Boss; recoverable tower root, add summons, capped control |

Numbers assume Standard. Enemy cards appear on first introduction, pause the pre-wave countdown, and present no more than: role, defenses, special, lives, and two counter hints. Armor/Ward shields are both icon- and color-coded for accessibility.

**Counter design:** every enemy has at least two available answers; no enemy is fully immune to a tower chassis; and no wave requires a specialization the player could not reasonably have funded before the preview.

## 9. Fourteen-wave pacing script

The wave timer starts only after the prior wave falls below its configured active-pressure threshold, not merely after the last spawn. Preview icons show lane, count category, Armor/Ward, flying, support, and boss/elite flags. Exact remaining seconds and early-call gold are visible.

| Wave | Composition and lane | Spawn shape | Lesson / pressure | Approx. kill gold |
|---:|---|---|---|---:|
| 1 | 10 Briarlings north, then 10 south | 0.75s cadence; 3s lane gap | Read two lanes; broad cheap coverage | 140 |
| 2 | 5 Mirehounds each lane + 8 Briarlings south | Hounds in pairs, 2.4s apart | Speed and late coverage | 146 |
| 3 | 2 Ironbark Bruisers each lane + 10 Briarlings north | Bruisers lead | Teach Armor and arcane counter | 198 |
| 4 | 4 Mistwings each lane + 10 Briarlings south | Air arrives 4s after ground | Air ignores the obvious choke | 166 |
| 5 | 6 Briarlings, 5 Mirehounds, 1 Bruiser per lane | Alternating packets | First mixed exam; deliberate Moonwell choice | 238 |
| 6 | 2 Hexweavers + 9 Briarlings each lane | Weaver behind pack | Support targeting; Ward favors physical | 230 |
| 7 | 2 Sap Sappers north, then 2 south; 7 Mirehounds each lane | 7s offset | Interception and hero split | 246 |
| 8 | 3 Bruisers + 3 Mistwings + 9 Briarlings each lane | Simultaneous lanes | Air/armor saturation without support | 390 |
| 9 | 1 Thornmother north; 4 Hexweavers + 12 Briarlings south | South starts 5s later | Miniboss versus support swarm; choose Moonwell mode | 298 |
| 10 | 4 Mirehounds, 3 Bruisers, 2 Sappers each lane | Cross-lane offset 2s | Economy squeeze and weak-side reaction | 384 |
| 11 | 9 Mistwings each lane; 5 Hexweavers south; 12 Briarlings north | Ground first, air at +3s | Anti-air capacity test while physical targets compete | 430 |
| 12 | 4 Bruisers, 3 Hexweavers, 2 Sappers each lane | Support wedge behind tanks | Priority targeting and control layering | 532 |
| 13 | 1 Thornmother + 12 Briarlings north; 1 Thornmother + 6 Mirehounds south; 8 Mistwings alternate | 6s stagger | Full-system final exam; 35s recovery after clear | 592 |
| 14 | Hollow Regent north route; at 85% HP, 10 Briarlings from each gate; at 55%, 3 Bruisers from each gate; at 25%, 4 Mistwings from each gate | Health-triggered adds, minimum 16s between triggers | Boss execution and recoverable disruption | 428 from adds |

### 9.1 Timing targets

- Waves 1–4: 35–50 seconds each, 16–22-second natural intermissions.
- Waves 5–9: 50–65 seconds, 20–26-second intermissions.
- Waves 10–13: 60–80 seconds, 22–30-second intermissions.
- Boss: 120–180 seconds.
- Early-call window opens once all spawn groups in the current wave are committed and active pressure is below the configured threshold.

### 9.2 Early-call formula

Let `r` be whole seconds remaining and `w` the next wave index:

```text
goldBonus = floor(min(45, 0.75*r + 0.65*w))
commandRechargeSeconds = min(18, 0.45*r)
```

Recharge applies to both hero ultimates, reinforcements, and the Moonwell, but not tower abilities. The button displays `+gold` and `-cooldown` before confirmation. Calling multiple waves compounds actual combat pressure; there is no hidden intensity multiplier.

## 10. Difficulty profiles

Difficulty is selectable per attempt and never changes unlock rewards.

| Profile | Enemy HP | Enemy damage | Ability cooldown | Spawn gap | Starting gold | Ally HP | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| Story | 0.78 | 0.82 | 1.10 | 1.08 | 620 | 1.15 | Boss tower-root telegraph 6s; +2 checkpoint lives once |
| Standard | 1.00 | 1.00 | 1.00 | 1.00 | 550 | 1.00 | Authored baseline |
| Veteran | 1.18 | 1.10 | 0.92 | 0.94 | 520 | 1.00 | Preview remains complete; rewards unchanged |
| Mythic | 1.34 | 1.20 | 0.84 | 0.90 | 500 | 0.95 | Unlock after clear; boss add floors shortened 16→13s |

Per-enemy overrides prevent pathological scaling:

- Briarling HP multiplier is capped at 1.22 so splash breakpoints remain satisfying.
- Thornmother spawnling count becomes 4 only on Mythic; raw HP multiplier is capped at 1.25.
- Mistwing speed never scales globally; anti-air tests capacity, not reaction latency.
- Sap Sapper disable duration remains 5s on every difficulty; only its cast cooldown changes.

## 11. Currencies, rewards, and meta-progression

### 11.1 Currency contract

| Currency | Scope | Earned from | Spent on | Rule |
|---|---|---|---|---|
| Gold | Current attempt | Starting grant, kills, early calls | Towers, upgrades, clearing roots, boss-root repair | Reset at end; every source and sink visible |
| Insight | Save file | First campaign clear only | Permanent doctrine nodes | Fixed award, independent of lives/difficulty; free respec between stages |
| Stars | Mastery record | Remaining integrity | Stage badges and challenge unlocks | Never buys combat power |

No premium gems, gacha, energy, consumable combat items, or repeatable grind currency belong in this project.

### 11.2 Stage result

- 18–20 integrity: 3 stars.
- 6–17 integrity: 2 stars.
- 1–5 integrity: 1 star.
- First clear: 3 Insight, regardless of star result or difficulty.
- Optional mastery goals, tracked but not required: clear both level-IV branches across separate runs; defeat the Hollow Regent without paying to clear a tower root; call five waves early.

### 11.3 Doctrine tree

Nodes are effect data, not bespoke code. Respec is free on the stage-select screen. For a multi-stage campaign, prerequisite cost provides pacing; exclusivity provides identity.

**Tier 1 (1 Insight each)**

- `Quartermaster`: sell refund 65% → 75%.
- `Field Signals`: reinforcement cooldown 15s → 13.5s.
- `Surveyor`: rootbound holder clear costs -20%; wave previews reveal exact count instead of count band.

**Tier 2 (2 Insight; requires 2 points in tree)**

- `Deep Ranks` *(exclusive group: reinforcement doctrine)*: reinforcements gain +30% HP and +1 block slot total.
- `Skywatch` *(exclusive group: reinforcement doctrine)*: reinforcements use short bows and can target flying enemies, but have -15% HP.
- `Measured Construction`: first tier-III tower upgrade each stage costs 12% less.

**Tier 3 (3 Insight; requires 5 points in tree)**

- `Concord Formation` *(exclusive group: army doctrine)*: each different tower chassis currently built gives heroes +2% ultimate recharge, max 8%.
- `Focused Arsenal` *(exclusive group: army doctrine)*: each duplicate beyond the first of the most common chassis gives that chassis +3% damage, max 12%.
- `Seize the Tempo`: early-call gold +25%, but natural intermission duration -10%. The downside is explicit in the node card.

These are deliberately bounded. They change plans and tempo but cannot compensate for ignoring Armor, air, support enemies, or lane geometry.

## 12. Challenge modes for reuse

The stage data can support two post-clear variants without new art:

- **Heroic — Split Allegiance:** 6 authored waves, 1 integrity, heroes allowed, tower upgrades capped at tier III, 900 starting gold. Emphasizes cross-lane hero movement and efficient basic-tower placement.
- **Iron — No Safe Harbor:** one long authored wave, 1 integrity, 1,450 starting gold, only Arclight Spire and Hearthguard Lodge allowed, Moonwell locked to Bloom. This tests armor countering, blocking geometry, and spell timing without anti-air enemies.

Restrictions are arrays in stage-mode data. Do not fork the scene or combat rules.

## 13. Scalable content model

The following TypeScript-shaped contract is engine-agnostic. Runtime validation should be generated from the same source (for example JSON Schema, Zod, or equivalent). IDs are stable namespaced strings; display text is localized separately.

```ts
type Id = string;
type DamageType = "physical" | "arcane" | "true";
type TargetTag = "ground" | "flying" | "boss" | "elite" | "soldier" | "hero";
type StatKey =
  | "maxHp" | "damageMin" | "damageMax" | "attackInterval" | "range"
  | "speed" | "armor" | "ward" | "abilityCooldown" | "sellRefund";

interface ContentPack {
  schemaVersion: number;
  contentVersion: string;
  namespace: string;
  dependencies: { namespace: string; minVersion: string }[];
  towers: TowerDef[];
  enemies: EnemyDef[];
  heroes: HeroDef[];
  stages: StageDef[];
  upgrades: UpgradeNodeDef[];
  difficulties: DifficultyDef[];
  economies: EconomyDef[];
}

interface CombatStats {
  maxHp: number;
  speed: number;
  armor: number;
  ward: number;
  livesTaken: number;
  blockSlotsUsed: number;
}

interface SoldierDef {
  count: number;
  stats: CombatStats;
  attack: AttackDef;
  respawnSeconds: number;
  rallyRange: number;
  lifetimeSeconds?: number;
}

type EffectDef =
  | { kind: "damage"; amount: { min: number; max: number; type: DamageType }; radius?: number }
  | { kind: "heal"; flat?: number; maxHpFraction?: number; radius?: number }
  | { kind: "shield"; amount: number; duration: number; stackingGroup: string }
  | { kind: "status"; statusId: Id; duration: number; magnitude?: number; stackingGroup: string }
  | { kind: "spawn"; unitId: Id; count: number; lifetimeSeconds?: number }
  | { kind: "pathDisplace"; distance: number; bossMultiplier: number; eliteMultiplier: number }
  | { kind: "statPatch"; query: TargetQueryDef; patches: StatPatch[]; duration?: number }
  | { kind: "cooldownRecharge"; query: TagQueryDef; seconds: number };

interface TagQueryDef {
  all?: string[];
  any?: string[];
  none?: string[];
}

interface TargetQueryDef {
  tags: TagQueryDef;
  radius?: number;
  maxTargets?: number;
  orderBy?: "first" | "last" | "strongest" | "special" | "nearest" | "lowestHp";
}

interface UnlockDef {
  kind: "default" | "stageClear" | "mastery";
  requirementId?: Id;
}

interface ConditionalEffectDef {
  when: { sourceQuery?: TagQueryDef; targetQuery?: TagQueryDef; conditionId?: Id };
  effects: EffectDef[];
  stackingGroup: string;
  maxStacks?: number;
}

interface AttackDef {
  id: Id;
  damage: { min: number; max: number; type: DamageType };
  interval: number;
  range: number;
  projectile?: { speed: number; arc: number; impactRadius?: number };
  validTargets: TargetTag[];
  priorityDefault: "first" | "last" | "strongest" | "special" | "flying";
  effects?: EffectDef[];
}

interface TowerDef {
  id: Id;
  family: Id;
  tags: string[];
  unlock: UnlockDef;
  levels: TowerLevelDef[];             // common levels I–III
  specializations: TowerBranchDef[];  // usually two, chosen once
  targetingOptions: string[];
  sellRulesId: Id;
  presentationId: Id;
  audioEventSetId: Id;
}

interface TowerLevelDef {
  level: number;
  incrementalCost: number;
  attack?: AttackDef;
  soldiers?: SoldierDef;
  statPatches?: StatPatch[];
}

interface TowerBranchDef {
  id: Id;
  fromLevel: number;
  incrementalCost: number;
  attack?: AttackDef;
  soldiers?: SoldierDef;
  abilities: AbilityDef[];
  mutuallyExclusiveWith: Id[];
}

interface AbilityDef {
  id: Id;
  trigger: "auto" | "playerTarget" | "passive" | "healthThreshold";
  targeting?: TargetQueryDef;
  ranks: {
    incrementalCost?: number;
    cooldown?: number;
    charges?: number;
    effects: EffectDef[];
  }[];
  invalidTargetPolicy: "holdCooldown" | "retarget" | "consume";
  internalLockout?: number;
}

interface EnemyDef {
  id: Id;
  tags: TargetTag[];
  stats: CombatStats;
  goldReward: number;
  attacks: AttackDef[];
  abilities: AbilityDef[];
  controlRules: {
    stunMultiplier: number;
    slowMultiplier: number;
    teleportMultiplier: number;
    instaKill: "allowed" | "immune" | "convertToDamage";
  };
  difficultyOverrides?: Record<Id, StatPatch[]>;
  encyclopediaCardId: Id;
}

interface HeroDef {
  id: Id;
  roleTags: string[];
  levels: { level: number; unlockRequirementId: Id; stats: CombatStats; attack: AttackDef }[];
  skills: AbilityDef[];
  ultimate: AbilityDef;
  recoverySeconds: number;
  unlock: UnlockDef;
  synergyRules?: ConditionalEffectDef[];
}

interface StageDef {
  id: Id;
  environmentId: Id;
  economyId: Id;
  startingIntegrity: number;
  routes: RouteDef[];
  holders: HolderDef[];
  interactables: StageInteractableDef[];
  modes: StageModeDef[];
  events: StageEventDef[];
  presentationId: Id;
}

interface StageInteractableDef {
  id: Id;
  position: { x: number; y: number };
  unlockEventId?: Id;
  sharedCooldownGroup?: Id;
  abilities: AbilityDef[];
}

interface StageEventDef {
  id: Id;
  trigger:
    | { kind: "waveStart" | "waveEnd"; waveId: Id }
    | { kind: "entityHealthThreshold"; entityId: Id; fraction: number }
    | { kind: "elapsed"; seconds: number };
  once: boolean;
  actions: (
    | { kind: "spawnGroup"; group: SpawnGroupDef }
    | { kind: "unlockInteractable"; interactableId: Id }
    | { kind: "applyModifier"; modifierId: Id }
    | { kind: "presentationCue"; cueId: Id }
  )[];
}

interface RouteDef {
  id: Id;
  points: { x: number; y: number }[];
  entryId: Id;
  exitId: Id;
  tags: string[];
}

interface HolderDef {
  id: Id;
  position: { x: number; y: number };
  buildRadius: number;
  blockedBy?: { interactionId: Id; clearCost: number };
  allowedTowerTags?: string[];
}

interface StageModeDef {
  id: "campaign" | "heroic" | "iron" | string;
  startingGold: number;
  integrity: number;
  heroRules: { allowed: boolean; max: number };
  towerRules: { allowedIds?: Id[]; bannedIds?: Id[]; maxTier?: number };
  waves: WaveDef[];
  modifiers: ModifierDef[];
  rewards: RewardDef[];
}

interface ModifierDef {
  id: Id;
  scope: TagQueryDef;
  patches: StatPatch[];
  stackingGroup: string;
  priority: number;
}

interface RewardDef {
  kind: "insight" | "stars" | "unlock" | "masteryFlag";
  amount?: number;
  contentId?: Id;
  firstClearOnly?: boolean;
  conditionId?: Id;
}

interface WaveDef {
  id: Id;
  preview: PreviewDef;
  naturalDelay: number;
  earlyCall: { enabled: boolean; economyFormulaId: Id; rechargeFormulaId: Id };
  groups: SpawnGroupDef[];
  completion: "allDefeated" | "allSpawned" | { activePressureBelow: number };
}

interface PreviewDef {
  lanes: Id[];
  countDisclosure: "band" | "exact";
  visibleTags: string[];
  enemyIds: Id[];
}

interface SpawnGroupDef {
  enemyId: Id;
  count: number;
  routeId: Id;
  startOffset: number;
  interval: number;
  formation?: "line" | "pairs" | "burst";
  overrides?: StatPatch[];
}

interface DifficultyDef {
  id: Id;
  globalPatches: StatPatch[];
  tagPatches: { query: TagQueryDef; patches: StatPatch[] }[];
  stagePatches?: Record<Id, StatPatch[]>;
}

interface UpgradeNodeDef {
  id: Id;
  cost: { currency: "insight"; amount: number };
  prerequisites: Id[];
  exclusiveGroup?: Id;
  effects: ConditionalEffectDef[];
}

interface StatPatch {
  stat: StatKey;
  operation: "add" | "multiply" | "override" | "clampMax" | "clampMin";
  value: number;
}

interface EconomyDef {
  id: Id;
  sellRefund: number;
  preWaveOneSellRefund: number;
  earlyCallGold: {
    secondsCoefficient: number;
    waveIndexCoefficient: number;
    cap: number;
  };
  earlyCallCommandRecharge: { secondsCoefficient: number; capSeconds: number };
}
```

### 13.1 Data-model constraints

- Never identify content by array index.
- Never place localized strings, asset file paths, or balance constants in combat code.
- A modifier has an explicit scope query, operation, stacking group, and priority.
- All cooldowns use simulation time; UI time scaling reads the same source.
- Save data stores chosen IDs and schema/content versions, not copied definitions.
- Unknown content IDs in old saves fall back safely and are logged; they do not invalidate the save.
- Content packs may add definitions but cannot silently patch another namespace without declaring a dependency and patch record.

### 13.2 Save model

```ts
interface CampaignSave {
  saveVersion: number;
  completedStages: Record<Id, {
    bestStars: 0 | 1 | 2 | 3;
    bestIntegrity: number;
    completedDifficulties: Id[];
    masteryFlags: Id[];
  }>;
  currencies: { insightEarned: number };
  purchasedUpgradeNodes: Id[];
  unlockedTowerIds: Id[];
  unlockedHeroIds: Id[];
  heroTrainingRank: number;
  heroBuilds: Record<Id, { skillRanks: Record<Id, number> }>;
  seenEncyclopediaCards: Id[];
  settings: { difficultyId: Id; accessibilityProfileId?: Id };
}
```

Insight spent is derived from purchased nodes; Insight available is `earned - spent`. A respec clears purchased nodes atomically and cannot alter earned total.

## 14. Expansion progression plan

The slice is stage 5 or 6 in difficulty, not a tutorial. A full 18-stage campaign can scale as follows:

| Arc | Stages | New strategic vocabulary | Unlock cadence |
|---|---|---|---|
| Verdant March | 1–5 | Ground, Armor, air, two routes, first support | Four chassis by stage 3; second hero by stage 4 |
| Ashen Crown | 6–10 | Ward, tower disruption, stealth/reveal, destructible shortcuts | One new tower at 6 and 9; one hero at 8; Tier-2 doctrines |
| Starless Deep | 11–15 | Spawned adds, aura stacking, route switching with warning, miniboss phases | One tower at 11 and 14; hero at 12; Tier-3 doctrines |
| The Last Root | 16–18 | Combined factions, multi-phase bosses, mastery variants | Final tower/hero before stage 16; Mythic after 18 |

Roster rule once more than five towers are unlocked: choose five towers and two heroes before a stage. The briefing shows terrain interactions and enemy tags but not a prescribed loadout. No campaign stage may have only one valid five-tower set.

New enemies should add one primary verb at a time—shield, heal, disable, split, stealth, summon, route change—then combine existing verbs. Never add enemies whose novelty is only a larger HP bar.

## 15. Balance and validation protocol

### 15.1 Offline metrics

- **Unresisted tower efficiency:** median sustained DPS / total gold, reported by tier and branch. Do not equalize support towers solely by DPS.
- **Effective matchup efficiency:** time-to-kill and gold-to-kill across the counter matrix, including Armor/Ward and realistic exposure windows.
- **Wave liquidity:** projected cumulative available gold at every wave under 0%, 40%, and 80% early-call behavior.
- **Coverage:** path-time in range for every holder/tower range pair; central holders should be flexible, not strictly best by total exposure.
- **Control uptime:** diminishing-return lockouts must prevent a single target from being permanently stunned/teleported.
- **Branch regret:** selling a branch at the first wave where its counter disappears must leave enough refund to purchase a credible answer.

### 15.2 Playtest acceptance gates

- Standard first-clear target for genre-experienced testers: 65–80%; Veteran: 30–50%. These are tuning targets, not claims about current performance.
- At least three distinct tower compositions clear Standard without lost integrity in expert hands.
- No tower chassis appears in more than 85% of successful Standard runs after 100+ representative tests; anti-air requirements count when interpreting Windlass use.
- Each level-IV branch should land between 30% and 70% selection in situations containing its intended matchup. If not, inspect cost, holder geometry, targeting, and encounter mix.
- At least 90% of tester deaths can be attributed by the tester to a visible threat or decision after replay; if not, improve telegraph/UI before lowering difficulty.
- Boss tower-root reaction succeeds at least 80% of the time after the player has seen it once.
- The player has at least two viable purchases at the end of waves 4, 8, and 12; repeated `no useful spend` states indicate bad pricing or holder access.
- No tooltip omits damage type, target restrictions, cooldown, effect radius/duration, or non-stacking rules.

### 15.3 Tuning order

1. Fix unreadable spawns, misleading previews, targeting bugs, and route/holder geometry.
2. Fix economy liquidity and counter availability.
3. Fix oppressive ability timing and control chains.
4. Adjust tower/enemy numbers.
5. Adjust global difficulty multipliers last.

This order follows the strongest lesson in Ironhide's own patches: adding strategic room and fair rewards often solves a stage more cleanly than shaving arbitrary HP.

## 16. Sources

Primary/official sources are preferred for current feature claims and balance rationale. Community wiki pages are used for detailed system behavior that official store copy does not document.

### Official / primary

- Ironhide / Steam, *Kingdom Rush 5: Alliance TD* store description and feature list: https://store.steampowered.com/app/2849080/Kingdom_Rush_5_Alliance_TD/
- Ironhide, *Kingdom Rush Alliance Balance Patch* (2025-02-11): https://www.ironhidegames.com/News/Details/405
- Ironhide, *Abominor Mechanics Update* (2025-01-14): https://kingdomrushalliance.com/News/399
- Ironhide official Steam announcements, including *Dragon Wars Campaign: Balance & Stage Updates (v7.00.60)*: https://steamcommunity.com/app/2849080/announcements/
- Ironhide, *Wukong's Journey* content announcement (stage mechanic and content-pack example): https://www.kingdomrushalliance.com/News/421
- Ironhide, *We Heard You. So We're Changing Course* (Genesis individual tower leveling removed; 2026-07-24): https://www.ironhidegames.com/News/Details/502
- Ironhide, *Kingdom Rush 6: Genesis Is Coming* (official announcement): https://www.ironhidegames.com/News/Details/449

### Community-maintained reference

- Kingdom Rush Wiki, *Kingdom Rush 5: Alliance*: https://kingdomrushtd.fandom.com/wiki/Kingdom_Rush_5%3A_Alliance
- Kingdom Rush Wiki, *Towers — Alliance*: https://kingdomrushtd.fandom.com/wiki/Towers/Alliance
- Kingdom Rush Wiki, *Heroes — Alliance*: https://kingdomrushtd.fandom.com/wiki/Heroes/Alliance
- Kingdom Rush Wiki, *Upgrades*: https://kingdomrushtd.fandom.com/wiki/Upgrades
- Kingdom Rush Wiki, *Difficulty*: https://kingdomrushtd.fandom.com/wiki/Difficulty
- Kingdom Rush Wiki, *Campaign*: https://kingdomrushtd.fandom.com/wiki/Campaign
- Kingdom Rush Wiki, *Strategic Point*: https://kingdomrushtd.fandom.com/wiki/Strategic_Point
- Kingdom Rush Wiki, *Shop — Alliance*: https://kingdomrushtd.fandom.com/wiki/Shop/Alliance
- Kingdom Rush Wiki, *The Wildbeast Den* (representative 15-wave Alliance stage structure): https://kingdomrushtd.fandom.com/wiki/The_Wildbeast_Den
- Kingdom Rush Wiki, *Encyclopedia* (series guidance on counters, wave calls, and stage mechanics): https://kingdomrushtd.fandom.com/wiki/Encyclopedia

### Secondary design analysis

- Daniel Cook, *Kingdom Rush — the wonderful Campaign level design*, Game Developer: https://www.gamedeveloper.com/design/kingdom-rush---the-wonderful-campaign-level-design

## 17. Confidence statement and unresolved empirical work

**Confidence: high** that the structural recommendations—limited loadout, two active heroes, visible wave economy, reversible disruption, fixed first-clear meta rewards, no per-tower grind, and data-driven composition—match both the official feature set and Ironhide's published balance rationale. The no-grind decision is especially current: Ironhide reversed Genesis's individual tower leveling on 2026-07-24, after its demo and before the announced release.

**Confidence: moderate** that the initial combat numbers will create the intended Standard curve without iteration. No paper design can establish final balance because path length, animation timing, targeting, collision, frame-step behavior, and actual player attention materially change effective DPS and stall. The numbers above are coherent starting targets and should be treated as versioned data. They require deterministic simulation, instrumented playtests, and visual QA before being declared final.
