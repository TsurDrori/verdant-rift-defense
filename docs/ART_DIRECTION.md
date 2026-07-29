# ART DIRECTION — RELICLIGHT

**Document status:** production north star
**Research date:** 2026-07-28
**Confidence:** high for the benchmark observations and visual rules; moderate for final asset dimensions until the runtime camera and smallest supported viewport are locked.

## 1. Creative mandate

This game must be readable at tower-defense speed, look handcrafted in a still frame, and remain visually coherent when the battlefield is full. “More detail” is not the objective. The objective is **controlled splendor**: rich material painting and animation everywhere the player can appreciate it, aggressive simplification everywhere tactical information must survive.

The visual identity is **Reliclight**:

> A living battlefield painted like an ancient tactical atlas, where moss-covered stone has cracked open to reveal luminous memories beneath it.

Reliclight combines:

- painterly high-fantasy landscapes with convincing stone, wood, water, cloth, and metal;
- a fixed top-down-oblique stage composed as one heroic illustration;
- readable, enamel-like combat actors with selective dark edge keys rather than thick cartoon outlines;
- a recurring visual grammar of split circles, woven crescents, carved routes, and light leaking through old materials;
- quiet, low-chroma terrain under combat and jewel-like color reserved for towers, enemies, abilities, objectives, and rewards.

The emotional tone is **ancient wonder under siege**, not comedy, grimdark, or generic fairy-tale fantasy. Small moments of charm can exist in idles and environmental vignettes, but the world should never look like a parody.

### Non-negotiable originality boundary

Kingdom Rush is a quality benchmark, not a style sheet. Do not reproduce its characters, faction language, tower concepts, comic lettering, thick black contour treatment, rounded chibi anatomy, build-holder design, radial menu art, or exact HUD skin. Our battle layout can use genre-standard corners, paths, and build sites, but the authored shapes and materials must read as Reliclight in a logo-free crop.

The blind question is not “does this resemble Kingdom Rush?” It is: **“Which battlefield looks clearer, richer, and more intentional?”**

## 2. What the benchmark actually teaches

### Kingdom Rush 5: Alliance

Official Alliance screenshots show several qualities worth matching in function:

1. **The lane remains the dominant navigational shape.** Even in dense forest or alien snow, the route has a broad, continuous value and hue family.
2. **Actors are separated from terrain.** Towers and enemies use darker contour keys, compact silhouettes, and stronger local contrast than the background.
3. **Combat color is semantic.** Purple beams, green corruption, orange fire, and cyan ice create immediately different attack signatures.
4. **The frame is densely authored but the normal HUD is sparse.** Status lives at the upper left, pause at the upper right, and hero/ability commands at the lower left. The center and lower-middle remain playable.
5. **Large rosters scale through silhouette families.** The current game supports a wide tower and enemy roster, yet towers retain obvious crowns, barrels, battlements, creatures, or emissive cores.
6. **Progress is visible on the battlefield.** Four tower levels and special skills are not only stat changes; upgraded towers accumulate mass, occupants, moving parts, emissive energy, and branch-specific features.

Alliance also reveals failure modes we must beat:

- Late-wave screenshots can become a wall of equal-saturation effects.
- Background ornament occasionally competes with small actors.
- Similar red health bars and small units become hard to parse in same-colored packs.
- Thick outlines solve separation but can flatten materials.

Our answer is stricter value staging, larger silhouette differences, fewer simultaneous full-saturation effects, and material-specific selective edges.

### Comparable premium games

- **Thronefall** demonstrates that a brutally limited palette and long cast shadows can make a large battlefield legible at a glance. Take the hierarchy, not its low-poly look.
- **Bad North** demonstrates clean figure-ground separation, disciplined negative space, and islands composed as instantly understandable tactical objects. Take the compositional restraint, not its minimalist watercolor treatment.
- **Isle of Arrows** demonstrates that a restrained board-game presentation and low-chrome UI can make choice architecture feel premium. Take the quiet UI hierarchy, not its floating-tile aesthetic.
- **Emberward** demonstrates energetic tower silhouettes and attack ownership, but its full-combat screenshots also show the danger of large overlapping UI, numbers, and effects. Our maximum-combat state must remain calmer and clearer.

## 3. The Reliclight shape language

The world is built from three shape dialects. Every asset must declare one primary dialect and may borrow one secondary dialect.

| Dialect | Geometry | Meaning | Typical use |
|---|---|---|---|
| **Oath** | upright arches, squared shoulders, nested shields, unbroken circles | protection, order, endurance | defensive towers, gates, ally UI, objectives |
| **Wild** | asymmetrical crescents, branching forks, leaf wedges, coiled roots | adaptation, speed, control | ranged towers, living environments, agile units |
| **Rift** | split circles, displaced rings, downward needles, fractured facets | magic, risk, corruption, transformation | magic towers, elite enemies, bosses, ability VFX |

