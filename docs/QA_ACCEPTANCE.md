# Premium Tower-Defense Vertical Slice — QA Acceptance Contract

**Document status:** release-blocking
**Benchmark:** the presentation, combat legibility, tactical communication, and interaction finish of *Kingdom Rush 5: Alliance* (KR5), judged only from public official media or a legally obtained retail copy; the current *Kingdom Rush 6: Genesis* demo may be used as a secondary forward-looking presentation reference
**Target:** current desktop and mobile browsers
**Confidence:** high for the quality gates and web-platform criteria; moderate for inferred feel/readability criteria because those require human playtests

This is a hostile acceptance contract. “Pretty,” “fun,” “polished,” and “AAA” are not test results. The slice passes only when the evidence below exists and the release gates are green. A functioning game with placeholder-feeling art, unreadable combat, a dominant strategy, a generic web-app HUD, brittle input, or a ceremonial progression screen fails.

The granular responsive, animation, three-wave/2× stability, and adaptive-audio
rejection criteria live in
[`RESPONSIVE_ANIMATION_AUDIO_GATES.md`](./RESPONSIVE_ANIMATION_AUDIO_GATES.md).
That addendum is release-blocking and takes precedence where it is stricter.

The benchmark is a quality bar, not permission to copy Ironhide art, characters, maps, text, audio, trade dress, or UI. Comparison must evaluate craft and usability with original assets and an original visual identity.

---

## 1. Release verdict and severity gates

### 1.1 Severity definitions

| Severity | Meaning | Representative examples |
|---|---|---|
| **P0 — stop-ship** | The game cannot be started, completed, trusted, or safely operated on a required platform. Data corruption, a hard lock, nondeterministic core rules, or a path that makes the level unwinnable without player fault is P0. | Blank canvas; boot crash; stuck loading; no playable input; wave never completes; victory/failure cannot exit; progress erased; simulation changes with refresh rate; audio feedback loop; unrecoverable WebGL/canvas failure. |
| **P1 — benchmark failure** | The golden path works but a major quality, clarity, balance, performance, accessibility, or presentation defect makes the slice visibly below a premium commercial tower-defense game. | Combat cannot be parsed under load; tutorial does not teach a required counter; clipped/overlapping HUD; wrong damage/resistance result; one strategy trivially dominates; sustained sub-50 fps on the reference tier; missing hit/death feedback; generic placeholder styling; critical state communicated only by color or sound. |
| **P2 — polish defect** | Localized imperfection that does not break strategy or completion but remains visible, audible, or inconsistent. | One-frame sprite pop; minor kerning issue; a quiet missing UI sound; small alignment drift; low-priority tooltip wording; cosmetic animation seam. Repetition or clustering promotes P2 to P1. |

### 1.2 Non-negotiable verdict rules

A release candidate is **rejected** if any of the following is true:

1. Any P0 is open, intermittent, waived, or “cannot reproduce.”
2. Any P1 is open on a required browser, viewport, input mode, or golden-path state.
3. Any player-visible P2 remains on the golden path (boot → onboarding → one complete battle → victory → upgrade/replay).
4. More than three P2s remain outside the golden path, or two P2s share one root cause or one screen.
5. A required test has no attached evidence. “Tested locally” is not evidence.
6. The deterministic suite, viewport matrix, performance stress capture, accessibility pass, or blind visual benchmark is absent or red.
7. The build uses unlicensed or benchmark-derived assets, copied layouts, copied names, or copied dialogue.

No defect may be downgraded because it is difficult to fix, because the deadline is close, or because the reviewer has become accustomed to it.

### 1.3 Definition of “AAA-parity vertical slice”

The claim applies only to the bounded slice, not to the content volume of a multi-year commercial game. At minimum, the submitted slice must contain:

- one original, authored 10–15 minute map with at least two lanes or a meaningful path junction, 12+ waves, environmental storytelling, one scripted escalation, and one boss phase;
- five meaningfully different loadout towers, each with four in-battle tiers and two final specializations or ability choices;
- two controllable heroes with distinct battlefield roles, readable selection states, movement/rally commands, defeat, and recovery;
- reinforcements plus two hero/ultimate abilities with distinct tactical timing;
- at least eight enemies spanning fodder, swarm, armored, magic-resistant, fast, flying or path-bypassing, support, elite, and boss behaviors (one enemy may fill more than one role);
- campaign/map, loadout, battle, pause/settings, bestiary or inspect, victory, failure, upgrade, and replay states;
- three difficulty presets whose rules are stated in player-facing language;
- persistent, resettable progression that demonstrates at least three consequential purchases and one mutually exclusive branch.

A smaller content set can be a prototype. It cannot pass this contract as the requested premium vertical slice.

---

## 2. Benchmark facts that must inform the design

The benchmark is not merely an art target. Current KR5 public material describes a combat grammar built around specialized tower selection, two heroes, three abilities, enemy resistances, wave economies, and persistent upgrades:

As of **2026-07-28**, *Kingdom Rush 6: Genesis* is scheduled for 2026-09-24 and is not yet a released retail game; an official demo has been available since 2026-06-15. The retail-quality pass/fail anchor is therefore KR5. The Genesis demo may inform current presentation expectations, but its incomplete balance, content, reviews, and work-in-progress behavior must not silently redefine the benchmark. [S13][S14]

- Ironhide’s current press kit advertises 18 towers with special skills, 16 heroes with two used per stage, 25 campaign stages, three modes, 45+ enemies, five landscapes, and boss fights. Those numbers set an expectation of authored variety even though this slice intentionally proves only one level. [S1]
- The KR5 gameplay summary describes taking five specialized towers into battle, upgrading them four times, controlling two heroes, and combining reinforcements with hero-determined spells. [S2]
- KR’s counter grammar distinguishes physical armor, magic resistance, and true damage. A premium slice must make counter choice legible before failure, not hide it in a spreadsheet. [S3]
- The series’ progression model couples campaign completion to permanent upgrades; current KR5 upgrade examples change range, sell reimbursement, early-wave income, respawn time, explosion behavior, and cooldowns. This is a useful model because it changes decisions, not merely damage numbers. [S4]
- Earlier KR entries visibly tied 1–3 stars to lives remaining and let players reset permanent upgrade spending. That creates a performance goal and supports experimentation. [S4][S5]
- KR5 exposes enemy information during battle and supports drag movement for heroes, reducing the cost of learning in the moment. [S2][S6]

