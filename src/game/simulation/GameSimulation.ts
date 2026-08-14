import { ENEMIES } from '../content/enemies';
import { COMBAT_BALANCE } from '../content/combatBalance';
import { HERO_ARTIFACTS, HERO_LEVEL_THRESHOLDS, HERO_MILESTONES, HERO_PRIMARY_SPELL, HERO_SPELLS, HERO_XP_BY_ENEMY, heroAbilitySpec, heroUnlockedSpells, isHeroActiveSpell } from '../content/heroProgression';
import { TOWERS } from '../content/towers';
import type { DamageType, HeroActiveSpellId, HeroArtifactId, HeroId, TowerBranch, TowerId, WaveGroup } from '../content/types';
import { RUN_DEFINITIONS } from '../content/generated/stages';
import type { RunDefinition } from '../content/stages/types';
import { distance, PathGeometry, type Vec2 } from './geometry';
import type { AttackPresentationActor, AttackPresentationStyle, DamageOwner, DefenderState, DifficultyId, EnemyState, GameEvent, GamePhase, GameSnapshot, HeroState, ProjectileStyle, TowerState } from './state';

interface SpawnOrder { at: number; enemy: keyof typeof ENEMIES; wave: number; routeId: string }
interface BossStrike { at: number; towerUid: number }
interface BossEscort { at: number; enemy: keyof typeof ENEMIES; wave: number; routeId: string }
type HeroTemplate = Omit<HeroState, 'x' | 'y' | 'target' | 'attackCooldown' | 'ultimateCooldown' | 'hp' | 'alive' | 'respawnTime' | 'spawn' | 'engagedEnemyUid'>;

const heroTemplates: Record<HeroId, HeroTemplate> = {
  kael: { id: 'kael', name: 'Kael • Rift Warden', color: 0x1e5962, accent: 0x7ee4cf, range: 92, damage: 38, fireRate: 0.72, speed: 138, canHitFlying: false, canBlock: true, level: 1, xp: 0, ownKills: 0, milestones: [], unlockedSpells: ['rift-quake'], spellCooldowns: { 'rift-quake': 0, 'warden-pulse': 0, starfall: 0, 'falling-constellation': 0 }, artifact: null, basicStrikeCount: 0, starseedPrimed: false, commanded: false, ultimateMax: 26, maxHp: 420, armor: 0.28, respawnMax: 11, regenCooldown: 0 },
  lyra: { id: 'lyra', name: 'Lyra • Star Seer', color: 0x56347a, accent: 0xe1b4ff, range: 186, damage: 26, fireRate: 0.82, speed: 148, canHitFlying: true, canBlock: false, level: 1, xp: 0, ownKills: 0, milestones: [], unlockedSpells: ['starfall'], spellCooldowns: { 'rift-quake': 0, 'warden-pulse': 0, starfall: 0, 'falling-constellation': 0 }, artifact: null, basicStrikeCount: 0, starseedPrimed: false, commanded: false, ultimateMax: 31, maxHp: 285, armor: 0.12, respawnMax: 9, regenCooldown: 0 },
};

const HERO_GUARD_RADIUS: Readonly<Record<HeroId, { reserve: number; commanded: number }>> = {
  kael: { reserve: 90, commanded: 108 },
  lyra: { reserve: 95, commanded: 132 },
};

// Derive merge reservation from authored bodies so adding a larger ground unit
// cannot silently make synchronized entrances overlap at a junction.
const SHARED_TRAFFIC_JUNCTION_MARGIN = Math.max(
  ...Object.values(ENEMIES).filter((enemy) => !enemy.flying).map((enemy) => enemy.radius),
) * 2 + COMBAT_BALANCE.lanes.footprintPadding + 2;

const towerPresentation: Record<TowerId, { windup: number; travel: number }> = {
  thorn: { windup: 0.132, travel: 0.11 },
  ember: { windup: 0.22, travel: 0.24 },
  aegis: { windup: 0.175, travel: 0.13 },
  astral: { windup: 0.265, travel: 0.18 },
};
const enemyPresentation: Record<keyof typeof ENEMIES, { windup: number; travel: number }> = {
  skitter: { windup: 0.072, travel: 0 },
  marauder: { windup: 0.128, travel: 0 },
  wisp: { windup: 0.21, travel: 0.12 },
  brute: { windup: 0.26, travel: 0 },
  bloomlord: { windup: 1.6, travel: 0.6 },
};

export class GameSimulation {
  readonly run: RunDefinition;
  readonly geometry: PathGeometry;
  private phase: GamePhase = 'briefing';
  private difficulty: DifficultyId = 'warden';
  private difficultyHp = 1;
  private difficultySpeed = 1;
  private gold = 310;
  private lives = 20;
  private startingLives = 20;
  private score = 0;
  private speed: 1 | 2 = 1;
  private time = 0;
  private accumulator = 0;
  private acceptedRealTime = 0;
  private droppedRealTime = 0;
  private expectedSimulationTime = 0;
  private totalFixedTicks = 0;
  private maxAccumulator = 0;
  private timingDiscards = 0;
  private waveIndex = 0;
  private waveActive = false;
  private waveTime = 0;
  private intermission = 0;
  private enemyUid = 0;
  private towerUid = 0;
  private defenderUid = 0;
  private presentationAttackUid = 0;
  private spawnQueue: SpawnOrder[] = [];
  private spawnCompleteWaves = new Set<number>();
  private clearedWaves = new Set<number>();
  private nextWaveReady = false;
  private pendingBossStrikes: BossStrike[] = [];
  private pendingBossEscorts: BossEscort[] = [];
  private bossTargetHistory = new Set<number>();
  private insightLoadout = new Set<string>();
  private enemies: EnemyState[] = [];
  private towers: TowerState[] = [];
  private defenders: DefenderState[] = [];
  private events: GameEvent[] = [];
  private heroes: HeroState[];

  constructor(run: RunDefinition = RUN_DEFINITIONS['sunken-way']!) {
    this.run = run;
    this.geometry = new PathGeometry(run.map);
    this.heroes = (['kael', 'lyra'] as HeroId[]).map((id) => {
      const spawn = run.heroSpawns[id];
      return this.createHero(id, this.geometry.point(spawn.progress, spawn.routeId));
    });
    this.setDifficulty(this.difficulty);
  }

  private createHero(id: HeroId, point: Vec2): HeroState {
    const template = heroTemplates[id];
    const spawn = this.geometry.project(point).point;
    return {
      ...template, milestones: [...template.milestones], unlockedSpells: [...template.unlockedSpells], spellCooldowns: { ...template.spellCooldowns }, ...spawn, target: { ...spawn }, spawn: { ...spawn }, attackCooldown: 0, ultimateCooldown: 0,
      hp: template.maxHp, alive: true, respawnTime: 0, engagedEnemyUid: null,
    };
  }

  getSnapshot(): GameSnapshot {
    const waveTarget = this.objectiveWaveTarget();
    return {
      phase: this.phase, difficulty: this.difficulty, gold: this.gold, lives: this.lives, startingLives: this.startingLives, wave: this.waveIndex,
      waveTotal: waveTarget, waveActive: this.waveActive, canCallWave: this.nextWaveReady,
      intermission: this.intermission,
      speed: this.speed, score: this.score, enemies: this.enemies, towers: this.towers, heroes: this.heroes, defenders: this.defenders,
    };
  }

  drainEvents(): GameEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  private presentAttack(
    actor: AttackPresentationActor,
    actorUid: string,
    targetUid: string,
    source: Vec2,
    target: Vec2,
    color: number,
    style: AttackPresentationStyle,
    windup: number,
    travel: number,
  ): void {
    const attackId = ++this.presentationAttackUid;
    const base = {
      attackId, actor, actorUid, targetUid,
      source: { x: source.x, y: source.y },
      target: { x: target.x, y: target.y },
      color, style,
    };
    this.events.push({ type: 'attack-start', ...base, delay: 0 });
    this.events.push({ type: 'attack-release', ...base, delay: windup });
    this.events.push({ type: 'attack-impact', ...base, delay: windup + travel });
  }

  begin(): void {
    if (this.phase !== 'briefing') return;
    this.phase = 'playing';
    this.events.push({ type: 'toast', tone: 'info', message: 'The rift stirs. Build your first defense.' });
  }

  setDifficulty(difficulty: DifficultyId): void {
    if (this.phase !== 'briefing') return;
    this.difficulty = difficulty;
    const economy = this.run.economy.difficulties[difficulty];
    this.gold = economy.startingGold;
    this.lives = economy.startingLives;
    this.difficultyHp = economy.enemyHp;
    this.difficultySpeed = economy.enemySpeed;
    this.applyInsightBonuses();
  }

  setInsightLoadout(upgrades: readonly string[]): void {
    if (this.phase !== 'briefing') return;
    this.insightLoadout = new Set(upgrades);
    this.setDifficulty(this.difficulty);
  }

  /**
   * Equips at most one authored artifact per hero before combat. Invalid cross-
   * hero assignments are rejected atomically, so a malformed save can never
   * partially mutate battle balance.
   */
  setHeroArtifactLoadout(loadout: Partial<Record<HeroId, HeroArtifactId | null>>): boolean {
    if (this.phase !== 'briefing') return false;
    for (const [heroId, artifactId] of Object.entries(loadout) as Array<[HeroId, HeroArtifactId | null]>) {
      if (!this.heroes.some((hero) => hero.id === heroId) || (artifactId !== null && HERO_ARTIFACTS[artifactId]?.hero !== heroId)) return false;
    }
    for (const hero of this.heroes) {
      if (!(hero.id in loadout)) continue;
      hero.artifact = loadout[hero.id] ?? null;
      this.events.push({ type: 'hero-artifact-equipped', hero: hero.id, artifact: hero.artifact });
    }
    this.setDifficulty(this.difficulty);
    return true;
  }