Avoid visual soup. An asset cannot use arches, roots, gears, horns, crystals, flames, wings, and skulls at once. Choose a noun, a verb, and a signature shape. Example: “stone kiln / exhales / offset drum.”

### Recurring original motifs

- **Split halo:** a circular form interrupted at roughly the 1 o’clock and 7 o’clock positions.
- **Memory seam:** a narrow teal or violet glow visible inside a physical crack, never painted on top like neon trim.
- **Woven crescent:** two opposing hooks that nearly interlock; used in frames, banners, and magic trajectories.
- **Three-notch cadence:** groups of three shallow cuts in stone or metal signal player-owned craft.

One primary motif per object is enough. Repetition establishes identity; stacking motifs cheapens it.

## 4. Camera, scale, and map composition

### Camera

- Fixed top-down-oblique view, visually equivalent to a **54–60° downward pitch**.
- Orthographic or near-orthographic projection. No fisheye and no wide-angle convergence across the playfield.
- Terrain is painted with a consistent upper-left key light. Actors use the same key plus a restrained cool rim for tactical separation.
- Default camera presents the entire tactical problem without required panning on desktop.
- At aspect ratios narrower than 16:10, crop decorative perimeter first. Never crop an entrance, exit, junction, objective, tower site, or boss arena.

### 1080p reference scale

| Element | Reference size |
|---|---:|
| Standard lane width | 92–122 px |
| Small enemy body, excluding effects | 34–42 px |
| Standard enemy body | 44–58 px |
| Hero body | 54–68 px |
| Tower footprint | 94–122 px |
| Empty build dais | 76–92 px diameter |
| Boss body | 105–165 px, encounter-dependent |
| Critical HUD icon | 44–56 px |

Sprites and UI must be authored at 2× the shipping reference resolution, then downsampled with controlled sharpening. Do not upscale small generated assets and call them finished.

### Composition formula

Every map must read in this order:

1. **Entrance → lane → exit** in under one second.
2. **Primary landmark** in the following second.
3. **Build opportunities and choke points.**
4. Environmental narrative and easter eggs only after the tactical read is secure.

Map budget at the 16:9 reference view:

- 20–28% lane and junction surfaces;
- 8–14% build dais footprints plus their breathing room;
- 40–52% quiet terrain and negative space;
- 12–20% perimeter framing, cliffs, water, architecture, or void;
- one dominant landmark occupying 8–16% of frame area, normally on the perimeter or inside a strategically dead zone.

### Lane rules

- Lane and shoulder must differ by at least **18 points of CIELAB L\*** in calm lighting.
- Lane hue may vary by biome, but its local texture must stay low-frequency. No roots, cracks, or tile lines may form false branches.
- Use a continuous inner-edge cue: worn grass, low curb, pale dust, packed snow, or reflected light. Do not rely on outline alone.
- Entrances receive an outward-facing chevron and a moving atmospheric cue. Exits receive an inward-converging light cue. Both must remain distinguishable in grayscale.
- Junctions need 0.6–0.9 seconds of travel-time visibility before the split from the default camera.

### Build-site rules

Reliclight build sites are **carved vow-discs**, not glowing generic pads: low stone rings with a broken halo, three craft notches, and a dark central socket.

- Empty sites are one value step above nearby grass but one step below active towers.
- Hover/selection animates light through the carved groove clockwise over 280 ms.
- Valid placement adds three short inward ticks; invalid placement crosses the socket with two physical-looking red shards. State is never color-only.
- Keep at least 24 px of quiet ground around a site at 1080p.
- Perimeter props must not mimic the site’s diameter, ring motif, or hover color.

### Environmental storytelling

Each map gets exactly:

- one heroic landmark;
- two medium narrative clusters;
- three to five micro-vignettes;
- one ambient motion family (water, leaves, ash, snow, insects, or drifting motes).

Do not distribute equal-detail props everywhere. Detail density should form a deliberate gradient: highest at the landmark and perimeter, lowest along combat lanes and beneath unit clusters.

## 5. Color script

### Master palette

