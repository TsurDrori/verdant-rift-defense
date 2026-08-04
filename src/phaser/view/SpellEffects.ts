import Phaser from 'phaser';
import { ASSETS } from '../../game/assets/manifest';

export type HeroSpellEffectId = 'rift-quake' | 'warden-pulse' | 'starfall' | 'falling-constellation';

export interface SpellEffectCast {
  hero: 'kael' | 'lyra';
  spell: HeroSpellEffectId;
  source: { x: number; y: number };
  target: { x: number; y: number };
  radius: number;
  reducedMotion: boolean;
  suppressed?: boolean;
}

export interface SpellEffectDiagnostics {
  activeCasts: number;
  peakCasts: number;
  activeObjects: number;
  peakObjects: number;
  castsStarted: number;
  castsCompleted: number;
  castsDropped: number;
}

type SpellPhase = 'anticipation' | 'release' | 'impact' | 'aftermath';

interface ActiveSpell {
  root: Phaser.GameObjects.Container;
  owned: Set<Phaser.GameObjects.GameObject>;
  tweens: Set<Phaser.Tweens.Tween>;
  objectCount: number;
  finish: () => void;
}

const FULL_CAST_BUDGET = 4;

/**
 * Disposable, presentation-only hero spell rigs. The authoritative spell hit
 * has already happened when this director is called; every object here can be
 * culled without changing combat or delaying the simulation.
 */
export class SpellEffects {
  private readonly active: ActiveSpell[] = [];
  private serial = 0;
  private peakCasts = 0;
  private peakObjects = 0;
  private castsStarted = 0;
  private castsCompleted = 0;
  private castsDropped = 0;

  constructor(private readonly scene: Phaser.Scene) {
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
  }

  cast(config: SpellEffectCast): void {
    // A debug harness can fire spells much faster than their real cooldowns.
    // Keep the newest casts and retire the oldest rig rather than allowing a
    // presentation-only burst to threaten the fixed-step simulation.
    while (this.active.length >= FULL_CAST_BUDGET) {
      this.castsDropped += 1;
      this.active[0]?.finish();
    }

    const effect = config.spell === 'rift-quake' || config.spell === 'warden-pulse'
      ? this.verdantCast(config)
      : this.astralCast(config);
    this.active.push(effect);
    this.castsStarted += 1;
    this.peakCasts = Math.max(this.peakCasts, this.active.length);
    this.peakObjects = Math.max(this.peakObjects, this.getDiagnostics().activeObjects);
  }

  getDiagnostics(): SpellEffectDiagnostics {
    return {
      activeCasts: this.active.length,
      peakCasts: this.peakCasts,
      activeObjects: this.active.reduce((sum, effect) => sum + effect.objectCount, 0),
      peakObjects: this.peakObjects,
      castsStarted: this.castsStarted,
      castsCompleted: this.castsCompleted,
      castsDropped: this.castsDropped,
    };
  }

  suppressActive(alpha = 0.38): void {
    this.active.forEach((effect) => effect.root.setAlpha(Math.min(effect.root.alpha, alpha)));
  }

  dispose(): void {
    [...this.active].forEach((effect) => effect.finish());
  }

  private createScope(config: SpellEffectCast): ActiveSpell {
    const root = this.scene.add.container(config.target.x, config.target.y)
      .setName(`spell-fx:${config.spell}:${++this.serial}`)
      .setData('spell', config.spell)
      .setData('hero', config.hero)
      .setData('phase', 'anticipation' satisfies SpellPhase)
      // Keep the complete spell field below towers, enemies, heroes, and their
      // health bars. Sparse light still reads around silhouettes while combat
      // state remains legible at the exact impact frame.
      .setDepth(28)
      .setAlpha(config.suppressed ? 0.38 : 1);
    const tweens = new Set<Phaser.Tweens.Tween>();
    const owned = new Set<Phaser.GameObjects.GameObject>([root]);
    let finished = false;
    const scope: ActiveSpell = {
      root,
      owned,
      tweens,
      objectCount: 1,
      finish: () => {
        if (finished) return;
        finished = true;
        tweens.forEach((tween) => { tween.stop(); tween.remove(); });
        tweens.clear();
        owned.forEach((object) => {
          if (object.active) object.destroy(object instanceof Phaser.GameObjects.Container);
        });
        owned.clear();
        const index = this.active.indexOf(scope);
        if (index >= 0) this.active.splice(index, 1);
        this.castsCompleted += 1;
      },
    };
    return scope;
  }

