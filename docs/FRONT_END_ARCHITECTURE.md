# Front-end and campaign architecture

The command menu is a DOM front end layered over a dormant Phaser battle scene. It is not a second game scene and it does not mutate battle entities. This keeps keyboard, focus, and scroll behavior native while the battle renderer stays concerned with world presentation.

## Boundaries

- `src/game/campaign/content.ts` is the declarative catalog for stages, menu heroes, permanent upgrades, and guide topics. New content should enter here before UI code.
- `src/game/campaign/CampaignProfile.ts` owns versioned, validated, serializable campaign progress. It migrates the legacy first-clear and Insight keys, rejects invalid IDs and values, and awards first-clear currency once.
- `src/ui/FrontEndShell.ts` renders campaign routes from content plus a read-only profile snapshot. It does not know how the battle simulation works.
- `src/ui/GameUI.ts` is the integration boundary. It maps DOM actions to profile mutations or `GameController` commands and records a stage result when a run ends.
- `GameSimulation` remains run-scoped. Towers, enemies, hero positions, current XP, cooldowns, gold, and wave state must never be serialized into the campaign profile.

## Adding a stage

1. Add a stable `CampaignStageId` and definition. Set `unlockAfter` to an earlier stage.
2. Keep `playable: false` until the simulation can load that stage's authored path, pads, waves, environment, and objectives.
3. Add the battle content behind a stage loader rather than branching on menu labels.
4. Add profile and end-to-end tests for unlock order, launch routing, result recording, and small-screen selection.
5. Only then set `playable: true`.

## Adding a hero or upgrade

Add the catalog entry first, then implement its battle definition and capability. A future hero may remain visible as locked menu content, but must not be added to `selectedHeroes` until it exists in the simulation and renderer. Insight IDs are persisted; rename their display text freely, but migrate the schema before renaming or removing an ID.

## Save evolution

`CampaignProfile.version` is the migration boundary. Never read arbitrary stored objects directly in rendering or simulation code. A schema change must normalize old data into the current profile, preserve corrupt-storage boot safety, and remain covered by a unit test.

Audio and accessibility settings remain separate preferences because they are device configuration, not campaign progress.
