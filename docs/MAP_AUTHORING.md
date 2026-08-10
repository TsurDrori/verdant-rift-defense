# Battle map authoring

Verdant Rift uses a hybrid map pipeline: a hand-painted battlefield provides the visual composition, while Tiled owns the exact gameplay geometry. Main campaign stages should not be procedurally generated. Procedural layouts are reserved for later challenge modes where replay variance matters more than authored landmarks.

## Source of truth

- `maps/verdant-rift.tmj` is the editable Tiled 1.12 map.
- `public/assets/environment/verdant-rift-1600.png` is the exact 1600×900 authoring image. Do not use a differently sized source in Tiled.
- `src/game/content/maps/generated/verdantRift.ts` is generated runtime data. Never edit it directly.
- `src/game/simulation/geometry.ts` derives navigation and build-pad geometry from the generated map.

Open the `.tmj` file in the free [Tiled map editor](https://www.mapeditor.org/). The layer contract is:

- `Painted Battlefield`: locked image layer.
- `Navigation/enemy-route`: one `EnemyRoute` polyline. Its `halfWidth` property defines the traversable lane corridor.
- `Navigation/entrance` and `Navigation/gate`: point markers with a `label` property.
- `Build Pads`: ellipse objects with contiguous integer `index` properties starting at zero.

After editing, run:

```sh
pnpm map:sync
pnpm test
pnpm build
```

Builds run `pnpm map:check` and fail if the Tiled file and generated runtime geometry differ. This prevents art edits from silently shipping with stale movement, placement, targeting, or audio coordinates.

## Visual validation

Run the game with `?debugMap=1` to show the exact runtime route centerline and lane edges over the painted road. Normal play hides this diagnostic overlay. Every route point and build pad must be checked at 1600×900 before committing.

## Adding a stage

1. Create a 16:9 authoring image at the final world resolution.
2. Duplicate the Tiled layer/class contract and author the route and pads on top of the final image.
3. Extend `scripts/sync-map.mjs` to emit the new typed map module.
4. Add the map to the registry, then make stage selection inject that map into the simulation and scene.
5. Add geometry validation, desktop overview, portrait overview/focus, and rotation tests before marking the campaign stage playable.

Tiled object layers support freely positioned points, ellipses, polygons, and polylines with typed custom properties, which is the right representation for a painterly tower-defense map: [Tiled layers](https://doc.mapeditor.org/en/stable/manual/layers/) and [custom properties](https://doc.mapeditor.org/en/stable/manual/custom-properties/).
