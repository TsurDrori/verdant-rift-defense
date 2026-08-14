# Verdant Rift Defense

A complete top-down fantasy tower-defense vertical slice built with Phaser 3, TypeScript, Vite, deterministic fixed-step simulation, DOM battle UI, and original generated art.

## Play

[Play Verdant Rift Defense](https://tsurdrori.github.io/verdant-rift-defense/)

The `master` branch is the release branch. Every push to `master` runs the deterministic test suite, creates a production build, and publishes that exact revision to GitHub Pages through `.github/workflows/pages.yml`.

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4173`.

## Create a complete stage

```bash
pnpm stage:new my-stage
# edit content/stages/my-stage/{stage,map,waves}.json
pnpm content:sync
pnpm dev
```

Open `http://localhost:4173/?stage=my-stage&debugMap=1` to preview a playable package and its authoritative route overlay. The content pipeline supports geometry-assembled painted maps (scenery + reusable painted roads/foundations/foreground), monolithic paintings, and deterministic procedural maps without a GUI editor. See [`docs/MAP_AUTHORING.md`](./docs/MAP_AUTHORING.md).

## Controls

- Mouse/touch: select foundations, build, upgrade, specialize, command heroes
- `Q` / `E`: cycle foundations
- `Z` / `X`: select Kael / Lyra
- `WASD`: move the selected hero
- `1` / `2`: smart-cast hero commands at the frontline
- `Space`: call the next wave
- `F`: toggle 1× / 2× speed
- `Esc`: pause and open sound/contrast/motion settings

## Included

- Two playable data-driven stages: a 12-wave layered-painted map and a 10-wave procedural multi-route map
- Five enemy archetypes, three difficulties, proportional star scoring
- Four tower families with three ranks and two mechanically distinct final branches each
- Armor/resistance, flying coverage, burn, slow, mark, expose, splash, chain, aura, and targeting priorities
- Two directly commandable heroes with distinct attacks and ultimates
- Multi-phase boss with escort thresholds, readable ROOTFALL telegraph, tower disable/recovery, and dedicated boss UI
- Separate 4:40 menu, 5:15 battle, and 5:05 boss compositions streamed through a four-bus Web Audio mix
- First-clear Insight reward, three-node pre-stage loadout, and free respec
- Capped early-call economy with hero-command recharge
- Fixed 60 Hz deterministic simulation and impact-synchronized health, bounty, audio, defeat, and victory presentation
- Responsive landscape/portrait behavior, keyboard play, reduced motion, contrast mode, pause-on-hidden, and persistent sound settings
- Campaign hub with stage route, hero hall, permanent-upgrade grove, field guide, and settings surfaces backed by a versioned profile
- Build-validated AI-native content packages with one-command scaffolding and direct stage preview

## Music

“Angevin”, “Noble Race”, and “Killers” by Kevin MacLeod
([incompetech.com](https://incompetech.com/)), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Verification

```bash
pnpm build
pnpm test
pnpm test:e2e
pnpm capture:review
```

Design and acceptance references live in [`docs/`](./docs/):

- `PROGRESSION_DESIGN.md`
- `ART_DIRECTION.md`
- `QA_ACCEPTANCE.md`
- `ASSET_MANIFEST.md`
- `FRONT_END_ARCHITECTURE.md`
