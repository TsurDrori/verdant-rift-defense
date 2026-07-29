import { ENEMIES } from '../../game/content/enemies';
import { TOWERS } from '../../game/content/towers';
import type { HeroId, TowerBranch, TowerId } from '../../game/content/types';
import { WAVES } from '../../game/content/waves';
import { GameSimulation } from '../../game/simulation/GameSimulation';
import type { Vec2 } from '../../game/simulation/geometry';
import type { GameEvent, GameSnapshot, TowerState } from '../../game/simulation/state';
import type { DifficultyId } from '../../game/simulation/state';

export type Selection =
  | { kind: 'none' }
  | { kind: 'pad'; padIndex: number }
  | { kind: 'tower'; towerUid: number }
  | { kind: 'hero'; heroId: HeroId };

export class GameController extends EventTarget {
  readonly simulation = new GameSimulation();
  selection: Selection = { kind: 'none' };
  armedAbility?: HeroId;
  private pendingPresentationLethals = 0;
  private deferredPresentationEvents: GameEvent[] = [];

  begin(): void { this.simulation.begin(); this.changed(); }
  setInsightLoadout(upgrades: readonly string[]): void { this.simulation.setInsightLoadout(upgrades); this.changed(); }
  setDifficulty(difficulty: DifficultyId): void { this.simulation.setDifficulty(difficulty); this.changed(); }
  update(delta: number): void { this.simulation.update(delta); this.changed(false); }
  discardElapsedTime(): void { this.simulation.discardElapsedTime(); }
  snapshot(): GameSnapshot { return this.simulation.getSnapshot(); }
  drainEvents(): GameEvent[] {
    const events = this.simulation.drainEvents();
    events.forEach((event) => {
      if (event.type === 'enemy-hit' && event.lethal) this.pendingPresentationLethals += 1;
      if ((event.type === 'wave-cleared' || event.type === 'victory') && this.pendingPresentationLethals > 0) this.deferredPresentationEvents.push(event);
      else this.dispatchEvent(new CustomEvent<GameEvent>('game-event', { detail: event }));
    });
    return events;
  }
  present(event: GameEvent): void {
    this.dispatchEvent(new CustomEvent<GameEvent>('presentation-event', { detail: event }));
    if (event.type === 'enemy-hit' && event.lethal) this.pendingPresentationLethals = Math.max(0, this.pendingPresentationLethals - 1);
    if (this.pendingPresentationLethals === 0 && this.deferredPresentationEvents.length > 0) {
      const deferred = this.deferredPresentationEvents.splice(0);
      deferred.forEach((item) => this.dispatchEvent(new CustomEvent<GameEvent>('game-event', { detail: item })));
    }
    this.changed(false);
  }
  hasPendingLethalPresentation(): boolean { return this.pendingPresentationLethals > 0; }
  presentationDiagnostics(): Readonly<{ pendingLethals: number; deferredEvents: number }> {
    return { pendingLethals: this.pendingPresentationLethals, deferredEvents: this.deferredPresentationEvents.length };
  }
  towerDefinition(id: TowerId) { return TOWERS[id]; }
  enemyDefinition(id: keyof typeof ENEMIES) { return ENEMIES[id]; }
  nextWave() { return WAVES[this.snapshot().wave]; }

  selectPad(padIndex: number): void {
    const tower = this.snapshot().towers.find((candidate) => candidate.padIndex === padIndex);
    this.selection = tower ? { kind: 'tower', towerUid: tower.uid } : { kind: 'pad', padIndex };
    this.armedAbility = undefined;
    this.changed();
  }

  selectTower(towerUid: number): void {
    if (!this.snapshot().towers.some((tower) => tower.uid === towerUid)) return;
    this.selection = { kind: 'tower', towerUid };
    this.armedAbility = undefined;
    this.changed();
  }
  selectHero(heroId: HeroId): void { this.selection = { kind: 'hero', heroId }; this.armedAbility = undefined; this.changed(); }
  clearSelection(): void { this.selection = { kind: 'none' }; this.armedAbility = undefined; this.changed(); }

  selectedTower(): TowerState | undefined {
    if (this.selection.kind !== 'tower') return undefined;
    const towerUid = this.selection.towerUid;
    return this.snapshot().towers.find((tower) => tower.uid === towerUid);
  }

  build(type: TowerId, tactical = false): boolean {
    const builtSuccessfully = this.tacticalMutation(tactical, () => {
      if (this.selection.kind !== 'pad') return false;
      const padIndex = this.selection.padIndex;
      const built = this.simulation.buildTower(padIndex, type);
      const tower = built ? this.snapshot().towers.find((candidate) => candidate.padIndex === padIndex) : undefined;
      if (tower) this.selection = { kind: 'tower', towerUid: tower.uid };
      return Boolean(tower);
    });
    if (!builtSuccessfully) this.invalidAction();
    this.changed();
    return builtSuccessfully;
  }

