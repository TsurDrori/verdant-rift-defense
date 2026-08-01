import { describe, expect, it } from 'vitest';
import { heroAbilitySpec } from '../src/game/content/heroProgression';
import { GameSimulation } from '../src/game/simulation/GameSimulation';
import { distance, PATH_LENGTH, pointOnPath, projectPointToPath } from '../src/game/simulation/geometry';
import type { EnemyState, GameSnapshot } from '../src/game/simulation/state';

type HeroPolicy = 'reserve' | 'split' | 'kael-carry';

interface BalanceResult {
  phase: GameSnapshot['phase'];
  wave: number;
  lives: number;
  towers: number;
  elapsed: number;
  heroes: Array<{ id: string; level: number; xp: number; kills: number }>;
}

const BUILD = [
  { pad: 0, type: 'thorn', branch: 'left' },
  { pad: 1, type: 'ember', branch: 'right' },
  { pad: 2, type: 'astral', branch: 'right' },
  { pad: 4, type: 'aegis', branch: 'left' },
  { pad: 7, type: 'thorn', branch: 'right' },
  { pad: 8, type: 'ember', branch: 'left' },
  { pad: 10, type: 'astral', branch: 'left' },
] as const;

function bestCluster(enemies: readonly EnemyState[], include: (enemy: EnemyState) => boolean): EnemyState | undefined {
  const candidates = enemies.filter((enemy) => enemy.alive && include(enemy));
  return [...candidates].sort((a, b) => {
    const aProgress = projectPointToPath(a).progress;
    const bProgress = projectPointToPath(b).progress;
    const aWeight = candidates.filter((other) => Math.abs(projectPointToPath(other).progress - aProgress) * PATH_LENGTH <= 125).length;
    const bWeight = candidates.filter((other) => Math.abs(projectPointToPath(other).progress - bProgress) * PATH_LENGTH <= 125).length;
    return bWeight - aWeight || b.progress - a.progress || a.uid - b.uid;
  })[0];
}

function maintainFixedBuild(simulation: GameSimulation): void {
  const state = simulation.getSnapshot();
  for (const order of BUILD) {
    if (state.towers.some((tower) => tower.padIndex === order.pad)) continue;
    simulation.buildTower(order.pad, order.type);
    return;
  }
  for (const order of BUILD) {
    const tower = state.towers.find((candidate) => candidate.padIndex === order.pad);
    if (!tower) return;
    if (tower.level < 3) {
      simulation.upgradeTower(tower.uid);
      return;
    }
    if (!tower.branch) {
      simulation.chooseBranch(tower.uid, order.branch);
      return;
    }
  }
}

function manageHeroes(simulation: GameSimulation, policy: Exclude<HeroPolicy, 'reserve'>): void {
  const state = simulation.getSnapshot();
  const ground = bestCluster(state.enemies, (enemy) => enemy.type !== 'wisp');
  const air = bestCluster(state.enemies, (enemy) => enemy.type === 'wisp');
  const any = bestCluster(state.enemies, () => true);
  if (ground) simulation.moveHero('kael', ground);
  if (policy === 'split') simulation.moveHero('lyra', air ?? any ?? pointOnPath(0.42));
  else simulation.moveHero('lyra', pointOnPath(0.93));

  const kael = state.heroes.find((hero) => hero.id === 'kael')!;
  const lyra = state.heroes.find((hero) => hero.id === 'lyra')!;
  const kaelAbility = heroAbilitySpec('kael', kael.level);
  const lyraAbility = heroAbilitySpec('lyra', lyra.level);
  const kaelCast = bestCluster(state.enemies, (enemy) => (
    enemy.type !== 'wisp' && distance(kael, enemy) <= kaelAbility.castRange
  ));
  const lyraCast = bestCluster(state.enemies, (enemy) => distance(lyra, enemy) <= lyraAbility.castRange);
  if (kaelCast && kael.ultimateCooldown <= 0) simulation.useAbility('kael', kaelCast);
  if (policy === 'split' && lyraCast && lyra.ultimateCooldown <= 0) simulation.useAbility('lyra', lyraCast);
}

function run(policy: HeroPolicy): BalanceResult {
  const simulation = new GameSimulation();
  simulation.setDifficulty('warden');
  simulation.begin();
  simulation.startWave();
  let elapsed = 0;
  let commandAt = 0;
  for (; elapsed < 900; elapsed += 0.1) {
    maintainFixedBuild(simulation);
    if (policy !== 'reserve' && elapsed >= commandAt) {
      manageHeroes(simulation, policy);
      commandAt += policy === 'kael-carry' ? 4 : 5;
    }
    simulation.update(0.1);
    simulation.drainEvents();
    const phase = simulation.getSnapshot().phase;
    if (phase === 'victory' || phase === 'defeat') break;
  }
  const state = simulation.getSnapshot();
  return {
    phase: state.phase,
    wave: state.wave,
    lives: state.lives,
    towers: state.towers.length,
    elapsed,
    heroes: state.heroes.map((hero) => ({ id: hero.id, level: hero.level, xp: hero.xp, kills: hero.ownKills })),
  };
}

describe('Warden hero-management balance telemetry', () => {
  it('keeps reserve growth below deliberate mastery and preserves a winnable managed line', () => {
    const reserve = run('reserve');
    const split = run('split');
    const carry = run('kael-carry');
    expect(reserve.heroes.every((hero) => hero.level >= 2 && hero.level <= 3)).toBe(true);
    expect(split.heroes.every((hero) => hero.level >= 3 && hero.level <= 5)).toBe(true);
    const reserveKael = reserve.heroes.find((hero) => hero.id === 'kael')!;
    const splitKael = split.heroes.find((hero) => hero.id === 'kael')!;
    const carryKael = carry.heroes.find((hero) => hero.id === 'kael')!;
    expect(carryKael.level).toBeGreaterThanOrEqual(5);
    // The focused policy farms more ground kills, while split play can earn
    // more XP from fewer high-value targets. Mastery is therefore expressed by
    // own-kill leadership plus the level threshold, not raw XP ordering.
    expect(carryKael.kills).toBeGreaterThan(splitKael.kills);
    expect(carryKael.xp).toBeGreaterThan(reserveKael.xp * 2);
    expect(splitKael.xp).toBeGreaterThan(reserveKael.xp);
    expect(carry.heroes.find((hero) => hero.id === 'lyra')!.level).toBeLessThanOrEqual(2);
    expect(split.phase).toBe('victory');
    expect(split.lives).toBeGreaterThanOrEqual(reserve.lives + 2);
    expect(reserve.lives).toBeLessThan(20);
  // This executes three complete deterministic campaign simulations. It takes
  // ~9 s on a local ARM machine and ~26 s on GitHub's shared Linux runner; the
  // assertions validate simulation output, so CPU speed must not fail the gate.
  }, 60_000);
});
