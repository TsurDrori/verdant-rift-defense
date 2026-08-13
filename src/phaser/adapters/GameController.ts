import { ENEMIES } from '../../game/content/enemies';
import { HERO_PRIMARY_SPELL, heroSpellSpec } from '../../game/content/heroProgression';
import { TOWERS } from '../../game/content/towers';
import type { HeroActiveSpellId, HeroArtifactId, HeroId, TowerBranch, TowerId } from '../../game/content/types';
import { RUN_DEFINITIONS } from '../../game/content/generated/stages';
import type { RunDefinition } from '../../game/content/stages/types';
import { GameSimulation } from '../../game/simulation/GameSimulation';
import type { Vec2 } from '../../game/simulation/geometry';
import type { GameEvent, GameSnapshot, TowerState } from '../../game/simulation/state';
import type { DifficultyId } from '../../game/simulation/state';

export type Selection =
  | { kind: 'none' }
  | { kind: 'pad'; padIndex: number }
  | { kind: 'tower'; towerUid: number }
  | { kind: 'hero'; heroId: HeroId };

export type SpellTargetingKind = 'point' | 'self';

export interface ArmedHeroSpell {
  heroId: HeroId;
  spellId: HeroActiveSpellId;
  targeting: SpellTargetingKind;
}

export interface SpellTargetPreview extends ArmedHeroSpell {
  point?: Vec2;
  valid?: boolean;
}

export class GameController extends EventTarget {
  simulation: GameSimulation;
  run: RunDefinition;
  selection: Selection = { kind: 'none' };
  armedSpell?: ArmedHeroSpell;
  spellTargetPreview?: SpellTargetPreview;
  private pendingPresentationLethals = 0;
  private deferredPresentationEvents: GameEvent[] = [];
  private runtimeReady = false;

  constructor(run: RunDefinition = RUN_DEFINITIONS['sunken-way']!) {
    super();
    this.run = run;
    this.simulation = new GameSimulation(run);
  }

  configureStage(stageId: string): boolean {
    const run = RUN_DEFINITIONS[stageId];
    return Boolean(run && this.configureRun(run));
  }

  configureRun(run: RunDefinition): boolean {
    if (this.simulation.getSnapshot().phase !== 'briefing') return false;
    if (this.run.stageId === run.stageId) return true;
    this.run = run;
    this.simulation = new GameSimulation(run);
    this.selection = { kind: 'none' };
    this.armedSpell = undefined;
    this.spellTargetPreview = undefined;
    this.pendingPresentationLethals = 0;
    this.deferredPresentationEvents = [];
    this.runtimeReady = false;
    this.dispatchEvent(new CustomEvent<RunDefinition>('run-change', { detail: run }));
    this.changed();
    return true;
  }

  begin(): void { if (!this.runtimeReady) return; this.simulation.begin(); this.changed(); }
  isRuntimeReady(): boolean { return this.runtimeReady; }
  markRuntimeReady(): void {
    if (this.runtimeReady) return;
    this.runtimeReady = true;
    this.dispatchEvent(new Event('runtime-ready'));
  }
  setInsightLoadout(upgrades: readonly string[]): void { this.simulation.setInsightLoadout(upgrades); this.changed(); }
  setHeroArtifactLoadout(loadout: Partial<Record<HeroId, HeroArtifactId | null>>): boolean {
    const applied = this.simulation.setHeroArtifactLoadout(loadout);
    if (applied) this.changed();
    else this.invalidAction();
    return applied;
  }
  setDifficulty(difficulty: DifficultyId): void { this.simulation.setDifficulty(difficulty); this.changed(); }
  update(delta: number): void {
    this.simulation.update(delta);
    if (this.armedSpell && !this.armedHeroCanCast()) this.cancelSpellCast(false);
    this.changed(false);
  }
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
  nextWave() { return this.run.waves[this.snapshot().wave]; }

  /** Compatibility surface for view code and diagnostics written before heroes had multiple spells. */
  get armedAbility(): HeroId | undefined { return this.armedSpell?.heroId; }

  isSpellCastMode(): boolean { return Boolean(this.armedSpell); }

  selectPad(padIndex: number): void {
    if (this.armedSpell) return;
    const tower = this.snapshot().towers.find((candidate) => candidate.padIndex === padIndex);
    this.selection = tower ? { kind: 'tower', towerUid: tower.uid } : { kind: 'pad', padIndex };
    this.changed();
  }

  selectTower(towerUid: number): void {
    if (this.armedSpell) return;
    if (!this.snapshot().towers.some((tower) => tower.uid === towerUid)) return;
    this.selection = { kind: 'tower', towerUid };
    this.changed();
  }
  selectHero(heroId: HeroId): void { if (this.armedSpell) return; this.selection = { kind: 'hero', heroId }; this.changed(); }
  clearSelection(): void { this.selection = { kind: 'none' }; this.cancelSpellCast(false); this.changed(); }

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
  togglePause(): void { this.cancelSpellCast(false); this.simulation.togglePause(); this.changed(); }
  toggleSpeed(): void { this.simulation.toggleSpeed(); this.changed(); }