  private track(scope: ActiveSpell, tween: Phaser.Tweens.Tween): Phaser.Tweens.Tween {
    scope.tweens.add(tween);
    return tween;
  }

  private finalizeScope(scope: ActiveSpell): ActiveSpell {
    scope.objectCount = [...scope.owned].reduce((sum, object) => sum + (object instanceof Phaser.GameObjects.Container ? this.countObjects(object) : 1), 0);
    return scope;
  }

  private own<T extends Phaser.GameObjects.GameObject>(scope: ActiveSpell, object: T): T {
    scope.owned.add(object);
    return object;
  }

  private countObjects(container: Phaser.GameObjects.Container): number {
    return 1 + container.list.reduce((total, child) => total + (child instanceof Phaser.GameObjects.Container ? this.countObjects(child) : 1), 0);
  }

  private phase(scope: ActiveSpell, phase: SpellPhase): void {
    if (scope.root.active) scope.root.setData('phase', phase);
  }

  private verdantCast(config: SpellEffectCast): ActiveSpell {
    const scope = this.createScope(config);
    const root = scope.root;
    const isPulse = config.spell === 'warden-pulse';
    const radius = Math.max(58, config.radius);
    const reduced = config.reducedMotion;
    const sourceX = config.source.x - config.target.x;
    const sourceY = config.source.y - config.target.y - 26;
    const ink = 0x071e1a;
    const jade = isPulse ? 0xa7f7c9 : 0x72f2ce;
    const gold = isPulse ? 0xffe59a : 0xd8ffb0;

    const fractureDecal = this.own(scope, this.scene.add.image(config.target.x, config.target.y + 4, ASSETS.vfx.riftQuakeFracture)
      .setName(`spell-ground-decal:${config.spell}`)
      .setData('readabilityLayer', 'beneath-actors')
      .setDisplaySize(radius * 2.04, radius * 1.31)
      .setRotation(((Math.round(config.target.x + config.target.y) % 9) - 4) * 0.065)
      .setDepth(27).setAlpha(0));
    const fractureScale = { x: fractureDecal.scaleX, y: fractureDecal.scaleY };
    fractureDecal.setScale(fractureScale.x * 0.58, fractureScale.y * 0.58);

    const ground = this.scene.add.ellipse(0, 8, radius * 1.62, radius * 0.66, ink, 0.2)
      .setStrokeStyle(1.5, jade, 0.18).setBlendMode(Phaser.BlendModes.MULTIPLY);
    const radiusWash = this.scene.add.ellipse(0, 0, radius * 2, radius * 1.28, jade, 0.018)
      .setStrokeStyle(1.5, jade, 0.46).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7).setAlpha(0);
    const sigil = this.scene.add.graphics();
    for (let index = 0; index < 7; index += 1) {
      const start = index / 7 * Math.PI * 2 + (index % 2) * 0.08;
      const points = [0, 0.13, 0.28].map((offset, pointIndex) => ({
        x: Math.cos(start + offset) * radius * (0.86 + pointIndex * 0.035),
        y: Math.sin(start + offset) * radius * (0.52 + (pointIndex % 2) * 0.035),
      }));
      sigil.lineStyle(4, ink, 0.55).strokePoints(points);
      sigil.lineStyle(1.4, index % 2 ? jade : gold, 0.68).strokePoints(points);
    }
    sigil.setScale(0.68).setAlpha(0);