| Role | Name | Hex | Use |
|---|---|---|---|
| Deep neutral | Night Ink | `#102B2B` | deep shadow, UI backing, selective actor edge |
| Terrain dark | Fir Vault | `#173B32` | forest mass, cliff shadow |
| Terrain mid | Moss Bronze | `#647746` | grass, patina, subdued foliage |
| Lane light | Pilgrim Stone | `#D8C896` | roads, worn masonry, readable ground |
| Warm focus | Reliquary Gold | `#F2C45E` | rewards, exits, confirmed action |
| Primary magic | Rift Teal | `#27B8B0` | player magic, water-memory glow |
| Secondary magic | Vesper Violet | `#8067D9` | unstable magic, control, corruption accents |
| Physical impact | Ember Orange | `#E56A32` | blast cores, burn, danger accents |
| Enemy danger | Wound Red | `#D44743` | damage, hostile telegraphs, critical state |
| Ally command | Banner Blue | `#4D9FCC` | selection, rally, ally ownership |
| Parchment | Bone Paper | `#E8DDBB` | text surfaces, tooltip cards |
| Cool metal | Rain Steel | `#74858B` | armor, UI frame, machinery |

These are anchors, not a prohibition on biome palettes. Each biome adds one dominant environmental hue and one rare wonder accent. It may not replace semantic colors.

### Saturation hierarchy

- Terrain base: 20–48% HSL saturation.
- Landmark accents: 40–62%.
- Combat actors: 42–72%.
- Active VFX cores and reward beats: 72–100%, used on less than 6% of the frame at once.

At maximum combat, no more than **12% of the playfield** may be covered by pixels above 85% saturation, excluding a boss phase-change burst shorter than 700 ms.

### Value hierarchy

- Background shadows never reach pure black; reserve the darkest 5% values for actor contact shadows, hostile eye sockets, and UI depth.
- Lane sits in the middle-high value band.
- Standard enemies must preserve a minimum 3:1 local contrast against the lane through body value, contact shadow, or selective edge key.
- Friendly effects use bright cores with darker colored falloff; hostile telegraphs use a darker rim plus a broken or toothed shape so they remain hostile in monochrome.

### Color-vision resilience

Every tactical state uses **color + shape + motion**:

- ally target: blue, closed diamond, inward pulse;
- enemy target: red, open four-notch reticle, outward pulse;
- shield: cyan/white, hexagonal shell, clockwise shimmer;
- poison/corruption: violet, dripping crescent, descending motes;
- stun: gold, three angular shards, irregular snap;
- slow: teal, concentric broken rings, decelerating rotation;
- burn: orange, pointed tongues, upward acceleration.

The battlefield must pass grayscale, deuteranopia, protanopia, and tritanopia simulations without losing lane flow, ownership, target, build-validity, or boss-telegraph meaning.

## 6. Material bible

Materials are painted responses to light, not texture overlays.

| Material | Large read | Mid-frequency detail | Highlight behavior | Forbidden shortcut |
|---|---|---|---|---|
| **Pilgrim limestone** | warm block mass, rounded chipped corners | shallow chisel arcs, moss in occlusion | broad cream planes | uniform noise or photo texture |
| **Oath iron** | dark blue-green facets | three-notch craft marks, restrained rivets | narrow cool edge, warm near fire | white bevel on every edge |
| **Living wood** | directional trunk/branch flow | sparse growth scars, wrapped fiber | warm amber along fresh cuts | brown plastic tubes |
| **Rift crystal** | clear faceted silhouette | internal fracture and one moving glint | emissive core contained by dark rim | full-object neon bloom |
| **Lacquered cloth** | large readable banner plane | one woven border motif | soft elongated highlight | high-frequency embroidered clutter |
| **Water** | broad teal value field | directional foam and depth shelves | moving broken reflection | identical looping noise everywhere |
| **Bone paper UI** | quiet warm card | fibers only at large panel scale | matte, subtle edge wear | stained parchment cliché on every control |

### Selective edge treatment

Reliclight does not use a uniform black outline.

- Actor shadow-side key: 1.5–2.5 px at 1080p, sampled from Night Ink or a material-dark equivalent.
- Light-side edge: mostly open; use a 1 px colored rim only where the actor would merge into terrain.
- Interior lines: thinner and lower contrast than the silhouette edge.
- Background props: no explicit contour unless they touch the lane.
- VFX: dark containment rim only on hostile telegraphs and very bright projectiles.

## 7. Towers and visible progression

The system may support a growing loadout, so each tower needs a scalable visual record rather than a one-off illustration. Every tower asset sheet must include:

- 128 px black silhouette thumbnail;
- 64 px grayscale gameplay thumbnail;
- top/side mass diagram;
- faction/dialect declaration;
- level 1–4 growth strip;
- special-ability tell and impact frame;
- branch comparison with color removed;
- damaged/disabled state if the game supports it;
- build, idle, attack, upgrade, and sell/recall beats.

### Four foundational silhouette families

Names are working names and must remain original.

