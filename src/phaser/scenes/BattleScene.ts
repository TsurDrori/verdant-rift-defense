import Phaser from 'phaser';
import { ASSETS } from '../../game/assets/manifest';
import { heroAbilitySpec } from '../../game/content/heroProgression';
import { BUILD_PADS, PATH_POINTS } from '../../game/simulation/geometry';
import type { AttackPresentationEvent, GameEvent, ProjectileStyle } from '../../game/simulation/state';
import { GameController } from '../adapters/GameController';
import {
  animateAllyAttackView,
  animateAllyHitView,
  animateDefeatView,
  animateEnemyAttackView,
  animateEnemyHitView,
  animateTowerAttackView,
  createDefenderView,
  createEnemyView,
  createHeroView,
  createTowerView,
  disposeEntityView,
  refreshDefenderView,
  refreshEnemyView,
  refreshHeroView,
  refreshTowerView,
} from '../view/EntityViews';

export class BattleScene extends Phaser.Scene {
  private controller: GameController;
  private enemyViews = new Map<number, Phaser.GameObjects.Container>();
  private defenderViews = new Map<number, Phaser.GameObjects.Container>();
  private towerViews = new Map<number, Phaser.GameObjects.Container>();
  private heroViews = new Map<string, Phaser.GameObjects.Container>();
  private padRings: Phaser.GameObjects.Container[] = [];
  private rangeRing?: Phaser.GameObjects.Arc;
  private towerFocusRing?: Phaser.GameObjects.Ellipse;
  private gateValueText?: Phaser.GameObjects.Text;
  private activeBossTelegraphs = 0;
  private bossPresent = false;
  private bossArrivalAnnouncements = 0;
  private bossTelegraphCancel = new Map<string, () => void>();
  private friendlyAbilityFx = new Set<Phaser.GameObjects.Container | Phaser.GameObjects.Graphics>();
  private activeProjectileFx = 0;
  private peakProjectileFx = 0;
  private enemyFxReduced = false;
  private lastEventDrain = 0;
  private presentationPaused = false;
  private enemyReleaseDelays = new Map<number, number[]>();
  private allyImpactDelays = new Map<string, number[]>();

  constructor(controller: GameController) { super('battle'); this.controller = controller; }

  create(): void {
    this.cameras.main.setBackgroundColor(0x071310);
    this.add.image(800, 450, ASSETS.environment.verdantRift).setDisplaySize(1600, 900).setDepth(0);
    this.add.rectangle(800, 450, 1600, 900, 0x071410, 0.08).setDepth(1);
    const laneReadability = this.add.graphics().setDepth(2);
    laneReadability.lineStyle(104, 0x071310, 0.075).strokePoints(PATH_POINTS as Phaser.Types.Math.Vector2Like[], false, false);
    laneReadability.lineStyle(78, 0xffedbd, 0.042).strokePoints(PATH_POINTS as Phaser.Types.Math.Vector2Like[], false, false);
    this.createAmbientFx();
    this.createRouteCues();
    this.createPads();
    this.createHeroes();
    this.rangeRing = this.add.circle(0, 0, 100, 0x7ee4cf, 0.08).setStrokeStyle(2, 0xb8f4d9, 0.65).setVisible(false).setDepth(18);
    this.towerFocusRing = this.add.ellipse(0, 0, 88, 34, 0x8ff0c1, 0.08).setStrokeStyle(3, 0xffe493, 0.94).setVisible(false).setDepth(29);
    this.tweens.add({ targets: this.towerFocusRing, scaleX: 1.14, scaleY: 1.08, alpha: { from: 0.92, to: 0.38 }, duration: 680, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (this.uiOwnsPointer(pointer)) return;
      if (over.length === 0) this.controller.worldAction({ x: pointer.worldX, y: pointer.worldY });
    });
  }

  private uiOwnsPointer(pointer: Phaser.Input.Pointer): boolean {
    const sourceEvent = pointer.event as PointerEvent | TouchEvent | undefined;
    if (!sourceEvent) return false;
    // Phaser retains the native TouchEvent on mobile rather than promoting it
    // to a PointerEvent. TouchEvent itself has no client coordinates, so using
    // sourceEvent.clientX made elementFromPoint inspect (0, 0) and reject valid
    // battlefield taps as HUD-owned input.
    const touch = 'changedTouches' in sourceEvent
      ? sourceEvent.changedTouches.item(0) ?? sourceEvent.touches.item(0)
      : undefined;
    const clientX = touch?.clientX ?? (sourceEvent as PointerEvent).clientX;
    const clientY = touch?.clientY ?? (sourceEvent as PointerEvent).clientY;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
    const topElement = document.elementFromPoint(clientX, clientY);
    return topElement instanceof Element && Boolean(topElement.closest('#ui-root'));
  }

  update(time: number, delta: number): void {
    this.controller.update(delta / 1000);
    const snapshot = this.controller.snapshot();
    this.tweens.timeScale = snapshot.speed;
    const shouldPausePresentation = snapshot.phase === 'paused';
    if (shouldPausePresentation !== this.presentationPaused) {
      this.presentationPaused = shouldPausePresentation;
      if (shouldPausePresentation) this.tweens.pauseAll(); else this.tweens.resumeAll();
    }
    if (time - this.lastEventDrain > 12) {
      this.lastEventDrain = time;
      for (const event of this.controller.drainEvents()) this.handleEvent(event);
    }
    this.syncViews();
    this.syncSelection();
  }