    const runeLeaves = Array.from({ length: reduced ? 4 : 8 }, (_, index) => {
      const angle = index / (reduced ? 4 : 8) * Math.PI * 2;
      return this.scene.add.polygon(
        Math.cos(angle) * radius * 0.79,
        Math.sin(angle) * radius * 0.5,
        [0, -9, 6, -1, 2, 8, -5, 3],
        index % 2 ? jade : gold,
        0.92,
      ).setStrokeStyle(2, ink, 0.9).setRotation(angle + Math.PI / 2).setScale(0.55).setAlpha(0);
    });
    const wardGlyphs = isPulse ? Array.from({ length: reduced ? 3 : 6 }, (_, index) => {
      const angle = index / (reduced ? 3 : 6) * Math.PI * 2;
      const ward = this.scene.add.container(Math.cos(angle) * radius * 0.74, Math.sin(angle) * radius * 0.46)
        .setRotation(angle + Math.PI / 2).setScale(0.35).setAlpha(0).setName('warden-pulse:ward');
      const shadow = this.scene.add.polygon(0, 0, [0, -15, 13, -8, 10, 9, 0, 17, -10, 9, -13, -8], ink, 0.82);
      const plate = this.scene.add.polygon(0, 0, [0, -12, 10, -6, 8, 7, 0, 13, -8, 7, -10, -6], jade, 0.78)
        .setStrokeStyle(2, gold, 0.94).setBlendMode(Phaser.BlendModes.ADD);
      const seam = this.scene.add.rectangle(0, 0, 3, 15, gold, 0.92);
      ward.add([shadow, plate, seam]);
      return ward;
    }) : [];

    const sourceRune = this.scene.add.container(sourceX, sourceY).setAlpha(0).setScale(0.42);
    const sourceDisc = this.scene.add.circle(0, 0, 22, ink, 0.7).setStrokeStyle(3, jade, 0.92);
    const sourceMark = this.scene.add.polygon(0, 0, [0, -17, 6, -5, 17, 0, 6, 5, 0, 17, -6, 5, -17, 0, -6, -5], gold, 0.96)
      .setStrokeStyle(2, jade, 0.82);
    sourceRune.add([sourceDisc, sourceMark]);

    const conduit = this.scene.add.graphics().setAlpha(0);
    const bendX = Phaser.Math.Linear(sourceX, 0, 0.58);
    const bendY = Phaser.Math.Linear(sourceY, 0, 0.58) - 42;
    conduit.lineStyle(12, ink, 0.72).beginPath().moveTo(sourceX, sourceY).lineTo(bendX, bendY).lineTo(0, 0).strokePath();
    conduit.lineStyle(5, jade, 0.9).beginPath().moveTo(sourceX, sourceY).lineTo(bendX, bendY).lineTo(0, 0).strokePath();
    conduit.lineStyle(1.5, 0xffffff, 0.86).beginPath().moveTo(sourceX, sourceY).lineTo(bendX, bendY).lineTo(0, 0).strokePath();

