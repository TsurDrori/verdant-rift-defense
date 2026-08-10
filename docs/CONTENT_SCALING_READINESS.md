# Content scaling readiness

## Current verdict

The project can safely iterate on the existing stage, but it is not yet ready to multiply content at production speed. The largest risk is not art volume; it is that one stage, one wave table, and one simulation are still selected through module-level globals. Adding stages before removing those globals will produce conditionals, duplicated tests, and cross-stage regressions.

## Completed foundations

- Deterministic simulation separated from Phaser presentation.
- Versioned campaign profile with migration and corrupt-storage fallback.
- Stable asset keys and deployment-relative asset URLs.
- Tiled-authored map source with generated typed geometry and stale-build rejection.
- DOM HUD/menu boundary with keyboard and touch accessibility.
- Fixed-step stress telemetry, effect cleanup diagnostics, and browser regression coverage.
- Data-driven towers, enemies, waves, hero spells, artifacts, and progression thresholds.

## Gates before adding many stages

### P0 — Stage/run dependency injection

Replace `ACTIVE_BATTLE_MAP`, global `WAVES`, and `new GameSimulation()` defaults with a validated `RunDefinition` injected by the campaign launch action:

```ts
interface RunDefinition {
  stageId: CampaignStageId;
  map: BattleMapDefinition;
  waves: readonly WaveDefinition[];
  economy: EconomyDefinition;
  objectives: readonly ObjectiveDefinition[];
  modifiers: readonly StageModifier[];
}
```

The simulation, scene, UI, and audio director must read the same immutable run definition. No subsystem may independently choose a map or wave set.

### P0 — Instance-owned path geometry

Convert the current module-level route caches into a `PathGeometry` instance created from `RunDefinition.map`. Simulation and renderer receive that same instance. This is required for multi-route stages, alternate exits, route switching, and editor hot reload.

### P0 — Content schema validation

Validate every stage at build time:

- stable unique IDs;
- route and pad bounds;
- contiguous wave timing;
- referenced enemy/tower/asset IDs exist;
- spawn and exit markers exist;
- no unreachable route branch;
- localization keys exist;
- budget and difficulty telemetry stay within declared ranges.

The map generator now demonstrates this pattern; waves and stage definitions need the same treatment.

### P1 — Split the simulation by domain

`GameSimulation` is still a large integration unit. Keep one deterministic clock and snapshot, but move rules into explicit systems: `WaveSystem`, `MovementSystem`, `TargetingSystem`, `CombatSystem`, `HeroSystem`, `TowerSystem`, `StatusSystem`, and `EconomySystem`. Systems should consume typed commands and emit typed events; Phaser must remain presentation-only.

### P1 — Stage-scoped asset bundles

Boot currently loads the complete manifest. Add bundles such as `core-ui`, `stage:<id>`, `hero:<id>`, and `tower:<id>`, with reference-counted disposal between stages. This keeps mobile memory and first-load time bounded as content grows.

### P1 — Wave and balance authoring

Move waves to a validated JSON/CSV authoring format with a batch simulator. Every stage commit should report completion rate, leak distribution, gold curve, tower pick rate, hero XP distribution, and worst fixed-step/render load across deterministic seeds.

### P1 — Visual regression matrix

Keep screenshot gates for overview, tactical focus, boss, tower panel, expanded hero bar, each spell icon/VFX, and debug map overlay at desktop, shallow landscape, and portrait. Add baseline diff thresholds in CI once the current art direction stabilizes.

### P2 — Localization and narrative data

Replace display text embedded in UI templates with localization keys before adding large codex, stage, hero, and artifact catalogs. Content IDs remain stable; prose can then change without save migrations.

### P2 — Procedural modes

Only after `RunDefinition` and instance-owned geometry exist should procedural route generation be considered. Use it for endless/challenge modes, validate route clearance and pad coverage, and render it with a dedicated modular terrain kit. Do not use it to replace authored campaign maps.

## Recommended order

1. Run definition injection and instance-owned geometry.
2. Second stage as the proof case—not ten stages.
3. Stage-scoped asset loading.
4. Wave authoring plus batch balance telemetry.
5. Split simulation systems where the second stage exposes real variation pressure.
6. Localization and visual-regression baselines.
7. Procedural challenge mode, if still valuable.