| Family | Working tower | Silhouette | Primary read | Attack ownership |
|---|---|---|---|---|
| Ranged | **Briarwatch Roost** | wide forked crown over a narrow trunk | fast precision | thin copper-white streak, small leaf-shear impact |
| Arcane | **Riftloom Spire** | tall split needle held inside an incomplete ring | magic / armor answer | curved teal thread that tightens before impact |
| Garrison | **Oathgate Hall** | low, broad arch with two square shoulders and banner gap | blockers / area control | rally chevron and physical unit movement, minimal projectile VFX |
| Artillery | **Embercoil Foundry** | heavy offset drum, low chimney, front counterweight | burst / area damage | slow dark shell, orange core flash, outward stone-dust ring |

No two equipped towers may share the same dominant crown shape at 64 px. If they do, one must be redesigned.

### Level growth grammar

- **Level 1 — Function:** 60–70% of final mass; one operator or one animated core; no decorative satellite pieces.
- **Level 2 — Confidence:** footprint gains support mass; weapon or focal crystal grows; silhouette changes on one side.
- **Level 3 — Mastery:** top profile changes; secondary animation appears; faction material becomes clear.
- **Level 4 — Identity:** signature silhouette is complete; special-ability apparatus becomes visible; emissive surface area may reach, but not exceed, 12% of the tower.

The tower must look stronger because its center of mass, weapon scale, staffing, and motion complexity change—not because it becomes brighter.

### Tradeoff visualization

If progression offers mutually exclusive choices, the choice must become visible at gameplay scale.

- **Damage branch:** forward or vertical thrust, closed mass, hotter accent, shorter/faster mechanical cycle.
- **Control branch:** wider lateral span, open rings or branching arms, cooler accent, longer anticipatory motion.
- **Support branch:** elevated banner/light, open central negative space, gold accent, outward pulse.
- **Risk/reward branch:** visibly exposed core, asymmetry, Rift dialect, unstable idle cadence.

Recolor-only branches fail review. A branch must alter at least two of: crown silhouette, footprint balance, animated apparatus, operator count, projectile path, or idle pose.

### Upgrade user experience

The upgrade beat is 550–750 ms:

1. Physical tower compresses 2–4 px for 90 ms.
2. Memory seams trace the changed silhouette for 180–260 ms.
3. New mass resolves from stone/wood/metal pieces, not a white flash.
4. One restrained gold confirmation ring expands along the ground.
5. The tower performs a 250–400 ms signature readiness motion.

The player must see what changed without opening a tooltip.

## 8. Enemies and combat readability

Enemy design begins with tactical job, not lore. The roster can grow indefinitely if six silhouette cohorts stay intact.

| Cohort | Silhouette | Motion signature | Read at a glance |
|---|---|---|---|
| **Swarm** | compact triangle or bean, little negative space | quick two-beat scurry | numerous, fragile |
| **Runner** | horizontal wedge, forward lean, trailing element | long stride, low vertical bounce | fast leak threat |
| **Bulwark** | square torso, broad shoulders, short legs | heavy four-beat walk, 1-frame settle | armor / stall |
| **Caster** | narrow base, large crown or raised arm, open center | gliding or delayed steps, visible charge pose | support / ranged danger |
| **Flyer** | clear wing span wider than body, detached ground shadow | sinusoidal height drift | ignores blockers or path rules |
| **Boss** | 2.2–3.0× local enemy area, unique asymmetry | authored phase cadence | encounter-defining rules |

### Armor and resistance language

- Physical armor is communicated by large overlapping plates covering at least 25% of the torso silhouette.
- Magical resistance is communicated by an open split halo, ward cloth, or orbiting physical token—never only a purple tint.
- Regeneration uses visibly closing seams and a rising three-pulse glyph.
- Summoners carry an obvious secondary silhouette, such as a cage, nest, bell, or bound lantern.
- Stealth reduces internal detail but preserves a contact shadow and directional distortion; it must never become genuinely untrackable.

### Health and status display

- Standard health bar appears after first damage and fades 1.4 seconds after no value change.
- Elite health bar is always present while on screen. Boss health occupies a dedicated top-center encounter strip.
- Bar frame is Night Ink; remaining health uses pale Bone Paper with a hostile red terminus, so it remains visible over warm and cool biomes.
- Regular units may show two status pips; elites three; further effects collapse into a small `+n` badge.
- Status order is: invulnerability → imminent cast → hard control → vulnerability → damage over time → buff.

### Spawn and death