  private heroArtifactModifiers(hero: HeroState) {
    return hero.artifact ? HERO_ARTIFACTS[hero.artifact].modifiers : undefined;
  }

  private heroSpellCooldownMax(hero: HeroState, spell: HeroActiveSpellId): number {
    const artifactScale = this.heroArtifactModifiers(hero)?.spellCooldown ?? 1;
    const commandScale = this.insightLoadout.has('command') ? 0.9 : 1;
    return HERO_SPELLS[spell].cooldown * artifactScale * commandScale;
  }

  private reduceHeroSpellCooldowns(hero: HeroState, seconds: number): void {
    const primary = HERO_PRIMARY_SPELL[hero.id];
    hero.ultimateCooldown = Math.max(0, hero.ultimateCooldown - seconds);
    hero.spellCooldowns[primary] = hero.ultimateCooldown;
    for (const spell of hero.unlockedSpells) {
      if (!isHeroActiveSpell(spell) || spell === primary) continue;
      hero.spellCooldowns[spell] = Math.max(0, hero.spellCooldowns[spell] - seconds);
    }
  }

  private applyInsightBonuses(): void {
    this.heroes.forEach((hero) => {
      const template = heroTemplates[hero.id];
      const artifact = hero.artifact ? HERO_ARTIFACTS[hero.artifact] : undefined;
      const modifiers = artifact?.modifiers;
      hero.maxHp = template.maxHp * (modifiers?.maxHp ?? 1);
      hero.hp = hero.maxHp;
      hero.damage = template.damage * (modifiers?.damage ?? 1);
      hero.range = template.range * (modifiers?.range ?? 1);
      hero.speed = template.speed * (modifiers?.speed ?? 1);
      hero.armor = Math.max(0, Math.min(0.8, template.armor + (modifiers?.armor ?? 0)));
      hero.ultimateMax = this.heroSpellCooldownMax(hero, HERO_PRIMARY_SPELL[hero.id]);
    });
    if (this.insightLoadout.has('treasury')) this.gold += 25;
    if (this.insightLoadout.has('gate')) this.lives += 2;
    this.startingLives = this.lives;
  }