The slice therefore fails if its “progression” is only a linear percentage ladder, its enemies are only reskinned health pools, or its tower choices collapse into one DPS ranking.

---

## 3. Required evidence packet

Every release candidate must be versioned with one immutable build ID and include:

1. browser/OS/device matrix with pass/fail, timestamp, tester, and build SHA;
2. Playwright report, unit/simulation report, accessibility scan, and manual accessibility checklist;
3. deterministic result hashes for the canonical scenarios in §16;
4. raw performance traces for cold boot and the worst combat wave;
5. one uninterrupted capture of a first-time play session and one expert 3-star clear;
6. lossless screenshots for every state in §17, plus automated diff output;
7. blind A/B comparison pack, randomized assignment key, anonymized ballots, and calculated result;
8. audio mix capture and a table proving each critical audio cue has a visual equivalent;
9. current known-issues list, including zero-item sections rather than omitted sections;
10. attribution/license inventory for every shipped font, texture, icon, sound, music cue, library, and generated asset.

Missing evidence is a failed test, not an “unknown.”

---

## 4. Acceptance matrix — boot, recovery, and lifecycle

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| BOOT-01 | P0 | A fresh session reaches a visibly intentional loading state and then an actionable title/map state. | 30/30 cold boots on each required browser; no blank frame longer than 500 ms after first paint; no unhandled exception, rejected promise, failed required asset, mixed-content error, or endless spinner. |
| BOOT-02 | P1 | Loading communicates brand, progress, and readiness without fake completion. | Monotonic progress tied to real asset groups; first actionable screen ≤2.5 s desktop broadband and ≤5.0 s on the defined mobile/4G tier; 90th percentile over five cold runs. |
| BOOT-03 | P0 | Refresh, background/foreground, and visibility changes cannot corrupt simulation or progress. | Refresh each major state; background battle for 30 s; resume. The game either pauses explicitly or advances by documented rules. No catch-up death burst, duplicate music, timer jump, or save rollback. |
| BOOT-04 | P1 | Required assets fail gracefully. | Block one noncritical audio/image request: fallback is coherent and the level remains playable. Block a critical level bundle: a themed error gives retry/back navigation and never exposes stack traces. |
| BOOT-05 | P1 | Browser zoom, DPR change, and resize do not reset or duplicate state. | During waves 1, midpoint, boss, pause, victory: resize and change zoom 80/100/125/200%. Unit positions, health, cooldowns, gold, wave number, and input state remain valid. |
| BOOT-06 | P0 | Save versioning is safe. | Load empty, valid, malformed, and one-version-old data. Malformed data is quarantined/reset with explicit notice; migration is deterministic; no crash or silent loss of valid progress. |
| BOOT-07 | P1 | Audio starts only after permitted user activation and resumes correctly. | Safari/Chrome autoplay policies produce no errors. One gesture unlocks audio; pause/resume never stacks sources or restarts all cues. |

---

## 5. Acceptance matrix — onboarding and learnability

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| ONB-01 | P1 | A new player reaches the first meaningful tower choice in ≤45 s without a manual. | Five first-time strategy-game players; at least 4/5 act without facilitator intervention. More than two full-screen text panels before control is a failure. |
| ONB-02 | P0 | Every required verb is taught before it becomes mandatory. | Build, inspect range, upgrade, sell, move/rally hero, deploy reinforcements, cast ability, call wave early, pause, change speed, and inspect enemy are introduced contextually before the first forced use. |
| ONB-03 | P1 | The tutorial teaches reasoning, not button coordinates. | The player is told why armor favors magic, why swarms favor area damage, and why blockers create firing time. Hints survive responsive layout and input changes. |
| ONB-04 | P1 | Tutorials do not steal inputs or cause losses. | Time pauses when a blocking instruction appears. Focus is placed deliberately. Dismiss/build targets cannot click through. Returning players can skip, revisit, or reset tutorials. |
| ONB-05 | P1 | New threats are explained at the moment they can be understood. | The first armored, resistant, flying/bypass, support, elite, and boss behavior gets a concise card/inspect affordance. Enemy remains inspectable later. Card never covers the relevant path or expires before it can be read. |
| ONB-06 | P1 | Unassisted novice success is credible. | At least 4/5 first-time testers complete waves 1–5 on Standard and can correctly answer: which tower counters armor, what gold buys, what a leak costs, and how to redirect a hero. |
| ONB-07 | P2 | Copy is concise, specific, and tonal. | No tutorial body exceeds 35 words; no unexplained stat acronym; terminology exactly matches buttons/tooltips; no placeholder, lorem ipsum, or generic system voice. |

---

## 6. Acceptance matrix — combat readability

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| READ-01 | P1 | Route, spawn, exit, build pads, blocked enemies, and current threat are readable at a glance. | In a 2-second screenshot exposure, ≥8/10 testers identify the exit, active lane, buildable pads, and enemy closest to leaking. |
| READ-02 | P1 | Every enemy class has a distinct silhouette, gait, scale, value grouping, and death read. | Grayscale and 50%-scale contact sheets remain identifiable at ≥80% accuracy; elite/boss cannot be mistaken for fodder; no recolor-only enemy variants on the slice’s golden path. |
| READ-03 | P1 | Towers are readable by family, tier, allegiance/theme, firing direction, and selected state. | At 100% gameplay zoom, 8/10 testers identify tower role and relative tier without opening the tooltip. Final specialization changes silhouette, weapon, VFX, and audio—not just tint. |
| READ-04 | P0 | Targeting, projectile impact, health change, death, gold reward, leak, and life loss agree with simulation. | Frame-stepped canonical scenarios; no “ghost” hits, visually missed damage, delayed health bars, wrong impact target, double death, or reward without a kill. |
| READ-05 | P1 | Resistance and immunity are obvious before wasted spending becomes fatal. | Damage type and resistance use icon + text/pattern, never color alone. Reduced/immune hits have distinct feedback. Inspect panel states exact current values and abilities. |
| READ-06 | P1 | Effects preserve the tactical picture at peak density. | Worst-wave screenshot and 10 s capture: path edges, exit, selected unit, health bars under 35%, boss tell, and placement pads remain visible. No critical unit is fully obscured for >500 ms by friendly VFX. |
| READ-07 | P1 | Threat tells are early and honest. | Boss/elite wind-ups provide enough time for the intended response; telegraph, hit area, timing, and damage agree within one simulation tick. Offscreen/occluded threats produce directional warning. |
| READ-08 | P1 | Range and rally geometry are trustworthy. | Preview matches effective range/path within one logical pixel/tile; invalid rally/placement explains why; moving a hero never silently chooses a different disconnected lane. |
| READ-09 | P2 | Idle/environment animation supports place without competing with state changes. | No ambient loop resembles a projectile, spawn warning, selectable glow, status effect, or ability-ready pulse. |
| READ-10 | P1 | Camera framing never hides decisive information. | Spawn, exit, active threats, boss health, currency, lives, wave, and abilities are visible or recoverable in one action at every required viewport. No uncontrolled camera shake displaces a click target. |

