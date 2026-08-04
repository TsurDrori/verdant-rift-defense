# Hero magic and progression acceptance

This gate is intentionally stricter than ordinary smoke testing. A spell is not
accepted because it deals the correct damage; targeting, presentation,
readability, input ownership, cleanup, and build choice must all pass.

## Baseline defect

Before this pass, arming Kael and clicking foundation 1 changed selection to the
foundation and silently cleared the armed spell. The canvas cursor remained the
ordinary pointer, and the two hero buttons exposed only one unnamed ultimate
each. This is the deployment-blocking reproduction for the targeting work.

## Exclusive targeting

- A dedicated spell button is at least 44 by 44 CSS pixels at supported sizes.
- Arming a point-targeted spell changes the cursor, canvas treatment, hero card,
  spell button, instruction copy, cast range, effect radius, and valid/invalid
  target feedback.
- While targeting, a primary world action can only attempt that spell. It cannot
  select a pad, select a tower, select another hero, open a panel, or move a hero.
- An invalid point keeps the spell armed and communicates why it is invalid.
- A successful cast consumes the spell cooldown and exits targeting exactly once.
- Escape, secondary click, and the explicit cancel control exit targeting without
  spending a cooldown. Pausing or ending the battle also clears targeting.
- Self-targeted spells fire from their dedicated button without requiring a map
  click or leaving the UI in a false targeting state.
- Keyboard and touch paths exercise the same controller commands as mouse input.

## Progression depth

- Both heroes have a readable role, a primary active spell, a later active spell,
  and at least two passive or magic milestones.
- Own-kill-only XP remains run-scoped and deterministic.
- Level unlocks change tactics rather than only increasing damage.
- Artifacts are deterministic choices, not random drops or consumable grinding.
- The artifact limit is small enough that the tower-defense HUD stays primary.
- Every artifact has a credible opportunity cost and is validated before battle.
- Existing saves normalize safely when new progression fields are absent.

## Spell presentation

- Kael and Lyra have different color, shape, motion, timing, and aftermath
  languages; recoloring one generic burst does not pass.
- Each targeted spell reads through anticipation, release, impact, and aftermath.
- The effect radius is legible without hiding enemies, health bars, the road, or a
  boss warning.
- VFX remain temporally correct at 1x and 2x speed.
- Reduced motion removes camera shake and high-frequency or sweeping motion while
  preserving gameplay radius and impact communication.
- Every temporary object, tween, timer, emitter, and listener is disposed after
  repeated casts. Diagnostics return near baseline after the effect settles.
- Ordinary combat effects are suppressed or simplified under extreme load before
  hero spell readability is sacrificed.

## Browser matrix

- Desktop: 1440x900 and 1920x1080.
- Shallow landscape: 844x390 and 740x360.
- Portrait: 430x932 and 390x844.
- Mouse, keyboard-only, and touch-emulated targeting.
- Full motion and reduced motion.

## Release gate

The verifier must provide screenshots of both heroes in armed and impact states,
an interaction trace proving selection does not leak, a repeated-cast cleanup
measurement, and automated test output. Any critical or high-severity finding
reopens implementation before publication.
