# AI-native battle map authoring

Verdant Rift does not require Tiled, Unity, Photoshop metadata, or another GUI editor to produce a functioning stage. The canonical source is a small repository-native package under `content/stages/<stage-id>/`. An AI agent can create, inspect, patch, validate, compile, and preview the complete package with ordinary text and image tools.

## One command to start

```sh
pnpm stage:new my-stage-id
```

This creates:

- `stage.json` — campaign metadata, unlock rule, difficulty economy, objectives, modifiers, and hero spawns;
- `map.json` — world visual recipe, routes, lane widths, build pads, entrances, and gate;
- `waves.json` — wave groups, timings, route assignments, and tactical-difficulty pressure.

Edit those files, then run:

```sh
pnpm content:sync
pnpm build
pnpm dev
```

Preview any playable package directly at `http://localhost:4173/?stage=my-stage-id&debugMap=1`. The `stage` query bypasses campaign locking for authoring; `debugMap=1` overlays the exact runtime lanes and build geometry.

## Two production visual modes

### Procedural composition

Set `visual.kind` to `procedural`. The map renderer deterministically composes terrain color variation, water bands, foliage, landmarks, roads, lane edging, road wear, and build-pad foundations from the JSON seed and palette. Roads are drawn from the same route geometry enemies use, so painted-road and collision drift is impossible. This is the fastest AI-native path for a complete, functional stage.

### Painted composition

Set `visual.kind` to `painted` and provide a stable asset key and a 1600×900 image under `public/assets/`. The compiler verifies that the file exists and that a PNG has the exact world dimensions. Use `debugMap=1` to align its visible road and foundations to canonical route/pad data. Painted art is presentation; `map.json` remains the gameplay authority.

The modes share one runtime contract. A campaign can mix authored key-art maps with deterministic procedural maps without special-case simulation code.

## Geometry rules

- The normalized world is 1600×900. Responsive scaling and pointer conversion happen outside this coordinate system.
- Each route has a stable kebab-case ID, `halfWidth`, and a centerline of at least four points.
- A wave group can choose a route. Missing `route` means `primaryRouteId`.
- Multiple routes may converge on one gate. Every entrance names its route.
- Build pads have stable IDs, centers, and radii. Selection, tower placement, audio position, and rendering all consume these exact values.
- Hero spawns bind to a route plus normalized progress, never arbitrary screen pixels.

## Compiler guarantees

`pnpm content:check` is part of every production build. It rejects stale generated output and invalid packages, including duplicate IDs/order, unknown enemies or routes, missing assets, incorrect image dimensions, unsafe wave populations, invalid economy ranges, bad route segments, out-of-bounds pads, overlapping pads, entrance/gate mismatches, and broken unlock references.

The compiler emits `src/game/content/generated/stages.ts`. Never hand-edit that file. Runtime systems receive one immutable `RunDefinition` from the generated registry; no scene, UI, audio system, or simulation module chooses its own map or waves.

## Content-agent checklist

1. Scaffold the package with `pnpm stage:new`.
2. Choose procedural or painted visual composition.
3. Author route centerlines first, then entrances, gate, and route-aware wave groups.
4. Place pads where their attack coverage creates distinct choices rather than uniform coverage.
5. Set hero spawn progress and stage-specific economy.
6. Run `pnpm content:sync && pnpm test && pnpm build`.
7. Preview with `?stage=<id>&debugMap=1` at desktop, shallow landscape, and portrait.
8. Remove `debugMap=1`, play several waves at 2×, and check route traffic, clicks, tower coverage, hero movement, and frame telemetry.

`rootbound-crossing` is the reference multi-route procedural package. `sunken-way` is the reference painted package.
