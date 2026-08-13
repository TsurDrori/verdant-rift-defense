# Content scaling architecture

## Verdict

The runtime content boundary is now scalable. A stage is a self-contained, validated package, not a collection of globals wired into UI and simulation code. The second playable stage proves a different wave count, economy, procedural visual recipe, two enemy routes, route-specific spawns, twelve build pads, and different hero deployment without changing the engine.

## Implemented boundary

```text
content/stages/<id>/{stage,map,waves}.json
                    │
                    ▼
          compile-content.mjs
      semantic validation + stale check
                    │
                    ▼
       generated immutable catalog
                    │
        campaign selects RunDefinition
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 GameSimulation  BattleScene     GameUI/Audio
 PathGeometry    stage bundle    same run data
```

The campaign launch selection injects a `RunDefinition`. `GameSimulation` owns a `PathGeometry` instance built from that run. Enemy state carries a route ID; movement, blocker occupancy, boss escorts, hero projection, pad placement, UI, and spatial audio consume the same instance. Runtime stage changes rebuild the deterministic simulation and restart the battle scene cleanly.

## Content package coverage

A package controls:

- campaign order, map-node position, unlock dependency, prose, reward, and playable status;
- painted or seeded procedural map presentation;
- any number of routes, lane widths, entrances, a shared gate, build pads, water bands, and landmarks;
- wave count, enemy composition, delays, intervals, route assignment, and difficulty-only tactical groups;
- starting gold/lives, HP/speed scaling, early-call reward, intermission bands;
- objectives, modifiers, hero routes, and hero spawn progress;
- stage-scoped image assets.

Shared catalogs still correctly own reusable content—enemy archetypes, tower families, heroes, spells, artifacts, VFX rigs, and soundtrack compositions. A map package references those stable IDs rather than duplicating their mechanics.

## Safety and performance

- Production builds fail on stale generated content.
- Stage images load only for the active run; future painted maps do not inflate first-load memory.
- The 1600×900 simulation world is invariant while Phaser/CSS scale it responsively.
- Procedural rendering is deterministic from `seed`; screenshots are reproducible.
- Per-route geometry caches are instance-owned and immutable.
- The 300-unit per-wave authoring ceiling guards accidental browser-killing data.
- Planned campaign nodes need only `stage.json`; playable nodes must provide a complete package.

## What scales without engine edits

New campaign maps, alternate layouts, multi-route missions, wave scripts, economy curves, objectives already represented by the objective union, procedural palettes, landmarks, painted backdrops, and stage metadata require data changes only.

Engine work is still appropriate when adding genuinely new rule vocabulary—a new objective type, route branching during a run, a new enemy mechanic, a new reusable landmark renderer, localization, or streaming audio per biome. Those are engine capabilities, not failures of the package system. They should extend the typed contract once and then become reusable content primitives.

## Proof packages

- `sunken-way`: 12-wave painted campaign map migrated from the original vertical slice.
- `rootbound-crossing`: 10-wave procedural map with north/south routes converging on one gate and route-specific pressure.
- `glasswood`, `cinder-grove`, `hollow-crown`: planned catalog entries proving that campaign structure can exist before battle content is marked playable.

See `docs/MAP_AUTHORING.md` for the exact agent workflow.