---

## 7. Acceptance matrix — tactics, balance, and scalable progression

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| TAC-01 | P1 | The five towers occupy distinct jobs and opportunity costs. | Design sheet and telemetry show at least: reliable physical single-target, magic/armor answer, area/splash, blocking/stall, and a hybrid/control role. Each has a documented weakness and at least two encounter segments where it is a rational buy. |
| TAC-02 | P1 | Enemy composition forces adaptation without hard-locking one answer. | The level includes armored, magic-resistant, swarm, fast, support, and airborne/bypass pressure. Every threat has at least two viable responses; no single tower type is mandatory at one exact pad. |
| TAC-03 | P1 | Upgrade-versus-expansion is a real choice. | At three scripted economy checkpoints, both “upgrade an anchor” and “add coverage/control” can lead to a 3-star Standard clear in expert tests. One option must not dominate expected value in all three. |
| TAC-04 | P1 | Hero movement and blocking create tactical value rather than chores. | Two heroes have distinct roles; rallying changes an outcome in canonical scenarios; commands are acknowledged immediately; pathing is stable; optimal play does not demand commands more often than once every three seconds for sustained periods. |
| TAC-05 | P1 | Active abilities have different timing questions. | One ability favors clustered timing, one creates stall/control or rescue, and reinforcements create spatial blocking. Cooldowns, preview, ready cue, target rules, and failure refund behavior are explicit. |
| TAC-06 | P1 | Calling a wave early creates a visible risk/reward tradeoff. | Bonus gold or cooldown benefit is displayed before confirmation; result is deterministic; early calls cannot overlap tutorial locks or create invisible spawns; at least two waves present a legitimate “now or wait” decision. |
| TAC-07 | P0 | Economy and combat math are internally exact. | Costs, refunds, bounty, DPS ranges, cooldowns, resistances, area falloff, lives, and displayed totals match simulation tests. Currency cannot go negative or be spent twice. |
| TAC-08 | P1 | At least three materially different strategies can earn the top rating on Standard. | Three expert recordings use different tower-spend distributions (no two with >70% spend in the same families) and different hero/ability emphasis. All end with the top life threshold. |
| TAC-09 | P1 | No universal dominant build trivializes the map. | Automated/replay search across ≥100 valid seeded purchase scripts plus human challenge runs. A single unchanged build order may not achieve the top rating on all three difficulties or ignore both final specializations. |
| TAC-10 | P1 | Difficulty changes decision pressure, not just opacity or unfair numbers. | Player-facing description and data diff exist. Each preset preserves counter logic and telegraph reaction time. Standard passes novice target; Hard changes composition/timing/economy; highest difficulty may change stats but cannot introduce offscreen or untelegraphed failure. |
| TAC-11 | P1 | Persistent rewards improve expressive options rather than erase counters. | At least three purchase types affect different verbs (for example economy/refund, range/positioning, reinforcement cadence). At least one mutually exclusive branch has two situationally valid choices and can be reset without penalty. |
| TAC-12 | P1 | Stage rating is performance-linked and transparent. | End state shows lives preserved and exact 1/2/3-star thresholds. Replaying can improve the rating and reward exactly once. No grind-only currency is required to make the base stage fair. |
| TAC-13 | P1 | Progression scales without runaway power. | Fully purchased slice progression improves expert clear time or safety by a bounded, documented amount (target 15–30%), never bypasses a resistance, boss mechanic, or required player verb, and is included in difficulty balance tests. |
| TAC-14 | P1 | Numerical choices expose their consequence. | Upgrade cards show cost, current → next values, damage type, cooldown, area/range, and special rule. “Better,” “stronger,” and unlabeled bars are insufficient. |
| TAC-15 | P2 | Bestiary/inspect supports strategy and discovery. | Encountered enemies reveal exact HP/resistance/speed/bounty/abilities; unseen content remains intentionally hidden; information matches runtime data rather than duplicated hand-authored numbers. |

---

## 8. Acceptance matrix — feel, animation, and interaction

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| FEEL-01 | P1 | Pointer/touch down produces visible acknowledgement within one presented frame; game action begins promptly. | High-speed/video or event instrumentation: acknowledgement ≤50 ms at p95 desktop, ≤80 ms mobile; input-to-next-paint ≤100 ms at p95 during worst wave. |
| FEEL-02 | P1 | Selection is stable and reversible. | Selected pad/tower/hero has one unmistakable state; tapping empty space closes contextual UI; clicks do not fall through; double tap/click cannot double-buy; Escape/Back closes one layer at a time. |
| FEEL-03 | P1 | Build and upgrade animations communicate gameplay timing. | Construction becomes active on the exact readable frame; weapon anticipation/release/impact align; sell/upgrade cannot leave invisible colliders, target references, or stale range rings. |
| FEEL-04 | P1 | Hits have material-specific weight without obscuring information. | Physical, magic, explosive, blocked, resisted, critical/special, and boss hits differ through at least two of motion, shape, sound, timing, or impact response. Screen shake is sparse, bounded, and disableable. |
| FEEL-05 | P1 | Movement looks grounded and is simulation-safe. | Units do not moonwalk, slide, foot-skip visibly, overlap formation indefinitely, snap across corners, or diverge from hitboxes. Render interpolation cannot change combat outcome. |
| FEEL-06 | P1 | Pause and speed controls are exact. | Pause freezes simulation, cooldowns, VFX timeline, and spatial audio as documented; UI remains responsive. Speed modes produce the same result hash and do not pitch-shift audio unless designed. |
| FEEL-07 | P2 | Animation quality is authored, not procedural mush. | Key poses read in silhouettes; loops have no visible seam; attack/death variants avoid obvious synchronized repetition; no tween uses default browser easing without art-direction rationale. |
| FEEL-08 | P2 | Reward cadence has restraint and escalation. | Normal kill, elite kill, wave clear, upgrade, ability ready, boss defeat, and stage victory have increasing feedback weight; none reuse the exact same animation/sound stack. |