  togglePause(): void {
    if (this.phase === 'playing') { this.phase = 'paused'; this.discardElapsedTime(); }
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  /** Discards residual wall-clock debt when the page is hidden or suspended. */
  discardElapsedTime(): void {
    this.accumulator = 0;
    this.timingDiscards += 1;
  }

  getTimingDiagnostics(): Readonly<{
    simulationTime: number;
    expectedSimulationTime: number;
    acceptedRealTime: number;
    droppedRealTime: number;
    accumulator: number;
    maxAccumulator: number;
    totalFixedTicks: number;
    timingDiscards: number;
  }> {
    return {
      simulationTime: this.time,
      expectedSimulationTime: this.expectedSimulationTime,
      acceptedRealTime: this.acceptedRealTime,
      droppedRealTime: this.droppedRealTime,
      accumulator: this.accumulator,
      maxAccumulator: this.maxAccumulator,
      totalFixedTicks: this.totalFixedTicks,
      timingDiscards: this.timingDiscards,
    };
  }

  /**
   * Executes one authoritative panel mutation while the battle remains paused
   * to every external observer. No controller event is emitted until the
   * caller has restored the original phase in this finally block.
   */
  runTacticalTransaction<T>(action: () => T): T {
    const restorePaused = this.phase === 'paused';
    if (restorePaused) this.phase = 'playing';
    try {
      return action();
    } finally {
      if (restorePaused) this.phase = 'paused';
    }
  }

  toggleSpeed(): void {
    this.speed = this.speed === 1 ? 2 : 1;
  }

  update(realDelta: number): void {
    if (this.phase !== 'playing') return;
    const step = 1 / 60;
    // Foreground stalls up to 250 ms are retained, not silently discarded.
    // At 2x this is exactly 500 ms / 30 fixed ticks. Hidden tabs explicitly
    // call discardElapsedTime, so a backgrounded page never replays seconds of
    // stale combat when focus returns.
    const maxRealDebt = 0.25;
    const maxSteps = this.speed === 2 ? 30 : 15;
    const catchUpWindow = maxRealDebt * this.speed;
    const positiveDelta = Math.max(0, realDelta);
    const acceptedDelta = Math.min(positiveDelta, maxRealDebt);
    this.acceptedRealTime += acceptedDelta;
    this.droppedRealTime += Math.max(0, positiveDelta - acceptedDelta);
    this.expectedSimulationTime += acceptedDelta * this.speed;
    const scaledDelta = acceptedDelta * this.speed;
    this.accumulator = Math.min(this.accumulator + scaledDelta, catchUpWindow);
    this.maxAccumulator = Math.max(this.maxAccumulator, this.accumulator);
    const steps = Math.min(maxSteps, Math.floor((this.accumulator + 1e-9) / step));
    let executed = 0;
    for (let index = 0; index < steps && this.phase === 'playing'; index += 1) {
      this.step(step);
      executed += 1;
      this.totalFixedTicks += 1;
    }
    this.accumulator -= executed * step;
    if (this.phase !== 'playing') this.accumulator = 0;
    if (Math.abs(this.accumulator) < 1e-9) this.accumulator = 0;
  }

  private step(dt: number): void {
    this.time += dt;
    this.updateWave(dt);
    this.reconcileDefenders();
    this.updateDefenders(dt);
    this.updateHeroes(dt);
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateBossStrikes();
  }

  startWave(): boolean {
    const waveTarget = this.objectiveWaveTarget();
    const mayStart = !this.waveActive || this.nextWaveReady;
    if (this.phase !== 'playing' || !mayStart || this.waveIndex >= waveTarget) return false;
    const earlyCall = this.run.economy.earlyCall;
    const bonus = this.waveIndex === 0 ? 0 : Math.min(earlyCall.maximumBonus, Math.max(0, Math.floor(this.intermission * earlyCall.goldPerSecond)));
    this.gold += bonus;
    if (bonus > 0) this.heroes.forEach((hero) => { this.reduceHeroSpellCooldowns(hero, earlyCall.heroCooldownRefund); });
    const waveNumber = this.waveIndex + 1;
    const wave = this.run.waves[this.waveIndex]!;
    this.waveIndex += 1;
    this.waveActive = true;
    this.nextWaveReady = false;
    this.waveTime = 0;
    this.intermission = 0;
    const pressure = this.difficulty === 'wanderer' ? [] : this.run.tacticalPressure[waveNumber] ?? [];
    this.spawnQueue = this.compileWave([...wave.groups, ...pressure], this.waveIndex);
    this.events.push({ type: 'wave-started', wave: this.waveIndex, bonus });
    if (bonus > 0) this.events.push({ type: 'toast', tone: 'good', message: `Early call: +${bonus} sunshards • champions rally` });
    return true;
  }

  private compileWave(groups: readonly WaveGroup[], wave: number): SpawnOrder[] {
    return groups.flatMap((group) => Array.from({ length: group.count }, (_, index) => ({
      at: group.delay + index * group.interval,
      enemy: group.enemy,
      wave,
      routeId: group.route ?? this.geometry.primaryRouteId,
    }))).sort((a, b) => a.at - b.at);
  }

  private intermissionFor(wave: number): number {
    return this.run.economy.intermissions.find((entry) => wave <= entry.throughWave)?.seconds
      ?? this.run.economy.intermissions.at(-1)?.seconds
      ?? 20;
  }

  private updateWave(dt: number): void {
    if (this.waveActive) {
      this.waveTime += dt;
      while (this.spawnQueue[0] && this.spawnQueue[0].at <= this.waveTime) {
        const order = this.spawnQueue.shift()!;
        this.spawnEnemy(order.enemy, order.wave, order.routeId);
      }
      if (this.spawnQueue.length === 0) this.spawnCompleteWaves.add(this.waveIndex);
      if (this.spawnQueue.length === 0 && this.waveIndex < this.objectiveWaveTarget() && !this.nextWaveReady) {
        this.nextWaveReady = true;
        this.intermission = this.intermissionFor(this.waveIndex);
      }
      if (this.nextWaveReady) {
        this.intermission = Math.max(0, this.intermission - dt);
        if (this.intermission === 0) this.startWave();
      }
    } else if (this.nextWaveReady && this.waveIndex > 0 && this.waveIndex < this.objectiveWaveTarget() && this.intermission > 0) {
      this.intermission = Math.max(0, this.intermission - dt);
      if (this.intermission === 0) this.startWave();
    }
    this.resolveWaveClears();
  }

  private resolveWaveClears(): void {
    for (let wave = 1; wave <= this.waveIndex; wave += 1) {
      if (this.clearedWaves.has(wave) || !this.spawnCompleteWaves.has(wave)) continue;
      const hasLiving = this.enemies.some((enemy) => enemy.alive && enemy.wave === wave);
      const hasScheduled = this.pendingBossEscorts.some((escort) => escort.wave === wave);
      if (hasLiving || hasScheduled) continue;
      this.clearedWaves.add(wave);
      this.events.push({ type: 'wave-cleared', wave });
      this.score += 250 * wave;
    }
    this.waveActive = this.spawnQueue.length > 0 || this.enemies.some((enemy) => enemy.alive);
    if (this.clearedWaves.size >= this.objectiveWaveTarget() && this.phase === 'playing') {
      this.phase = 'victory';
      this.events.push({ type: 'victory' });
    }
  }

  private objectiveWaveTarget(): number {
    return this.run.objectives.find((objective) => objective.type === 'survive-waves')?.count ?? this.run.waves.length;
  }

  private spawnEnemy(type: keyof typeof ENEMIES, wave = this.waveIndex, routeId = this.geometry.primaryRouteId): void {
    const definition = ENEMIES[type];
    const uid = ++this.enemyUid;
    const laneTarget = COMBAT_BALANCE.lanes.spawnOffsets[(uid - 1) % COMBAT_BALANCE.lanes.spawnOffsets.length]!;
    const point = this.geometry.lanePoint(0, laneTarget, routeId);
    const hpScale = this.difficultyHp;
    const enemy: EnemyState = {
      uid, wave, type, routeId, ...point, hp: definition.hp * hpScale,
      maxHp: definition.hp * hpScale, progress: 0, laneOffset: laneTarget, laneTarget, alive: true, slow: 0,
      slowTime: 0, mark: 0, markTime: 0, spawnedAt: this.time,
      burn: 0, burnTime: 0, exposed: 0, exposedTime: 0, bossPhase: 0,
      attackCooldown: 0, engagedAllyUid: null, xpPaid: false,
    };
    this.enemies.push(enemy);
    this.events.push({ type: 'enemy-spawned', enemyUid: enemy.uid });
  }

  private defenderCount(tower: TowerState): number {
    const counts = TOWERS.aegis.defenders!.counts;
    if (tower.branch) return counts[tower.branch];
    if (tower.level === 1) return counts.rank1;
    if (tower.level === 2) return counts.rank2;
    return counts.rank3;
  }

  private defenderProfile(tower: TowerState): Pick<DefenderState, 'maxHp' | 'armor' | 'damage' | 'fireRate' | 'respawnMax'> {
    if (tower.branch === 'left') return { maxHp: 205, armor: 0.28, damage: 10, fireRate: 0.9, respawnMax: 7 };
    if (tower.branch === 'right') return { maxHp: 315, armor: 0.42, damage: 18, fireRate: 0.78, respawnMax: 10 };
    if (tower.level === 1) return { maxHp: 105, armor: 0.18, damage: 6, fireRate: 1.08, respawnMax: 8 };
    if (tower.level === 2) return { maxHp: 142, armor: 0.22, damage: 8, fireRate: 1, respawnMax: 8 };
    return { maxHp: 185, armor: 0.26, damage: 11, fireRate: 0.92, respawnMax: 8 };
  }

  private defenderHome(tower: TowerState, slot: number, count: number): Vec2 {
    const projection = this.geometry.project(this.geometry.buildPads[tower.padIndex]!);
    const centerProgress = projection.progress;
    // One formation interval must leave a full bypass pocket for the largest
    // ordinary ground body. Five-unit branches still fit inside the 112 leash.
    const alongLane = (slot - (count - 1) / 2) * 52;
    return this.geometry.point(centerProgress + alongLane / this.geometry.length(projection.routeId), projection.routeId);
  }

  private reconcileDefenders(): void {
    const aegisTowers = this.towers.filter((tower) => tower.type === 'aegis');
    const towerUids = new Set(aegisTowers.map((tower) => tower.uid));
    for (const defender of this.defenders) {
      if (towerUids.has(defender.towerUid)) continue;
      this.releaseAlly(defender);
    }
    this.defenders = this.defenders.filter((defender) => towerUids.has(defender.towerUid));

    for (const tower of aegisTowers) {
      const count = this.defenderCount(tower);
      const profile = this.defenderProfile(tower);
      const surplus = this.defenders.filter((defender) => defender.towerUid === tower.uid && defender.slot >= count);
      surplus.forEach((defender) => this.releaseAlly(defender));
      this.defenders = this.defenders.filter((defender) => defender.towerUid !== tower.uid || defender.slot < count);
      for (let slot = 0; slot < count; slot += 1) {
        const home = this.defenderHome(tower, slot, count);
        let defender = this.defenders.find((candidate) => candidate.towerUid === tower.uid && candidate.slot === slot);
        if (!defender) {
          const uid = ++this.defenderUid;
          defender = {
            uid, allyUid: `defender:${uid}`, towerUid: tower.uid, slot, ...home, home,
            ...profile, hp: profile.maxHp, attackCooldown: slot * 0.08, alive: true, respawnTime: 0, regenCooldown: 0, engagedEnemyUid: null,
          };
          this.defenders.push(defender);
          continue;
        }
        const formerMax = defender.maxHp;
        defender.home = home;
        defender.maxHp = profile.maxHp;
        defender.armor = profile.armor;
        defender.damage = profile.damage;
        defender.fireRate = profile.fireRate;
        defender.respawnMax = profile.respawnMax;
        if (defender.alive && profile.maxHp > formerMax) defender.hp += profile.maxHp - formerMax;
        defender.hp = Math.min(defender.hp, defender.maxHp);
      }
    }
    this.defenders.sort((a, b) => a.towerUid - b.towerUid || a.slot - b.slot);
  }

  private allyRef(ally: HeroState | DefenderState): string {
    return 'allyUid' in ally ? ally.allyUid : `hero:${ally.id}`;
  }

  private findAlly(allyUid: string): HeroState | DefenderState | undefined {
    if (allyUid.startsWith('hero:')) return this.heroes.find((hero) => `hero:${hero.id}` === allyUid);
    return this.defenders.find((defender) => defender.allyUid === allyUid);
  }

  private canBlockEnemy(ally: HeroState | DefenderState, enemy: EnemyState): boolean {
    const definition = ENEMIES[enemy.type];
    const allyCanBlock = 'towerUid' in ally || ally.canBlock;
    return ally.alive && allyCanBlock && definition.blockable && !definition.flying;
  }

  private contactDistance(ally: HeroState | DefenderState, enemy: EnemyState): number {
    const allyRadius = 'towerUid' in ally ? 14 : ally.id === 'kael' ? 18 : 14;
    return ENEMIES[enemy.type].radius + allyRadius + 3;
  }

  private routeGap(a: Vec2, b: Vec2): number {
    const routeId = 'routeId' in b && typeof b.routeId === 'string' ? b.routeId : this.geometry.project(a).routeId;
    return Math.abs(this.geometry.project(a, routeId).progress - this.geometry.project(b, routeId).progress) * this.geometry.length(routeId);
  }

  private engage(ally: HeroState | DefenderState, enemy: EnemyState): void {
    const reservations = ally.engagedEnemyUid === null ? 0 : 1;
    if (reservations >= COMBAT_BALANCE.blockCapacity || enemy.engagedAllyUid !== null || !this.canBlockEnemy(ally, enemy)) return;
    const allyUid = this.allyRef(ally);
    ally.engagedEnemyUid = enemy.uid;
    enemy.engagedAllyUid = allyUid;
    enemy.laneTarget = COMBAT_BALANCE.lanes.combatOffset;
  }

  private releaseAlly(ally: HeroState | DefenderState): void {
    if (ally.engagedEnemyUid !== null) {
      const enemy = this.enemies.find((candidate) => candidate.uid === ally.engagedEnemyUid);
      if (enemy?.engagedAllyUid === this.allyRef(ally)) enemy.engagedAllyUid = null;
    }
    ally.engagedEnemyUid = null;
  }

  private releaseEnemy(enemy: EnemyState): void {
    if (enemy.engagedAllyUid) {
      const ally = this.findAlly(enemy.engagedAllyUid);
      if (ally?.engagedEnemyUid === enemy.uid) ally.engagedEnemyUid = null;
    }
    enemy.engagedAllyUid = null;
  }

  private validateEngagement(ally: HeroState | DefenderState): EnemyState | undefined {
    if (ally.engagedEnemyUid === null) return undefined;
    const enemy = this.enemies.find((candidate) => candidate.uid === ally.engagedEnemyUid && candidate.alive);
    const unreachableLane = enemy ? Math.abs(enemy.laneOffset) > this.contactDistance(ally, enemy) + 0.75 : false;
    const beyondHomeLeash = enemy && 'towerUid' in ally
      ? this.routeGap(ally.home, enemy) > TOWERS.aegis.defenders!.leash + this.contactDistance(ally, enemy)
      : false;
    if (!enemy || enemy.engagedAllyUid !== this.allyRef(ally) || !this.canBlockEnemy(ally, enemy) || unreachableLane || beyondHomeLeash) {
      this.releaseAlly(ally);
      return undefined;
    }
    return enemy;
  }

  /**
   * Ground actors advance by route arc length. A direct world-space lerp cuts
   * across water and cliff corners; projecting every destination and walking
   * the authored polyline keeps each fixed tick bounded and traversable.
   */
  private moveAllyOnRoute(ally: HeroState | DefenderState, point: Vec2, speed: number, dt: number, stopDistance = 0): void {
    const targetProjection = this.geometry.project(point);
    const current = this.geometry.project(ally, targetProjection.routeId);
    const routeLength = this.geometry.length(targetProjection.routeId);
    const maxStep = speed * dt;
    if (current.distance > 0.5) {
      const recoveryStep = Math.min(current.distance, maxStep);
      ally.x += (current.point.x - ally.x) / current.distance * recoveryStep;
      ally.y += (current.point.y - ally.y) / current.distance * recoveryStep;
      return;
    }
    const targetProgress = targetProjection.progress;
    const signedGap = (targetProgress - current.progress) * routeLength;
    if (Math.abs(signedGap) <= stopDistance + 0.5) {
      const onRoute = this.geometry.point(current.progress, targetProjection.routeId);
      ally.x = onRoute.x;
      ally.y = onRoute.y;
      return;
    }
    const step = Math.min(Math.abs(signedGap) - stopDistance, maxStep);
    const nextProgress = current.progress + Math.sign(signedGap) * step / routeLength;
    const next = this.geometry.point(nextProgress, targetProjection.routeId);
    ally.x = next.x;
    ally.y = next.y;
  }

  private nearestAvailableEnemy(ally: HeroState | DefenderState, origin: Vec2, radius: number): EnemyState | undefined {
    return this.enemies
      .filter((enemy) => enemy.alive && enemy.engagedAllyUid === null && this.canBlockEnemy(ally, enemy)
        && Math.abs(enemy.laneOffset) <= Math.max(...COMBAT_BALANCE.lanes.spawnOffsets.map(Math.abs)) + 1e-9
        && this.routeGap(origin, enemy) <= radius)
      .sort((a, b) => this.routeGap(origin, a) - this.routeGap(origin, b) || b.progress - a.progress || a.uid - b.uid)[0];
  }

  private updateDefenders(dt: number): void {
    for (const defender of this.defenders) {
      defender.attackCooldown -= dt;
      if (!defender.alive) {
        defender.respawnTime = Math.max(0, defender.respawnTime - dt);
        if (defender.respawnTime === 0) {
          defender.alive = true;
          defender.hp = defender.maxHp;
          defender.x = defender.home.x;
          defender.y = defender.home.y;
          defender.attackCooldown = 0.25;
          defender.regenCooldown = 0;
          this.events.push({ type: 'ally-respawned', allyUid: defender.allyUid, point: { ...defender.home } });
        }
        continue;
      }
      let enemy = this.validateEngagement(defender);
      if (!enemy) {
        const tower = this.towers.find((candidate) => candidate.uid === defender.towerUid);
        const leash = tower ? TOWERS.aegis.defenders!.leash : 0;
        enemy = this.nearestAvailableEnemy(defender, defender.home, leash);
        if (enemy) this.engage(defender, enemy);
      }
      if (enemy) {
        defender.regenCooldown = COMBAT_BALANCE.recovery.defender.delay;
        const contact = this.contactDistance(defender, enemy);
        const longitudinalContact = Math.sqrt(Math.max(0, contact * contact - enemy.laneOffset * enemy.laneOffset));
        this.moveAllyOnRoute(defender, enemy, 108, dt, longitudinalContact);
        if (distance(defender, enemy) <= contact + 0.75 && defender.attackCooldown <= 0) {
          defender.attackCooldown = defender.fireRate;
          this.presentAttack('ally', defender.allyUid, `enemy:${enemy.uid}`, defender, enemy, TOWERS.aegis.accent, 'impact', 0.145, 0);
          this.events.push({ type: 'ally-attack', allyUid: defender.allyUid, enemyUid: enemy.uid, source: { x: defender.x, y: defender.y }, color: TOWERS.aegis.accent });
          this.hitEnemy(enemy, defender.damage, 'physical', defender, 0, TOWERS.aegis.accent, 'impact', { kind: 'defender', defenderUid: defender.uid });
        }
      } else {
        this.moveAllyOnRoute(defender, defender.home, 92, dt, 0);
        defender.regenCooldown = Math.max(0, defender.regenCooldown - dt);
        if (defender.regenCooldown === 0 && defender.hp < defender.maxHp) {
          defender.hp = Math.min(defender.maxHp, defender.hp + defender.maxHp * COMBAT_BALANCE.recovery.defender.maxHpPerSecond * dt);
        }
      }
    }
  }

  private laneProgressLimit(enemy: EnemyState, laneOffset: number, desiredProgress: number, groundOrder: readonly EnemyState[], orderIndex: number, trafficKey?: string): number {
    let limit = desiredProgress;
    const traffic = trafficKey
      ? this.geometry.trafficPositionForKey(enemy.progress, enemy.routeId, trafficKey)
      : this.geometry.trafficPosition(enemy.progress, enemy.routeId);
    if (!traffic) return limit;
    for (let index = orderIndex - 1; index >= 0; index -= 1) {
      const ahead = groundOrder[index]!;
      if (!ahead.alive || ahead.uid === enemy.uid) continue;
      const aheadTraffic = trafficKey
        ? this.geometry.trafficPositionForKey(ahead.progress, ahead.routeId, trafficKey)
        : this.geometry.trafficPosition(ahead.progress, ahead.routeId);
      if (!aheadTraffic) continue;
      const sharedTie = traffic.key.startsWith('shared:') && aheadTraffic.distance === traffic.distance;
      if (aheadTraffic.key !== traffic.key || aheadTraffic.distance < traffic.distance || (aheadTraffic.distance === traffic.distance && !sharedTie)) continue;
      const pathLength = this.geometry.length(enemy.routeId);
      const centerGap = aheadTraffic.distance - traffic.distance;
      const lateralGap = Math.abs(laneOffset - ahead.laneOffset);
      const sameBandPadding = lateralGap < 1 ? COMBAT_BALANCE.lanes.footprintPadding : 0;
      // Arc distance is slightly longer than the rendered chord through a
      // bend. A one-pixel guard keeps circular bodies separated even on a
      // tightly authored route instead of relying on straight-line geometry.
      const clearance = ENEMIES[enemy.type].radius + ENEMIES[ahead.type].radius + sameBandPadding + 1.25;
      if (centerGap > clearance + ENEMIES[enemy.type].speed / 30) break;
      const longitudinalClearance = Math.sqrt(Math.max(0, clearance * clearance - lateralGap * lateralGap));
      const availableTravel = Math.max(0, centerGap - longitudinalClearance);
      limit = Math.min(limit, enemy.progress + availableTravel / pathLength);
    }
    return Math.max(enemy.progress, limit);
  }

  private laneChangeIsClear(enemy: EnemyState, laneOffset: number, groundOrder: readonly EnemyState[], trafficKey?: string): boolean {
    const traffic = trafficKey
      ? this.geometry.trafficPositionForKey(enemy.progress, enemy.routeId, trafficKey)
      : this.geometry.trafficPosition(enemy.progress, enemy.routeId);
    if (!traffic) return true;
    return groundOrder.every((other) => {
      if (!other.alive || other.uid === enemy.uid) return true;
      const otherTraffic = trafficKey
        ? this.geometry.trafficPositionForKey(other.progress, other.routeId, trafficKey)
        : this.geometry.trafficPosition(other.progress, other.routeId);
      if (!otherTraffic) return true;
      if (otherTraffic.key !== traffic.key) return true;
      const longitudinalGap = Math.abs(otherTraffic.distance - traffic.distance);
      const lateralGap = Math.abs(laneOffset - other.laneOffset);
      const sameBandPadding = lateralGap < 1 ? COMBAT_BALANCE.lanes.footprintPadding : 0;
      const clearance = ENEMIES[enemy.type].radius + ENEMIES[other.type].radius + sameBandPadding + 1.25;
      if (longitudinalGap >= clearance) return true;
      return Math.hypot(longitudinalGap, lateralGap) >= clearance;
    });
  }

  private advanceEnemyOnRoute(enemy: EnemyState, dt: number, groundOrders: Map<string, EnemyState[]>): void {
    const definition = ENEMIES[enemy.type];
    const speedScale = 1 - Math.min(0.65, enemy.slow);
    const terrainScale = this.geometry.terrainSpeedMultiplier(enemy.progress, enemy.routeId, Boolean(definition.flying));
    const desiredProgress = enemy.progress + definition.speed * this.difficultySpeed * speedScale * terrainScale * dt / this.geometry.length(enemy.routeId);
    if (!definition.flying) {
      const currentTraffic = this.geometry.trafficQueuePosition(enemy.progress, enemy.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN);
      const desiredTraffic = this.geometry.trafficQueuePosition(desiredProgress, enemy.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN);
      const trafficKey = desiredTraffic.key;
      const groundOrder = groundOrders.get(trafficKey) ?? [];
      const traffic = this.geometry.trafficPositionForKey(enemy.progress, enemy.routeId, trafficKey) ?? currentTraffic;
      let orderIndex = groundOrder.findIndex((other) => other.uid === enemy.uid);
      if (orderIndex < 0) {
        orderIndex = groundOrder.findIndex((other) => {
          const otherTraffic = this.geometry.trafficPositionForKey(other.progress, other.routeId, trafficKey);
          if (!otherTraffic) return false;
          return otherTraffic.distance < traffic.distance
            || (otherTraffic.distance === traffic.distance && other.uid > enemy.uid);
        });
        if (orderIndex < 0) orderIndex = groundOrder.length;
      }
      const currentLimit = this.laneProgressLimit(enemy, enemy.laneTarget, desiredProgress, groundOrder, orderIndex, trafficKey);
      let bestLane = enemy.laneTarget;
      let bestLimit = currentLimit;
      if (enemy.engagedAllyUid !== null) {
        bestLane = COMBAT_BALANCE.lanes.combatOffset;
      } else {
        for (const lane of COMBAT_BALANCE.lanes.offsets) {
          if (lane !== enemy.laneTarget && !this.laneChangeIsClear(enemy, lane, groundOrder, trafficKey)) continue;
          const candidate = this.laneProgressLimit(enemy, lane, desiredProgress, groundOrder, orderIndex, trafficKey);
          const laneIsOrdinary = (COMBAT_BALANCE.lanes.spawnOffsets as readonly number[]).includes(lane);
          const bestIsOrdinary = (COMBAT_BALANCE.lanes.spawnOffsets as readonly number[]).includes(bestLane);
          // A fixed tick advances sub-pixel distances, so lane-choice hysteresis
          // must also be sub-pixel; a multi-pixel threshold can never trigger
          // while an actor is actually queued behind a stationary blocker.
          if (candidate > bestLimit + 1e-9
            || (Math.abs(candidate - bestLimit) <= 1e-9 && candidate >= desiredProgress - 1e-9 && laneIsOrdinary && (!bestIsOrdinary
              || Math.abs(lane - enemy.laneOffset) < Math.abs(bestLane - enemy.laneOffset)))) {
            bestLane = lane;
            bestLimit = candidate;
          }
        }
      }
      enemy.laneTarget = bestLane;
      if (enemy.engagedAllyUid === null) {
        const lateralGap = enemy.laneTarget - enemy.laneOffset;
        const lateralStep = Math.min(Math.abs(lateralGap), COMBAT_BALANCE.lanes.lateralSpeed * dt);
        if (lateralStep > 0) enemy.laneOffset += Math.sign(lateralGap) * lateralStep;
      }
      enemy.progress = Math.min(1, this.laneProgressLimit(enemy, enemy.laneOffset, desiredProgress, groundOrder, orderIndex, trafficKey));
      const nextTraffic = this.geometry.trafficQueuePosition(enemy.progress, enemy.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN);
      if (nextTraffic.key !== currentTraffic.key) {
        const oldOrder = groundOrders.get(currentTraffic.key);
        if (oldOrder) {
          const oldIndex = oldOrder.findIndex((candidate) => candidate.uid === enemy.uid);
          if (oldIndex >= 0) oldOrder.splice(oldIndex, 1);
        }
        const nextOrder = groundOrders.get(nextTraffic.key) ?? [];
        if (!nextOrder.some((candidate) => candidate.uid === enemy.uid)) nextOrder.push(enemy);
        nextOrder.sort((a, b) => this.geometry.trafficQueuePosition(b.progress, b.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN).distance
          - this.geometry.trafficQueuePosition(a.progress, a.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN).distance || a.uid - b.uid);
        groundOrders.set(nextTraffic.key, nextOrder);
      }
    } else {
      enemy.progress = Math.min(1, desiredProgress);
    }
    const point = this.geometry.lanePoint(enemy.progress, enemy.laneOffset, enemy.routeId);
    enemy.x = point.x;
    enemy.y = point.y;
  }

  private updateEnemies(dt: number): void {
    // Build lane occupancy once per tick. The previous implementation searched
    // and sorted the whole enemy array for every actor (O(n² log n)), exactly
    // the kind of density-dependent work that turns burst waves into stalls.
    const groundOrders = new Map<string, EnemyState[]>();
    for (const enemy of this.enemies) {
      if (!enemy.alive || ENEMIES[enemy.type].flying) continue;
      const key = this.geometry.trafficQueuePosition(enemy.progress, enemy.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN).key;
      const order = groundOrders.get(key) ?? [];
      order.push(enemy);
      groundOrders.set(key, order);
    }
    for (const order of groundOrders.values()) {
      order.sort((a, b) => this.geometry.trafficQueuePosition(b.progress, b.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN).distance
        - this.geometry.trafficQueuePosition(a.progress, a.routeId, SHARED_TRAFFIC_JUNCTION_MARGIN).distance || a.uid - b.uid);
    }
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const definition = ENEMIES[enemy.type];
      // Route progress is authoritative even while blocked. This also repairs
      // stale presentation coordinates without allowing combat code to invent
      // a second, off-road position for the same enemy.
      const routePoint = this.geometry.lanePoint(enemy.progress, enemy.laneOffset, enemy.routeId);
      enemy.x = routePoint.x;
      enemy.y = routePoint.y;
      enemy.attackCooldown -= dt;
      enemy.slowTime = Math.max(0, enemy.slowTime - dt);
      enemy.markTime = Math.max(0, enemy.markTime - dt);
      enemy.burnTime = Math.max(0, enemy.burnTime - dt);
      enemy.exposedTime = Math.max(0, enemy.exposedTime - dt);
      if (enemy.slowTime === 0) enemy.slow = 0;
      if (enemy.markTime === 0) enemy.mark = 0;
      if (enemy.exposedTime === 0) enemy.exposed = 0;
      if (enemy.burnTime > 0) enemy.hp -= enemy.burn * dt;
      if (enemy.hp <= 0) { this.defeatEnemy(enemy); continue; }
      let ally = enemy.engagedAllyUid ? this.findAlly(enemy.engagedAllyUid) : undefined;
      if (ally && (ally.engagedEnemyUid !== enemy.uid || !this.canBlockEnemy(ally, enemy))) {
        this.releaseEnemy(enemy);
        ally = undefined;
      }
      if (ally) {
        enemy.laneTarget = COMBAT_BALANCE.lanes.combatOffset;
        const lateralGap = enemy.laneTarget - enemy.laneOffset;
        const lateralStep = Math.min(Math.abs(lateralGap), COMBAT_BALANCE.lanes.lateralSpeed * dt);
        if (lateralStep > 0) {
          enemy.laneOffset += Math.sign(lateralGap) * lateralStep;
          Object.assign(enemy, this.geometry.lanePoint(enemy.progress, enemy.laneOffset, enemy.routeId));
        }
      }
      if (!ally && definition.blockable) {
        const candidates = [...this.defenders, ...this.heroes]
          .filter((candidate) => candidate.engagedEnemyUid === null && this.canBlockEnemy(candidate, enemy)
            && Math.abs(enemy.laneOffset) <= Math.max(...COMBAT_BALANCE.lanes.spawnOffsets.map(Math.abs)) + 1e-9
            && this.routeGap(candidate, enemy) <= this.contactDistance(candidate, enemy) + 4)
          .sort((a, b) => this.routeGap(a, enemy) - this.routeGap(b, enemy) || this.allyRef(a).localeCompare(this.allyRef(b)));
        ally = candidates[0];
        if (ally) this.engage(ally, enemy);
      }
      if (ally) {
        const inContact = distance(enemy, ally) <= this.contactDistance(ally, enemy) + 0.75;
        if (inContact && enemy.attackCooldown <= 0) {
          enemy.attackCooldown = definition.attackRate;
          const timing = enemyPresentation[enemy.type];
          this.presentAttack('enemy', `enemy:${enemy.uid}`, this.allyRef(ally), enemy, ally, definition.accent, enemy.type, timing.windup, timing.travel);
          this.hitAlly(ally, enemy, definition.attackDamage);
        }
        if (inContact) continue;
      }
      // Ranged/non-blocking heroes are still vulnerable. A passing creep may
      // strike at physical contact, but never reserves the hero or stops moving.
      const passingHero = !ally
        ? this.heroes
          .filter((hero) => hero.alive && !hero.canBlock && distance(hero, enemy) <= this.contactDistance(hero, enemy) + 0.75)
          .sort((a, b) => distance(a, enemy) - distance(b, enemy) || a.id.localeCompare(b.id))[0]
        : undefined;
      if (passingHero && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = definition.attackRate;
        const timing = enemyPresentation[enemy.type];
        this.presentAttack('enemy', `enemy:${enemy.uid}`, this.allyRef(passingHero), enemy, passingHero, definition.accent, enemy.type, timing.windup, timing.travel);
        this.hitAlly(passingHero, enemy, definition.attackDamage);
      }
      this.advanceEnemyOnRoute(enemy, dt, groundOrders);
      if (enemy.progress >= 1) {
        this.releaseEnemy(enemy);
        enemy.alive = false;
        this.lives = Math.max(0, this.lives - definition.leak);
        this.events.push({ type: 'enemy-leaked', enemyUid: enemy.uid, lives: definition.leak });
        if (this.lives === 0) {
          this.phase = 'defeat';
          this.events.push({ type: 'defeat' });
          break;
        }
      }
    }
    if (this.enemies.length > 180) this.enemies = this.enemies.filter((enemy) => enemy.alive);
  }