    const core = this.scene.add.circle(0, 0, 9, 0xffffff, 0.58).setStrokeStyle(3, jade, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.12).setAlpha(0);
    const shockDark = this.scene.add.ellipse(0, 2, 34, 20, ink, 0.22).setStrokeStyle(5, ink, 0.54).setAlpha(0);
    const shock = this.scene.add.ellipse(0, 0, 32, 18, jade, 0.025).setStrokeStyle(2, gold, 0.7)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const impactBurst = this.scene.add.graphics().setAlpha(0).setScale(0.24);
    for (let index = 0; index < (reduced ? 5 : 9); index += 1) {
      const angle = index / (reduced ? 5 : 9) * Math.PI * 2 + (index % 3 - 1) * 0.12;
      const reach = radius * (0.64 + (index % 4) * 0.095);
      const points = [
        { x: (index % 2 - 0.5) * 8, y: (index % 3 - 1) * 4 },
        { x: Math.cos(angle - 0.14) * reach * 0.24, y: Math.sin(angle - 0.14) * reach * 0.16 },
        { x: Math.cos(angle + 0.09) * reach * 0.52, y: Math.sin(angle + 0.09) * reach * 0.34 },
        { x: Math.cos(angle - 0.05) * reach * 0.78, y: Math.sin(angle - 0.05) * reach * 0.5 },
        { x: Math.cos(angle + 0.07) * reach, y: Math.sin(angle + 0.07) * reach * 0.64 },
      ];
      impactBurst.lineStyle(index % 3 ? 7 : 10, ink, 0.78).strokePoints(points);
      impactBurst.lineStyle(index % 2 ? 2.2 : 3.2, index % 2 ? jade : gold, 0.84).strokePoints(points);
      const branchStart = points[2]!;
      const branchEnd = {
        x: branchStart.x + Math.cos(angle + (index % 2 ? 0.72 : -0.68)) * reach * 0.23,
        y: branchStart.y + Math.sin(angle + (index % 2 ? 0.72 : -0.68)) * reach * 0.15,
      };
      impactBurst.lineStyle(4, ink, 0.68).lineBetween(branchStart.x, branchStart.y, branchEnd.x, branchEnd.y);
      impactBurst.lineStyle(1.4, jade, 0.65).lineBetween(branchStart.x, branchStart.y, branchEnd.x, branchEnd.y);
    }
    const bladeCount = reduced ? (isPulse ? 4 : 6) : (isPulse ? 8 : 14);
    const rootBlades = Array.from({ length: bladeCount }, (_, index) => {
      const angle = index / bladeCount * Math.PI * 2;
      const endX = Math.cos(angle) * radius * (0.44 + (index % 3) * 0.12);
      const endY = Math.sin(angle) * radius * (0.28 + (index % 2) * 0.08);
      const blade = this.scene.add.polygon(0, 3, [0, -5, 12, -3, 24, 1, 9, 6, -5, 3], index % 3 === 0 ? gold : jade, 0.74)
        .setStrokeStyle(2, ink, 0.88).setRotation(angle).setScale(0.35).setAlpha(0)
        .setData('endX', endX).setData('endY', endY);
      return blade;
    });
    const fragments = Array.from({ length: reduced ? 4 : 10 }, (_, index) => {
      const angle = index / (reduced ? 4 : 10) * Math.PI * 2 + 0.17;
      return this.scene.add.polygon(0, 0, [0, -7, 5, 0, 0, 9, -5, 0], index % 2 ? jade : gold, 0.9)
        .setStrokeStyle(1, ink, 0.8).setData('endX', Math.cos(angle) * radius * (0.65 + (index % 3) * 0.12))
        .setData('endY', Math.sin(angle) * radius * 0.55 - 9 - (index % 2) * 10).setRotation(angle).setAlpha(0);
    });
    const motes = this.scene.add.particles(0, 0, '__DEFAULT', {
      emitting: false,
      lifespan: reduced ? 180 : Math.round(520 / Math.max(1, this.scene.tweens.timeScale)),
      speed: { min: 30, max: 92 },
      angle: { min: 185, max: 355 },
      gravityY: 115,
      scale: { start: reduced ? 0.022 : 0.038, end: 0 },
      alpha: { start: 0.72, end: 0 },
      tint: [jade, 0xb59b6a, 0x617451],
      blendMode: Phaser.BlendModes.NORMAL,
    });

    root.add([ground, radiusWash, sigil, ...runeLeaves, ...wardGlyphs, sourceRune, conduit, shockDark, shock, impactBurst, core, ...rootBlades, ...fragments, motes]);