  private createPads(): void {
    BUILD_PADS.forEach((pad, index) => {
      const container = this.add.container(pad.x, pad.y).setDepth(15);
      const hover = this.add.circle(0, 0, 37, 0x9ce2b8, 0).setStrokeStyle(2, 0xf4dda7, 0.1);
      const socket = this.add.circle(0, 0, 15, 0x132d28, 0.62).setStrokeStyle(1.5, 0xd7c58b, 0.48);
      const rune = this.add.polygon(0, 0, [0, -8, 6, 0, 0, 8, -6, 0], 0xc9e7bd, 0.75).setStrokeStyle(1, 0x143c34, 1);
      const notches = [0, 120, 240].map((angle) => {
        const radians = Phaser.Math.DegToRad(angle);
        return this.add.rectangle(Math.cos(radians) * 29, Math.sin(radians) * 29, 3, 10, 0xcbbd86, 0.45).setRotation(radians + Math.PI / 2);
      });
      container.add([hover, socket, rune, ...notches]);
      // 112 world pixels resolves to 44.8 CSS pixels at the smallest supported
      // 740x360 landscape fit (0.4x), while remaining clear of neighboring pads.
      // The visible stone ring stays compact; only the forgiving input proxy grows.
      container.setName(`build-pad-hit-${index}`).setData('touchProxy', { width: 112, height: 112 });
      container.setSize(112, 112).setInteractive({ useHandCursor: true });
      container.on('pointerover', () => { hover.setFillStyle(0x9ce2b8, 0.14).setStrokeStyle(2.5, 0xbef5d4, 0.82); rune.setFillStyle(0xffe897, 0.95); container.setScale(1.08); });
      container.on('pointerout', () => { hover.setFillStyle(0x9ce2b8, 0).setStrokeStyle(2, 0xf4dda7, 0.1); rune.setFillStyle(0xc9e7bd, 0.75); container.setScale(1); });
      container.on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); if (!this.uiOwnsPointer(pointer)) this.controller.selectPad(index); });
      this.padRings.push(container);
    });
  }

  private createAmbientFx(): void {
    const particles = this.add.particles(0, 0, '__DEFAULT', {
      x: { min: 0, max: 1600 }, y: { min: 0, max: 900 }, quantity: 1, frequency: 310,
      lifespan: { min: 1900, max: 3500 }, speedY: { min: -14, max: -4 }, speedX: { min: -5, max: 5 },
      scale: { start: 0.035, end: 0 }, tint: [0x9af5c9, 0xf7d77d, 0xaa83ff], alpha: { start: 0.75, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(8);
    particles.setAlpha(0.7);
  }

  private createRouteCues(): void {
    const entrance = this.add.container(174, 132).setDepth(86);
    const enterPlate = this.add.rectangle(0, -27, 132, 22, 0x071b17, 0.82).setStrokeStyle(1, 0xb7edc9, 0.42);
    const enterLabel = this.add.text(0, -27, 'RIFT APPROACH', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#eaffdf', stroke: '#10221d', strokeThickness: 3 }).setOrigin(0.5);
    const enterChevrons = [0, 1, 2].map((index) => this.add.polygon(-24 + index * 24, 0, [-10, -8, 0, 0, -10, 8, -4, 8, 7, 0, -4, -8], 0xcaffc9, 0.55).setStrokeStyle(1,0x0a2a24,0.8));
    entrance.add([enterPlate, enterLabel, ...enterChevrons]).setRotation(0.16);
    enterChevrons.forEach((chevron, index) => this.tweens.add({ targets: chevron, alpha: { from: 0.2, to: 0.88 }, duration: 560, delay: index * 150, yoyo: true, repeat: -1 }));

    const exit = this.add.container(145, 817).setDepth(86);
    const exitRing = this.add.ellipse(0, 0, 126, 56, 0xffce5c, 0.08).setStrokeStyle(3, 0xffdf79, 0.58).setBlendMode(Phaser.BlendModes.ADD);
    const crest = this.add.polygon(-43, -38, [0,-13,12,-6,10,9,0,15,-10,9,-12,-6],0xc69d42,0.95).setStrokeStyle(2,0xffe69d,0.8);
    const gatePlate = this.add.rectangle(9, -38, 78, 28, 0x342611, 0.9).setStrokeStyle(2,0xe1bd5e,0.76);
    const exitLabel = this.add.text(-1, -38, 'GATE', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#ffe7a0' }).setOrigin(0.5);
    this.gateValueText = this.add.text(34, -38, '20', { fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold', color: '#fff4c6', stroke: '#2d1c08', strokeThickness: 3 }).setOrigin(0.5);
    exit.add([exitRing, gatePlate, crest, exitLabel, this.gateValueText]);
    this.tweens.add({ targets: exitRing, scale: { from: 0.82, to: 1.12 }, alpha: { from: 0.1, to: 0.45 }, duration: 980, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  private createHeroes(): void {
    for (const hero of this.controller.snapshot().heroes) {
      const view = createHeroView(this, hero);
      view.setName(`hero-hit-${hero.id}`).setData('touchProxy', { width: 112, height: 120 });
      view.setSize(112, 120).setInteractive({ useHandCursor: true });
      view.on('pointerdown', (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); if (!this.uiOwnsPointer(pointer)) this.controller.selectHero(hero.id); });
      this.heroViews.set(hero.id, view);
    }
  }

  private syncViews(): void {
    const snapshot = this.controller.snapshot();
    const livingBoss = snapshot.enemies.find((enemy) => enemy.alive && enemy.type === 'bloomlord');
    if (livingBoss && !this.bossPresent) {
      this.bossPresent = true;
      this.announceBossArrival(livingBoss.x, livingBoss.y);
    } else if (!livingBoss) {
      this.bossPresent = false;
    }
    const livingEnemyCount = snapshot.enemies.reduce((count, enemy) => count + Number(enemy.alive), 0);
    // Per-sprite shader grades are visually useful at normal density but each
    // one requires an off-screen render pass. Dozens of simultaneous enemies
    // (easy to reach by calling three waves early at 2x) can saturate the GPU
    // and prevent the scene update from running. Hysteresis avoids rapidly
    // toggling quality around the threshold.
    if (!this.enemyFxReduced && livingEnemyCount > 12) this.enemyFxReduced = true;
    else if (this.enemyFxReduced && livingEnemyCount < 8) this.enemyFxReduced = false;
    this.gateValueText?.setText(String(snapshot.lives));
    for (const tower of snapshot.towers) {
      let view = this.towerViews.get(tower.uid);
      if (!view) {
        view = createTowerView(this, tower);
        view.setName(`tower-view-${tower.uid}`);
        const point = BUILD_PADS[tower.padIndex]!;
        view.setPosition(point.x, point.y);
        // Generated branch silhouettes are wider than the base towers and two
        // vertically adjacent pads overlap in screen space. Pixel-perfect
        // sprite input keeps every opaque bow, fin, and spire clickable without
        // allowing a transparent rectangle to steal the neighboring tower.
        const selectTower = (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData): void => {
          event.stopPropagation();
          if (!this.uiOwnsPointer(_pointer)) this.controller.selectTower(tower.uid);
        };
        const sprite = view.getData('sprite') as Phaser.GameObjects.Image;
        sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 12, useHandCursor: true }).on('pointerdown', selectTower);
        // A generous, non-overlapping crown zone makes the intended selection
        // gesture forgiving even when the painted top has thin transparent gaps.
        const crownHit = this.add.zone(0, -68, 112, 120)
          .setName(`tower-crown-hit-${tower.uid}`)
          .setData('touchProxy', { width: 112, height: 120 })
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', selectTower);
        view.add(crownHit);
        const selectionPlate = view.getData('selectionPlate') as Phaser.GameObjects.Ellipse;
        selectionPlate.setInteractive({ useHandCursor: true }).on('pointerdown', selectTower);
        this.towerViews.set(tower.uid, view);
      }
      this.setTowerPostFx(view, !this.enemyFxReduced);
      refreshTowerView(view, tower);
      this.padRings[tower.padIndex]?.setVisible(false);
    }
    for (const [uid, view] of this.towerViews) {
      if (!snapshot.towers.some((tower) => tower.uid === uid)) {
        disposeEntityView(view);
        view.destroy();
        this.towerViews.delete(uid);
      }
    }
    this.padRings.forEach((pad, index) => pad.setVisible(!snapshot.towers.some((tower) => tower.padIndex === index)));

    for (const enemy of snapshot.enemies) {
      if (!enemy.alive) continue;
      let view = this.enemyViews.get(enemy.uid);
      if (!view) {
        view = createEnemyView(this, enemy);
        view.setData('postFxEnabled', true);
        this.enemyViews.set(enemy.uid, view);
      }
      this.setEnemyPostFx(view, enemy.type, !this.enemyFxReduced);
      const flyingOffset = this.controller.enemyDefinition(enemy.type).flying ? -11 : 0;
      view.x = Phaser.Math.Linear(view.x, enemy.x, 0.42);
      view.y = Phaser.Math.Linear(view.y, enemy.y + flyingOffset, 0.42);
      view.setDepth(40 + enemy.y * 0.02);
      refreshEnemyView(view, enemy);
      if (enemy.engagedAllyUid) {
        const ally = enemy.engagedAllyUid.startsWith('hero:')
          ? snapshot.heroes.find((candidate) => `hero:${candidate.id}` === enemy.engagedAllyUid)
          : snapshot.defenders.find((candidate) => candidate.allyUid === enemy.engagedAllyUid);
        if (ally) (view.getData('sprite') as Phaser.GameObjects.Image).setFlipX(ally.x < enemy.x);
      }
    }
    for (const [uid, view] of this.enemyViews) {
      const enemy = snapshot.enemies.find((candidate) => candidate.uid === uid);
      if ((!enemy || !enemy.alive) && !view.getData('pendingLethal')) {
        this.fadeDestroy(view);
        this.enemyReleaseDelays.delete(uid);
        this.enemyViews.delete(uid);
      }
    }

    for (const defender of snapshot.defenders) {
      let view = this.defenderViews.get(defender.uid);
      if (!view) {
        view = createDefenderView(this, defender);
        view.setData('supportFxEnabled', true);
        this.defenderViews.set(defender.uid, view);
      }
      this.setDefenderPostFx(view, defender.slot, !this.enemyFxReduced);
      view.setPosition(defender.x, defender.y).setDepth(58 + defender.y * 0.02);
      refreshDefenderView(view, defender);
      if (defender.engagedEnemyUid !== null) {
        const enemy = snapshot.enemies.find((candidate) => candidate.uid === defender.engagedEnemyUid);
        if (enemy) (view.getData('sprite') as Phaser.GameObjects.Image).setFlipX(enemy.x < defender.x);
      }
    }
    for (const [uid, view] of this.defenderViews) {
      if (!snapshot.defenders.some((defender) => defender.uid === uid)) {
        this.fadeDestroy(view);
        this.allyImpactDelays.delete(`defender:${uid}`);
        this.defenderViews.delete(uid);
      }
    }

    for (const hero of snapshot.heroes) {
      const view = this.heroViews.get(hero.id);
      if (view) {
        this.setHeroPostFx(view, hero.accent, !this.enemyFxReduced);
        view.setPosition(hero.x, hero.y).setDepth(60 + hero.y * 0.02);
        refreshHeroView(view, hero);
        if (hero.engagedEnemyUid !== null) {
          const enemy = snapshot.enemies.find((candidate) => candidate.uid === hero.engagedEnemyUid);
          if (enemy) (view.getData('sprite') as Phaser.GameObjects.Image).setFlipX(enemy.x < hero.x);
        }
      }
    }
  }

  private setEnemyPostFx(view: Phaser.GameObjects.Container, enemyType: keyof typeof ASSETS.enemyActions, enabled: boolean): void {
    if (view.getData('postFxEnabled') === enabled) return;
    const sprite = view.getData('sprite') as Phaser.GameObjects.Image;
    const spriteFx = sprite.preFX;
    if (!spriteFx) {
      view.setData('postFxEnabled', enabled);
      return;
    }
    spriteFx.clear();
    view.setData('engagementGlow', undefined);
    if (enabled) {
      const grade = spriteFx.addColorMatrix();
      grade.brightness(enemyType === 'bloomlord' ? 1.27 : 1.14);
      grade.saturate(0.07, true);
      if (enemyType === 'marauder' || enemyType === 'brute') {
        view.setData('engagementGlow', spriteFx.addGlow(0xffbc8d, 0.42, 0.04, false, 0.1, 3));
      }
    }
    view.setData('postFxEnabled', enabled);
  }

  private setTowerPostFx(view: Phaser.GameObjects.Container, enabled: boolean): void {
    if (view.getData('supportFxEnabled') === undefined) view.setData('supportFxEnabled', true);
    if (view.getData('supportFxEnabled') === enabled) return;
    const sprite = view.getData('sprite') as Phaser.GameObjects.Image;
    const spriteFx = sprite.preFX;
    spriteFx?.clear();
    if (enabled && spriteFx) {
      const grade = spriteFx.addColorMatrix();
      grade.brightness(1.07);
      grade.saturate(0.04, true);
    }
    view.setData('supportFxEnabled', enabled);
  }

  private setHeroPostFx(view: Phaser.GameObjects.Container, accent: number, enabled: boolean): void {
    if (view.getData('supportFxEnabled') === undefined) view.setData('supportFxEnabled', true);
    if (view.getData('supportFxEnabled') === enabled) return;
    const sprite = view.getData('sprite') as Phaser.GameObjects.Image;
    const spriteFx = sprite.preFX;
    spriteFx?.clear();
    if (enabled && spriteFx) {
      const grade = spriteFx.addColorMatrix();
      grade.brightness(1.1);
      grade.saturate(0.04, true);
      spriteFx.addGlow(accent, 0.38, 0.03, false, 0.1, 3);
    }
    view.setData('supportFxEnabled', enabled);
  }

  private setDefenderPostFx(view: Phaser.GameObjects.Container, slot: number, enabled: boolean): void {
    if (view.getData('supportFxEnabled') === enabled) return;
    const sprite = view.getData('sprite') as Phaser.GameObjects.Image;
    const spriteFx = sprite.preFX;
    spriteFx?.clear();
    if (enabled && spriteFx) {
      const grade = spriteFx.addColorMatrix();
      grade.brightness(1.13);
      grade.saturate(0.08, true);
      spriteFx.addGlow(slot % 2 ? 0x9fe8ff : 0x8ff0c1, 0.5, 0.04, false, 0.1, 3);
    }
    view.setData('supportFxEnabled', enabled);
  }

  private syncSelection(): void {
    if (!this.rangeRing || !this.towerFocusRing) return;
    const selection = this.controller.selection;
    if (selection.kind === 'tower') {
      const tower = this.controller.selectedTower();
      if (!tower) { this.rangeRing.setVisible(false); this.towerFocusRing.setVisible(false); return; }
      const point = BUILD_PADS[tower.padIndex]!;
      const definition = this.controller.towerDefinition(tower.type);
      const levelStats = tower.level === 1 ? undefined : definition.upgrades[tower.level - 2];
      const branchScale = tower.branch ? definition.branches[tower.branch].rangeMultiplier : 1;
      this.rangeRing.setPosition(point.x, point.y).setRadius((levelStats?.range ?? definition.range) * branchScale).setVisible(true);
      this.towerFocusRing.setPosition(point.x, point.y + 12).setVisible(true);
      this.towerViews.forEach((view, uid) => view.setData('isSelected', uid === tower.uid));
    } else if (selection.kind === 'hero') {
      const hero = this.controller.snapshot().heroes.find((candidate) => candidate.id === selection.heroId);
      if (hero) this.rangeRing.setPosition(hero.x, hero.y).setRadius(this.controller.armedAbility ? heroAbilitySpec(hero.id, hero.level).castRange : hero.range).setVisible(true);
      this.towerFocusRing.setVisible(false);
      this.towerViews.forEach((view) => view.setData('isSelected', false));
    } else {
      this.rangeRing.setVisible(false);
      this.towerFocusRing.setVisible(false);
      this.towerViews.forEach((view) => view.setData('isSelected', false));
    }
    this.padRings.forEach((pad, index) => {
      const selected = selection.kind === 'pad' && selection.padIndex === index;
      pad.setScale(selected ? 1.17 : 1);
    });
  }

  private handleEvent(event: GameEvent): void {
    if (event.type === 'enemy-hit') {
      const target = this.enemyViews.get(event.enemyUid);
      if (!target) { this.controller.present(event); return; }
      target.setData('pendingDamage', (target.getData('pendingDamage') as number) + event.amount);
      if (event.lethal) target.setData('pendingLethal', true);
      const releaseDelay = this.shiftDelay(this.enemyReleaseDelays, event.enemyUid);
      this.scheduleViewCall(target, this.scaledPresentationMs(releaseDelay), () => {
        if (!target.active) { this.controller.present(event); return; }
        this.projectileFx(event.style, event.source.x, event.source.y - 18, target.x, target.y, event.color, event.splash, () => {
          // Another lethal impact may remove this view while the projectile is
          // still in flight. Settle bookkeeping, but never mutate or animate a
          // destroyed/stale container after the authoritative view is replaced.
          if (!target.active || this.enemyViews.get(event.enemyUid) !== target) {
            this.controller.present(event);
            return;
          }
          target.setData('pendingDamage', Math.max(0, (target.getData('pendingDamage') as number) - event.amount));
          animateEnemyHitView(target);
          this.controller.present(event);
          if (event.lethal && this.enemyViews.get(event.enemyUid) === target) {
            target.setData('pendingLethal', false);
            this.fadeDestroy(target);
            this.enemyReleaseDelays.delete(event.enemyUid);
            this.enemyViews.delete(event.enemyUid);
          }
        });
      });
    } else if (event.type === 'ally-attack') {
      // Retained for audio/UI compatibility. Presentation is driven by the
      // explicit attack-start/release/impact contract below.
    } else if (event.type === 'ally-hit') {
      const ally = this.allyView(event.allyUid);
      if (ally) {
        const impactDelay = this.shiftDelay(this.allyImpactDelays, event.allyUid);
        this.scheduleViewCall(ally, this.scaledPresentationMs(impactDelay), () => {
          if (!ally.active) return;
          animateAllyHitView(ally);
          this.meleeClash(ally.x, ally.y - 10, 0xff806d);
        });
      }
    } else if (event.type === 'attack-start' || event.type === 'attack-release' || event.type === 'attack-impact') {
      this.handleAttackPresentation(event);
    } else if (event.type === 'ally-defeated') {
      const ally = this.allyView(event.allyUid);
      if (ally) this.tweens.add({ targets: ally, alpha: 0.2, scale: 0.82, duration: 260, ease: 'Quad.In' });
    } else if (event.type === 'ally-respawned') {
      const ally = this.allyView(event.allyUid);
      if (ally) this.tweens.add({ targets: ally, alpha: { from: 0.2, to: 1 }, scale: { from: 0.65, to: 1 }, duration: 420, ease: 'Back.Out' });
      this.flashImpact(event.point.x, event.point.y, 0x8ff0c1, 24);
    } else if (event.type === 'hero-level-up') {
      const hero = this.controller.snapshot().heroes.find((candidate) => candidate.id === event.hero);
      const label = this.add.text(event.point.x, event.point.y - 48, `LV ${event.level}`, {
        fontFamily: 'Georgia, serif', fontSize: '19px', fontStyle: 'bold', color: '#fff1ae',
        stroke: '#10231d', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(190).setScale(0.72).setAlpha(0);
      this.flashImpact(event.point.x, event.point.y - 4, hero?.accent ?? 0xffdf87, 32);
      this.tweens.add({
        targets: label, alpha: { from: 0, to: 1 }, scale: { from: 0.72, to: 1 }, y: event.point.y - 68,
        duration: 360, ease: 'Back.Out', hold: 720, yoyo: true,
        onComplete: () => label.destroy(),
      });
    } else if (event.type === 'enemy-leaked') {
      this.cameras.main.shake(180, 0.0045);
      this.cameras.main.flash(100, 120, 20, 30, false);
    } else if (event.type === 'tower-built') {
      const point = BUILD_PADS[event.padIndex]!;
      this.flashImpact(point.x, point.y, 0xffdd86, 44);
    } else if (event.type === 'ability') {
      this.abilityFx(event.hero, event.point.x, event.point.y);
    } else if (event.type === 'boss-telegraph') {
      this.bossTelegraph(event.source.x, event.source.y, event.point.x, event.point.y, event.radius, event.duration, event.label);
    } else if (event.type === 'tower-disabled') {
      const tower = this.towerViews.get(event.towerUid);
      if (tower) { this.bossTelegraphCancel.get(this.warningKey(tower.x, tower.y))?.(); this.disabledFx(tower.x, tower.y, event.duration); }
    } else if (event.type === 'defeat') {
      this.cameras.main.shake(600, 0.008);
    }
  }

  private handleAttackPresentation(event: AttackPresentationEvent & { type: 'attack-start' | 'attack-release' | 'attack-impact' }): void {
    if (event.type === 'attack-release' && (event.actor === 'tower' || event.actor === 'ally') && event.targetUid.startsWith('enemy:')) {
      this.pushDelay(this.enemyReleaseDelays, Number(event.targetUid.slice('enemy:'.length)), event.delay);
    }
    if (event.type === 'attack-impact' && event.actor === 'enemy' && !event.targetUid.startsWith('tower:')) {
      this.pushDelay(this.allyImpactDelays, event.targetUid, event.delay);
    }
    if (event.type !== 'attack-start') return;

    if (event.actor === 'tower') {
      const towerUid = Number(event.actorUid.slice('tower:'.length));
      const tower = this.controller.snapshot().towers.find((candidate) => candidate.uid === towerUid);
      const view = this.towerViews.get(towerUid);
      if (tower && view) animateTowerAttackView(view, tower.type);
      return;
    }
    if (event.actor === 'ally') {
      const view = this.allyView(event.actorUid);
      if (view) animateAllyAttackView(view);
      return;
    }
    const enemyUid = Number(event.actorUid.slice('enemy:'.length));
    const view = this.enemyViews.get(enemyUid);
    if (view) animateEnemyAttackView(view);
  }

  private scaledPresentationMs(seconds: number): number {
    return seconds * 1000 / Math.max(0.25, this.tweens.timeScale || 1);
  }

  private scheduleViewCall(view: Phaser.GameObjects.Container, delayMs: number, callback: () => void): void {
    const timers = view.getData('ownedViewTimers') as Set<Phaser.Time.TimerEvent> | undefined;
    let timer: Phaser.Time.TimerEvent;
    timer = this.time.delayedCall(delayMs, () => {
      timers?.delete(timer);
      if (view.active) callback();
    });
    timers?.add(timer);
  }

  private pushDelay<Key>(map: Map<Key, number[]>, key: Key, delay: number): void {
    const queue = map.get(key) ?? [];
    queue.push(delay);
    map.set(key, queue);
  }

  private shiftDelay<Key>(map: Map<Key, number[]>, key: Key): number {
    const queue = map.get(key);
    const delay = queue?.shift() ?? 0;
    if (queue?.length === 0) map.delete(key);
    return delay;
  }

  private allyView(allyUid: string): Phaser.GameObjects.Container | undefined {
    if (allyUid.startsWith('hero:')) return this.heroViews.get(allyUid.slice('hero:'.length));
    if (allyUid.startsWith('defender:')) return this.defenderViews.get(Number(allyUid.slice('defender:'.length)));
    return undefined;
  }

  private meleeClash(x: number, y: number, color: number): void {
    const slash = this.add.polygon(x, y, [-11, -2, -3, -1, 10, -6, 4, 1, 11, 3, 2, 2, -9, 6, -3, 1], color, 0.78)
      .setStrokeStyle(1, 0xfff4d4, 0.68).setDepth(112).setBlendMode(Phaser.BlendModes.ADD).setScale(0.38);
    this.tweens.add({ targets: slash, scale: 0.92, angle: 18, alpha: 0, duration: 165, ease: 'Quad.Out', onComplete: () => slash.destroy() });
  }

  private projectileFx(style: ProjectileStyle, sx: number, sy: number, tx: number, ty: number, color: number, splash: number, onImpact: () => void): void {
    if (style === 'impact') { this.materialImpact(tx, ty, style, color, splash > 0 ? Math.min(splash, 54) : 13); onImpact(); return; }
    // Presentation must never back-pressure the authoritative simulation. A
    // dense 2x-speed wave burst can produce more shots than the renderer can
    // animate concurrently on a low-end GPU. Keep the newest combat result and
    // its lightweight impact, but skip excess flight rigs. Most importantly,
    // always resolve onImpact so lethal-presentation bookkeeping cannot lock a
    // wave-clear event behind an effect that was never scheduled.
    const projectileBudget = 32;
    if (this.activeProjectileFx >= projectileBudget) {
      this.materialImpact(tx, ty, style, color, splash > 0 ? Math.min(splash, 42) : 13);
      onImpact();
      return;
    }
    this.activeProjectileFx += 1;
    this.peakProjectileFx = Math.max(this.peakProjectileFx, this.activeProjectileFx);
    const shot = this.add.container(sx, sy).setDepth(100);
    const angle = Phaser.Math.Angle.Between(sx, sy, tx, ty);
    if (style === 'ember') {
      shot.add([this.add.circle(0, 0, 11, 0x19130f, 1).setStrokeStyle(3, 0xf18b42, 0.96), this.add.circle(-3, -3, 5, 0xffd06a, 1).setBlendMode(Phaser.BlendModes.ADD), this.add.polygon(-13,3,[0,-5,14,0,0,5],0x78311d,.72)]);
    } else if (style === 'thorn') {
      shot.add([this.add.rectangle(0, 0, 33, 5, 0xffe6ae, 1).setStrokeStyle(1,0x5f3217,.8).setRotation(angle), this.add.polygon(-13, 0, [-7,0,5,-7,1,0,5,7],0x83e3a4,1).setRotation(angle)]);
    } else if (style === 'aegis') {
      shot.add(this.add.polygon(0, 0, [-14,-10,2,0,-14,10,-4,0,14,0], 0x76cfff, 1).setRotation(angle).setStrokeStyle(2,0xe6fbff,0.95));
    } else if (style === 'kael') {
      shot.add(this.add.polygon(0,0,[-12,0,-2,-6,11,0,-2,6],0x72f2ce,0.92).setRotation(angle).setStrokeStyle(1,0xe6fff7,0.9));
    } else {
      const orb = this.add.circle(0,0,style === 'lyra' ? 8 : 7,color,0.95).setStrokeStyle(3,0xffefff,0.96).setBlendMode(Phaser.BlendModes.ADD);
      const orbit = this.add.arc(0,0,15,25,295,false,color,0).setStrokeStyle(3,color,0.86);
      shot.add([orb,orbit]);
      this.tweens.add({ targets: orbit, angle: 260, duration: 300 });
    }
    const sourceFlash = this.add.polygon(sx, sy, [0,-12,4,-3,12,0,4,3,0,12,-4,3,-12,0,-4,-3], color, this.activeBossTelegraphs > 0 ? 0.38 : 0.8).setDepth(99).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: sourceFlash, scale: 1.8, alpha: 0, duration: 150, onComplete: () => sourceFlash.destroy() });
    const lift = style === 'ember' ? 76 : style === 'astral' || style === 'lyra' ? 28 : 12;
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(sx, sy), new Phaser.Math.Vector2((sx + tx) / 2, Math.min(sy,ty) - lift), new Phaser.Math.Vector2(tx, ty));
    const trailColor = style === 'ember' ? 0xff7c39 : style === 'thorn' ? 0xffd49b : style === 'aegis' ? 0x69cfff : color;
    const trailUnder = this.add.graphics().setDepth(97);
    const trail = this.add.graphics().setDepth(98);
    const commandMarks = style === 'aegis' ? [0, 1].map(() => this.add.polygon(0,0,[-8,-6,1,0,-8,6,-2,0,8,0],0x73d3ff,.86).setDepth(99).setStrokeStyle(1,0xe5fbff,.82)) : [];
    const tailLength = style === 'astral' || style === 'lyra' ? 0.24 : style === 'aegis' ? 0.13 : style === 'ember' ? 0.11 : 0.075;
    const travelDuration = Phaser.Math.Clamp(curve.getLength() / (style === 'ember' ? 285 : 430) * 1000, 160, 520);
    this.tweens.addCounter({ from: 0, to: 1, duration: travelDuration, ease: style === 'ember' ? 'Sine.In' : 'Cubic.InOut', onUpdate: (tween) => {
      const progress = tween.getValue() ?? 0;
      const point = curve.getPoint(progress);
      const mid = curve.getPoint(Math.max(0,progress-tailLength*.48));
      const back = curve.getPoint(Math.max(0,progress-tailLength));
      const facing = Phaser.Math.Angle.Between(mid.x,mid.y,point.x,point.y);
      shot.setPosition(point.x, point.y).setRotation(facing-angle);
      const hierarchyAlpha = this.activeBossTelegraphs > 0 ? 0.42 : 1;
      shot.setAlpha(hierarchyAlpha);
      trailUnder.clear().lineStyle(style === 'ember'?9:7,style === 'ember'?0x2b170d:0x111b21,.54*hierarchyAlpha).strokePoints([back,mid,point]);
      trail.clear().lineStyle(style === 'ember'?5:style === 'thorn'?3:4,trailColor,.78*hierarchyAlpha).strokePoints([back,mid,point]);
      trail.lineStyle(style === 'ember'?3:2,style === 'ember'?0xffc15a:0xfff0cf,.66*hierarchyAlpha).strokePoints([mid,point]);
      commandMarks.forEach((mark,index)=>{ const markProgress=Math.max(0,progress-.07*(index+1)); const markPoint=curve.getPoint(markProgress); const markAhead=curve.getPoint(Math.min(1,markProgress+.015)); mark.setPosition(markPoint.x,markPoint.y).setRotation(Phaser.Math.Angle.Between(markPoint.x,markPoint.y,markAhead.x,markAhead.y)).setAlpha((.78-index*.2)*hierarchyAlpha); });
    }, onComplete: () => {
      this.activeProjectileFx = Math.max(0, this.activeProjectileFx - 1);
      shot.destroy();
      commandMarks.forEach((mark)=>mark.destroy());
      this.tweens.add({ targets: [trail, trailUnder], alpha: 0, duration: 210, onComplete: () => { trail.destroy(); trailUnder.destroy(); } });
      this.materialImpact(tx, ty, style, color, splash > 0 ? Math.min(splash, 58) : 18);
      onImpact();
    } });
  }

  /** Read-only stress telemetry used by browser QA; never drives gameplay. */
  getPerformanceDiagnostics(): {
    activeProjectiles: number;
    peakProjectiles: number;
    enemyViews: number;
    defenderViews: number;
    towerViews: number;
    displayObjects: number;
    tweens: number;
    timers: number;
    reducedEnemyFx: boolean;
    simulationTime: number;
    expectedSimulationTime: number;
    simulationDebtMs: number;
    simToExpectedRatio: number;
    pendingLethals: number;
    deferredPresentationEvents: number;
    watchdogHealthy: boolean;
    bossArrivalAnnouncements: number;
  } {
    const timing = this.controller.simulation.getTimingDiagnostics();
    const presentation = this.controller.presentationDiagnostics();
    const simulationDebtMs = timing.accumulator * 1000;
    const simToExpectedRatio = timing.expectedSimulationTime > 0
      ? timing.simulationTime / timing.expectedSimulationTime
      : 1;
    const tweens = this.tweens.getTweens().length;
    const clock = this.time as unknown as { _active?: Phaser.Time.TimerEvent[]; _pendingInsertion?: Phaser.Time.TimerEvent[] };
    const timers = (clock._active?.length ?? 0) + (clock._pendingInsertion?.length ?? 0);
    return {
      activeProjectiles: this.activeProjectileFx,
      peakProjectiles: this.peakProjectileFx,
      enemyViews: this.enemyViews.size,
      defenderViews: this.defenderViews.size,
      towerViews: this.towerViews.size,
      displayObjects: this.children.list.length,
      tweens,
      timers,
      reducedEnemyFx: this.enemyFxReduced,
      simulationTime: timing.simulationTime,
      expectedSimulationTime: timing.expectedSimulationTime,
      simulationDebtMs,
      simToExpectedRatio,
      pendingLethals: presentation.pendingLethals,
      deferredPresentationEvents: presentation.deferredEvents,
      watchdogHealthy: simulationDebtMs <= 500.01 && this.activeProjectileFx <= 32
        && presentation.pendingLethals <= 32 && tweens < 500 && timers < 500,
      bossArrivalAnnouncements: this.bossArrivalAnnouncements,
    };
  }

  private announceBossArrival(x: number, y: number): void {
    this.bossArrivalAnnouncements += 1;
    const reducedMotion = document.documentElement.classList.contains('reduce-motion');
    this.cameras.main.flash(reducedMotion ? 120 : 260, 102, 22, 28, false);
    if (!reducedMotion) this.cameras.main.shake(920, 0.012, true);

    const shadow = this.add.ellipse(x, y + 18, 42, 16, 0x19070c, 0.72)
      .setStrokeStyle(3, 0xff6558, 0.75).setDepth(36).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const shockwave = this.add.circle(x, y, 24, 0x6a1027, 0.16)
      .setStrokeStyle(6, 0xff765d, 0.92).setDepth(116).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: [shadow, shockwave],
      scaleX: reducedMotion ? 2.2 : 5.8,
      scaleY: reducedMotion ? 1.7 : 4.2,
      alpha: 0,
      duration: reducedMotion ? 260 : 920,
      ease: 'Cubic.Out',
      onComplete: () => { shadow.destroy(); shockwave.destroy(); },
    });

    const banner = this.add.container(800, 178).setDepth(210).setAlpha(0);
    const plate = this.add.rectangle(0, 0, 470, 72, 0x160b10, 0.9)
      .setStrokeStyle(2, 0xe9b66a, 0.82);
    const title = this.add.text(0, -7, 'THE HOLLOW BLOOM', {
      fontFamily: 'Georgia, serif', fontSize: '31px', fontStyle: 'bold', color: '#ffe2a1',
      stroke: '#2b080c', strokeThickness: 6, letterSpacing: 3,
    }).setOrigin(0.5);
    const warning = this.add.text(0, 24, 'SOVEREIGN OF THE POISONED CROSSING', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#ff8972',
      letterSpacing: 2,
    }).setOrigin(0.5);
    banner.add([plate, title, warning]);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.84, to: 1 },
      duration: reducedMotion ? 120 : 300,
      ease: 'Back.Out',
      hold: reducedMotion ? 520 : 1050,
      yoyo: true,
      onComplete: () => banner.destroy(),
    });
  }

  private materialImpact(x: number, y: number, style: ProjectileStyle, color: number, radius: number): void {
    if (style === 'impact') {
      const fracture = this.add.polygon(x,y,[0,-8,4,-2,11,0,4,3,7,9,0,5,-8,8,-4,2,-11,-2,-3,-4],color,.55).setStrokeStyle(1,0xffffff,.52).setDepth(110);
      this.tweens.add({targets:fracture,scale:{from:.45,to:1.4},angle:38,alpha:0,duration:220,onComplete:()=>fracture.destroy()});
      const motes = this.add.particles(x,y,'__DEFAULT',{quantity:3,lifespan:210,speed:{min:16,max:45},scale:{start:.025,end:0},tint:color,blendMode:Phaser.BlendModes.ADD});
      this.time.delayedCall(230,()=>motes.destroy());
      return;
    } else if (style === 'ember') {
      const crater = this.add.ellipse(x,y + 5,radius * 1.5,radius * .55,0x32190e,.52).setStrokeStyle(3,0xff8d43,.72).setDepth(99);
      this.tweens.add({ targets: crater, scale: {from:.5,to:1.25}, alpha:0, duration:520, onComplete:()=>crater.destroy() });
    } else if (style === 'aegis') {
      [-1,1].forEach((side) => { const lock = this.add.polygon(x + side * 18,y,[side*-7,-13,side*3,-13,side*3,-7,side*8,-7,side*8,7,side*3,7,side*3,13,side*-7,13],0x9ee7ff,.74).setDepth(110); this.tweens.add({targets:lock,x:x+side*9,alpha:0,duration:320,onComplete:()=>lock.destroy()}); });
    } else if (style === 'thorn' || style === 'kael') {
      for (let i=0;i<4;i+=1) { const leaf=this.add.polygon(x,y,[0,-7,4,0,0,7,-4,0],i%2?0xcaf18e:color,.9).setDepth(110).setRotation(i*Math.PI/2); this.tweens.add({targets:leaf,x:x+Math.cos(i*Math.PI/2)*radius,y:y+Math.sin(i*Math.PI/2)*radius,angle:180,alpha:0,duration:300,onComplete:()=>leaf.destroy()}); }
    } else if (style === 'astral' || style === 'lyra') {
      [-38,48,138].forEach((start,index)=>{ const arc=this.add.arc(x,y,8+index*3,start,start+180,false,color,0).setStrokeStyle(2,color,.9).setDepth(110); this.tweens.add({targets:arc,radius:radius+index*7,angle:index%2?90:-90,alpha:0,duration:390,onComplete:()=>arc.destroy()}); });
    }
    this.flashImpact(x, y, color, radius);
  }

  private flashImpact(x: number, y: number, color: number, radius: number): void {
    const ring = this.add.circle(x, y, 5, color, 0.35).setStrokeStyle(3, color, 0.95).setDepth(110).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, radius, alpha: 0, duration: 340, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    const sparks = this.add.particles(x, y, '__DEFAULT', { quantity: 7, lifespan: 360, speed: { min: 25, max: 95 }, scale: { start: 0.045, end: 0 }, tint: color, blendMode: Phaser.BlendModes.ADD });
    this.time.delayedCall(380, () => sparks.destroy());
  }

  private abilityFx(hero: string, x: number, y: number): void {
    const color = hero === 'kael' ? 0x72f2ce : 0xe1a5ff;
    const origin = this.heroViews.get(hero);
    if (origin) {
      const trace = this.add.graphics().setDepth(103).lineStyle(7,0x4a235f,.6).beginPath().moveTo(origin.x,origin.y-36).lineTo(Phaser.Math.Linear(origin.x,x,.52),Phaser.Math.Linear(origin.y-36,y,.52)-34).lineTo(x,y).strokePath();
      trace.lineStyle(3,hero === 'lyra' ? 0xffefd0 : color,.94).beginPath().moveTo(origin.x,origin.y-36).lineTo(Phaser.Math.Linear(origin.x,x,.52),Phaser.Math.Linear(origin.y-36,y,.52)-34).lineTo(x,y).strokePath();
      this.tweens.add({ targets: trace, alpha: 0, duration: 480, onComplete:()=>trace.destroy() });
      this.friendlyAbilityFx.add(trace); trace.once(Phaser.GameObjects.Events.DESTROY,()=>this.friendlyAbilityFx.delete(trace));
    }
    if (hero === 'lyra') {
      const weave = this.add.container(x,y).setDepth(105);
      const graphics = this.add.graphics();
      graphics.fillStyle(0x8b4fc7,.18).fillPoints([{x:-62,y:8},{x:-19,y:-42},{x:43,y:-29},{x:68,y:15},{x:18,y:48},{x:-49,y:37}],true);
      graphics.fillStyle(0x6d35a8,.22).fillEllipse(18,14,84,33);
      graphics.lineStyle(9,0x9f63e8,.98).beginPath().arc(-27,7,53,2.45,5.82,false).strokePath();
      graphics.lineStyle(6,0xffefd0,.96).beginPath().arc(27,-8,73,-.72,1.72,false).strokePath();
      const fracture = this.add.polygon(3,-1,[0,-24,7,-7,25,-2,9,7,12,25,0,11,-17,20,-10,3,-27,-8,-6,-9],0xe5b3ff,.48).setStrokeStyle(3,0xffefd0,.96);
      weave.add([graphics,fracture]).setScale(.78).setRotation(-.3);
      this.friendlyAbilityFx.add(weave); weave.once(Phaser.GameObjects.Events.DESTROY,()=>this.friendlyAbilityFx.delete(weave));
      this.tweens.add({targets:weave,scale:1.2,angle:38,duration:420,ease:'Cubic.Out',onComplete:()=>this.tweens.add({targets:weave,scale:1.55,angle:74,alpha:0,duration:620,ease:'Cubic.In',onComplete:()=>weave.destroy()})});
    } else {
      for (let index=0;index<12;index+=1) { const angle=index*Math.PI/6; const root=this.add.polygon(x+Math.cos(angle)*24,y+Math.sin(angle)*18,[0,-18,6,7,0,13,-6,7],index%2?0x9def93:color,.76).setDepth(105).setRotation(angle+Math.PI/2); this.tweens.add({targets:root,x:x+Math.cos(angle)*132,y:y+Math.sin(angle)*104,scaleY:1.45,alpha:0,duration:560+index*12,ease:'Quad.Out',onComplete:()=>root.destroy()}); }
    }
    this.cameras.main.shake(220, 0.003);
  }

  private bossTelegraph(sx: number, sy: number, x: number, y: number, radius: number, duration: number, label: string): void {
    this.activeBossTelegraphs += 1;
    this.friendlyAbilityFx.forEach((effect)=>effect.setAlpha(Math.min(effect.alpha,.38)));
    const p1 = {x:Phaser.Math.Linear(sx,x,.28),y:Phaser.Math.Linear(sy,y,.28)-30};
    const p2 = {x:Phaser.Math.Linear(sx,x,.52),y:Phaser.Math.Linear(sy,y,.52)+23};
    const p3 = {x:Phaser.Math.Linear(sx,x,.76),y:Phaser.Math.Linear(sy,y,.76)-18};
    const path = this.add.graphics().setDepth(106).lineStyle(15,0x21120f,.78).beginPath().moveTo(sx,sy).lineTo(p1.x,p1.y).lineTo(p2.x,p2.y).lineTo(p3.x,p3.y).lineTo(x,y).strokePath();
    path.lineStyle(5,0xb52451,.9).beginPath().moveTo(sx,sy).lineTo(p1.x,p1.y).lineTo(p2.x,p2.y).lineTo(p3.x,p3.y).lineTo(x,y).strokePath();
    path.lineStyle(2,0xff7891,.72).beginPath().moveTo(sx,sy).lineTo(p1.x,p1.y).lineTo(p2.x,p2.y).lineTo(p3.x,p3.y).lineTo(x,y).strokePath();
    const branches = this.add.graphics().setDepth(105).lineStyle(9,0x21120f,.72).beginPath().moveTo(p1.x,p1.y).lineTo(p1.x-35,p1.y-25).strokePath().beginPath().moveTo(p2.x,p2.y).lineTo(p2.x+44,p2.y+20).strokePath().beginPath().moveTo(p3.x,p3.y).lineTo(p3.x-31,p3.y+29).strokePath();
    branches.lineStyle(3,0x8d2449,.78).beginPath().moveTo(p1.x,p1.y).lineTo(p1.x-35,p1.y-25).strokePath().beginPath().moveTo(p2.x,p2.y).lineTo(p2.x+44,p2.y+20).strokePath().beginPath().moveTo(p3.x,p3.y).lineTo(p3.x-31,p3.y+29).strokePath();
    const brackets = [0,1,2,3].map((index)=>{
      const start = -2.86 + index * Math.PI / 2;
      const curl = this.add.graphics().setPosition(x,y).setDepth(109);
      curl.lineStyle(10,0x24130f,.9).beginPath().arc(0,0,radius*.63,start,start+.78,false).strokePath();
      curl.lineStyle(3,0xd6325b,.94).beginPath().arc(0,0,radius*.63,start,start+.78,false).strokePath();
      const tipAngle = start + .78;
      curl.fillStyle(0x5d1f2d,.96).fillTriangle(Math.cos(tipAngle)*radius*.63,Math.sin(tipAngle)*radius*.63,Math.cos(tipAngle)*radius*.42,Math.sin(tipAngle)*radius*.42,Math.cos(tipAngle+.16)*radius*.55,Math.sin(tipAngle+.16)*radius*.55);
      return curl;
    });
    const roots = Array.from({length:7},(_,index)=>{ const angle=index/7*Math.PI*2; return this.add.polygon(x+Math.cos(angle)*18,y+Math.sin(angle)*14,[0,-5,5,0,0,22,-5,0],0x6d1a39,.84).setDepth(108).setRotation(angle+Math.PI/2); });
    const text = this.add.text(x, y - radius - 18, `${label}  ${duration.toFixed(1)}`, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffe6cf', stroke: '#4a0718', strokeThickness: 4 }).setOrigin(0.5).setDepth(110);
    const key = this.warningKey(x,y);
    let disposed = false;
    let timer: Phaser.Tweens.Tween | undefined;
    let pulse: Phaser.Tweens.Tween | undefined;
    let growth: Phaser.Tweens.Tween | undefined;
    const dispose = (impact: boolean) => {
      if (disposed) return;
      disposed = true;
      timer?.stop(); pulse?.stop(); growth?.stop();
      if (impact) this.flashImpact(x,y,0xff3b66,radius);
      [path,branches,text,...brackets,...roots].forEach((item)=>item.destroy());
      this.activeBossTelegraphs = Math.max(0,this.activeBossTelegraphs-1);
      this.bossTelegraphCancel.delete(key);
    };
    timer = this.tweens.addCounter({from:duration,to:0,duration:duration*1000,ease:'Linear',onUpdate:(tween)=>text.setText(`${label}  ${(tween.getValue() ?? 0).toFixed(1)}`),onComplete:()=>dispose(true)});
    pulse = this.tweens.add({targets:brackets,x:'+=0',scale:{from:.82,to:1.08},alpha:{from:.45,to:1},duration:280,yoyo:true,repeat:Math.ceil(duration/.56)});
    growth = this.tweens.add({targets:roots,scaleY:{from:.35,to:1.25},duration:duration*1000,ease:'Cubic.In'});
    this.bossTelegraphCancel.set(key,()=>dispose(false));
  }

  private warningKey(x:number,y:number):string { return `${Math.round(x)}:${Math.round(y)}`; }

  private disabledFx(x:number,y:number,duration:number):void {
    const shutter=this.add.rectangle(x,y-34,54,65,0x140b12,.2).setStrokeStyle(2,0x8e354b,.5).setDepth(112);
    const lockA=this.add.rectangle(x,y-35,51,5,0x32151a,.92).setStrokeStyle(1,0xc8455e,.84).setRotation(.48).setDepth(113);
    const lockB=this.add.rectangle(x,y-35,51,5,0x32151a,.92).setStrokeStyle(1,0xc8455e,.84).setRotation(-.48).setDepth(113);
    const label=this.add.text(x,y-91,`ROOTBOUND  ${duration.toFixed(1)}`,{fontFamily:'Trebuchet MS, sans-serif',fontSize:'12px',fontStyle:'bold',color:'#ffc3bf',stroke:'#360916',strokeThickness:4}).setOrigin(.5).setDepth(113);
    const roots=Array.from({length:6},(_,index)=>{const angle=index/6*Math.PI*2;return this.add.polygon(x+Math.cos(angle)*29,y+Math.sin(angle)*17,[0,-5,5,0,0,28,-5,0],0x6f1c38,.88).setDepth(111).setRotation(angle+Math.PI/2);});
    const recovery=this.add.graphics().setDepth(114);
    const drawRecovery=(ratio:number)=>{ recovery.clear(); for(let index=0;index<12;index+=1){ const active=index/12<ratio; recovery.lineStyle(4, active ? 0xff6b78 : 0x432129, active ? 0.92 : 0.34).beginPath().arc(x,y-28,49,-Math.PI/2+index*Math.PI/6,-Math.PI/2+index*Math.PI/6+.34,false).strokePath(); } };
    drawRecovery(1);
    this.tweens.addCounter({from:duration,to:0,duration:duration*1000,onUpdate:(tween)=>{ const remaining=tween.getValue()??0; label.setText(`ROOTBOUND  ${remaining.toFixed(1)}`); drawRecovery(remaining/duration); },onComplete:()=>{shutter.destroy();lockA.destroy();lockB.destroy();recovery.destroy();label.destroy();roots.forEach((root)=>root.destroy());this.flashImpact(x,y,0x9ff0c0,35);}});
    this.tweens.add({targets:shutter,alpha:{from:.38,to:.72},duration:420,yoyo:true,repeat:Math.ceil(duration/.84)});
  }

  private fadeDestroy(view: Phaser.GameObjects.Container): void {
    animateDefeatView(view, () => view.destroy());
  }
}