  private updateTowers(dt: number): void {
    for (const tower of this.towers) {
      tower.disabledTime = Math.max(0, tower.disabledTime - dt);
      if (tower.disabledTime > 0) continue;
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;
      const stats = this.towerStats(tower);
      const point = this.geometry.buildPads[tower.padIndex]!;
      const target = this.findTarget(point, stats.range, tower.type === 'thorn' || tower.type === 'astral', tower.priority);
      if (!target) continue;
      const wasControlled = target.slow > 0 || target.mark > 0;
      tower.cooldown = stats.fireRate;
      tower.shots += 1;
      let damage = stats.damage;
      if (tower.type === 'thorn' && tower.branch === 'right') {
        target.mark = 0.18;
        target.markTime = 4;
      }
      if (tower.type === 'aegis' && tower.branch === 'left') {
        target.slow = Math.max(target.slow, 0.42);
        target.slowTime = 1.3;
      }
      if (tower.type === 'aegis' && !ENEMIES[target.type].flying) {
        target.slow = Math.max(target.slow, tower.branch === 'left' ? 0.58 : 0.35);
        target.slowTime = Math.max(target.slowTime, 0.75);
      }
      if (tower.type === 'astral' && tower.branch === 'right') {
        target.slow = Math.max(target.slow, 0.72);
        target.slowTime = 0.35;
        target.exposed = 0.32;
        target.exposedTime = 3;
      }
      if (tower.type === 'aegis' && tower.branch === 'right' && wasControlled) damage *= 1.5;
      const presentation = towerPresentation[tower.type];
      this.presentAttack('tower', `tower:${tower.uid}`, `enemy:${target.uid}`, point, target, TOWERS[tower.type].accent, tower.type, presentation.windup, presentation.travel);
      const towerOwner: DamageOwner = { kind: 'tower', towerUid: tower.uid };
      const killed = this.hitEnemy(target, damage, stats.damageType, point, stats.splash, TOWERS[tower.type].accent, tower.type, towerOwner);
      if (killed) tower.kills += 1;
      if (stats.splash > 0) {
        for (const nearby of this.enemies) {
          if (nearby.alive && nearby.uid !== target.uid && distance(nearby, target) <= stats.splash) {
            this.hitEnemy(nearby, damage * 0.58, stats.damageType, target, 0, TOWERS[tower.type].accent, 'impact', towerOwner);
            if (tower.type === 'ember' && tower.branch === 'right') {
              nearby.slow = Math.max(nearby.slow, 0.38);
              nearby.slowTime = 2.4;
            }
            if (tower.type === 'ember' && tower.branch === 'left') { nearby.burn = 18; nearby.burnTime = 3.2; }
          }
        }
        if (tower.type === 'ember' && tower.branch === 'right') { target.slow = Math.max(target.slow, 0.38); target.slowTime = 2.4; }
        if (tower.type === 'ember' && tower.branch === 'left') { target.burn = 18; target.burnTime = 3.2; }
      }
      if (tower.type === 'thorn' && tower.branch === 'left' && tower.shots % 4 === 0) {
        const fan = this.enemies.filter((enemy) => enemy.alive && enemy.uid !== target.uid && distance(enemy, target) < 88).slice(0, 2);
        fan.forEach((enemy) => this.hitEnemy(enemy, damage * 0.72, 'physical', point, 0, 0x7bd8a0, 'thorn', towerOwner));
      }
      if (tower.type === 'astral' && tower.branch === 'left') {
        const chain = this.enemies.find((enemy) => enemy.alive && enemy.uid !== target.uid && distance(enemy, target) < 92);
        if (chain) this.hitEnemy(chain, damage * 0.52, 'arcane', target, 0, 0xdca6ff, 'astral', towerOwner);
      }
    }
  }