  upgrade(towerUid?: number, tactical = false): boolean {
    const tower = this.actionTower(towerUid);
    const upgraded = tower ? this.tacticalMutation(tactical, () => this.simulation.upgradeTower(tower.uid)) : false;
    if (!upgraded) this.invalidAction();
    this.changed();
    return upgraded;
  }

  branch(branch: TowerBranch, towerUid?: number, tactical = false): boolean {
    const tower = this.actionTower(towerUid);
    const branched = tower ? this.tacticalMutation(tactical, () => this.simulation.chooseBranch(tower.uid, branch)) : false;
    if (!branched) this.invalidAction();
    this.changed();
    return branched;
  }

  sell(towerUid?: number, tactical = false): boolean {
    const tower = this.actionTower(towerUid);
    const sold = Boolean(tower && this.tacticalMutation(tactical, () => this.simulation.sellTower(tower.uid)));
    if (tower && sold) this.selection = { kind: 'pad', padIndex: tower.padIndex };
    if (!sold) this.invalidAction();
    this.changed();
    return sold;
  }

  cyclePriority(towerUid?: number, tactical = false): boolean {
    const tower = this.actionTower(towerUid);
    if (!tower) { this.invalidAction(); this.changed(); return false; }
    this.tacticalMutation(tactical, () => this.simulation.cyclePriority(tower.uid));
    this.changed();
    return true;
  }
  startWave(): boolean {
    const started = this.simulation.startWave();
    if (!started) this.invalidAction();
    this.changed();
    return started;
  }
  togglePause(): void { this.simulation.togglePause(); this.changed(); }
  toggleSpeed(): void { this.simulation.toggleSpeed(); this.changed(); }

  armAbility(id: HeroId): void {
    const hero = this.snapshot().heroes.find((candidate) => candidate.id === id);
    if (!hero || !hero.alive || hero.ultimateCooldown > 0) {
      this.invalidAction();
      return;
    }
    this.armedAbility = this.armedAbility === id ? undefined : id;
    this.selection = { kind: 'hero', heroId: id };
    this.changed();
  }

  worldAction(point: Vec2): void {
    if (this.armedAbility) {
      if (this.simulation.useAbility(this.armedAbility, point)) this.armedAbility = undefined;
      else this.invalidAction();
    } else if (this.selection.kind === 'hero') {
      this.simulation.moveHero(this.selection.heroId, point);
    } else {
      this.clearSelection();
    }
    this.changed();
  }

  selectAdjacentPad(direction: -1 | 1): void {
    const current = this.selection.kind === 'pad' ? this.selection.padIndex : this.selection.kind === 'tower' ? (this.selectedTower()?.padIndex ?? -1) : -1;
    this.selectPad((current + direction + 11) % 11);
  }

  nudgeSelectedHero(dx: number, dy: number): void {
    if (this.selection.kind !== 'hero') return;
    const heroId = this.selection.heroId;
    const selected = this.snapshot().heroes.find((candidate) => candidate.id === heroId);
    if (selected) this.simulation.moveHero(selected.id, { x: selected.x + dx, y: selected.y + dy });
    this.changed();
  }

  castAtFrontline(id: HeroId): void {
    const enemies = this.snapshot().enemies.filter((enemy) => enemy.alive).sort((a, b) => b.progress - a.progress);
    const hero = this.snapshot().heroes.find((candidate) => candidate.id === id);
    const point = enemies[0] ?? hero;
    if (!point || !this.simulation.useAbility(id, point)) this.invalidAction();
    this.changed();
  }

  /**
   * Tower-panel actions carry the UID that rendered the button. Resolving that
   * identity here prevents a canvas pointer event or a late DOM click from ever
   * applying an upgrade to a different, newly selected tower.
   */
  private actionTower(towerUid?: number): TowerState | undefined {
    const uid = towerUid ?? (this.selection.kind === 'tower' ? this.selection.towerUid : undefined);
    if (uid === undefined) return undefined;
    const tower = this.snapshot().towers.find((candidate) => candidate.uid === uid);
    if (tower) {
      this.selection = { kind: 'tower', towerUid: tower.uid };
      this.armedAbility = undefined;
    }
    return tower;
  }

  private tacticalMutation<T>(enabled: boolean, action: () => T): T {
    return enabled ? this.simulation.runTacticalTransaction(action) : action();
  }

  private invalidAction(): void {
    this.dispatchEvent(new Event('audio-invalid'));
  }

  private changed(immediate = true): void {
    this.dispatchEvent(new CustomEvent('state', { detail: { immediate } }));
  }
}
