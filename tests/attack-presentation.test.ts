import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import type { AttackPresentationActor, AttackPresentationStyle, GameEvent } from '../src/game/simulation/state';
import type { Vec2 } from '../src/game/simulation/geometry';

interface PresentationHarness {
  presentAttack(
    actor: AttackPresentationActor,
    actorUid: string,
    targetUid: string,
    source: Vec2,
    target: Vec2,
    color: number,
    style: AttackPresentationStyle,
    windup: number,
    travel: number,
  ): void;
}

const phaseEvents = (events: GameEvent[]) => events.filter((event) =>
  event.type === 'attack-start' || event.type === 'attack-release' || event.type === 'attack-impact',
);

describe('explicit combat presentation contract', () => {
  it('emits start, release, and impact in one stable attack identity', () => {
    const simulation = new GameSimulation();
    const harness = simulation as unknown as PresentationHarness;
    harness.presentAttack('tower', 'tower:7', 'enemy:11', { x: 4, y: 8 }, { x: 40, y: 80 }, 0xffaa44, 'ember', 0.22, 0.24);
    const events = phaseEvents(simulation.drainEvents());

    expect(events.map((event) => event.type)).toEqual(['attack-start', 'attack-release', 'attack-impact']);
    const delays = events.map((event) => 'delay' in event ? event.delay : -1);
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBeCloseTo(0.22, 8);
    expect(delays[2]).toBeCloseTo(0.46, 8);
    expect(new Set(events.map((event) => 'attackId' in event ? event.attackId : -1)).size).toBe(1);
    expect(events.every((event) => 'actorUid' in event && event.actorUid === 'tower:7')).toBe(true);
  });

  it('is deterministic and leaves authoritative state untouched', () => {
    const run = () => {
      const simulation = new GameSimulation();
      const before = simulation.getSnapshot();
      (simulation as unknown as PresentationHarness).presentAttack('enemy', 'enemy:3', 'hero:kael', { x: 10, y: 20 }, { x: 30, y: 40 }, 0xff7755, 'brute', 0.26, 0);
      const events = phaseEvents(simulation.drainEvents());
      const after = simulation.getSnapshot();
      return { events, before: JSON.stringify(before), after: JSON.stringify(after) };
    };
    const a = run();
    const b = run();
    expect(a.events).toEqual(b.events);
    expect(a.after).toBe(a.before);
    expect(b.after).toBe(b.before);
  });
});