  private towerStats(tower: TowerState): { range: number; damage: number; fireRate: number; damageType: DamageType; splash: number } {
    const definition = TOWERS[tower.type];
    const upgraded = tower.level === 1 ? null : definition.upgrades[tower.level - 2]!;
    let damage = upgraded?.damage ?? definition.damage;
    let range = upgraded?.range ?? definition.range;
    let fireRate = upgraded?.fireRate ?? definition.fireRate;
    if (tower.branch) {
      const branch = definition.branches[tower.branch];
      damage *= branch.damageMultiplier;
      range *= branch.rangeMultiplier;
      fireRate *= branch.fireRateMultiplier;
    }
    if (tower.type === 'aegis' && tower.branch === 'left') fireRate *= 0.82;
    const point = this.geometry.buildPads[tower.padIndex]!;
    const supported = this.towers.some((candidate) => candidate.uid !== tower.uid && candidate.type === 'aegis' && candidate.branch === 'left' && distance(point, this.geometry.buildPads[candidate.padIndex]!) < 175);
    if (supported) fireRate *= 0.84;
    return { range, damage, fireRate, damageType: definition.damageType, splash: definition.splash };
  }

  private findTarget(origin: Vec2, range: number, canHitFlying: boolean, priority: TowerState['priority'] = 'first'): EnemyState | undefined {
    const candidates = this.enemies.filter((enemy) => enemy.alive && distance(origin, enemy) <= range && (canHitFlying || !ENEMIES[enemy.type].flying));
    if (priority === 'strong') return candidates.sort((a, b) => b.maxHp - a.maxHp || b.progress - a.progress)[0];
    if (priority === 'flying') return candidates.sort((a, b) => Number(Boolean(ENEMIES[b.type].flying)) - Number(Boolean(ENEMIES[a.type].flying)) || b.progress - a.progress)[0];
    return candidates.sort((a, b) => b.progress - a.progress)[0];
  }