“Physics” are accepted when they serve clarity. Decorative particles, knockback, ragdoll-like debris, and camera impulses must never drive authoritative damage, targeting, blocking, or path position.

---

## 9. Acceptance matrix — visual art and world presentation

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| ART-01 | P1 | The game has one written visual direction and every surface follows it. | Art bible names shape language, line weight, value structure, palette, materials, lighting, scale, typography, VFX, and motion. Contact sheet reveals no stock-icon, AI-style, or resolution mismatch. |
| ART-02 | P1 | The map has authored composition and gameplay hierarchy. | Grayscale/value and blur tests keep paths, pads, threats, exits, and focal landmark readable. Decorative contrast never exceeds active-combat contrast in the same region. |
| ART-03 | P1 | Assets survive native output. | No blurry UI text, nearest/bilinear mismatch, haloed alpha edge, compression block, texture seam, inconsistent pixel density, cropped shadow, or stretched nine-slice at any required DPR. |
| ART-04 | P1 | Towers and heroes show premium state progression. | Base → max tier contact sheets show structural growth, new functional parts, material evolution, and clean anchors. Heroes have readable idle/move/attack/cast/hit/defeat/revive states. |
| ART-05 | P1 | VFX language is systematic. | Friendly/enemy, physical/magic, buff/debuff, warning/damage, and interactable/ambient categories have documented palettes/shapes. No two opposed meanings share the same cue. |
| ART-06 | P1 | Lighting, shadows, and depth cues agree. | One key-light direction; consistent contact shadows; projectiles and flyers occupy coherent depth; no unit appears pasted on, floating accidentally, or hidden behind incorrect draw order. |
| ART-07 | P1 | The UI is diegetically thematic without sacrificing clarity. | Menus read as part of the game’s world, not a SaaS dashboard or default component kit. Ornament frames hierarchy and never reduces contrast/touch area. |
| ART-08 | P2 | The environment feels alive at rest. | At least three subtle ambient systems and one contextual event are present, desynchronized, performant, and subordinate to combat. |
| ART-09 | P1 | The boss is a visual event. | Unique entrance, silhouette, health presentation, phase transition, attacks, defeat, and aftermath. No standard enemy scaled up with extra particles. |
| ART-10 | P1 | Originality survives benchmark comparison. | Independent art review finds no traced pose, copied composition, copied UI frame, confusingly similar unit, or benchmark asset in build/source. Similarity review is attached. |

---

## 10. Acceptance matrix — HUD, menus, and information architecture

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| UI-01 | P1 | Critical combat information has an obvious hierarchy. | Lives, gold, wave, speed/pause, selected-context actions, hero health, and ability cooldowns are readable without searching. Rare information lives behind inspect/pause, not permanent panels. |
| UI-02 | P1 | Normal-play HUD protects the battlefield. | Persistent UI covers ≤20% of desktop pixels and ≤28% of mobile pixels; center and lower-middle route remain clear. Temporary contextual UI closes automatically or in one action. |
| UI-03 | P1 | Every action has affordance, state, and consequence. | Buttons have default/hover/focus/pressed/disabled/selected states; disabled actions say why; cost failures identify the shortfall; destructive reset asks confirmation. |
| UI-04 | P0 | Displayed state is authoritative. | Gold, lives, wave, cooldown, health, upgrade cost, sell refund, stars, and progression update on the simulation transaction and never drift, flicker backward, or show stale values. |
| UI-05 | P1 | Context panels enable comparison. | Current and next tower stats are aligned and unit-labeled; branches remain visible together; tower range remains previewed; opening a panel pauses only if explicitly designed. |
| UI-06 | P1 | Layering and focus are deterministic. | Exactly one modal layer accepts input; focus is trapped only inside a modal and returns to invoker; gameplay hotkeys do not fire while typing/adjusting settings; z-order has no exceptions. |
| UI-07 | P1 | Typography remains legible over motion. | Text has sufficient backing/edge contrast; minimum critical combat text 14 CSS px desktop and 16 CSS px mobile; numbers do not jitter horizontally; truncation is absent in all supported strings. |
| UI-08 | P2 | Microcopy is consistent and grammatical. | One term per concept; numerals, percent signs, time units, capitalization, punctuation, and key labels follow a written style sheet. |
| UI-09 | P1 | Settings are complete and persistent. | Master/music/SFX/voice sliders, mute, motion/shake, display/quality, UI scale, color-access options, and control help apply immediately, persist, and offer defaults/reset. |
| UI-10 | P1 | Pause makes state and exit choices unambiguous. | Pause label is visible; resume/restart/settings/map actions are distinct; restart/quit confirmation states consequence; no enemies move beneath pause UI. |

---

## 11. Acceptance matrix — audio

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| AUD-01 | P1 | Music, ambience, combat, UI, voices, and rewards form a controlled mix. | Captured full run has no clipping, DC pop, unintended silence, masking of boss/wave warnings, or >6 dB loudness jump between normal states. Master output peak ≤−1 dBFS. |
| AUD-02 | P1 | Critical states have distinct cues and visual equivalents. | Wave start/early call, leak/life loss, ability ready, invalid action, hero defeat/revive, boss tell/phase, victory, and failure each have a recognizable cue; all are understandable muted. |
| AUD-03 | P1 | Repetition is controlled. | Common attacks/impacts/deaths use variants and bounded pitch/volume randomization driven by cosmetic PRNG; 60-second single-tower capture does not produce obvious machine-gun sameness or phase cancellation. |
| AUD-04 | P1 | Spatial priority helps locate action. | Panning/attenuation is subtle and stable; offscreen danger remains audible; UI/reward cues are not spatialized; dense combat uses voice limits and priority stealing without cutting critical cues. |
| AUD-05 | P1 | Music responds to battle structure. | At least calm, active, boss, victory, and failure states transition on musical or intentionally designed boundaries; pause/background behavior is correct; repeated restarts do not layer stems. |
| AUD-06 | P1 | Sliders and mute are trustworthy. | 0% is silent, 100% does not clip, curves offer usable mid-range, mute prevents new voices, state persists, and changing devices/visibility does not reset it. |
| AUD-07 | P2 | Sounds match materials and animation. | Wood, stone, metal, magic, flesh/armor, UI parchment/material, projectile release, and impact sound intentional; no downloaded-library cue is conspicuously unprocessed or off-theme. |

