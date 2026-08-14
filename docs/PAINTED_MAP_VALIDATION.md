# Painted map geometry and strategy contract

Production stages keep a full 1600×900 beauty painting. Gameplay does not sample colors from that painting. Routes, tower pads, collision, wave approaches, and hero navigation remain explicit geometry in `map.json`.

## Painting without geometry drift

Create the geometry guide after editing a stage map:

```sh
pnpm map:mask veilwater-confluence
```

The default output is `public/assets/environment/veilwater-confluence-semantic.png`:

- red (`#ff0000`) is the complete navigable road corridor;
- green (`#00ff00`) is the exact tower-foundation area;
- transparent pixels are unrestricted scenery.

The painting agent imports this guide as a locked layer, paints the road and foundations against it, and exports two files from the **same layered scene**:

1. the finished beauty painting;
2. the red/green semantic layer with every decorative layer hidden.

This preserves painterly terrain. The semantic image is not inferred from the beauty image and is never displayed in the shipped game.

Declare the exported mask beside the beauty asset:

```json
{
  "kind": "painted",
  "assetKey": "environment.veilwater-confluence",
  "assetPath": "assets/environment/veilwater-confluence-painted-1600.png",
  "semanticMaskPath": "assets/environment/veilwater-confluence-semantic.png",
  "semanticMask": {
    "roadColor": "#ff0000",
    "padColor": "#00ff00",
    "tolerancePx": 6,
    "minRoadRecall": 0.97,
    "minRoadPrecision": 0.9,
    "minPadRecall": 0.95,
    "minPadPrecision": 0.9
  }
}
```

`pnpm content:check` then compares the semantic export with authoritative lane and pad geometry. Recall catches missing painted coverage; precision catches paint marked as road or foundation where gameplay does not allow it. The small tolerance permits antialiasing and hand-painted edges without permitting a visibly shifted road.

Run `pnpm content:proof` to write deterministic evidence under `artifacts/content-proof/`:

- `<stage>-alignment.json` contains exact recall and precision;
- `<stage>-alignment.png` uses cyan/green for exact agreement, red/yellow for missing geometry, and magenta/orange for unexpected mask paint;
- `<stage>-strategy.json` contains the pad-by-pad tactical report.

The mask proves that the exported semantic layer matches gameplay. It cannot prove that someone later edited the beauty PNG separately. Beauty and mask must therefore be exported together, and the final browser review must inspect the beauty painting with `?stage=<id>&debugMap=1`.

## Strategic analysis

Every playable map is scored at the real base tower ranges: 126, 158, 170, and 176 world units. For each pad and range, the report records:

- road distance and reference traversal seconds under fire;
- routes reached;
- disjoint exposure windows, which identify hairpins and repeat passes;
- route-level coverage ratios;
- strict coverage dominance, where another pad reaches every sampled road point this pad reaches and additional points.

Exposure seconds use a reference enemy speed of 100 world units/second and any applicable slow-terrain sections. This is a geometry comparison metric, not a balance simulation.

A benchmark stage can make tactical intent a build contract:

```json
"strategicRequirements": {
  "baseTowerRanges": [126, 158, 170, 176],
  "minDoublePassPads": 2,
  "minMultiRoutePads": 2,
  "minDistinctProfiles": 5,
  "maxDominatedPads": 1
}
```

Routes can declare overlapping sections for shared traffic or terrain. A shared `trafficGroup` only compiles when every participating route describes the same physical corridor within three pixels: equal arc length and lane width, matching direction, centerline, and sampled tangents. This prevents a painted merge from secretly behaving as two independent queues.

```json
{
  "id": "north",
  "halfWidth": 28,
  "centerline": [],
  "sections": [
    {
      "id": "north-marsh-choke",
      "from": 0.3,
      "to": 0.48,
      "trafficGroup": "marsh-choke",
      "speedMultiplier": 0.72,
      "affectsFlying": false
    }
  ]
}
```

`from` and `to` are normalized route progress. Sections may overlap so terrain and traffic rules can be layered; the smallest active speed multiplier wins. Ground enemies use slow terrain by default, while `affectsFlying: true` applies it to flying enemies too. A traffic-group section cannot overlap another traffic-group section on the same route.

## Limits

- Strategic scoring measures geometry; it does not prove wave balance, tower economy, or fun.
- Centerline sampling is deterministic at four-world-unit intervals. It is intentionally stable and slightly conservative rather than a full combat simulation.
- Duplicate route polylines can visually merge, but they are not a genuine shared occupancy queue. Shared collision and congestion require the route-graph runtime.
- A semantic mask verifies geometry only when it is an honest export from the same layered painting source.
