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

## Three visual modes

### Layered painted composition (recommended)

Set `visual.kind` to `layered-painted`. Supply a scenery-only 1600×900 terrain painting plus transparent reusable road, foundation, and optional foreground-foliage sprites. The renderer stamps the painted road brush along every route centerline, centers the painted foundation on every build pad, and places foreground sprites above actors for genuine occlusion. The compiler validates every asset and all brush/placement metrics.

This is the primary production workflow: the battlefield remains fully painted, but roads and foundations cannot drift away from navigation or tower geometry because the same JSON coordinates create both gameplay and art. A new map needs one scenery painting and can reuse an existing biome kit; a new biome needs a small tile kit, not a monolithic painted road baked into every scene.

### Procedural composition

Set `visual.kind` to `procedural`. The map renderer deterministically composes terrain color variation, water bands, foliage, landmarks, roads, lane edging, road wear, and build-pad foundations from the JSON seed and palette. Roads are drawn from the same route geometry enemies use, so painted-road and collision drift is impossible. This is the fastest AI-native path for a complete, functional stage.

### Monolithic painted composition (legacy/special cases)

Set `visual.kind` to `painted` and provide a stable asset key and a 1600×900 image under `public/assets/`. The compiler verifies that the file exists and that a PNG has the exact world dimensions. Use `debugMap=1` to align its visible road and foundations to canonical route/pad data. Painted art is presentation; `map.json` remains the gameplay authority.

All modes share one runtime contract. A campaign can mix layered paintings, monolithic key-art maps, and deterministic procedural maps without simulation changes.

For production painted stages, use the explicit semantic-mask workflow in [`PAINTED_MAP_VALIDATION.md`](./PAINTED_MAP_VALIDATION.md). It preserves the full beauty painting while giving the compiler a machine-verifiable road and foundation contract. `pnpm map:mask <stage-id>` creates the locked authoring guide; `pnpm content:proof` emits alignment and strategic evidence.

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
2. Choose layered-painted, procedural, or monolithic painted visual composition.
3. Author route centerlines first, then entrances, gate, and route-aware wave groups.
4. Place pads where their attack coverage creates distinct choices rather than uniform coverage.
5. Set hero spawn progress and stage-specific economy.
6. Run `pnpm content:sync && pnpm test && pnpm build`.
7. Preview with `?stage=<id>&debugMap=1` at desktop, shallow landscape, and portrait.
8. Remove `debugMap=1`, play several waves at 2×, and check route traffic, clicks, tower coverage, hero movement, and frame telemetry.

`rootbound-crossing` is the reference multi-route procedural package. `sunken-way` is the reference layered-painted package.