---

## 12. Acceptance matrix — responsive layout and browsers

Required viewports: **360×800, 390×844, 844×390, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080, and 2560×1440**, at DPR 1 and 2 where supported. Required current browser families: latest two stable major versions of Chromium, Firefox, and Safari/WebKit.

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| RESP-01 | P0 | Every required viewport can start, play, pause, win/fail, and replay. | Automated smoke plus manual full clear on the smallest portrait, smallest landscape, common desktop, and largest desktop. No control leaves the viewport. |
| RESP-02 | P1 | The map composes rather than stretches. | Aspect-ratio changes preserve world proportions, useful route visibility, targeting coordinates, and art sharpness. Letterboxing, if used, is themed and not counted as usable HUD area. |
| RESP-03 | P1 | HUD changes structure at breakpoints. | Clusters stack/collapse intentionally; no scale-to-fit microscopic desktop UI; no overlapping wave call, ability, hero, or selected-tower panel; safe-area insets are honored. |
| RESP-04 | P1 | Touch input is first-class. | Primary targets are ≥44×44 CSS px; adjacent destructive/expensive actions have ≥8 px separation; drag has tap/keyboard alternative; hover-only information is absent. |
| RESP-05 | P1 | Zoom and text sizing remain usable. | At 200% page zoom and 200% UI scale where exposed, menus reflow, essential values stay visible, no horizontal page scroll traps input, and battle can still be paused/exited. |
| RESP-06 | P1 | Pointer, touch, keyboard, and hybrid switching work in one session. | Switch input modes during selection, drag/rally, targeting, pause, and modal screens. Focus rings do not appear spuriously on pointer use but remain obvious for keyboard use. |
| RESP-07 | P1 | Unsupported orientation or capability is handled deliberately. | If portrait gameplay cannot retain the authored map, provide an accessible orientation prompt plus pause; never crop controls or silently degrade targeting. Browser/feature errors identify minimum requirement and recovery. |
| RESP-08 | P1 | Browser chrome and scrolling cannot steal the battle. | No accidental page scroll/zoom during intended gestures; browser Back has explicit behavior; fullscreen is optional; loss of fullscreen does not change simulation or layout state. |

---

## 13. Acceptance matrix — performance and reliability

### Reference tiers

- **Desktop tier:** 4-core 2019-class laptop CPU, integrated graphics, 8 GB RAM, current Chromium, 1920×1080, DPR 1, no thermal throttling.
- **Mobile tier:** Pixel 6 / iPhone 12 class device or calibrated equivalent, 390×844 and 844×390, DPR 2–3, current Chrome/Safari.
- **Network tier:** cold cache, 10 Mbps down / 1 Mbps up / 100 ms RTT for mobile-load tests; warm cache for restart/replay tests.
- **Stress scene:** final non-boss wave at maximum expected simultaneous units/projectiles/effects plus both heroes, all ability effects, open contextual HUD, and active audio.

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| PERF-01 | P1 | Desktop combat presents at 60 fps under expected worst load. | 60 s trace: p95 presented frame ≤16.7 ms, p99 ≤33.4 ms, no task >100 ms during active control, and no contiguous visible stall >50 ms. |
| PERF-02 | P1 | Mobile remains responsive under expected worst load. | 60 s device trace: median ≥55 fps, p95 frame ≤33.4 ms, input-to-next-paint p95 ≤120 ms, no thermal-collapse trend over three consecutive runs. |
| PERF-03 | P1 | Simulation cost is bounded and independent of presentation. | Fixed-tick profile publishes unit/projectile caps; render degradation changes particles/shadows only, never AI, targeting, spawn, hit, or economy results. |
| PERF-04 | P1 | Memory reaches a plateau. | Five restart cycles and 20 minutes of play: retained heap after GC grows <10% from the post-first-run baseline; no detached canvas/audio nodes; total tab memory stays within 300 MB desktop / 220 MB mobile tier. |
| PERF-05 | P1 | Asset delivery is intentional. | Initial interactive payload ≤6 MB compressed; full slice transfer ≤40 MB compressed; fonts are subset/preloaded; no duplicate textures/audio; large media streams or lazy-loads before needed. |
| PERF-06 | P0 | Frame drops cannot change game outcome. | Canonical run at forced 30, 60, 90, 120, and 144 Hz produces identical result hash; CPU stall injection does not skip spawns, attacks, cooldown boundaries, or input transactions. |
| PERF-07 | P1 | Context loss and resource pressure recover. | Simulate canvas/WebGL context loss where applicable, audio-context interruption, tab sleep, and low-memory reload. Show recovery/retry; never corrupt progress or continue invisibly. |
| PERF-08 | P1 | No runaway console/network noise. | Full run: zero console warnings/errors from owned code, zero repeating failed requests, zero per-frame allocations visible as regular GC spikes, and no analytics/network request in the render tick. |

The web rendering reference explains why a nominal 60 Hz display leaves roughly 16.7 ms per frame and recommends keeping work nearer 10 ms to leave browser overhead. [S7]

---

## 14. Acceptance matrix — accessibility

