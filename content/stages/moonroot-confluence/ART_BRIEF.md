# Moonroot Confluence — painted benchmark contract

The production painting is `public/assets/environment/moonroot-confluence-painted-1600.png`. It is a 1600×900, opaque, hand-painted fantasy battlefield. `map.json` is the gameplay authority and has been fitted to the visible roads and nine painted tower foundations.

## Battlefield read

- Two independent left-side approaches: the upper Moonweir road and lower Reedmarch road.
- A true merge on the stone bridge at **(700,448)**. The collapsed ruin immediately southeast of the bridge is blocked scenery, not a third route.
- One shared road from the bridge to the gate. Both route definitions intentionally repeat this exact centerline so route-specific wave spawning and shared physical traffic can coexist.
- The bridge and first moonroot ascent, from **(700,448)** through **(890,320)**, slow ground enemies to 72% speed. Flying enemies ignore the terrain effect.
- The shared road takes the only open northeast exit, arcs clockwise around the forest sanctuary, returns west beneath it, then makes a tight U-turn near **(1010,700)** before running east to the crystal gate.
- `double-pass-ward` at **(1193,698)** sits between the lower return and final gate road. It is the premium double-exposure position: enemies enter its range, leave, then enter it again after the U-turn.

## Authoritative road centers

North approach:

`(-60,125) → (90,180) → (205,225) → (330,265) → (470,260) → (575,310) → (650,405) → (700,448)`

South approach:

`(-60,740) → (80,715) → (215,700) → (340,675) → (460,625) → (570,555) → (640,485) → (700,448)`

Shared bridge, sanctuary coil, U-turn, and gate road:

`(700,448) → (780,385) → (890,320) → (1010,275) → (1140,250) → (1270,250) → (1385,315) → (1460,380) → (1480,460) → (1450,535) → (1380,605) → (1280,645) → (1170,650) → (1070,640) → (1010,700) → (1010,760) → (1110,795) → (1260,790) → (1410,785) → (1540,790) → (1660,790)`

The gameplay road is 72 px wide. Painted shoulders may be irregular, but the road centerline must remain within the visibly open surface.

## Painted foundation centers

| Foundation | Center | Intended decision |
|---|---:|---|
| north-watch | 198,142 | North-only early coverage |
| north-bend | 480,200 | North bend and merge preparation |
| upper-lens | 939,243 | Long upper-arc fire |
| observatory-high | 1184,176 | Upper-road specialist |
| east-arc | 1417,280 | Upper arc plus upgraded coverage of the right return curve |
| moonroot-heart | 1108,498 | Premium inner-sanctuary and lower-return control |
| inner-return | 923,634 | U-turn control and hero support |
| double-pass-ward | 1193,698 | Two separated firing windows around the U-turn |
| south-watch | 68,770 | South-only early coverage |

Each foundation has a runtime radius of 37 px. The visible disk center must remain within 3 px of its declared coordinate; decorative roots and ruins may overlap its outer rim but not the usable disk.

## Why the painting and geometry match

The debug overlay must draw both route centerlines, 36 px half-width boundaries, all foundation circles, both entrance markers, and the gate over the painting. Acceptance requires:

- Both routes remain distinct until **(700,448)** and use identical coordinates afterward.
- No route crosses the collapsed ruin southeast of the bridge, water cliffs, tree masses, or sanctuary walls.
- Every centerline sample is visibly on the road, bridge, or intended moonroot traversal surface.
- All nine runtime foundations coincide with the nine painted circular foundations.
- The gate marker is centered in the crystal gate opening at **(1540,790)**.
- Debug and clean screenshots at 1600×900 and 800×450 preserve the route, merge, U-turn, foundation, and gate read.

If the painting changes, edit `map.json` against a new overlay and rerun content validation. Never move gameplay geometry silently away from painted roads to improve a metric.
