# Production Gate Addendum — Responsive UI, Animation, Burst Stability, Audio

**Status:** release-blocking
**Applies to:** the complete playable browser slice
**Review posture:** hostile; screenshots, metrics, and recordings outrank intent

This addendum exists because broad labels such as “responsive,” “animated,”
“stable,” and “good audio” allowed visible defects through the earlier gate.
Every criterion below needs evidence from the current build. A pass in one
viewport, one wave, one unit type, or one quiet combat sample proves nothing.

## 1. Responsive layout matrix

Required viewports:

| Class | CSS viewport | Required state |
|---|---:|---|
| Large desktop | 1920×1080 | briefing, combat, selection, boss, pause |
| Desktop | 1600×900 | same |
| Laptop | 1366×768 | same |
| Reference desktop | 1280×720 | same |
| Tablet landscape | 1024×768 | same |
| Phone landscape A | 844×390 | combat, selection, ability target, pause |
| Phone landscape B | 740×360 | same |
| Phone portrait A | 430×932 | briefing, combat, selection, pause |
| Phone portrait B | 390×844 | same |

Stop-ship conditions:

- A critical route segment, spawn, gate, selected tower crown, hero, boss tell,
  or current target is covered by persistent chrome without one-action recovery.
- A button is clipped, smaller than 44×44 CSS pixels on touch layouts, offscreen,
  or only reachable by browser-page scrolling.
- DOM-to-canvas pointer mapping selects another world object after resize, DPR
  change, browser zoom, portrait panning, or orientation change.
- Modal content exceeds the safe viewport without contained scrolling, or the
  page itself scrolls behind a modal.
- Text truncates, wraps into another control, falls below 12 CSS pixels for
  secondary text, or below 14 CSS pixels for a critical live value.
- HUD occupancy exceeds 20% of desktop or 28% of mobile viewport pixels during
  ordinary combat.

Evidence:

1. lossless screenshot of every matrix cell;
2. bounding-box assertion for every critical control;
3. exact selection/upgrade click after resize at every class;
4. visual-diff baseline for briefing, combat, tower panel, and pause;
5. keyboard-only pass on desktop and touch-target pass on mobile.

## 2. Animation system

Every hero, defender, ground enemy, flying enemy, and boss needs independently
readable states for idle, locomotion, anticipation, release/impact, recovery,
hurt, defeat, and return/respawn where applicable. Towers need idle mechanism,
target acquisition, anticipation, release, recoil, recovery, upgrade, disabled,
and specialization-specific motion language.

Stop-ship conditions:

- Locomotion uses a static sprite with container bob as its principal motion.
- Attack anticipation, gameplay release, visual contact, damage presentation,
  and sound transient disagree by more than 80 ms at 1× or 2×.
- More than three nearby actors begin the same loop on the same frame.
- Mirroring produces impossible weapon handedness, backwards VFX, or a shifting
  foot anchor.
- A hurt response erases attack readability, or repeated damage permanently
  restarts a sprite before a key pose can be seen.
- Death is a generic alpha fade with no class-specific silhouette break.
- The boss uses an enlarged ordinary-enemy loop for any phase transition.
- Towers of different families share the same anticipation/recoil curve.
- Reduced-motion mode removes gameplay-critical tells instead of only reducing
  decorative travel, shake, and ambient motion.

Objective checks:

- frame-stepped contact sheets for every state and actor family;
- 60 fps capture at 1× and 2× with release/contact/audio markers;
- phase-randomization histogram for 20 simultaneously visible actors;
- foot-anchor drift under 3 logical pixels for grounded loops;
- no animation-owned mutation of authoritative position, health, cooldown, or
  targeting state.

## 3. Burst-wave and 2× stability

Canonical stress scenario: begin a fresh Warden run, call three consecutive
waves at the earliest legal frame, switch to 2× before the second call, maintain
at least six firing towers, two heroes, and one Aegis cohort, then run for 90
real seconds or until all three waves resolve.

Stop-ship conditions:

- update loop hangs, requestAnimationFrame stops, input is ignored for more than
  250 ms, or the wave cannot clear;
- a single render delta expands into an unbounded fixed-step catch-up loop;
- queued presentation events prevent wave/victory state from advancing;
- projectile, tween, timer, event, view, audio voice, or particle counts grow
  after their owners are dead or removed;
- 1× and 2× produce different deterministic result hashes for the same input
  schedule;
- live enemies exceed authored spawn totals, a UID is duplicated, or a queued
  group is emitted twice;
- p95 frame time exceeds 33.3 ms on the reference desktop after a five-second
  warm-up, excluding capture instrumentation.

Required automated coverage:

- simulation test with three overlapping waves and large deltas;
- browser test that calls waves and toggles speed through player-facing inputs;
- bounded delta/catch-up assertion;
- entity and presentation-event high-water telemetry;
- end-of-scenario assertion that pending queues and transient views return to a
  bounded idle level.

## 4. Audio direction and mix

The score must be a composition, not a repeating pitch list. Minimum musical
grammar: eight-bar or longer harmonic form, a recognizable lead, independent
counterline, deliberate cadence, orchestration change, rhythmic development,
and calm/active/crisis/boss state behavior. MIDI files and General MIDI playback
are prohibited. Real-time synthesis is acceptable only when articulation,
voicing, space, dynamics, and arrangement form a coherent authored sound.

Critical cue families:

| Family | Required distinction |
|---|---|
| Thorn | string release, wooden transient, narrow high impact |
| Ember | low ignition, pressure burst, weighty area impact |
| Aegis | metal/stone deployment and shield contact |
| Astral | pitched glass/energy partials with a soft spatial tail |
| Heroes | separate weapon/ability/defeat/respawn identities |
| Enemies | body-weight death variation; boss never shares fodder cues |
| System | click, invalid action, build, upgrade, sell, wave, leak, reward |

Stop-ship conditions:

- obvious eight-note loop, unvarying attack click, default oscillator beep, or
  General MIDI timbre dominates a 60-second capture;
- two simultaneous restarts stack music schedulers, ambience, or reverbs;
- 2× game speed changes music pitch or destabilizes musical time;
- pause, tab visibility, resume, or device interruption loses the score clock or
  creates a burst of late notes;
- dense combat masks leak, boss warning, ability-ready, hero-defeat, or wave cues;
- output clips, DC-pops, or changes perceived level by more than 6 dB between
  calm and active states;
- common sounds lack at least three cosmetic variations in pitch, transient, or
  layer balance;
- master, music, effects, and ambience do not have persistent, immediate controls;
- a critical cue lacks a visual equivalent.

Mix evidence:

1. 90-second calm → active → crisis → boss recording;
2. isolated cue sheet and dense-combat capture;
3. peak at or below −1 dBFS after the mastering bus;
4. pause/resume and restart source-count audit;
5. 0/25/50/75/100% control sweep;
6. muted golden-path completion.

## 5. Critic protocol

Each specialty critic returns `SHIP` or `NO-SHIP`, confidence, scored rubric,
evidence paths, and only material blockers. The critic must reproduce at least
one failure candidate rather than reviewing screenshots alone. A workstream
cannot approve itself. After a fix, the same critic rechecks the exact failing
scenario plus one neighboring regression scenario.

The integrated build ships only when the responsive, animation, stress, audio,
and final battlefield critics all return `SHIP` and every automated suite is
green on the same working tree.
