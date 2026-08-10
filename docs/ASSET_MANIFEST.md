# Original Asset Manifest

All shipped bitmap art was created for Verdant Rift with the built-in OpenAI image-generation mode, then normalized into transparent runtime assets. No Kingdom Rush art, characters, logos, UI, or map geometry are included.

## Environment

Runtime file: `public/assets/environment/verdant-rift-1600.png`

The 1600×900 runtime image is also the locked background layer in `maps/verdant-rift.tmj`, so painted landmarks and authored gameplay coordinates share one exact pixel coordinate system. See `docs/MAP_AUTHORING.md`.

Production prompt:

> Original premium painterly fantasy tower-defense battlefield, top-down three-quarter orthographic view, 16:9. A single readable pale-stone route enters through an upper-left rift approach, crosses ancient bridges around a luminous turquoise chasm and waterfalls, curls down the right side, then exits at a radiant lower-left golden gate. Eleven quiet circular build foundations sit beside—not on—the road. Dense verdant ruins, teal crystal light, moss, autumn-gold foliage, carved stone, strong warm upper-left light, deep cool ravines, high readability at gameplay scale, no UI, no text, no characters, no existing franchise imagery, 1600×900 composition.

## Tower atlas

Runtime files: `public/assets/towers/thorn.png`, `ember.png`, `aegis.png`, `astral.png`

Production prompt:

> Four original premium fantasy tower-defense buildings as separate centered orthographic cutouts on perfectly flat #ff00ff chroma: Thornwatch, a tall living-wood archer watchtower with copper leaf fins; Ember Foundry, a broad stone-and-brass cannon forge with orange furnace core; Aegis Grove, a squat teal ward bastion with banner-blue shield geometry; Astral Spire, a slender violet crystal observatory with teal arcane aperture. Shared warm upper-left lighting, dark grounded bases, three large value masses per silhouette, painterly materials, no labels, no UI, no cast shadows outside each cutout, no existing franchise designs.

## Hero atlas

Runtime files: `public/assets/heroes/kael.png`, `lyra.png`

Production prompt:

> Two original full-body fantasy tower-defense champions as separate three-quarter top-down gameplay cutouts on perfectly flat #ff00ff chroma. Kael, a broad rift warden in teal-and-bronze armor with a large asymmetrical shield and root-blade; Lyra, a violet-and-bone star seer with split crescent staff and flowing mantle. Strong class silhouettes, warm upper-left key light, cool rim light, readable faces and hands, compact heroic proportions, painterly premium mobile-strategy finish, no labels, no UI, no existing characters.

## Enemy atlases

Runtime files: `public/assets/enemies/skitter.png`, `marauder.png`, `wisp.png`, `brute.png`, `bloomlord.png`

Production prompt set:

> Original hostile fantasy tower-defense units as isolated three-quarter top-down gameplay cutouts on perfectly flat #ff00ff chroma: low-wide rust-red Rift Skitter with luminous eyes; forward-wedge Thorn Marauder with pale bark armor; luminous open-center violet Gloam Wisp; square-shouldered Mossback Brute with massive stone-bark arms. Strong cohort-specific outer contours, three major value groups, warm upper-left planes, Night Ink grounding, no labels, no UI, no existing franchise creatures.

> Original final boss cutout on perfectly flat #ff00ff chroma: The Hollow Bloom, a huge rooted rift sovereign with three-part anatomy—thorn crown, exposed teal heart/core, heavy grounded root body—violet-black bark, wound-red seams, broad contact mass, premium painterly tower-defense readability, no labels, no UI, no existing franchise creature.

## Source-generation records

- Environment source generation: `/Users/tsur/.codex/generated_images/019fa5a6-6adf-7eb1-ad9a-42d44836cae9/exec-73377e6d-7afd-4081-a668-7a9c279df872.png`
- Tower atlas source generation: `/Users/tsur/.codex/generated_images/019fa5a6-6adf-7eb1-ad9a-42d44836cae9/exec-a2bb3480-19fa-4080-99a8-cb816c4538db.png`
- Hero atlas source generation: `/Users/tsur/.codex/generated_images/019fa5a6-6adf-7eb1-ad9a-42d44836cae9/exec-9a34ce88-c226-480f-a8a8-0c83711ff817.png`
- Enemy atlas source generation: `/Users/tsur/.codex/generated_images/019fa5a6-6adf-7eb1-ad9a-42d44836cae9/exec-e7fb3064-7081-461a-918b-df24bf6857a1.png`
- Elite/boss source generation: `/Users/tsur/.codex/generated_images/019fa5a6-6adf-7eb1-ad9a-42d44836cae9/exec-8c4b08c6-1db8-49bd-9aeb-5fb445640ccf.png`

The generated-image cache is not required at runtime. Complete normalized assets are stored under `public/assets/`.