The applicable interface target is WCAG 2.2 AA, plus the game-specific requirements below. WCAG explicitly covers keyboard access, visible/unobscured focus, contrast, non-color communication, pointer alternatives, animation, and target size. [S8]

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| A11Y-01 | P0 | All menus and every gameplay verb are keyboard operable with no trap. | Complete golden path without pointer: cycle pads/units, build, upgrade, sell, rally heroes, target abilities, inspect enemy, call wave, speed, pause, settings, victory/replay. Focus order follows visual order and returns after modals. |
| A11Y-02 | P1 | Canvas actions have semantic, inspectable equivalents. | Accessible control layer exposes selected object name, role, health/state, cost, range, available actions, and disabled reason. Dynamic critical changes use restrained live announcements. |
| A11Y-03 | P1 | Meaning never depends on color, audio, fine motion, or shape alone. | Resistance, damage type, team, ability readiness, target validity, health danger, wave direction, and boss tells use at least two channels, including icon/text/pattern. |
| A11Y-04 | P1 | Contrast and focus meet WCAG 2.2 AA in real screenshots. | Automated sampling plus manual check over light/dark/moving backgrounds; text ≥4.5:1 (or 3:1 for qualifying large text), meaningful graphics/UI states ≥3:1, focus never obscured. |
| A11Y-05 | P1 | Motion and flashes are safe and configurable. | `prefers-reduced-motion` is honored on first load; motion/shake toggle persists; no content flashes more than three times per second; essential tells remain when particles/shake are reduced. |
| A11Y-06 | P1 | Touch and drag actions have alternatives. | ≥44×44 CSS px target goal; tap-select + destination and keyboard move alternatives exist for rally/targeting; cancellation does not commit an expensive action. [S9] |
| A11Y-07 | P1 | Text/UI scaling is usable. | 200% zoom and in-game UI scale preserve controls and meaning. Critical information is DOM text where practical; images of text are absent except logos. |
| A11Y-08 | P1 | Audio is optional and controllable. | Independent master/music/SFX/voice controls; audio warning has visual cue; subtitles/captions exist for voiced strategic information; no required spatial-audio-only task. |
| A11Y-09 | P1 | Speed and timing accommodate players. | Pause always available outside deliberate short cinematics; tutorials wait for acknowledgment; speed can return to 1×; no menu or inspect information disappears on a timer. |
| A11Y-10 | P1 | Color-vision presets preserve the authored palette and state clarity. | Protan/deutan/tritan simulations of all golden screenshots; team, resistance, valid/invalid, health, rarity/tier, and telegraphs remain separable. |
| A11Y-11 | P1 | Remapping and conflicts are explicit. | Keyboard controls can be remapped or offer at least two documented layouts; duplicate binding is prevented/explained; shortcuts do not conflict with browser/assistive-technology essentials. |
| A11Y-12 | P2 | Accessibility settings are discoverable before play. | Title screen has direct settings/accessibility entry; plain-language descriptions preview effect; reset defaults is available. |

---

## 15. Acceptance matrix — failure, victory, persistence, and replay

| ID | Pri | Acceptance requirement | Objective evidence / rejection trigger |
|---|---:|---|---|
| END-01 | P0 | Failure triggers once at the exact rule boundary and freezes combat. | Leak canonical test; lives hit zero once; no subsequent attack/reward/leak; overlay cannot be bypassed by queued input; music/state transition is singular. |
| END-02 | P1 | Failure teaches without blaming or spoiling. | Screen shows wave reached, leak count/cause, key threat, and one relevant counter tip drawn from actual run telemetry; restart and map/loadout are one action away. |
| END-03 | P0 | Victory triggers only after all required threats resolve. | Boss/wave canonical tests include summons, delayed deaths, projectiles, blockers, and phase transitions. No early victory, hanging wave, double reward, or reward after refresh. |
| END-04 | P1 | Victory resolves the emotional and numerical arc. | Boss aftermath clears visually; music/stinger lands; stars/lives, time, towers, abilities, enemies, and reward are legible; animation can be advanced after a safe minimum without losing reward. |
| END-05 | P0 | Rewards and best result are idempotent. | Replay, refresh during result, double-click continue, browser back/forward, and duplicate save events cannot grant currency twice or replace a better star result with a worse one. |
| END-06 | P1 | Restart is fast and exact. | Warm-cache restart to actionable pre-wave state ≤2.0 s desktop / ≤3.0 s mobile; same seed recreates map/waves; no stale selected object, sound, cooldown, particle, or event listener. |
| END-07 | P1 | Replay supports mastery. | Stage select shows best rating, difficulty, discovered enemies, progression effect, and challenge target. The player can change loadout/upgrades and immediately retry. |
| END-08 | P1 | Pause/quit preserves declared progress policy. | Policy is stated before loss. Mid-battle save, if supported, reproduces exact simulation state; if unsupported, quit confirmation says the run will be lost. |
| END-09 | P2 | End-state presentation has no dead air. | No unskippable wait >2 s after action is resolved; statistics count at readable pace; all buttons remain blocked until safe and then respond immediately. |

---

## 16. Deterministic simulation and automated test contract

### 16.1 Architecture requirements

1. Combat advances on a fixed simulation tick. Rendering interpolates but never authoritatively changes positions, targets, cooldowns, RNG, damage, or economy.
2. Every run has an explicit seed recorded in test output and optionally exposed in a debug/replay screen.
3. Gameplay randomness uses one documented seeded PRNG stream or named streams. `Math.random()`, wall-clock time, frame count, locale, and iteration order cannot influence authoritative results.
4. Inputs are timestamped/quantized to simulation ticks and serializable. A replay is seed + game version + initial configuration + ordered input events.
5. Runtime data has one source of truth. Tooltips/bestiary derive from the same tower, enemy, ability, and progression data consumed by simulation.
6. Test builds expose a guarded scenario API for setting seed, spawning a wave, selecting loadout/upgrades, advancing ticks, querying state, and hashing state. It must be absent or inert in production.
7. Time-dependent browser tests install the fake clock before app timers. Playwright documents that its clock controls `Date`, timers, animation frames, idle callbacks, performance time, and event timestamps. [S10]

### 16.2 Required deterministic scenarios

All scenario hashes must match on Chromium, Firefox, and WebKit at 30/60/90/120/144 Hz render cadence, with audio on/off and reduced motion on/off.