  armAbility(id: HeroId): void {
    this.armSpell(id, HERO_PRIMARY_SPELL[id]);
  }

  getHeroSpellTargeting(id: HeroId, spellId: HeroActiveSpellId): ReturnType<GameSimulation['getHeroSpellTargeting']> {
    return this.simulation.getHeroSpellTargeting(id, spellId);
  }

  armSpell(id: HeroId, spellId: HeroActiveSpellId): void {
    const hero = this.snapshot().heroes.find((candidate) => candidate.id === id);
    const spell = heroSpellSpec(spellId);
    if (!hero || !hero.alive || hero.spellCooldowns[spellId] > 0 || !hero.unlockedSpells.includes(spellId)) {
      this.invalidAction();
      return;
    }
    if (this.armedSpell?.heroId === id && this.armedSpell.spellId === spellId) {
      this.cancelSpellCast();
      return;
    }
    this.selection = { kind: 'hero', heroId: id };
    if (spell.targeting === 'self') {
      if (!this.useHeroSpell(id, spellId, hero)) this.invalidAction();
      this.cancelSpellCast(false);
      this.changed();
      return;
    }
    this.armedSpell = { heroId: id, spellId, targeting: 'point' };
    this.spellTargetPreview = { ...this.armedSpell };
    this.dispatchEvent(new CustomEvent<ArmedHeroSpell>('cast-mode-change', { detail: this.armedSpell }));
    this.changed();
  }

  cancelSpellCast(changed = true): boolean {
    if (!this.armedSpell) return false;
    this.armedSpell = undefined;
    this.spellTargetPreview = undefined;
    this.dispatchEvent(new CustomEvent<undefined>('cast-mode-change', { detail: undefined }));
    if (changed) this.changed();
    return true;
  }

  previewSpellTarget(point?: Vec2): SpellTargetPreview | undefined {
    if (!this.armedSpell) return undefined;
    const preview: SpellTargetPreview = {
      ...this.armedSpell,
      point,
      valid: point ? this.canCastArmedSpellAt(point) : undefined,
    };
    const previous = this.spellTargetPreview;
    const unchanged = previous?.point?.x === preview.point?.x
      && previous?.point?.y === preview.point?.y
      && previous?.valid === preview.valid
      && previous?.heroId === preview.heroId
      && previous?.spellId === preview.spellId;
    this.spellTargetPreview = preview;
    if (!unchanged) this.dispatchEvent(new CustomEvent<SpellTargetPreview>('spell-target-preview', { detail: preview }));
    return preview;
  }

  worldAction(point: Vec2): void {
    if (this.armedSpell) {
      const armed = this.armedSpell;
      if (this.canCastArmedSpellAt(point) && this.useHeroSpell(armed.heroId, armed.spellId, point)) {
        this.cancelSpellCast(false);
      } else {
        this.previewSpellTarget(point);
        this.dispatchEvent(new CustomEvent<SpellTargetPreview>('spell-target-invalid', { detail: this.spellTargetPreview! }));
        this.invalidAction();
      }
    } else if (this.selection.kind === 'hero') {
      this.simulation.moveHero(this.selection.heroId, point);
    } else {
      this.clearSelection();
    }
    this.changed();
  }

  selectAdjacentPad(direction: -1 | 1): void {
    const current = this.selection.kind === 'pad' ? this.selection.padIndex : this.selection.kind === 'tower' ? (this.selectedTower()?.padIndex ?? -1) : -1;
    const count = this.simulation.geometry.buildPads.length;
    this.selectPad((current + direction + count) % count);
  }

  nudgeSelectedHero(dx: number, dy: number): void {
    if (this.armedSpell || this.selection.kind !== 'hero') return;
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
    if (this.armedSpell) return undefined;
    const uid = towerUid ?? (this.selection.kind === 'tower' ? this.selection.towerUid : undefined);
    if (uid === undefined) return undefined;
    const tower = this.snapshot().towers.find((candidate) => candidate.uid === uid);
    if (tower) {
      this.selection = { kind: 'tower', towerUid: tower.uid };
    }
    return tower;
  }

  private canCastArmedSpellAt(point: Vec2): boolean {
    const armed = this.armedSpell;
    if (!armed) return false;
    if (!this.armedHeroCanCast()) return false;
    return this.simulation.canUseHeroSpell(armed.heroId, armed.spellId, point);
  }

  private armedHeroCanCast(): boolean {
    const armed = this.armedSpell;
    if (!armed || this.snapshot().phase !== 'playing') return false;
    const hero = this.snapshot().heroes.find((candidate) => candidate.id === armed.heroId);
    if (!hero || !hero.alive || !hero.unlockedSpells.includes(armed.spellId)) return false;
    return hero.spellCooldowns[armed.spellId] <= 0;
  }

  private useHeroSpell(heroId: HeroId, spellId: HeroActiveSpellId, point: Vec2): boolean {
    return this.simulation.useHeroSpell(heroId, spellId, point);
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