- Spawn points must announce a new cohort with a 350–600 ms environmental tell before the first unit becomes targetable.
- Small enemies die in 220–360 ms and clear their combat silhouette within 180 ms.
- Large enemies die in 420–650 ms, falling away from the lane center where possible.
- Corpses, decals, and loot cannot obscure live feet, health bars, or path edges. Corpse opacity falls below 25% after 1.2 seconds and clears by 2.5 seconds unless it is mechanically relevant.

## 9. VFX language and combat hierarchy

VFX communicates **source, path, result**.

1. Source performs a readable anticipation.
2. Projectile or field shows ownership through path shape.
3. Impact confirms hit type and area.
4. Residue only remains if gameplay remains.

### Effect budgets

| Effect class | Typical duration | Max radius at 1080p | Notes |
|---|---:|---:|---|
| Basic hit | 90–160 ms | 20 px | no bloom cloud |
| Heavy hit | 160–260 ms | 38 px | brief 2–3 px camera impulse only for exceptional hits |
| Area ability | 350–850 ms | exact mechanical radius | edge must be clearer than fill |
| Hero ultimate | 700–1,500 ms | encounter-specific | may dominate frame once, must reveal lane again promptly |
| Boss telegraph | 450–1,200 ms before resolution | exact danger area | toothed/dashed hostile boundary plus directional motion |
| Persistent field | mechanical duration | exact mechanical radius | 12–22% fill alpha; no opaque center |

### Overdraw and occlusion rules

- At peak combat, effects may obscure no more than 15% of living enemy body area for longer than 180 ms.
- The lane edge, boss weak point, selected hero, and active hostile telegraph can never all be obscured simultaneously.
- Maximum three high-intensity effect families on screen. The fourth is automatically reduced to a low-intensity supporting treatment.
- Bloom stays inside 1.35× the bright source diameter.
- Screen shake is 0–2 px for regular combat, 3–5 px for hero ultimates, and 4–7 px for boss phase events. No continuous shake.
- Chromatic aberration, full-screen blur, film grain, and lens dirt are not part of this style.

### Telegraph grammar

- Friendly area: solid broken-halo perimeter, smooth clockwise flow.
- Hostile area: toothed or segmented perimeter, counter-clockwise stutter.
- Delayed strike: perimeter contracts toward the impact point.
- Expanding hazard: perimeter grows ahead of its fill so the safe boundary remains readable.
- Directional attack: wedge has a clear origin cap and traveling inner ticks.

All damaging telegraphs must remain readable when particles are disabled.

## 10. UI skin — the Wayfinder Reliquary

The interface should feel like a field instrument assembled from dark patinated metal, bone paper, and carved luminous routes. It is not a wooden tavern sign, generic stone slab, or modern glass dashboard.

### Persistent battlefield HUD

- **Upper left:** a single compact status reliquary for lives, currency, and wave. One backing plate, three semantic groups.
- **Upper right:** pause/settings button only.
- **Lower left:** hero and ability command dock, expanding horizontally only as abilities unlock.
- **Contextual:** tower/build controls appear anchored near the selected site but reposition to remain inside the safe area.
- **Top center:** reserved for boss health, urgent wave announcements, or scenario objectives; never all three at once.

Persistent HUD coverage must remain below 16% of a 16:9 desktop viewport and below 22% on mobile. The center 58% and lower-middle 38% of the playfield remain free during normal combat.

### Panel construction

- Outer frame: Oath iron, 2–4 px apparent thickness, asymmetric split-halo corners.
- Inner surface: Night Ink for combat HUD; Bone Paper for reading-heavy menus.
- Active edge: narrow Rift Teal memory seam.
- Confirm/reward: Reliquary Gold wax-like inset, not gold bevel everywhere.
- Destructive/danger: Wound Red with a physical broken-shard edge.
- Drop shadows are short and colored, never soft black fog.

### Typography