| Scenario | Assertions |
|---|---|
| D-01 Path and leak | Every enemy follows expected path distance/order; blockers release correctly; exact enemy reaches exit; lives decrement once. |
| D-02 Target selection | First/last/strong/weak or documented policy chooses exact target under ties, death, range exit, and lane junctions. |
| D-03 Damage grammar | Physical, magic, true, splash/falloff, armor, magic resistance, buff/debuff, immunity, overkill, and rounding match golden values. |
| D-04 Economy | Start gold, costs, failed buy, upgrade transaction, early-wave bonus, bounty, sell refund, progression modifiers, and reward totals are exact. |
| D-05 Tower lifecycle | Build, active timing, upgrade while targeting, branch lock, sell, rebuild, cooldown preservation/reset policy, and range changes are exact. |
| D-06 Hero lifecycle | Move/rally, block, retarget, ability, damage, defeat, untargetable state, respawn timer, and recovery position are exact for both heroes. |
| D-07 Ability targeting | Valid/invalid areas, cancellation, cooldown start, damage/status tick, overlapping effects, kill credit, and refund policy are exact. |
| D-08 Wave lifecycle | Countdown, early call, overlapping wave policy, spawn schedule, pause, speed change, last enemy, boss gate, victory, and reward are exact. |
| D-09 Save/replay | Serialize at pre-wave, active combat, paused, boss transition, and result; reload or replay produces the same final state hash. |
| D-10 Stress cap | Maximum supported simultaneous enemies/projectiles/particles never changes spawn, hit, targeting, or reward order and never leaks an entity/listener. |
| D-11 Progression | Purchase, mutual exclusion, reset/refund, star threshold, best-result replacement, and duplicate reward protection are exact. |
| D-12 Input arbitration | Pointer/touch/keyboard equivalents map to the same transactions; modal focus, resize, visibility, and context loss cannot duplicate or drop committed actions. |

### 16.3 Automation gates

- 100% of the scenarios above pass; no retries are allowed for simulation, economy, persistence, or lifecycle tests.
- Browser smoke tests may retry once only to diagnose infrastructure. A pass after retry remains a P1 until root cause is proven external.
- Core combat/economy/progression branch coverage target: ≥90%; overall project branch coverage target: ≥80%. Coverage never substitutes for scenario evidence.
- Mutation testing or equivalent fault injection must prove the suite catches at least one changed constant/branch in damage, resistance, cooldown, refund, wave timing, star award, and persistence.
- Own-build screenshot baselines use a pinned browser, OS font set, DPR, viewport, seed, clock, locale, and GPU/software rendering mode. Intentional baseline changes require before/after review, not blind regeneration.

---

## 17. Screenshot and motion comparison methodology

Pixel similarity to Kingdom Rush is neither expected nor desirable. The external comparison is a blinded quality/preference study; pixel diffs are reserved for regression against this project’s own approved baselines.

### 17.1 Reference acquisition

Use current, unmodified 16:9 images or captures from one of these sources:

1. Ironhide’s official KR5 press kit screenshots/trailer [S1];
2. the official Steam store media for KR5 [S11];
3. a legally obtained current retail build captured by the test team with platform, version, resolution, UI scale, and capture date recorded.

An independently labeled appendix may compare against the official *Kingdom Rush 6: Genesis* demo [S14]. Do not mix demo frames into the scored KR5 cohort or describe demo behavior as final retail quality.

Do not use fan remasters, compressed search thumbnails, promotional key art as a gameplay substitute, mods, or community screenshots with unknown settings. Do not mix KR versions in one score without labeling the cohort.

### 17.2 Twelve mandatory matched states

Capture both games at native 1920×1080 (plus the project at 390×844 and 844×390 for its responsive appendix):

1. title/first actionable screen;
2. campaign or stage-selection screen;
3. loadout/progression decision;
4. quiet pre-wave battlefield;
5. tower selected with range and upgrade UI;
6. first meaningful enemy counter;
7. two-lane medium-density combat;
8. peak-density combat with abilities;
9. hero command and ability targeting;
10. boss entrance/telegraph;
11. victory/reward;
12. failure/retry.

Match **purpose, information density, and combat intensity**, not exact composition. Never cherry-pick a reference transition smear, paused low-detail frame, mobile crop against desktop, or an obviously older asset.

For motion, add five synchronized 10-second clips: quiet ambience, tower attack cycle, hero movement/cast, peak wave, and boss phase. Encode both sides identically after retaining lossless masters.

### 17.3 Capture controls

- Pin build, seed, viewport, DPR, locale, UI scale, quality preset, browser, color profile, clock, and camera/zoom.
- Wait for font/image/audio decode and two identical frames before still capture.
- Hide cursor only on both samples; do not hide HUD, damage, selection, or loading defects.
- Apply no post-processing, sharpening, color grade, crop, or exposure adjustment after capture.
- For project regression images, freeze authoritative and cosmetic PRNG or deliberately mask only documented nondeterministic particles. Playwright supports repeated screenshot capture until stable and comparison through `toHaveScreenshot`. [S12]
- Own-baseline gate: `maxDiffPixelRatio ≤ 0.002` and per-pixel threshold ≤0.15 for full frames; zero unexpected diff in HUD text, cost, lives, wave, range, telegraph, or hit-state regions. A higher threshold requires a written rendering-platform exception.

### 17.4 Double-blind forced-choice panel

Use at least **nine independent raters** who did not implement or approve the compared scenes. At least three must be professional game art/UI/animation practitioners; at least three must be experienced tower-defense players; no rater may know which label represents the project. Randomize left/right and use opaque codes per pair. Remove product names only when that can be done without altering the underlying frame; otherwise disclose that franchise familiarity may partially unblind the study.

For each pair, ask one forced choice—**“Which looks and communicates like the more finished premium game?”**—then collect 1–5 scores for:

- composition and value hierarchy;
- combat readability;
- silhouette and state clarity;
- asset/material/texture finish;
- animation/VFX timing (clips only);
- UI craft and thematic cohesion;
- emotional impact and originality.

Require a one-sentence observable reason for any score ≤3. “I just like it” is not actionable evidence.

### 17.5 Blind benchmark gates

The candidate passes only when all are true:

1. The project wins ≥60% of all forced choices across stills and clips.
2. The project wins a simple majority in at least 8 of the 12 still pairs and 3 of the 5 clip pairs.
3. No critical gameplay state (peak combat, hero targeting, boss tell, victory, failure) loses by more than 6–3.
4. Every rubric dimension has project median ≥4/5; combat readability and UI craft are not lower than the reference median.
5. No more than two raters identify the same visible defect at score ≤3. A repeated defect is P1 regardless of aggregate preference.
6. The separate hostile critic issues **SHIP** for every critical state, with no unresolved observable objection.

These gates are intentionally harder than “looks similar.” They require the slice to win a blind presentation/usability preference often enough that “AAA parity” is a defensible claim.