    const anticipationMs = reduced ? 80 : 190;
    this.track(scope, this.scene.tweens.add({
      targets: [radiusWash, sigil], alpha: { from: 0, to: 1 }, scale: { from: 0.68, to: 1 }, duration: anticipationMs, ease: 'Cubic.Out',
      onComplete: () => {
        if (!root.active) return;
        this.phase(scope, 'release');
        runeLeaves.forEach((leaf, index) => this.track(scope, this.scene.tweens.add({
          targets: leaf, alpha: 1, scale: 1, angle: `${index % 2 ? '+=' : '-='}${reduced ? 18 : 42}`, duration: reduced ? 70 : 150, ease: 'Back.Out',
        })));
        wardGlyphs.forEach((ward, index) => this.track(scope, this.scene.tweens.add({
          targets: ward, alpha: 1, scale: 1, angle: `${index % 2 ? '+=' : '-='}${reduced ? 8 : 22}`,
          duration: reduced ? 65 : 150, ease: 'Back.Out',
        })));
        this.track(scope, this.scene.tweens.add({ targets: sourceRune, alpha: 1, scale: 1, duration: reduced ? 60 : 125, ease: 'Back.Out' }));
        this.track(scope, this.scene.tweens.add({
          targets: conduit, alpha: { from: 0, to: 1 }, duration: reduced ? 45 : 90, yoyo: true, hold: reduced ? 0 : 25,
          onComplete: () => {
            if (!root.active) return;
            this.phase(scope, 'impact');
            if (!reduced) this.scene.cameras.main.shake(150, isPulse ? 0.0018 : 0.0028, true);
            motes.explode(reduced ? 5 : 14);
            fractureDecal.setAlpha(config.suppressed ? 0.18 : (reduced ? 0.27 : 0.38));
            this.track(scope, this.scene.tweens.add({
              targets: fractureDecal,
              scaleX: { from: fractureScale.x * 0.58, to: fractureScale.x },
              scaleY: { from: fractureScale.y * 0.58, to: fractureScale.y },
              alpha: 0,
              duration: reduced ? 260 : 760,
              ease: 'Cubic.Out',
            }));
            core.setAlpha(1);
            shock.setAlpha(1);
            shockDark.setAlpha(0.82);
            impactBurst.setAlpha(1);
            rootBlades.forEach((blade) => blade.setAlpha(0.94));
            wardGlyphs.forEach((ward) => this.track(scope, this.scene.tweens.add({
              targets: ward, x: 0, y: 0, scale: reduced ? 1.15 : 1.45, alpha: 0,
              duration: reduced ? 160 : 430, ease: 'Cubic.In',
            })));
            fragments.forEach((fragment) => fragment.setAlpha(1));
            // The exact range perimeter is an anticipation affordance only.
            // Remove it on the impact frame so the rupture reads as terrain,
            // never as a clean targeting gauge left on top of the road.
            radiusWash.setAlpha(0);
            sigil.setAlpha(0);
            runeLeaves.forEach((leaf) => leaf.setAlpha(0));
            this.track(scope, this.scene.tweens.add({ targets: core, scale: reduced ? 1.4 : 1.9, alpha: 0, duration: reduced ? 90 : 165, ease: 'Expo.Out' }));
            this.track(scope, this.scene.tweens.add({ targets: shock, scaleX: radius / 18, scaleY: radius / 25, alpha: 0, duration: reduced ? 150 : 360, ease: 'Cubic.Out' }));
            this.track(scope, this.scene.tweens.add({ targets: shockDark, scaleX: radius / 14, scaleY: radius / 22, alpha: 0, duration: reduced ? 170 : 420, ease: 'Cubic.Out' }));
            this.track(scope, this.scene.tweens.add({ targets: impactBurst, scale: { from: 0.58, to: 1 }, alpha: 0, duration: reduced ? 210 : 620, ease: 'Quart.Out' }));
            rootBlades.forEach((blade, index) => this.track(scope, this.scene.tweens.add({
              targets: blade,
              x: blade.getData('endX') as number,
              y: blade.getData('endY') as number,
              scale: reduced ? 0.7 : 1,
              angle: `${index % 2 ? '+=' : '-='}${35 + index * 7}`,
              alpha: 0,
              duration: reduced ? 180 : 500,
              ease: 'Cubic.Out',
            })));
            fragments.forEach((fragment, index) => this.track(scope, this.scene.tweens.add({
              targets: fragment,
              x: fragment.getData('endX') as number,
              y: fragment.getData('endY') as number,
              angle: `${index % 2 ? '+=' : '-='}${90 + index * 13}`,
              alpha: 0,
              duration: reduced ? 140 : 470,
              ease: 'Quad.Out',
            })));
            this.track(scope, this.scene.tweens.add({
              targets: [ground, radiusWash, sigil, ...runeLeaves, ...wardGlyphs, sourceRune], alpha: 0,
              duration: reduced ? 210 : 640, ease: 'Sine.In',
              onStart: () => this.phase(scope, 'aftermath'),
              onComplete: scope.finish,
            }));
          },
        }));
      },
    }));