  private hitEnemy(
    enemy: EnemyState,
    rawDamage: number,
    damageType: DamageType,
    source: Vec2,
    splash: number,
    color: number,
    style: ProjectileStyle,
    owner: DamageOwner,
  ): boolean {
    if (!enemy.alive) return false;
    const definition = ENEMIES[enemy.type];
    const baseMitigation = damageType === 'true' ? 0 : damageType === 'physical' ? definition.armor : definition.resistance;
    const mitigation = baseMitigation * (1 - enemy.exposed);
    const amount = rawDamage * (1 - mitigation) * (1 + enemy.mark);
    enemy.hp -= amount;
    const lethal = enemy.hp <= 0;
    this.events.push({ type: 'enemy-hit', enemyUid: enemy.uid, source, damageType, amount, splash, color, style, lethal, bounty: lethal ? definition.bounty : 0, owner });
    if (enemy.hp <= 0 && enemy.alive) {
      this.resolveHeroKillCredit(enemy, owner);
      this.defeatEnemy(enemy, true);
      return true;
    }
    return false;
  }

  private resolveHeroKillCredit(enemy: EnemyState, owner: DamageOwner): void {
    if (enemy.xpPaid) return;
    enemy.xpPaid = true;
    if (owner.kind !== 'hero') return;
    const hero = this.heroes.find((candidate) => candidate.id === owner.heroId);
    if (!hero) return;
    const amount = HERO_XP_BY_ENEMY[enemy.type];
    hero.xp = Math.min(HERO_LEVEL_THRESHOLDS[HERO_LEVEL_THRESHOLDS.length - 1]!, hero.xp + amount);
    hero.ownKills += 1;
    this.events.push({ type: 'hero-xp', hero: hero.id, enemyUid: enemy.uid, amount, xp: hero.xp, ownKills: hero.ownKills });

    while (hero.level < HERO_LEVEL_THRESHOLDS.length && hero.xp >= HERO_LEVEL_THRESHOLDS[hero.level]!) {
      this.levelUpHero(hero);
    }

    if (hero.level >= 6) {
      if (hero.id === 'kael') {
        hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.06);
        this.reduceHeroSpellCooldowns(hero, 0.65);
      } else {
        this.reduceHeroSpellCooldowns(hero, 0.85);
        hero.starseedPrimed = true;
      }
    }
  }

  private levelUpHero(hero: HeroState): void {
    hero.level += 1;
    const previousMaxHp = hero.maxHp;
    hero.maxHp *= 1.05;
    hero.damage *= 1.07;
    hero.speed = Math.min(heroTemplates[hero.id].speed * 1.075, hero.speed * 1.015);
    hero.hp = Math.min(hero.maxHp, hero.hp + (hero.maxHp - previousMaxHp) + hero.maxHp * 0.12);
    this.reduceHeroSpellCooldowns(hero, 1.25);
    const unlocked = HERO_MILESTONES[hero.id][hero.level];
    if (unlocked && !hero.milestones.includes(unlocked)) hero.milestones.push(unlocked);
    hero.unlockedSpells = heroUnlockedSpells(hero.id, hero.level);
    this.events.push({ type: 'hero-level-up', hero: hero.id, level: hero.level, point: { x: hero.x, y: hero.y }, unlocked });
  }

  private defeatEnemy(enemy: EnemyState, presentationDelayed = false): void {
    if (!enemy.alive) return;
    const definition = ENEMIES[enemy.type];
    // Environmental and damage-over-time deaths are explicitly non-hero
    // outcomes. Mark them paid before removal so no later queued hit can claim
    // the same enemy.
    enemy.xpPaid = true;
    this.releaseEnemy(enemy);
    enemy.alive = false;
    this.gold += definition.bounty;
    this.score += Math.round(definition.bounty * 12);
    this.events.push({ type: 'enemy-defeated', enemyUid: enemy.uid, bounty: definition.bounty, presentationDelayed });
  }

  private hitAlly(ally: HeroState | DefenderState, enemy: EnemyState, rawDamage: number): void {
    const amount = rawDamage * (1 - ally.armor);
    ally.hp = Math.max(0, ally.hp - amount);
    ally.regenCooldown = 'towerUid' in ally
      ? COMBAT_BALANCE.recovery.defender.delay
      : COMBAT_BALANCE.recovery.hero.delay;
    const allyUid = this.allyRef(ally);
    this.events.push({ type: 'ally-hit', allyUid, enemyUid: enemy.uid, amount, hp: ally.hp });
    if (ally.hp > 0) return;
    ally.alive = false;
    ally.respawnTime = ally.respawnMax;
    this.releaseAlly(ally);
    this.events.push({ type: 'ally-defeated', allyUid, respawn: ally.respawnMax });
  }

  private updateHeroes(dt: number): void {
    for (const hero of this.heroes) {
      hero.ultimateCooldown = Math.max(0, hero.ultimateCooldown - dt);
      const primary = HERO_PRIMARY_SPELL[hero.id];
      hero.spellCooldowns[primary] = hero.ultimateCooldown;
      for (const spell of hero.unlockedSpells) {
        if (!isHeroActiveSpell(spell) || spell === primary) continue;
        hero.spellCooldowns[spell] = Math.max(0, hero.spellCooldowns[spell] - dt);
      }
      hero.attackCooldown -= dt;
      if (!hero.alive) {
        hero.respawnTime = Math.max(0, hero.respawnTime - dt);
        if (hero.respawnTime === 0) {
          hero.alive = true;
          hero.hp = hero.maxHp;
          hero.x = hero.spawn.x;
          hero.y = hero.spawn.y;
          hero.target = { ...hero.spawn };
          hero.attackCooldown = 0.35;
          hero.regenCooldown = 0;
          this.events.push({ type: 'ally-respawned', allyUid: this.allyRef(hero), point: { ...hero.spawn } });
        }
        continue;
      }

      const guardRadius = hero.commanded ? HERO_GUARD_RADIUS[hero.id].commanded : HERO_GUARD_RADIUS[hero.id].reserve;
      let target = this.validateEngagement(hero);
      // Engagement is a reservation, not permission to chase an enemy across
      // the whole map. Once a foe clears the assigned guard zone, both actors
      // are released and the hero returns to the anchor.
      if (target && this.routeGap(hero.target, target) > guardRadius + this.contactDistance(hero, target)) {
        this.releaseAlly(hero);
        target = undefined;
      }
      if (!target && hero.canBlock) {
        const confrontation = this.nearestAvailableEnemy(hero, hero.target, guardRadius);
        if (confrontation) {
          this.engage(hero, confrontation);
          target = confrontation;
        }
      }
      if (target) {
        hero.regenCooldown = COMBAT_BALANCE.recovery.hero.delay;
        const contact = this.contactDistance(hero, target);
        const longitudinalContact = Math.sqrt(Math.max(0, contact * contact - target.laneOffset * target.laneOffset));
        this.moveAllyOnRoute(hero, target, hero.speed, dt, longitudinalContact);
        if (distance(hero, target) <= contact + 0.75 && hero.attackCooldown <= 0) {
          hero.attackCooldown = hero.fireRate;
          this.presentAttack('ally', this.allyRef(hero), `enemy:${target.uid}`, hero, target, hero.accent, hero.id, hero.id === 'kael' ? 0.165 : 0.235, hero.id === 'kael' ? 0.08 : 0.18);
          this.events.push({ type: 'ally-attack', allyUid: this.allyRef(hero), enemyUid: target.uid, source: { x: hero.x, y: hero.y }, color: hero.accent });
          this.resolveHeroBasicAttack(hero, target);
        }
        continue;
      }

      this.moveAllyOnRoute(hero, hero.target, hero.speed, dt, 3);
      if (hero.attackCooldown <= 0) {
        const rangedTarget = this.findTarget(hero, hero.range, hero.canHitFlying, 'first');
        const targetInsideGuard = rangedTarget && this.routeGap(hero.target, rangedTarget) <= guardRadius;
        if (rangedTarget && targetInsideGuard) {
          hero.regenCooldown = COMBAT_BALANCE.recovery.hero.delay;
          hero.attackCooldown = hero.fireRate;
          this.presentAttack('ally', this.allyRef(hero), `enemy:${rangedTarget.uid}`, hero, rangedTarget, hero.accent, hero.id, hero.id === 'kael' ? 0.165 : 0.235, hero.id === 'kael' ? 0.08 : 0.18);
          this.events.push({ type: 'ally-attack', allyUid: this.allyRef(hero), enemyUid: rangedTarget.uid, source: { x: hero.x, y: hero.y }, color: hero.accent });
          this.resolveHeroBasicAttack(hero, rangedTarget);
          continue;
        }
      }
      hero.regenCooldown = Math.max(0, hero.regenCooldown - dt);
      if (hero.regenCooldown === 0 && hero.hp < hero.maxHp) {
        hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * COMBAT_BALANCE.recovery.hero.maxHpPerSecond * dt);
      }
    }
  }

  private resolveHeroBasicAttack(hero: HeroState, target: EnemyState): void {
    hero.basicStrikeCount += 1;
    const consumedStarseed = hero.id === 'lyra' && hero.level >= 6 && hero.starseedPrimed;
    if (consumedStarseed) hero.starseedPrimed = false;
    const damage = hero.damage * (consumedStarseed ? 1.2 : 1);
    this.hitEnemy(target, damage, hero.id === 'lyra' ? 'arcane' : 'physical', hero, 0, hero.accent, hero.id, { kind: 'hero', heroId: hero.id, channel: 'basic' });

    if (hero.id === 'kael') {
      target.slow = Math.max(target.slow, 0.18);
      target.slowTime = Math.max(target.slowTime, 0.8);
      if (hero.level >= 2 && hero.basicStrikeCount % 4 === 0 && target.alive && !ENEMIES[target.type].flying) {
        this.hitEnemy(target, 20, 'true', hero, 0, hero.accent, 'impact', { kind: 'hero', heroId: 'kael', channel: 'magic' });
        target.slow = Math.max(target.slow, 0.24);
        target.slowTime = Math.max(target.slowTime, 1.15);
      }
      return;
    }

    if (hero.level >= 2 && hero.basicStrikeCount % 3 === 0) {
      const chain = this.enemies
        .filter((enemy) => enemy.alive && enemy.uid !== target.uid && distance(enemy, target) <= 115)
        .sort((a, b) => b.progress - a.progress || a.uid - b.uid)[0];
      if (chain) {
        this.presentAttack('ally', this.allyRef(hero), `enemy:${chain.uid}`, target, chain, hero.accent, 'lyra', 0.06, 0.12);
        const echoScale = this.heroArtifactModifiers(hero)?.echoDamage ?? 0.55;
        this.hitEnemy(chain, damage * echoScale, 'arcane', target, 0, hero.accent, 'lyra', { kind: 'hero', heroId: 'lyra', channel: 'magic' });
      }
    }
  }

  moveHero(id: HeroId, point: Vec2): void {
    const hero = this.heroes.find((candidate) => candidate.id === id);
    if (!hero || !hero.alive || this.phase !== 'playing') return;
    this.releaseAlly(hero);
    const clamped = { x: Math.max(45, Math.min(1555, point.x)), y: Math.max(70, Math.min(855, point.y)) };
    hero.target = this.geometry.project(clamped).point;
    hero.commanded = true;
  }

  useAbility(id: HeroId, point: Vec2): boolean {
    return this.useHeroSpell(id, HERO_PRIMARY_SPELL[id], point);
  }

  getHeroSpellTargeting(id: HeroId, spell: HeroActiveSpellId): Readonly<{ targeting: 'point' | 'self'; castRange: number; effectRadius: number }> | null {
    const hero = this.heroes.find((candidate) => candidate.id === id);
    const definition = HERO_SPELLS[spell] as (typeof HERO_SPELLS)[HeroActiveSpellId] | undefined;
    if (!hero || !definition || definition.kind !== 'active' || definition.hero !== id) return null;
    const legacyAbility = spell === HERO_PRIMARY_SPELL[id] ? heroAbilitySpec(id, hero.level) : undefined;
    const rangeScale = this.heroArtifactModifiers(hero)?.range ?? 1;
    return {
      targeting: definition.targeting as 'point' | 'self',
      castRange: (legacyAbility?.castRange ?? definition.castRange) * rangeScale,
      effectRadius: (legacyAbility?.effectRadius ?? definition.effectRadius) * rangeScale,
    };
  }

  canUseHeroSpell(id: HeroId, spell: HeroActiveSpellId, requestedPoint: Vec2): boolean {
    const hero = this.heroes.find((candidate) => candidate.id === id);
    const definition = HERO_SPELLS[spell] as (typeof HERO_SPELLS)[HeroActiveSpellId] | undefined;
    const targeting = this.getHeroSpellTargeting(id, spell);
    if (!hero || !definition || !targeting || !hero.alive || this.phase !== 'playing' || definition.kind !== 'active' || !hero.unlockedSpells.includes(spell)) return false;
    const cooldown = spell === HERO_PRIMARY_SPELL[id] ? hero.ultimateCooldown : hero.spellCooldowns[spell];
    if (cooldown > 0) return false;
    return targeting.targeting === 'self' || distance(hero, requestedPoint) <= targeting.castRange;
  }

  useHeroSpell(id: HeroId, spell: HeroActiveSpellId, requestedPoint: Vec2): boolean {
    const hero = this.heroes.find((candidate) => candidate.id === id);
    const definition = HERO_SPELLS[spell] as (typeof HERO_SPELLS)[HeroActiveSpellId] | undefined;
    const targeting = this.getHeroSpellTargeting(id, spell);
    if (!hero || !definition || !targeting || !this.canUseHeroSpell(id, spell, requestedPoint)) return false;
    const primary = HERO_PRIMARY_SPELL[id];

    const point = targeting.targeting === 'self' ? { x: hero.x, y: hero.y } : requestedPoint;
    const legacyAbility = spell === primary ? heroAbilitySpec(id, hero.level) : undefined;
    const effectRadius = targeting.effectRadius;

    const maximumCooldown = spell === primary ? hero.ultimateMax : this.heroSpellCooldownMax(hero, spell);
    hero.spellCooldowns[spell] = maximumCooldown;
    if (spell === primary) hero.ultimateCooldown = maximumCooldown;
    const spellDamageScale = this.heroArtifactModifiers(hero)?.spellDamage ?? 1;
    const targets: number[] = [];
    if (spell === 'rift-quake') {
      const damage = (legacyAbility?.damage ?? definition.damage) * spellDamageScale;
      for (const enemy of this.enemies) {
        if (enemy.alive && distance(enemy, point) < effectRadius && !ENEMIES[enemy.type].flying) {
          targets.push(enemy.uid);
          this.hitEnemy(enemy, damage, 'true', point, 0, hero.accent, 'impact', { kind: 'hero', heroId: id, channel: 'ultimate' });
          enemy.slow = 0.68;
          enemy.slowTime = 3.2;
        }
      }
    } else if (spell === 'warden-pulse') {
      hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.18);
      for (const defender of this.defenders) {
        if (!defender.alive || distance(defender, point) > effectRadius) continue;
        defender.hp = Math.min(defender.maxHp, defender.hp + defender.maxHp * 0.24);
      }
      for (const enemy of this.enemies) {
        if (!enemy.alive || ENEMIES[enemy.type].flying || distance(enemy, point) > effectRadius) continue;
        targets.push(enemy.uid);
        enemy.exposed = Math.max(enemy.exposed, 0.18);
        enemy.exposedTime = Math.max(enemy.exposedTime, 5);
      }
    } else if (spell === 'starfall') {
      const damage = (legacyAbility?.damage ?? definition.damage) * spellDamageScale;
      const selected = this.enemies
        .filter((enemy) => enemy.alive && distance(enemy, point) < effectRadius)
        .sort((a, b) => b.progress - a.progress || a.uid - b.uid)
        .slice(0, legacyAbility?.maxTargets ?? definition.maxTargets);
      for (const enemy of selected) {
        targets.push(enemy.uid);
        this.hitEnemy(enemy, damage, 'arcane', point, 0, hero.accent, 'impact', { kind: 'hero', heroId: id, channel: 'ultimate' });
      }
    } else if (spell === 'falling-constellation') {
      const selected = this.enemies
        .filter((enemy) => enemy.alive && distance(enemy, point) < effectRadius)
        .sort((a, b) => b.maxHp - a.maxHp || b.progress - a.progress || a.uid - b.uid)
        .slice(0, definition.maxTargets);
      for (const enemy of selected) {
        targets.push(enemy.uid);
        this.hitEnemy(enemy, definition.damage * spellDamageScale, 'arcane', point, 0, hero.accent, 'impact', { kind: 'hero', heroId: id, channel: 'magic' });
        if (enemy.alive) {
          enemy.mark = Math.max(enemy.mark, 0.25);
          enemy.markTime = Math.max(enemy.markTime, 6);
        }
      }
    } else {
      // Compile-time exhaustiveness prevents a newly registered active spell
      // from silently inheriting another spell's combat behavior.
      const unhandledSpell: never = spell;
      void unhandledSpell;
      return false;
    }
    this.events.push({ type: 'hero-spell-cast', hero: id, spell, point, radius: effectRadius, targets });
    return true;
  }

  buildTower(padIndex: number, type: TowerId): boolean {
    const definition = TOWERS[type];
    if (this.phase !== 'playing' || this.gold < definition.cost || this.towers.some((tower) => tower.padIndex === padIndex)) return false;
    const tower: TowerState = { uid: ++this.towerUid, type, padIndex, level: 1, cooldown: 0, totalSpent: definition.cost, kills: 0, shots: 0, priority: 'first', disabledTime: 0 };
    this.gold -= definition.cost;
    this.towers.push(tower);
    this.reconcileDefenders();
    this.events.push({ type: 'tower-built', towerUid: tower.uid, padIndex });
    return true;
  }

  upgradeTower(uid: number): boolean {
    const tower = this.towers.find((candidate) => candidate.uid === uid);
    if (!tower || tower.level >= 3 || tower.branch) return false;
    const upgrade = TOWERS[tower.type].upgrades[tower.level - 1];
    if (!upgrade || this.gold < upgrade.cost) return false;
    this.gold -= upgrade.cost;
    tower.totalSpent += upgrade.cost;
    tower.level += 1;
    this.reconcileDefenders();
    this.events.push({ type: 'tower-upgraded', towerUid: uid });
    return true;
  }

  chooseBranch(uid: number, branch: TowerBranch): boolean {
    const tower = this.towers.find((candidate) => candidate.uid === uid);
    if (!tower || tower.level < 3 || tower.branch) return false;
    const option = TOWERS[tower.type].branches[branch];
    if (this.gold < option.cost) return false;
    this.gold -= option.cost;
    tower.totalSpent += option.cost;
    tower.branch = branch;
    this.reconcileDefenders();
    this.events.push({ type: 'tower-upgraded', towerUid: uid });
    this.events.push({ type: 'toast', tone: 'good', message: `${TOWERS[tower.type].name} becomes ${option.name}` });
    return true;
  }

  sellTower(uid: number): boolean {
    const index = this.towers.findIndex((candidate) => candidate.uid === uid);
    if (index < 0) return false;
    const tower = this.towers[index]!;
    const refund = Math.floor(tower.totalSpent * 0.7);
    this.gold += refund;
    this.towers.splice(index, 1);
    this.reconcileDefenders();
    this.events.push({ type: 'tower-sold', towerUid: uid, refund });
    return true;
  }

  cyclePriority(uid: number): void {
    const tower = this.towers.find((candidate) => candidate.uid === uid);
    if (!tower) return;
    const canHitFlying = tower.type === 'thorn' || tower.type === 'astral';
    tower.priority = tower.priority === 'first' ? 'strong' : tower.priority === 'strong' && canHitFlying ? 'flying' : 'first';
  }

  private triggerBossPhase(enemy: EnemyState): void {
    const ratio = enemy.hp / enemy.maxHp;
    const desiredPhase = ratio <= 0.35 ? 2 : ratio <= 0.7 ? 1 : 0;
    while (enemy.bossPhase < desiredPhase) this.resolveBossPhase(enemy, enemy.bossPhase + 1);
  }

  private resolveBossPhase(enemy: EnemyState, nextPhase: number): void {
    enemy.bossPhase = nextPhase;
    const eligible = this.towers.filter((tower) => tower.disabledTime <= 0 && !this.pendingBossStrikes.some((strike) => strike.towerUid === tower.uid) && !this.bossTargetHistory.has(tower.uid));
    const candidates = eligible.length > 0 ? eligible : this.towers.filter((tower) => tower.disabledTime <= 0 && !this.pendingBossStrikes.some((strike) => strike.towerUid === tower.uid));
    const target = [...candidates].sort((a, b) => distance(this.geometry.buildPads[a.padIndex]!, enemy) - distance(this.geometry.buildPads[b.padIndex]!, enemy))[0];
    if (target) {
      const point = this.geometry.buildPads[target.padIndex]!;
      this.pendingBossStrikes.push({ at: this.time + 2.2, towerUid: target.uid });
      this.bossTargetHistory.add(target.uid);
      this.presentAttack('enemy', `enemy:${enemy.uid}`, `tower:${target.uid}`, enemy, point, ENEMIES.bloomlord.accent, 'bloomlord', enemyPresentation.bloomlord.windup, enemyPresentation.bloomlord.travel);
      this.events.push({ type: 'boss-telegraph', source: { x: enemy.x, y: enemy.y }, point, radius: 62, duration: 2.2, label: 'ROOTFALL' });
      this.events.push({ type: 'toast', tone: 'danger', message: 'The Hollow Bloom marks a tower — refit the line!' });
    }
    const escorts = nextPhase === 1 ? 4 : 7;
    for (let index = 0; index < escorts; index += 1) this.pendingBossEscorts.push({ at: this.time + index * 0.24, enemy: index % 3 === 0 ? 'wisp' : 'skitter', wave: enemy.wave, routeId: enemy.routeId });
  }

  private updateBossStrikes(): void {
    for (const escort of this.pendingBossEscorts.filter((candidate) => candidate.at <= this.time)) this.spawnEnemy(escort.enemy, escort.wave, escort.routeId);
    this.pendingBossEscorts = this.pendingBossEscorts.filter((candidate) => candidate.at > this.time);
    for (const strike of this.pendingBossStrikes.filter((candidate) => candidate.at <= this.time)) {
      const tower = this.towers.find((candidate) => candidate.uid === strike.towerUid);
      if (tower) { tower.disabledTime = 4.5; this.events.push({ type: 'tower-disabled', towerUid: tower.uid, duration: 4.5 }); }
    }
    this.pendingBossStrikes = this.pendingBossStrikes.filter((candidate) => candidate.at > this.time);
    const boss = this.enemies.find((enemy) => enemy.alive && enemy.type === 'bloomlord');
    if (boss) this.triggerBossPhase(boss);
  }
}