### 17.6 Critic loop

For each rejected state:

1. log one issue per observable defect with frame/clip timestamp, severity, owner, and acceptance criterion;
2. identify the root system (composition, asset, VFX, animation, UI, simulation feedback, audio, or capture);
3. fix the source, not the screenshot;
4. rerun relevant deterministic, responsive, accessibility, and performance tests;
5. recapture the exact seed/state under §17.3 controls;
6. randomize labels again and rescore with the critic blind to change notes;
7. close only when the original defect is absent and no regression replaces it.

Do not ask a critic to re-score an unchanged build. Do not pass by averaging away a tactical-clarity defect with attractive art. Do not move the rubric after a failed round. “Wowed” means the numerical gates pass and the critic has no specific unresolved P0/P1/P2 on the golden-path frames.

---

## 18. Golden-path manual script

Run this script once with mouse, once touch-emulated/on device, and once keyboard-only:

1. Clear site data; cold boot on constrained network.
2. Open accessibility/settings before starting; set nondefault audio, UI scale, color, and motion values; reload and confirm persistence.
3. Start a fresh campaign; complete tutorial without skipping; inspect every new enemy card.
4. Build each tower family; attempt one invalid purchase; upgrade and sell; compare both final branches.
5. Move both heroes, cancel a move, defeat/revive one hero, cast both hero abilities, and deploy reinforcements.
6. Call two waves early; pause during a projectile and a boss telegraph; change speed twice.
7. Resize/rotate at midpoint; background for 30 s; resume.
8. Intentionally fail at a known threat; verify telemetry-based tip; restart.
9. Complete on Standard with top rating; verify reward/progression; refresh result screen; confirm no duplicate reward.
10. Buy and reset progression; change loadout; replay; complete on Hard.
11. Open bestiary/stats; verify values against runtime data; return to map and reload save.
12. Review console, network, memory, audio, trace, screenshots, video, state hashes, and saved data.

Any surprising behavior becomes an issue. A tester’s ability to work around it does not make it acceptable.

---

## 19. Final sign-off sheet

| Gate | Owner | Build/evidence link | Result |
|---|---|---|---|
| P0 count = 0 | QA lead |  | ☐ |
| P1 count = 0 | Game director |  | ☐ |
| Golden-path visible P2 count = 0 | Art/UI director |  | ☐ |
| Content floor §1.3 complete | Game director |  | ☐ |
| Deterministic scenarios D-01…D-12 | Engineering QA |  | ☐ |
| Browser/viewport matrix | Frontend QA |  | ☐ |
| Performance tiers | Performance owner |  | ☐ |
| Accessibility matrix | Accessibility reviewer |  | ☐ |
| Audio matrix | Audio reviewer |  | ☐ |
| First-time player target | UX research |  | ☐ |
| Three viable strategy clears | Design QA |  | ☐ |
| Own screenshot regressions | Visual QA |  | ☐ |
| Blind KR5 benchmark §17.5 | Independent panel lead |  | ☐ |
| Hostile critic: SHIP | Independent critic |  | ☐ |
| Asset/license inventory | Producer |  | ☐ |

The only passing final verdict is: **SHIP — all rows green, evidence attached, zero hidden waivers.**

---

## Sources

- **[S1]** Ironhide Game Studio, [Kingdom Rush 5: Alliance official press kit](https://www.kingdomrushalliance.com/Presskit/) — current feature list and official comparison media.
- **[S2]** Kingdom Rush Wiki, [Kingdom Rush 5: Alliance — gameplay and platform differences](https://kingdomrushtd.fandom.com/wiki/Kingdom_Rush_5%3A_Alliance) — five-tower loadout, four upgrades, two heroes, abilities, inspect cards, and input notes.
- **[S3]** Kingdom Rush Wiki, [Armor and Magic resistance](https://kingdomrushtd.fandom.com/wiki/Armor_and_Magic_resistance) — physical armor, magic resistance, true-damage counter grammar, and resistance tiers.
- **[S4]** Kingdom Rush Wiki, [Upgrades](https://kingdomrushtd.fandom.com/wiki/Upgrades) — star/upgrade-point systems, current KR5 upgrade categories, mutually exclusive reinforcement branch, and decision-changing upgrade examples.
- **[S5]** Kingdom Rush Wiki, [Kingdom Rush](https://kingdomrushtd.fandom.com/wiki/Kingdom_Rush) — lives-to-stars thresholds, resettable upgrades, challenge modes, heroes, and core rules.
- **[S6]** Ironhide Game Studio, [Kingdom Rush 5 developer Q&A](https://en.kingdomrushalliance.com/News/341) — in-battle enemy information design.
- **[S7]** Google web.dev, [Rendering performance](https://web.dev/articles/rendering-performance) — refresh/frame budgets, interaction responsiveness, and browser rendering pipeline.
- **[S8]** W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/) — normative accessibility criteria.
- **[S9]** W3C WAI, [Understanding Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced) — 44×44 CSS pixel enhanced target example and rationale.
- **[S10]** Playwright, [Clock](https://playwright.dev/docs/clock) — deterministic control of browser clocks, timers, animation frames, and performance time.
- **[S11]** Valve / Ironhide, [Kingdom Rush 5: Alliance official Steam store page](https://store.steampowered.com/app/2849080/Kingdom_Rush_5_Alliance_TD/) — official store screenshots, trailers, release facts, and marketed feature set.
- **[S12]** Playwright, [Visual comparisons](https://playwright.dev/docs/test-snapshots) — stable screenshot capture and `toHaveScreenshot` regression comparisons.
- **[S13]** Valve / Ironhide, [Kingdom Rush 6: Genesis official Steam page](https://store.steampowered.com/app/4259190/Kingdom_Rush_6_Genesis_TD/) — planned 2026-09-24 release date and current official presentation media.
- **[S14]** Valve / Ironhide, [Kingdom Rush 6: Genesis official demo](https://store.steampowered.com/app/4669880) — released 2026-06-15; secondary work-in-progress presentation reference only.

Community-maintained wiki material is used to understand observable game systems and progression tradeoffs, as requested; official Ironhide/Steam media is the visual benchmark. If the two disagree, current shipped behavior from a recorded retail build takes precedence, followed by Ironhide’s current press kit, then the wiki.