    return this.finalizeScope(scope);
  }

  private astralCast(config: SpellEffectCast): ActiveSpell {
    const scope = this.createScope(config);
    const root = scope.root;
    const isConstellation = config.spell === 'falling-constellation';
    const radius = Math.max(62, config.radius);
    const reduced = config.reducedMotion;
    const sourceX = config.source.x - config.target.x;
    const sourceY = config.source.y - config.target.y - 34;
    const voidInk = 0x170d2c;
    const violet = isConstellation ? 0xdcb4ff : 0xb469ff;
    const starlight = 0xfff0bc;

    const shardDecal = this.own(scope, this.scene.add.image(config.target.x, config.target.y + 2, ASSETS.vfx.starfallShards)
      .setName(`spell-ground-decal:${config.spell}`)
      .setData('readabilityLayer', 'beneath-actors')
      .setDisplaySize(radius * 2.05, radius * 1.46)
      .setRotation(isConstellation ? 0.08 : -0.06)
      .setDepth(27).setAlpha(0));
    const shardScale = { x: shardDecal.scaleX, y: shardDecal.scaleY };
    shardDecal.setScale(shardScale.x * 0.72, shardScale.y * 0.72);

    const pool = this.scene.add.ellipse(0, 8, radius * 1.7, radius * 0.76, 0x32124f, 0.075)
      .setStrokeStyle(1.5, violet, 0.34).setBlendMode(Phaser.BlendModes.ADD).setScale(0.64).setAlpha(0);
    const orbit = this.scene.add.graphics().setScale(0.66).setAlpha(0);
    orbit.lineStyle(3.5, voidInk, 0.48).beginPath().arc(0, 0, radius * 0.88, -2.85, -0.55, false).strokePath();
    orbit.lineStyle(1.5, violet, 0.7).beginPath().arc(0, 0, radius * 0.88, -2.85, -0.55, false).strokePath();
    orbit.lineStyle(3.5, voidInk, 0.48).beginPath().arc(0, 0, radius * 0.66, 0.15, 2.35, false).strokePath();
    orbit.lineStyle(1.5, starlight, 0.64).beginPath().arc(0, 0, radius * 0.66, 0.15, 2.35, false).strokePath();

    const starPoints = [
      { x: -radius * 0.5, y: radius * 0.14 },
      { x: -radius * 0.19, y: -radius * 0.42 },
      { x: radius * 0.13, y: -radius * 0.11 },
      { x: radius * 0.49, y: -radius * 0.34 },
      { x: radius * 0.38, y: radius * 0.28 },
      { x: -radius * 0.03, y: radius * 0.42 },
    ];
    const constellation = this.scene.add.graphics().setAlpha(0);
    constellation.lineStyle(3.5, voidInk, 0.5).strokePoints(starPoints, true);
    constellation.lineStyle(1, starlight, 0.58).strokePoints(starPoints, true);
    const stars = starPoints.slice(0, reduced ? 4 : 6).map((point, index) => this.scene.add.polygon(
      point.x, point.y,
      [0, -9, 3, -3, 9, 0, 3, 3, 0, 10, -3, 3, -9, 0, -3, -3],
      index % 2 ? violet : starlight,
      0.74,
    ).setStrokeStyle(1.5, voidInk, 0.78).setScale(0.2).setAlpha(0));
    const brandGlyphs = isConstellation ? Array.from({ length: 3 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
      const brand = this.scene.add.container(Math.cos(angle) * radius * 0.55, Math.sin(angle) * radius * 0.34)
        .setName('falling-constellation:brand').setScale(0.3).setAlpha(0);
      const seal = this.scene.add.circle(0, 0, 13, voidInk, 0.3).setStrokeStyle(1.5, violet, 0.7);
      const star = this.scene.add.polygon(0, 0, [0, -9, 3, -3, 9, 0, 3, 3, 0, 9, -3, 3, -9, 0, -3, -3], starlight, 0.74)
        .setStrokeStyle(1, violet, 0.72).setBlendMode(Phaser.BlendModes.ADD);
      const satellite = this.scene.add.circle(11, -9, 2, violet, 0.74).setBlendMode(Phaser.BlendModes.ADD);
      brand.add([seal, star, satellite]);
      return brand;
    }) : [];

    const tether = this.scene.add.graphics().setAlpha(0);
    const bendX = Phaser.Math.Linear(sourceX, 0, 0.54);
    const bendY = Phaser.Math.Linear(sourceY, 0, 0.54) - 52;
    tether.lineStyle(5, voidInk, 0.5).beginPath().moveTo(sourceX, sourceY).lineTo(bendX, bendY).lineTo(0, -12).strokePath();
    tether.lineStyle(1.8, violet, 0.72).beginPath().moveTo(sourceX, sourceY).lineTo(bendX, bendY).lineTo(0, -12).strokePath();

    const cometCount = reduced ? 3 : (isConstellation ? 7 : 5);
    const comets = Array.from({ length: cometCount }, (_, index) => {
      const angle = index / cometCount * Math.PI * 2 - Math.PI / 2;
      const endX = Math.cos(angle) * radius * (index % 2 ? 0.45 : 0.72);
      const endY = Math.sin(angle) * radius * 0.35;
      const comet = this.scene.add.container(endX + (index - cometCount / 2) * 13, -245 - (index % 3) * 35).setAlpha(0);
      const tailDark = this.scene.add.polygon(0, -18, [-4, 18, 0, -38, 4, 18], voidInk, 0.52);
      const tail = this.scene.add.polygon(0, -17, [-2, 17, 0, -34, 2, 17], index % 2 ? violet : starlight, 0.68)
        .setBlendMode(Phaser.BlendModes.ADD);
      const head = this.scene.add.polygon(0, 0, [0, -7, 3, -2, 7, 0, 3, 2, 0, 7, -3, 2, -7, 0, -3, -2], index % 2 ? violet : starlight, 0.82)
        .setStrokeStyle(1.5, violet, 0.74).setBlendMode(Phaser.BlendModes.ADD);
      comet.add([tailDark, tail, head]).setData('endX', endX).setData('endY', endY);
      return comet;
    });

    const impactHalo = this.scene.add.circle(0, 0, 9, starlight, 0.06).setStrokeStyle(2, starlight, 0.62)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(0);
    const lensRing = this.scene.add.ellipse(0, 0, 32, 19, violet, 0.025).setStrokeStyle(2, violet, 0.64)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const starburst = this.scene.add.graphics().setAlpha(0);
    for (let index = 0; index < (reduced ? 6 : 12); index += 1) {
      const angle = index / (reduced ? 6 : 12) * Math.PI * 2;
      const inner = index % 2 ? 13 : 7;
      const outer = radius * (index % 3 ? 0.8 : 1.03);
      starburst.lineStyle(index % 3 ? 1.4 : 2.5, index % 2 ? violet : starlight, 0.58)
        .lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.7, Math.cos(angle) * outer, Math.sin(angle) * outer * 0.7);
    }
    const peripheralImpacts = comets.map((comet, index) => {
      const x = comet.getData('endX') as number;
      const y = comet.getData('endY') as number;
      return this.scene.add.circle(x, y, 7 + (index % 2) * 2, violet, 0.025)
        .setStrokeStyle(1.5, index % 2 ? violet : starlight, 0.72)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    });
    const motes = this.scene.add.particles(0, 0, '__DEFAULT', {
      emitting: false,
      lifespan: reduced ? 180 : Math.round(620 / Math.max(1, this.scene.tweens.timeScale)),
      speed: { min: 30, max: 96 },
      scale: { start: reduced ? 0.02 : 0.033, end: 0 },
      alpha: { start: 0.66, end: 0 },
      tint: [violet, starlight, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    });

    root.add([pool, orbit, constellation, ...stars, ...brandGlyphs, tether, ...comets, ...peripheralImpacts, starburst, lensRing, impactHalo, motes]);

    const anticipationMs = reduced ? 90 : 230;
    this.track(scope, this.scene.tweens.add({
      targets: [pool, orbit], alpha: { from: 0, to: 0.58 }, scale: 1, angle: reduced ? 0 : -12, duration: anticipationMs, ease: 'Cubic.Out',
      onComplete: () => {
        if (!root.active) return;
        stars.forEach((star, index) => this.track(scope, this.scene.tweens.add({ targets: star, alpha: 0.72, scale: 0.68, delay: reduced ? 0 : index * 18, duration: reduced ? 50 : 115, ease: 'Back.Out' })));
        brandGlyphs.forEach((brand, index) => this.track(scope, this.scene.tweens.add({
          targets: brand, alpha: 1, scale: 1, angle: `${index % 2 ? '+=' : '-='}${reduced ? 12 : 32}`,
          delay: reduced ? 0 : index * 30, duration: reduced ? 60 : 145, ease: 'Back.Out',
        })));
        this.track(scope, this.scene.tweens.add({
          targets: constellation, alpha: 0.48, duration: reduced ? 45 : 115,
          onComplete: () => {
            if (!root.active) return;
            this.phase(scope, 'release');
            tether.setAlpha(1);
            this.track(scope, this.scene.tweens.add({ targets: tether, alpha: 0, duration: reduced ? 80 : 210, ease: 'Sine.In' }));
            comets.forEach((comet, index) => this.track(scope, this.scene.tweens.add({
              targets: comet,
              x: comet.getData('endX') as number,
              y: comet.getData('endY') as number,
              alpha: { from: 0, to: 1 },
              delay: reduced ? 0 : index * 24,
              duration: reduced ? 90 : 190,
              ease: 'Quint.In',
              onComplete: index === comets.length - 1 ? () => {
                if (!root.active) return;
                this.phase(scope, 'impact');
                if (!reduced) this.scene.cameras.main.shake(120, isConstellation ? 0.0025 : 0.0018, true);
                motes.explode(reduced ? 5 : (isConstellation ? 14 : 11));
                shardDecal.setAlpha(config.suppressed ? 0.14 : (reduced ? 0.2 : 0.29));
                this.track(scope, this.scene.tweens.add({
                  targets: shardDecal,
                  scaleX: { from: shardScale.x * 0.72, to: shardScale.x },
                  scaleY: { from: shardScale.y * 0.72, to: shardScale.y },
                  alpha: 0,
                  duration: reduced ? 260 : 680, ease: 'Cubic.Out',
                }));
                starburst.setAlpha(1);
                lensRing.setAlpha(1);
                impactHalo.setAlpha(1);
                if (!isConstellation) {
                  // Starfall resolves as separate meteor bodies around the
                  // target. Clear the navigation-like constellation scaffold
                  // on contact instead of letting a bright crown cover units.
                  pool.setAlpha(0);
                  orbit.setAlpha(0);
                  constellation.setAlpha(0);
                  stars.forEach((star) => star.setAlpha(0));
                }
                peripheralImpacts.forEach((impact, index) => {
                  impact.setAlpha(0.76);
                  this.track(scope, this.scene.tweens.add({
                    targets: impact, scale: reduced ? 1.55 : 2.25, alpha: 0,
                    delay: reduced ? 0 : index * 13, duration: reduced ? 120 : 280, ease: 'Cubic.Out',
                  }));
                });
                brandGlyphs.forEach((brand, index) => this.track(scope, this.scene.tweens.add({
                  targets: brand, scale: reduced ? 1.25 : 1.7, angle: `${index % 2 ? '+=' : '-='}${reduced ? 20 : 95}`, alpha: 0,
                  duration: reduced ? 150 : 440, ease: 'Cubic.Out',
                })));
                this.track(scope, this.scene.tweens.add({ targets: [...comets, ...(isConstellation ? [constellation, ...stars] : [])], alpha: 0, duration: reduced ? 75 : 150, ease: 'Sine.In' }));
                this.track(scope, this.scene.tweens.add({ targets: impactHalo, scale: reduced ? 1.6 : 2.2, alpha: 0, duration: reduced ? 100 : 190, ease: 'Expo.Out' }));
                this.track(scope, this.scene.tweens.add({ targets: lensRing, scaleX: radius / 18, scaleY: radius / 25, alpha: 0, angle: reduced ? 0 : 35, duration: reduced ? 170 : 420, ease: 'Cubic.Out' }));
                this.track(scope, this.scene.tweens.add({ targets: starburst, scale: { from: 0.35, to: 1 }, alpha: 0, duration: reduced ? 170 : 430, ease: 'Quart.Out' }));
                this.track(scope, this.scene.tweens.add({
                  targets: [pool, orbit, ...brandGlyphs], alpha: 0,
                  duration: reduced ? 230 : 560, ease: 'Sine.In',
                  onStart: () => this.phase(scope, 'aftermath'),
                  onComplete: scope.finish,
                }));
              } : undefined,
            })));
          },
        }));
      },
    }));

    return this.finalizeScope(scope);
  }
}
