# Verdant Rift Audio Direction — The Canopy Remembers

## Identity

The sound is weathered chamber fantasy under supernatural pressure: bowed
strings and melody against living wood, hammered metal, glass, breath, and the
low organic mass of the Hollow Bloom. It should feel authored and emotionally
legible without copying the orchestral-comic language of another tower-defense
series.

The build is a hybrid of a real recorded/rendered CC BY 4.0 score and CC0 sampled
material effects. Small procedural layers reinforce crisis pulse, sub weight,
air, and spatial cohesion; they never carry the melody or replace an authored
effect. No MIDI or General MIDI playback ships.

## Adaptive score

- Menu: Kevin MacLeod's 4:40 “Angevin” owns the briefing screen.
- Battle: the complete 5:15 “Noble Race” starts once and continues through calm,
  active, and crisis pressure. Calling waves early or toggling 2× cannot seek,
  restart, repitch, or accelerate it.
- Crisis: a syncopated frame-drum and low-reed reinforcement enters over the
  same battle playhead. A 20/13-enemy hysteresis band and dwell gate prevent
  orchestration from flapping around one threshold.
- Boss: one deliberate 0.6-second crossfade introduces the separate 5:05
  “Killers” composition. A reserved critical sting and low-frequency arrival
  impact coincide with the reduced-motion-aware battlefield shock.
- Victory: a short fanfare resolves the encounter while the score fades out.

Only scene boundaries change compositions: briefing to battle, and battle to
boss. Dynamic pressure lives in additive accents, not brittle horizontal
resequencing. The reinforcement layer keeps its irregular eight-bar,
64-eighth-note form (23.4 seconds at 82 BPM).

## Material identities

| Family | Sample identity | Reinforcement |
|---|---|---|
| Thorn | creaking/string-like release, wooden impact | narrow spatial image |
| Ember | vessel/body pressure transient | restrained low ignition pulse |
| Aegis | blade/metal release, plate or bell weight | short shield resonance |
| Astral/Lyra | pitched glass and bell | longer room send |
| Kael | dry blade and heavy body | minimal low pulse |
| Heroes | separate release, ability, hurt, defeat, ready, respawn families | spatial position |
| Enemies | skitter/soft, marauder/body, brute/heavy, wisp/glass | cosmetic rate variation |
| Bloomlord | layered heavy plate, bell, heavy body and sub | never a fodder death cue |
| System | three-way click, invalid, confirm, select variation | no oscillator UI beep |

The animation contract supplies explicit attack start, release, and impact
events. Weapon samples follow the release event after its speed-scaled windup;
the presentation impact event owns contact audio. Ally health mutates
authoritatively before presentation, but neither its contact sample nor a fatal
defeat sting may fire until that authored impact time. The older ally-attack
event is intentionally silent, preventing a doubled swing.

## Mix topology

Music, combat, and world ambience have independent gain buses. Each control
uses a 1.6-power curve so its middle range remains useful. Spatial panning is
capped at ±0.78. A deterministic 2.35-second stereo convolution space receives
selected sends.

All buses enter a gentle compressor, then master gain, then a fast −3 dB
working-ceiling limiter and measurement analyser. This leaves headroom for
lossy-codec inter-sample reconstruction. Source cues are individually staged near
−16 LUFS before the music bus. Master, music, combat, and world settings persist
in local storage; mute controls master gain without destroying the score.

Ordinary ambience and combat share a hard 48-voice ceiling. Leak, boss,
ability-ready, hero-defeat, and wave cues use a separate critical reserve, so
dense chatter cannot steal tactical information. Every critical admission and
drop count is exposed in diagnostics and browser-tested under a saturated
ordinary pool.

## State and lifecycle

- One user gesture creates exactly one `AudioContext`, one scheduler, and two
  ambience sources. Phaser audio is disabled.
- The music and reinforcement scheduler uses `AudioContext.currentTime`, never
  simulation delta; 2× therefore changes neither score tempo nor pitch.
- Requested modes pass through hysteresis and dwell before they become audible
  modes. Diagnostics expose the requested/candidate/current modes, their dwell
  times, program changes, source starts and stops, mid-phrase restart count,
  current cue duration, and the bounded recent transport history.
- Program changes are explicit scene transitions, not reactive pressure edits;
  `AudioContext` owns their clock and gain ramps.
- Pause suspends the context. Resume continues its musical clock without
  scheduling a duplicate engine.
- Page exit and hot replacement abort all listeners, clear every interval and
  deferred cue, stop sources, disconnect the graph, and close the context.
- Source and license hashes, measured source levels, and capture evidence are
  pinned in `docs/AUDIO_ASSET_MANIFEST.md`.