- **Display and chapter titles:** [Caudex](https://fonts.google.com/specimen/Caudex), weight 700. Use sparingly and never below 22 px at the 1080p reference.
- **HUD, buttons, body, and numbers:** [Atkinson Hyperlegible](https://fonts.google.com/specimen/Atkinson+Hyperlegible), weights 400/700. Enable tabular numerals for currency, cooldowns, wave counts, and damage ranges.
- Sentence case for controls. Small caps only for short chapter markers and rarity labels.
- No curved text around radial menus. No faux-medieval blackletter.

Reference sizes at 1080p:

| Text role | Minimum |
|---|---:|
| Critical resource number | 20 px / 700 |
| Standard button label | 17 px / 700 |
| Body text | 17 px / 400 |
| Secondary metadata | 15 px / 400 |
| Tooltip title | 19 px / 700 |
| Cooldown numeral | 18 px / 700 |

Text must reflow at 200% UI scale without hiding a critical battlefield control. Essential information cannot be baked into raster art.

### Icons

- One dominant silhouette, at most two internal cuts at 24 px.
- 2.25 px minimum apparent stroke at the 48 px master size.
- Damage families use both a corner notch and center glyph: physical/slash, arcane/split halo, blast/radiating wedge, true/diamond puncture.
- Locked content shows a physical clasp over the lower-right corner; unavailable-in-combat shows a diagonal shutter; cooldown shows a clockwise dark sweep. These states cannot be recolors of one another.
- Every icon must pass a five-second unlabeled recognition test with at least 80% correct answers among five testers familiar with the game.

### Selection and focus

- Hover: 90 ms light trace and 1 px lift.
- Press: 60 ms inward shift with highlight suppression.
- Selected: stable teal seam plus a lower-left identity notch.
- Keyboard/controller focus: bright double-corner brackets independent of hover.
- Disabled: preserve silhouette and label contrast; lower saturation and close the seam with a metal shutter.

### Contextual tower control

Prefer a compact crescent of 3–5 choices around the selected site. The arc opens away from the lane. Each choice shows icon, price, and one tactical keyword. Long descriptions live in a side-safe tooltip, never over the unit cluster.

If selection occurs near an edge, the crescent flips or becomes a short vertical stack. It must not shrink below touch-safe size.

## 11. Character art and portrait direction

- Standard humanoids use roughly 1:3.25 to 1:3.75 head-to-body proportions at gameplay scale: stylized enough to read, not super-deformed.
- Hands, weapons, horns, and headgear may be enlarged 10–20% for readable action, but torsos and legs retain believable weight.
- Portraits are painted three-quarter busts with strong eye-line, one hand/weapon cue, and a simple value-group background. Do not use cropped gameplay sprites.
- Friendly portraits look toward the playfield center; hostile portraits look toward the player’s command area.
- Skin, cloth, metal, and magic need visibly distinct edge softness and highlight behavior.
- Expressions communicate tactical role: defender grounded, ranger alert, caster focused, berserker coiled. Avoid the same clenched-teeth face on every hero.

## 12. Motion direction

Motion tone is **weight first, flourish second**.

### Units

- Standard locomotion reads at 10–14 unique poses per second, with subframe movement interpolation if the engine supports it.
- Small swarm enemies may use 14–18 pose changes per second but need a stable contact shadow.
- Heavy units use 7–10 pose changes per second with clear vertical settle and delayed secondary motion.
- Attack anticipation: 100–240 ms depending on weapon weight.
- Impact frame: 50–100 ms, with the weapon silhouette at maximum extension.
- Recovery: 100–320 ms and must preserve mechanical attack cadence.

Idle animation is asymmetric and restrained: breathing, cloth settle, lookout turn, mechanism reset. Do not bounce every actor on the same beat.

### Towers

- Tower base remains visually anchored. Only weapon assemblies, operators, banners, vents, roots, and energy apparatus move.
- Fast towers show cadence through small repeatable mechanical cycles.
- Heavy towers spend more motion budget on anticipation and recoil than impact fireworks.
- Magic towers tighten or align shapes before release; energy does not simply appear.

### Environment

- Ambient loops range from 4–14 seconds and start at randomized phases.
- No more than one broad moving layer and two local ambient clusters in the combat center.
- Water, foliage, fog, and particles use different loop lengths to avoid visible synchronization.

### Camera and hit response

- Standard hits use actor reaction, contact shadow compression, and VFX—not camera shake.
- Hero signature impacts may use 25–45 ms hit-stop on affected actors only.
- Boss phase breaks may use 45–70 ms global hit-stop and a single camera impulse.
- Reduced-motion mode removes screen shake, parallax drift, idle bob, and decorative particles while retaining attack anticipations and danger telegraphs.

## 13. Biome color-script template

Every biome brief must include these eight swatches:

1. deep terrain shadow;
2. terrain midtone;
3. lane surface;
4. lane shoulder;
5. landmark material;
6. atmospheric accent;
7. rare wonder accent;
8. corruption or threat intrusion.

### Verdant Rift example

- Deep terrain: `#12342D`
- Moss midtone: `#607447`
- Lane limestone: `#D8C896`
- Shoulder lichen: `#8A955A`
- Landmark stone: `#647477`
- Water-memory teal: `#24B7B4`
- Rare violet crystal: `#8B69E5`
- Threat ember: `#D84C3D`

The current Verdant Rift concept is directionally strong in composition, material richness, and landmark water. Its production pass must still reduce high-frequency foliage immediately beside vow-discs, unify light direction on the lower bridges, and protect at least 24 px of quiet ground around every build site.

## 14. Asset-level definition of done

An art asset is not done when it is attractive by itself. It is done when it survives the game.

### Map

- Lane flow reads in under one second at full size and at 25% thumbnail size.
- Entrances, exits, and build sites remain unambiguous in grayscale.
- No false paths are formed by roots, walls, water highlights, or paving seams.
- Landmark is memorable but does not attract the eye more strongly than an active hostile telegraph.
- Texture repetition is not visible within any 512×512 crop.
- Top, side, and contact planes obey the same key-light direction.

### Tower

- Family and level are identifiable from silhouette alone at 64 px.
- Attack source and projectile ownership are identifiable without color.
- Upgrade changes at least one exterior contour and one animated component.
- Occupants and weapon parts never merge into an unreadable crown.
- Material rendering matches the bible and neighboring towers.

### Enemy

- Tactical cohort is identified by at least four of five testers within two seconds.
- Facing and direction of travel are obvious on the anticipation and impact frames.
- Armor/resistance state is not color-only.
- Contact shadow stays connected to feet or ground projection during normal locomotion.
- Death clears combat information quickly and does not resemble a stunned live pose.

### VFX

- Source, affected area, and result are obvious in a paused frame.
- Telegraph boundary matches mechanical collision/radius within 3 px at the reference resolution.
- Effect remains meaningful with particles at 25% density.
- No frame hides selected hero, boss weak point, and lane edge at the same time.
- Effect palette is not confused with another equipped tower’s primary attack.

### UI

- Critical controls fit at 1280×720, 1920×1080, 2560×1440, 390×844, and 844×390 safe areas.
- HUD does not cover an entrance, exit, build site, or selected actor.
- All interactive states are distinguishable without color.
- Text is live, localizable, and readable at 200% UI scale.
- Controller focus, keyboard focus, pointer hover, touch press, disabled, selected, and cooldown states are all visibly distinct.

## 15. Harsh visual acceptance rubric

This is a ship gate, not a mood-board conversation. Each review uses captured gameplay from the current build, not isolated Photoshop comps.

### Scored rubric — 100 points

| Category | Weight | Pass condition |
|---|---:|---|
| Tactical readability | 22 | Lane, threat, ownership, target, and build state survive peak combat and grayscale |
| Composition and hierarchy | 14 | Eye order is lane → threat → defense → landmark; no equal-weight clutter |
| Original identity | 14 | Logo-free crop is recognizably Reliclight and not mistaken for Kingdom Rush or another benchmark |
| Asset craft and materials | 14 | Light, scale, surfaces, edges, and texture frequency are consistent at gameplay zoom |
| Tower/enemy silhouette system | 12 | Role and progression read at thumbnail scale; no recolor-only distinctions |
| Motion and combat feel | 10 | Anticipation, impact, recoil, and recovery carry weight without noise |
| VFX clarity and spectacle | 8 | Premium payoff with exact telegraphs and controlled occlusion |
| UI, type, and accessibility | 6 | Thematic, low-chrome, scalable, non-color-dependent, input-complete |

**Ship-quality pass:** at least **92/100**, no category below 80% of its available points, and zero automatic failures.

### Automatic failures

- placeholder art, system fonts, or mismatched generated assets remain in a release capture;
- lane or entrance is not understood in one second;
- a build site can be mistaken for scenery;
- two equipped towers share the same silhouette at 64 px;
- damage, resistance, ownership, target, or placement validity relies on color alone;
- a telegraph does not match the damaging area;
- peak VFX hides a selected unit or enemy threat for more than 180 ms;
- visible texture seam, upscale blur, inconsistent light direction, detached contact shadow, or sprite-foot sliding;
- HUD overlaps a gameplay-critical region at any supported viewport;
- art is recognizably derivative of a specific Kingdom Rush asset, character, tower, menu, or motif.

### Blind side-by-side benchmark protocol

Use official, unmodified gameplay screenshots from Kingdom Rush 5: Alliance as the external bar. Internal use only; do not redistribute copyrighted benchmark art.

1. Capture four matched states from each game at the same pixel dimensions: calm early wave, dense late wave, boss telegraph, and selected-tower UI.
2. Remove only logos and letterboxing. Do not recolor, sharpen, crop away weakness, or pick a promotional splash for one game and live gameplay for the other.
3. Randomize left/right placement and filename. Reviewers are told only that both are commercial-quality tower-defense candidates.
4. Use at least seven reviewers who did not create the compared assets. At least two must be unfamiliar with the project.
5. Ask which image is better for: immediate readability, composition, material richness, character/tower appeal, VFX clarity, UI integration, distinctiveness, and “would you play this based on the screenshot?”
6. Require a one-sentence reason for every choice and allow “tie.”
7. Repeat at full size, 50%, 25%, grayscale, and simulated deuteranopia.

**Benchmark pass:** Reliclight is preferred in at least 60% of non-tie decisions overall, is not behind by more than 10 percentage points in any single category, receives a median “would play” score of at least 4.5/5, and has no rubric automatic failure. If it fails, the art owner writes the top three causes, changes the build, and reruns the same matched states. Do not swap in easier screenshots.

### “Wow” is not a criterion by itself

A reviewer saying “wow” is useful but insufficient. The build is accepted only when the reviewer can name why it works—clean combat read, memorable landmark, material conviction, strong silhouettes, and satisfying motion—and the measurable gates above also pass.

## 16. Review cadence

### Gate A — black-and-white blockout

Review only value, lane flow, silhouettes, build sites, and HUD occupancy. No rendering may begin until this passes.

### Gate B — material and palette slice

One 512×512 environment crop, one full tower progression strip, one enemy cohort, one hero portrait, one HUD cluster, and three VFX are brought to final quality. This slice establishes the production bar.

### Gate C — motion slice

One complete wave is captured with all final animation classes. Review at normal speed, 0.5×, paused on impacts, reduced-motion mode, and 25% particle density.

### Gate D — stress battlefield

Run the densest legal wave with maximum equipped towers, simultaneous cooldowns, status effects, and a boss telegraph. Fix readability before adding more spectacle.

### Gate E — blind benchmark

Run the protocol above. A failed gate loops back to the responsible asset class. A second failure requires art-direction review of the system, not another polish pass on symptoms.

## 17. Source record

### Primary Kingdom Rush sources

- [Ironhide — Kingdom Rush 5: Alliance official game page](https://www.ironhidegames.com/Games/kingdom-rush-alliance) — official positioning, colorful terrains, two-hero premise, tower examples, release date.
- [Steam — Kingdom Rush 5: Alliance](https://store.steampowered.com/app/2849080/Kingdom_Rush_5_Alliance_TD/) — official live gameplay media and current feature list.
- [Ironhide — Questions and Answers from Alliance Devs](https://www.ironhidegames.com/News/Details/341) — rationale for two heroes, campaign structure at launch, returning tower families, and in-battle enemy information.
- [Kingdom Rush Wiki — Kingdom Rush 5: Alliance](https://kingdomrushtd.fandom.com/wiki/Kingdom_Rush_5%3A_Alliance) — loadout of five specialized towers, four in-stage tower upgrades, hero/spell structure, platform differences, and roster growth.
- [Kingdom Rush Wiki — Towers / Alliance](https://kingdomrushtd.fandom.com/wiki/Towers/Alliance) — current tower roster and special-tower breadth.
- [Kingdom Rush Wiki — Enemies / Alliance](https://kingdomrushtd.fandom.com/wiki/Enemies/Alliance) — current enemy, special-enemy, boss, and DLC roster breadth.
- [Kingdom Rush Wiki — Upgrades](https://kingdomrushtd.fandom.com/wiki/Upgrades) — global upgrade-tree structure and mutually exclusive reinforcement branches.
- [Kingdom Rush Wiki — Strategic Point](https://kingdomrushtd.fandom.com/wiki/Strategic_Point) — build-site purpose and blocked-site variants.

The official Steam page and community-maintained wiki can differ because the game has continued to receive updates. Use the official build as authority for current art content; use the wiki as a mechanics/progression index and verify changing counts before publishing them in player-facing material.

### Comparable premium presentation sources

- [Steam — Thronefall](https://store.steampowered.com/app/2239150/Thronefall/) — restrained palette, large-scale map legibility, minimal silhouette strategy.
- [Steam — Bad North: Jotunn Edition](https://store.steampowered.com/app/688420/Bad_North_Jotunn_Edition/) — negative space, figure-ground separation, and compact tactical islands.
- [Steam — Isle of Arrows](https://store.steampowered.com/app/1946970/Isle_of_Arrows/) — quiet board-game staging, minimal UI, and top-down choice clarity.
- [Steam — Emberward](https://store.steampowered.com/app/2459550/Emberward/) — dense modern roguelite TD combat, strong tower individuality, and peak-state clutter risks.

### Accessibility and type sources

- [W3C WCAG 2.2 — Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) — information must not rely on color alone.
- [W3C WCAG 2.2 — Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) — contrast guidance for meaningful graphics and controls.
- [Google Fonts — Caudex](https://fonts.google.com/specimen/Caudex)
- [Google Fonts — Atkinson Hyperlegible](https://fonts.google.com/specimen/Atkinson+Hyperlegible)
