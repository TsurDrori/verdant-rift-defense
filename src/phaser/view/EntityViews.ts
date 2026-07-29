import Phaser from 'phaser';
import { ASSETS } from '../../game/assets/manifest';
import { ENEMIES } from '../../game/content/enemies';
import { TOWERS } from '../../game/content/towers';
import type { EnemyId, HeroId, TowerBranch, TowerId } from '../../game/content/types';
import type { DefenderState, EnemyState, HeroState, TowerState } from '../../game/simulation/state';
import {
  DEFENDER_MOTION,
  ENEMY_MOTION,
  HERO_MOTION,
  TOWER_MOTION,
  canInterruptAnimation,
  phaseFrame,
  presentationSeed,
  type AnimationState,
  type CharacterMotionProfile,
} from './AnimationProfiles';

const towerRankTextures: Record<TowerId, string> = ASSETS.towerRanks;
const towerBranchTextures: Record<TowerId, string> = ASSETS.towerBranches;
const enemyActionTextures: Record<EnemyId, string> = ASSETS.enemyActions;
const heroActionTextures: Record<HeroId, string> = ASSETS.heroActions;
const towerRankHeights: Record<TowerId, readonly [number, number, number]> = {
  thorn: [104, 116, 128],
  ember: [98, 110, 122],
  aegis: [100, 112, 124],
  astral: [104, 117, 130],
};
const towerBranchHeights: Record<TowerId, number> = {
  thorn: 140,
  ember: 132,
  aegis: 134,
  astral: 142,
};
const enemyHeights: Record<EnemyId, number> = { skitter: 42, marauder: 57, wisp: 54, brute: 92, bloomlord: 142 };
const enemyFrameLayouts: Record<EnemyId, { displayHeight: number; y: number }> = {
  skitter: { displayHeight: 44, y: 13 },
  marauder: { displayHeight: 58, y: 13 },
  wisp: { displayHeight: 56, y: 5 },
  brute: { displayHeight: 98, y: 14 },
  bloomlord: { displayHeight: 148, y: 16 },
};

const ACTION_TOKEN = 'animationActionToken';
const VIEW_TIMERS = 'ownedViewTimers';

function viewObjects(root: Phaser.GameObjects.Container): Phaser.GameObjects.GameObject[] {
  const objects: Phaser.GameObjects.GameObject[] = [root];
  const visit = (container: Phaser.GameObjects.Container): void => {
    for (const child of container.list) {
      objects.push(child);
      if (child instanceof Phaser.GameObjects.Container) visit(child);
    }
  };
  visit(root);
  return objects;
}

function cancelViewActivity(container: Phaser.GameObjects.Container): void {
  // Phaser destroys container children but intentionally does not remove
  // TweenManager entries that target them. Kill every descendant target before
  // destruction so infinite idle/aura loops cannot survive as detached work.
  for (const object of viewObjects(container)) {
    container.scene.tweens.killTweensOf(object);
    const fx = (object as Phaser.GameObjects.GameObject & { preFX?: { clear(): void } }).preFX;
    fx?.clear();
  }
  const timers = container.getData(VIEW_TIMERS) as Set<Phaser.Time.TimerEvent> | undefined;
  timers?.forEach((timer) => timer.remove(false));
  timers?.clear();
  container.setData(ACTION_TOKEN, (Number(container.getData(ACTION_TOKEN)) || 0) + 1);
}

function installViewScope(container: Phaser.GameObjects.Container): void {
  container.setData(VIEW_TIMERS, new Set<Phaser.Time.TimerEvent>());
  container.once(Phaser.GameObjects.Events.DESTROY, () => cancelViewActivity(container));
}

/** Fully releases renderer-owned activity before the scene destroys a view. */
export function disposeEntityView(container: Phaser.GameObjects.Container): void {
  cancelViewActivity(container);
  for (const object of viewObjects(container)) object.removeAllListeners();
}

function presentationDelay(scene: Phaser.Scene, duration: number): number {
  return duration / Math.max(0.25, scene.tweens.timeScale || 1);
}

function beginAction(container: Phaser.GameObjects.Container, duration: number, nextState: AnimationState = 'attack'): number {
  const currentState = (container.getData('animationState') as AnimationState | undefined) ?? 'idle';
  const currentUntil = Number(container.getData('animationStateUntil')) || 0;
  if (!canInterruptAnimation(currentState, nextState, currentUntil, container.scene.time.now)) return -1;
  const token = (Number(container.getData(ACTION_TOKEN)) || 0) + 1;
  container.setData(ACTION_TOKEN, token);
  const until = container.scene.time.now + presentationDelay(container.scene, duration);
  container.setData('poseLockUntil', until);
  container.setData('animationState', nextState);
  container.setData('animationStateUntil', until);
  return token;
}

function actionIsCurrent(container: Phaser.GameObjects.Container, token: number): boolean {
  return container.active && container.getData(ACTION_TOKEN) === token;
}

function actionCall(container: Phaser.GameObjects.Container, token: number, delay: number, callback: () => void): void {
  const timers = container.getData(VIEW_TIMERS) as Set<Phaser.Time.TimerEvent> | undefined;
  let timer: Phaser.Time.TimerEvent;
  timer = container.scene.time.delayedCall(presentationDelay(container.scene, delay), () => {
    timers?.delete(timer);
    if (actionIsCurrent(container, token)) callback();
  });
  timers?.add(timer);
}

function resetRig(rig: Phaser.GameObjects.Container): void {
  rig.setPosition(0, 0).setAngle(0).setScale(1).setAlpha(1);
}

function resetPassiveRig(container: Phaser.GameObjects.Container): void {
  const idleRig = container.getData('idleRig') as Phaser.GameObjects.Container;
  idleRig?.setPosition(0, Number(container.getData('motionBaseY')) || 0).setAngle(0).setScale(1);
}

function makeMotionAccent(scene: Phaser.Scene, color: number, y: number, size: number): Phaser.GameObjects.Polygon {
  return scene.add.polygon(0, y, [
    -size, -2, -size * 0.22, -1, size, -7, size * 0.42, 0,
    size, 7, -size * 0.22, 1,
  ], color, 0).setStrokeStyle(1, 0xfff6db, 0).setBlendMode(Phaser.BlendModes.ADD);
}

function updateCharacterLocomotion(
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  moving: boolean,
  profile: CharacterMotionProfile,
): void {
  if (container.scene.time.now < (Number(container.getData('poseLockUntil')) || 0)) return;
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const idleRig = container.getData('idleRig') as Phaser.GameObjects.Container;
  const lastX = Number(container.getData('lastWorldX')) || x;
  const lastY = Number(container.getData('lastWorldY')) || y;
  const distance = Math.hypot(x - lastX, y - lastY);
  const baseY = Number(container.getData('motionBaseY')) || 0;
  let gaitPhase = Number(container.getData('gaitPhase')) || 0;

  if (moving) {
    container.setData('animationState', 'locomotion');
    // Distance-driven phase keeps feet synchronized with travel at both 1x and
    // 2x simulation speed instead of making actors skate across the lane.
    gaitPhase += distance * profile.locomotion.stride;
    const wave = Math.sin(gaitPhase);
    const plant = Math.abs(Math.sin(gaitPhase));
    const verticalDirection = distance > 0 ? Phaser.Math.Clamp((y - lastY) / distance, -1, 1) : 0;
    const travelLean = verticalDirection * (sprite.flipX ? -1 : 1) * 2.4;
    sprite.setFrame(phaseFrame(gaitPhase));
    idleRig.setPosition(-verticalDirection * 0.9, baseY - plant * profile.locomotion.bob);
    idleRig.setAngle(wave * profile.locomotion.sway + travelLean);
    idleRig.setScale(
      1 + plant * profile.locomotion.stretch - Math.abs(verticalDirection) * 0.012,
      1 - plant * profile.locomotion.stretch * 0.48 + Math.abs(verticalDirection) * 0.018,
    );
  } else {
    container.setData('animationState', 'idle');
    const seed = Number(container.getData('presentationSeed')) || 0;
    const clock = container.scene.time.now + seed * profile.locomotion.idlePeriod * 5;
    const breath = Math.sin(clock / profile.locomotion.idlePeriod * Math.PI * 2);
    const counter = Math.sin(clock / (profile.locomotion.idlePeriod * 2.37) * Math.PI * 2);
    // A brief deterministic alert shift every few breaths prevents a formation
    // of idle units from moving like synchronized metronomes.
    const alertPhase = (clock % (profile.locomotion.idlePeriod * 4.7)) / (profile.locomotion.idlePeriod * 4.7);
    const alert = alertPhase > 0.83 && alertPhase < 0.9 ? Math.sin((alertPhase - 0.83) / 0.07 * Math.PI) : 0;
    sprite.setFrame(alert > 0.35 ? 1 : 0);
    idleRig.setPosition(alert * (sprite.flipX ? -1.4 : 1.4), baseY - breath * profile.locomotion.idleBreath * 16 - alert * 0.8);
    idleRig.setAngle(counter * profile.locomotion.idleSway + alert * (sprite.flipX ? -1.2 : 1.2));
    idleRig.setScale(1 + breath * profile.locomotion.idleBreath * 0.28, 1 + breath * profile.locomotion.idleBreath);
  }
  container.setData('gaitPhase', gaitPhase);
}

function animateCharacterAttack(container: Phaser.GameObjects.Container, profile: CharacterMotionProfile): void {
  const rig = container.getData('actionRig') as Phaser.GameObjects.Container;
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const accent = container.getData('motionAccent') as Phaser.GameObjects.Polygon | undefined;
  const total = profile.combat.windup + profile.combat.impact + profile.combat.recovery;
  const token = beginAction(container, total);
  if (token < 0) return;
  const serial = (Number(container.getData('actionSerial')) || 0) + 1;
  container.setData('actionSerial', serial);
  const direction = sprite.flipX ? -1 : 1;
  const variation = serial % 2 ? 1 : -1;
  const motion = profile.combat;

  container.scene.tweens.killTweensOf(rig);
  if (accent) container.scene.tweens.killTweensOf(accent);
  resetRig(rig);
  resetPassiveRig(container);
  sprite.setFrame(motion.anticipationFrame);
  container.scene.tweens.add({
    targets: rig,
    x: -direction * motion.pull,
    y: motion.lift,
    angle: -direction * motion.anticipationAngle,
    scaleX: 0.96,
    scaleY: 1.045,
    duration: motion.windup,
    ease: 'Cubic.InOut',
  });

  actionCall(container, token, motion.windup, () => {
    sprite.setFrame(motion.impactFrame);
    if (accent) {
      const accentColor = Number(container.getData('motionAccentColor')) || 0xffffff;
      accent.setFillStyle(accentColor, 0.8).setStrokeStyle(1, 0xfff6db, 0.5);
      accent.setAlpha(0.8).setScale(direction * 0.34, 0.72 + variation * 0.06).setAngle(direction * (variation * 7));
      container.scene.tweens.add({ targets: accent, alpha: 0, scaleX: direction * 1.28, scaleY: 1.02, duration: motion.impact + 85, ease: 'Quad.Out' });
    }
    container.scene.tweens.killTweensOf(rig);
    container.scene.tweens.add({
      targets: rig,
      x: direction * motion.travel,
      y: -motion.lift * 0.35,
      angle: direction * (motion.impactAngle + variation * 0.8),
      scaleX: 1.085,
      scaleY: 0.92,
      duration: motion.impact,
      ease: 'Expo.Out',
    });
  });

  actionCall(container, token, motion.windup + motion.impact, () => {
    sprite.setFrame(motion.recoveryFrame);
    container.scene.tweens.killTweensOf(rig);
    container.scene.tweens.add({
      targets: rig,
      x: 0,
      y: 0,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      duration: motion.recovery,
      ease: 'Back.Out',
    });
  });

  actionCall(container, token, total, () => {
    sprite.setFrame(0);
    resetRig(rig);
    container.setData('animationState', 'idle');
    container.setData('animationStateUntil', container.scene.time.now);
  });
}

function animateCharacterHit(container: Phaser.GameObjects.Container, profile: CharacterMotionProfile): void {
  const rig = container.getData('actionRig') as Phaser.GameObjects.Container;
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const accent = container.getData('motionAccent') as Phaser.GameObjects.Polygon | undefined;
  const duration = 175 + profile.combat.hitWeight * 11;
  const token = beginAction(container, duration, 'hit');
  if (token < 0) return;
  const away = sprite.flipX ? 1 : -1;
  container.scene.tweens.killTweensOf(rig);
  if (accent) container.scene.tweens.killTweensOf(accent);
  resetRig(rig);
  resetPassiveRig(container);
  sprite.setFrame(7);
  if (accent) {
    accent.setFillStyle(0xff786b, 0.76).setStrokeStyle(1, 0xffe4c4, 0.56).setAlpha(0.72).setScale(away * 0.22, 0.22);
    container.scene.tweens.add({ targets: accent, alpha: 0, scaleX: away * 0.82, scaleY: 1.15, duration: 140, ease: 'Quad.Out' });
  }
  container.scene.tweens.add({
    targets: rig,
    x: away * profile.combat.hitWeight,
    y: -Math.min(4.5, profile.combat.hitWeight * 0.42),
    angle: away * Math.min(8, profile.combat.hitWeight * 0.8),
    scaleX: 0.93,
    scaleY: 1.06,
    duration: 58,
    yoyo: true,
    hold: Math.min(36, profile.combat.hitWeight * 3),
    ease: 'Expo.Out',
    onComplete: () => {
      if (!actionIsCurrent(container, token)) return;
      container.scene.tweens.add({ targets: rig, x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, duration: 105, ease: 'Back.Out' });
    },
  });
  actionCall(container, token, duration, () => {
    sprite.setFrame(0);
    resetRig(rig);
    container.setData('animationState', 'idle');
    container.setData('animationStateUntil', container.scene.time.now);
  });
}

function animateCharacterDefeat(container: Phaser.GameObjects.Container, profile: CharacterMotionProfile): void {
  const rig = container.getData('actionRig') as Phaser.GameObjects.Container;
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const accent = container.getData('motionAccent') as Phaser.GameObjects.Polygon | undefined;
  const token = beginAction(container, 900, 'death');
  if (token < 0) return;
  const away = sprite.flipX ? 1 : -1;
  container.scene.tweens.killTweensOf(rig);
  if (accent) container.scene.tweens.killTweensOf(accent);
  resetPassiveRig(container);
  sprite.setFrame(8);
  actionCall(container, token, 155, () => sprite.setFrame(9));
  if (accent) {
    accent.setFillStyle(0xff645d, 0.48).setAlpha(0.54).setScale(0.2);
    container.scene.tweens.add({ targets: accent, alpha: 0, scale: 1.22, duration: 260, ease: 'Quad.Out' });
  }
  container.scene.tweens.add({
    targets: rig,
    x: away * Math.min(11, profile.combat.hitWeight * 1.15),
    y: 5,
    angle: away * Math.min(13, profile.combat.hitWeight * 1.2),
    scaleX: 1.04,
    scaleY: 0.82,
    alpha: 0.26,
    duration: 340,
    ease: 'Cubic.Out',
    onComplete: () => {
      if (actionIsCurrent(container, token)) container.setData('poseLockUntil', Number.POSITIVE_INFINITY);
    },
  });
}

function animateCharacterRespawn(container: Phaser.GameObjects.Container): void {
  const rig = container.getData('actionRig') as Phaser.GameObjects.Container;
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const token = beginAction(container, 480, 'respawn');
  if (token < 0) return;
  container.scene.tweens.killTweensOf(rig);
  sprite.setFrame(10);
  rig.setPosition(0, 7).setAngle(0).setScale(0.72).setAlpha(0.18);
  container.scene.tweens.add({ targets: rig, x: 0, y: 0, scale: 1, alpha: 1, duration: 480, ease: 'Back.Out', onComplete: () => { if (actionIsCurrent(container, token)) { sprite.setFrame(0); container.setData('animationState', 'idle'); } } });
}

/** A presentation-only exit used by the scene after the simulation removes an actor. */
export function animateDefeatView(container: Phaser.GameObjects.Container, onComplete: () => void): void {
  if (container.getData('exitAnimating')) return;
  container.setData('exitAnimating', true);
  cancelViewActivity(container);
  const type = container.getData('enemyType') as EnemyId | undefined;
  const profile = type ? ENEMY_MOTION[type] : DEFENDER_MOTION;
  animateCharacterDefeat(container, profile);
  container.scene.tweens.killTweensOf(container);
  container.scene.tweens.add({
    targets: container,
    alpha: 0,
    scale: type === 'wisp' ? 0.28 : 0.72,
    y: container.y + (type === 'wisp' ? -18 : 7),
    duration: type === 'bloomlord' ? 520 : 340,
    ease: 'Cubic.In',
    onComplete: () => {
      disposeEntityView(container);
      onComplete();
    },
  });
}

function fitFrameToHeight(sprite: Phaser.GameObjects.Image, height: number): void {
  const frame = sprite.frame;
  sprite.setDisplaySize(frame.realWidth / frame.realHeight * height, height);
}

function setTowerVisual(sprite: Phaser.GameObjects.Image, tower: TowerState): number {
  if (tower.branch) {
    sprite.setTexture(towerBranchTextures[tower.type], tower.branch === 'left' ? 0 : 1);
    const height = towerBranchHeights[tower.type];
    fitFrameToHeight(sprite, height);
    return height;
  }
  const rank = Phaser.Math.Clamp(tower.level, 1, 3) as 1 | 2 | 3;
  sprite.setTexture(towerRankTextures[tower.type], rank - 1);
  const height = towerRankHeights[tower.type][rank - 1]!;
  fitFrameToHeight(sprite, height);
  return height;
}

function towerMuzzlePoint(type: TowerId, height: number): { x: number; y: number } {
  if (type === 'thorn') return { x: 13, y: -height + 35 };
  if (type === 'ember') return { x: 0, y: -height + 30 };
  if (type === 'aegis') return { x: 0, y: -height * 0.52 };
  return { x: 0, y: -height * 0.7 };
}

function makeTowerApparatus(scene: Phaser.Scene, type: TowerId, branch: TowerBranch): Phaser.GameObjects.Container {
  const color = TOWERS[type].branches[branch].color;
  const rig = scene.add.container(0, 0).setVisible(false).setAlpha(0.36);
  const animations: Array<() => void> = [];
  if (type === 'thorn' && branch === 'left') {
    const halo = scene.add.arc(0, 0, 27, 205, 335, false, color, 0).setStrokeStyle(4, color, 0.85);
    const leaves = [-20, 0, 20].map((x, index) => scene.add.polygon(x, -5 - Math.abs(index - 1) * 4, [0, -8, 5, 0, 0, 8, -5, 0], color, 0.92).setRotation((index - 1) * 0.35));
    rig.add([halo, ...leaves]);
    animations.push(() => { scene.tweens.add({ targets: leaves, y: '-=2', angle: '+=7', duration: 760, delay: scene.tweens.stagger(100, {}), yoyo: true, repeat: -1, ease: 'Sine.InOut' }); });
  } else if (type === 'thorn') {
    const arrows = [-1, 1].map((side) => scene.add.polygon(side * 25, 0, [side * -12, -4, side * 4, -4, side * 4, -9, side * 15, 0, side * 4, 9, side * 4, 4, side * -12, 4], color, 0.94).setStrokeStyle(1, 0xfff0ae, 0.72));
    rig.add(arrows);
    animations.push(() => { scene.tweens.add({ targets: arrows, x: (target: Phaser.GameObjects.Polygon) => target.x + Math.sign(target.x) * 4, duration: 470, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); });
  } else if (type === 'ember' && branch === 'left') {
    const vents = [-24, 24].map((x) => scene.add.polygon(x, 1, [0, -13, 7, -2, 4, 10, 0, 5, -4, 10, -7, -2], color, 0.84).setBlendMode(Phaser.BlendModes.ADD));
    rig.add(vents);
    animations.push(() => { scene.tweens.add({ targets: vents, scaleY: { from: 0.78, to: 1.18 }, alpha: { from: 0.55, to: 1 }, duration: 380, delay: scene.tweens.stagger(90, {}), yoyo: true, repeat: -1 }); });
  } else if (type === 'ember') {
    const coil = scene.add.circle(0, 1, 20, 0x09252e, 0.7).setStrokeStyle(4, color, 0.92);
    const spokes = [0, 60, 120].map((angle) => scene.add.rectangle(0, 1, 42, 3, color, 0.86).setRotation(Phaser.Math.DegToRad(angle)));
    rig.add([coil, ...spokes]);
    animations.push(() => { scene.tweens.add({ targets: spokes, angle: '+=360', duration: 3400, repeat: -1 }); });
  } else if (type === 'aegis' && branch === 'left') {
    const shields = [-27, 27].map((x) => scene.add.polygon(x, 1, [0, -13, 10, -7, 8, 8, 0, 15, -8, 8, -10, -7], color, 0.9).setStrokeStyle(2, 0xe8fff0, 0.72));
    rig.add(shields);
    animations.push(() => { scene.tweens.add({ targets: shields, scale: { from: 0.9, to: 1.08 }, alpha: { from: 0.68, to: 1 }, duration: 820, yoyo: true, repeat: -1, ease: 'Sine.InOut' }); });
  } else if (type === 'aegis') {
    const command = [-13, 0, 13].map((x, index) => scene.add.polygon(x, -index * 3, [-7, -5, 1, 0, -7, 5, -2, 0, 7, 0], color, 0.94).setStrokeStyle(1, 0xf2ffff, 0.78));
    rig.add(command);
    animations.push(() => { scene.tweens.add({ targets: command, y: '-=4', alpha: { from: 0.45, to: 1 }, duration: 520, delay: scene.tweens.stagger(110, {}), yoyo: true, repeat: -1 }); });
  } else if (type === 'astral' && branch === 'left') {
    const orbit = scene.add.arc(0, 0, 28, 0, 360, false, color, 0).setStrokeStyle(2, color, 0.65);
    const moons = [-22, 22].map((x) => scene.add.circle(x, 0, 5, color, 0.95).setStrokeStyle(1, 0xffffff, 0.75).setBlendMode(Phaser.BlendModes.ADD));
    rig.add([orbit, ...moons]);
    animations.push(() => { scene.tweens.add({ targets: rig, angle: 360, duration: 4200, repeat: -1 }); });
  } else {
    const fins = [-1, 1].map((side) => scene.add.polygon(side * 25, 1, [0, -15, side * 8, -3, side * 5, 14, side * -5, 7, side * -7, -6], color, 0.9).setStrokeStyle(2, 0xeaffff, 0.72).setBlendMode(Phaser.BlendModes.ADD));
    const core = scene.add.polygon(0, 0, [0, -11, 8, 0, 0, 11, -8, 0], color, 0.88).setBlendMode(Phaser.BlendModes.ADD);
    rig.add([...fins, core]);
    animations.push(() => { scene.tweens.add({ targets: [core, ...fins], scale: { from: 0.82, to: 1.1 }, alpha: { from: 0.58, to: 1 }, duration: 640, delay: scene.tweens.stagger(90, {}), yoyo: true, repeat: -1 }); });
  }
  rig.setData('activateApparatus', () => {
    if (rig.getData('apparatusActive')) return;
    rig.setData('apparatusActive', true);
    animations.forEach((start) => start());
  });
  return rig;
}

function activateTowerApparatus(rig: Phaser.GameObjects.Container): void {
  (rig.getData('activateApparatus') as (() => void) | undefined)?.();
}

function makeTowerMechanism(scene: Phaser.Scene, type: TowerId, color: number): Phaser.GameObjects.Container {
  const rig = scene.add.container(0, 0).setAlpha(0.72);
  if (type === 'thorn') {
    const string = scene.add.rectangle(0, 1, 37, 1.5, 0xfff1c4, 0.68);
    const nock = scene.add.polygon(0, 0, [-5, -3, 7, 0, -5, 3], color, 0.86).setStrokeStyle(1, 0xfff0c1, 0.62);
    rig.add([string, nock]);
    scene.tweens.add({ targets: string, scaleX: { from: 0.82, to: 1.04 }, scaleY: { from: 1.6, to: 0.8 }, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: nock, x: { from: -3, to: 3 }, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  } else if (type === 'ember') {
    const crucible = scene.add.circle(0, 0, 9, 0x2b130c, 0.74).setStrokeStyle(2, color, 0.8);
    const core = scene.add.circle(0, 0, 5, 0xffe383, 0.86).setBlendMode(Phaser.BlendModes.ADD);
    rig.add([crucible, core]);
    scene.tweens.add({ targets: core, scale: { from: 0.72, to: 1.28 }, alpha: { from: 0.48, to: 0.98 }, duration: 430, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  } else if (type === 'aegis') {
    const left = scene.add.polygon(-12, 0, [0, -7, 6, -3, 5, 6, 0, 9, -5, 6, -6, -3], color, 0.64).setStrokeStyle(1, 0xe9fff5, 0.58);
    const right = scene.add.polygon(12, 0, [0, -7, 6, -3, 5, 6, 0, 9, -5, 6, -6, -3], color, 0.64).setStrokeStyle(1, 0xe9fff5, 0.58);
    rig.add([left, right]);
    scene.tweens.add({ targets: left, x: { from: -9, to: -15 }, angle: { from: 4, to: -4 }, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: right, x: { from: 9, to: 15 }, angle: { from: -4, to: 4 }, duration: 760, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  } else {
    const orbit = scene.add.arc(0, 0, 14, 10, 315, false, color, 0).setStrokeStyle(2, color, 0.66);
    const moon = scene.add.circle(12, -5, 3.5, 0xe9d2ff, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    const core = scene.add.polygon(0, 0, [0, -6, 5, 0, 0, 6, -5, 0], color, 0.68).setBlendMode(Phaser.BlendModes.ADD);
    rig.add([orbit, moon, core]);
    scene.tweens.add({ targets: orbit, angle: 360, duration: 2800, repeat: -1 });
    scene.tweens.add({ targets: moon, x: { from: -12, to: 12 }, y: { from: 5, to: -5 }, duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    scene.tweens.add({ targets: core, scale: { from: 0.78, to: 1.18 }, alpha: { from: 0.45, to: 0.88 }, duration: 620, yoyo: true, repeat: -1 });
  }
  return rig;
}

function animateTowerAttack(container: Phaser.GameObjects.Container, type: TowerId): void {
  const rig = container.getData('actionRig') as Phaser.GameObjects.Container;
  const muzzleFlash = container.getData('muzzleFlash') as Phaser.GameObjects.Polygon;
  const branch = container.getData('towerBranch') as TowerState['branch'];
  const apparatus = branch ? container.getData(branch === 'left' ? 'leftApp' : 'rightApp') as Phaser.GameObjects.Container : undefined;
  const mechanismRig = container.getData('mechanismRig') as Phaser.GameObjects.Container;
  const profile = TOWER_MOTION[type];
  const branchTempo = branch === 'left' ? 1.12 : branch === 'right' ? 0.88 : 1;
  const windup = profile.windup * branchTempo;
  const impact = profile.impact * (branch === 'left' ? 1.08 : 0.94);
  const recovery = profile.recovery * branchTempo;
  const total = windup + impact + recovery;
  const token = beginAction(container, total);
  const serial = (Number(container.getData('actionSerial')) || 0) + 1;
  container.setData('actionSerial', serial);
  const variation = serial % 2 ? 1 : -1;
  container.scene.tweens.killTweensOf(rig);
  container.scene.tweens.killTweensOf(muzzleFlash);
  resetRig(rig);
  muzzleFlash.setAlpha(0);

  // Readable anticipation: bow draw, furnace compression, shield brace, or
  // astral lift. The mechanism carries most of the action so the architecture
  // remains grounded instead of wobbling as one giant bitmap.
  container.scene.tweens.add({
    targets: rig,
    x: -profile.recoilX * 0.42,
    y: type === 'astral' ? 2.8 : -Math.abs(profile.recoilY) * 0.45,
    angle: -profile.recoilAngle * 0.48,
    scaleX: type === 'ember' ? 1.018 : 0.992,
    scaleY: type === 'ember' ? 0.978 : 1.012,
    duration: windup,
    ease: 'Cubic.InOut',
  });
  container.scene.tweens.add({
    targets: mechanismRig,
    alpha: 1,
    scale: profile.chargeScale * (branch === 'left' ? 1.06 : branch === 'right' ? 0.96 : 1),
    angle: type === 'astral' ? variation * 18 : type === 'thorn' ? variation * -3 : 0,
    duration: windup,
    ease: 'Cubic.In',
  });
  if (apparatus) container.scene.tweens.add({ targets: apparatus, alpha: 0.68, scale: branch === 'left' ? 1.08 : 0.96, duration: windup, ease: 'Sine.In' });

  actionCall(container, token, windup, () => {
    muzzleFlash.setAlpha(0.98).setScale(0.26).setAngle(variation * -22);
    container.scene.tweens.add({ targets: muzzleFlash, alpha: 0, scale: type === 'ember' ? 2.75 : 2.2, angle: variation * 52, duration: impact + 92, ease: 'Expo.Out' });
    container.scene.tweens.killTweensOf(rig);
    container.scene.tweens.add({
      targets: rig,
      x: profile.recoilX,
      y: profile.recoilY,
      angle: profile.recoilAngle * variation,
      scaleX: type === 'thorn' ? 0.978 : 1.025,
      scaleY: type === 'ember' ? 0.955 : 1.018,
      duration: impact,
      ease: 'Expo.Out',
    });
    container.scene.tweens.add({ targets: mechanismRig, alpha: 0.76, scale: 0.9, angle: 0, duration: impact, ease: 'Expo.Out' });
  });

  actionCall(container, token, windup + impact, () => {
    container.scene.tweens.killTweensOf(rig);
    container.scene.tweens.add({ targets: rig, x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1, duration: recovery, ease: 'Back.Out' });
    container.scene.tweens.add({ targets: mechanismRig, alpha: 0.72, scale: 1, angle: 0, duration: recovery, ease: 'Back.Out' });
    if (apparatus) container.scene.tweens.add({ targets: apparatus, alpha: 0.36, scale: 1, duration: recovery, ease: 'Sine.Out' });
  });

  actionCall(container, token, total, () => {
    resetRig(rig);
    mechanismRig.setAlpha(0.72).setScale(1).setAngle(0);
  });
}

export function animateTowerAttackView(container: Phaser.GameObjects.Container, type: TowerId): void {
  animateTowerAttack(container, type);
}

export function createTowerView(scene: Phaser.Scene, tower: TowerState): Phaser.GameObjects.Container {
  const definition = TOWERS[tower.type];
  const container = scene.add.container(0, 0).setDepth(30);
  installViewScope(container);
  const selectionPlate = scene.add.ellipse(0, 15, 67, 24, 0x071713, 0.38).setStrokeStyle(2, 0xdcc98f, 0.25);
  const glow = scene.add.ellipse(0, 10, 58, 20, definition.accent, 0.12).setBlendMode(Phaser.BlendModes.ADD);
  const actionRig = scene.add.container(0, 0);
  const idleRig = scene.add.container(0, 0);
  const sprite = scene.add.image(0, 27, towerRankTextures[tower.type], tower.level - 1).setOrigin(0.5, 1);
  const height = setTowerVisual(sprite, tower);
  // PreFX renders into a sprite-sized target. PostFX renders each actor through
  // a full-canvas framebuffer, which becomes prohibitively expensive during
  // dense 2x wave overlaps.
  const towerGrade = sprite.preFX?.addColorMatrix(); towerGrade?.brightness(1.07); towerGrade?.saturate(0.04, true);
  idleRig.add(sprite); actionRig.add(idleRig);
  const pips = [0, 1, 2].map((index) => scene.add.polygon(-12 + index * 12, 23, [0, -3, 3, 0, 0, 3, -3, 0], index < tower.level ? 0xffdf70 : 0x243630, 0).setStrokeStyle(1, 0xffedb1, 0));
  const oath = scene.add.polygon(0, -height + 31, [0, -7, 6, -2, 4, 6, -4, 6, -6, -2], definition.accent, 0).setStrokeStyle(1.5, 0xffffff, 0);
  const leftApp = makeTowerApparatus(scene, tower.type, 'left').setPosition(0, -height * 0.66);
  const rightApp = makeTowerApparatus(scene, tower.type, 'right').setPosition(0, -height * 0.66);
  const mechanismRig = makeTowerMechanism(scene, tower.type, definition.accent).setPosition(0, -height * 0.65);
  const muzzlePoint = towerMuzzlePoint(tower.type, height);
  const muzzleFlash = scene.add.polygon(muzzlePoint.x, muzzlePoint.y, [0, -8, 3, -3, 9, 0, 3, 3, 0, 9, -3, 3, -9, 0, -3, -3], definition.accent, 0)
    .setStrokeStyle(1.5, 0xfff4d4, 0.72).setBlendMode(Phaser.BlendModes.ADD);
  actionRig.add([mechanismRig, leftApp, rightApp, oath, muzzleFlash]);
  container.add([selectionPlate, glow, actionRig, ...pips]);
  container.setData({ sprite, glow, pips, oath, leftApp, rightApp, mechanismRig, muzzleFlash, actionRig, idleRig, selectionPlate, towerLevel: tower.level, towerBranch: tower.branch, lastCooldown: tower.cooldown, lastDisabled: tower.disabledTime, presentationSeed: presentationSeed(`tower:${tower.uid}`), poseLockUntil: 0, animationActionToken: 0, actionSerial: 0 });

  const idle = tower.type === 'ember'
    ? { y: -1.2, scaleX: 1.008, scaleY: 1.015, angle: 0, duration: 1480 }
    : tower.type === 'astral'
      ? { y: -1.5, scaleX: 1.006, scaleY: 1.012, angle: 0.65, duration: 1760 }
      : tower.type === 'thorn'
        ? { y: -1.3, scaleX: 1.007, scaleY: 1.01, angle: -0.55, duration: 1580 }
        : { y: -1, scaleX: 1.01, scaleY: 1.012, angle: 0, duration: 1900 };
  scene.tweens.add({ targets: idleRig, ...idle, delay: presentationSeed(`tower:${tower.uid}`) * idle.duration, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  scene.tweens.add({ targets: glow, scale: 1.18, alpha: 0.03, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  if (tower.branch) {
    const apparatus = tower.branch === 'left' ? leftApp : rightApp;
    apparatus.setVisible(true).setAlpha(0.36);
    activateTowerApparatus(apparatus);
  }
  return container;
}

export function refreshTowerView(container: Phaser.GameObjects.Container, tower: TowerState): void {
  const oldLevel = container.getData('towerLevel') as number;
  const oldBranch = container.getData('towerBranch') as TowerState['branch'];
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const actionRig = container.getData('actionRig') as Phaser.GameObjects.Container;
  const selected = Boolean(container.getData('isSelected'));
  const pips = container.getData('pips') as Phaser.GameObjects.Polygon[];
  const selectionPlate = container.getData('selectionPlate') as Phaser.GameObjects.Ellipse;
  pips.forEach((pip, index) => pip.setFillStyle(index < tower.level ? 0xffdf70 : 0x243630, selected ? 0.92 : 0).setStrokeStyle(1, 0xffedb1, selected ? 0.42 : 0));
  selectionPlate.setFillStyle(0x071713, selected ? 0.58 : 0.32).setStrokeStyle(selected ? 2.5 : 1.5, selected ? 0xffe39a : 0xdcc98f, selected ? 0.76 : 0.2);
  sprite.setTint(tower.disabledTime > 0 ? 0x778682 : 0xffffff);

  if (oldLevel !== tower.level) {
    const height = setTowerVisual(sprite, tower);
    (container.getData('oath') as Phaser.GameObjects.Polygon).setY(-height + 31);
    (container.getData('leftApp') as Phaser.GameObjects.Container).setY(-height * 0.66);
    (container.getData('rightApp') as Phaser.GameObjects.Container).setY(-height * 0.66);
    (container.getData('mechanismRig') as Phaser.GameObjects.Container).setY(-height * 0.65);
    (container.getData('muzzleFlash') as Phaser.GameObjects.Polygon).setPosition(towerMuzzlePoint(tower.type, height).x, towerMuzzlePoint(tower.type, height).y);
    container.scene.tweens.killTweensOf(actionRig);
    container.scene.tweens.add({ targets: actionRig, scale: { from: 1.12, to: 1 }, y: { from: -5, to: 0 }, duration: 390, ease: 'Back.Out' });
    container.setData('towerLevel', tower.level);
  }
  if (oldBranch !== tower.branch) {
    const leftApp = container.getData('leftApp') as Phaser.GameObjects.Container;
    const rightApp = container.getData('rightApp') as Phaser.GameObjects.Container;
    leftApp.setVisible(tower.branch === 'left'); rightApp.setVisible(tower.branch === 'right');
    const oath = container.getData('oath') as Phaser.GameObjects.Polygon;
    const height = setTowerVisual(sprite, tower);
    oath.setY(-height + 31);
    leftApp.setY(-height * 0.66);
    rightApp.setY(-height * 0.66);
    (container.getData('mechanismRig') as Phaser.GameObjects.Container).setY(-height * 0.65);
    (container.getData('muzzleFlash') as Phaser.GameObjects.Polygon).setPosition(towerMuzzlePoint(tower.type, height).x, towerMuzzlePoint(tower.type, height).y);
    if (tower.branch) {
      const color = TOWERS[tower.type].branches[tower.branch].color;
      oath.setFillStyle(color, 1).setStrokeStyle(2, 0xffffff, 0.72);
      (container.getData('glow') as Phaser.GameObjects.Ellipse).setFillStyle(color, 0.28);
      const apparatus = tower.branch === 'left' ? leftApp : rightApp;
      apparatus.setAlpha(0.36);
      activateTowerApparatus(apparatus);
      container.scene.tweens.add({ targets: apparatus, scale: { from: 0.1, to: 1 }, angle: { from: tower.branch === 'left' ? -90 : 90, to: 0 }, duration: 560, ease: 'Back.Out' });
    }
    container.setData('towerBranch', tower.branch);
  }

  container.setData('lastCooldown', tower.cooldown);
  const lastDisabled = container.getData('lastDisabled') as number;
  if (tower.disabledTime > lastDisabled + 0.2) {
    container.scene.tweens.killTweensOf(actionRig);
    container.scene.tweens.add({ targets: actionRig, x: { from: -4, to: 4 }, angle: { from: -1.2, to: 1.2 }, duration: 58, yoyo: true, repeat: 3, onComplete: () => actionRig.setPosition(0, 0).setAngle(0) });
  }
  container.setData('lastDisabled', tower.disabledTime);
}

export function createEnemyView(scene: Phaser.Scene, enemy: EnemyState): Phaser.GameObjects.Container {
  const definition = ENEMIES[enemy.type];
  const height = enemyHeights[enemy.type];
  const container = scene.add.container(enemy.x, enemy.y).setDepth(40 + enemy.y * 0.02);
  installViewScope(container);
  const contact = scene.add.ellipse(0, 12, Math.max(24, definition.radius * (enemy.type === 'bloomlord' ? 3.6 : 2.5)), Math.max(9, definition.radius * 0.78), 0x020908, definition.flying ? 0.24 : 0.58);
  const groundAuraAlpha = enemy.type === 'brute' ? 0.12 : enemy.type === 'marauder' ? 0.1 : enemy.type === 'skitter' ? 0.07 : 0;
  const aura = scene.add.ellipse(0, definition.flying ? -17 : -height * 0.42, height * 0.58, height * 0.52, definition.flying ? 0x8b6bff : 0xff9c72, definition.flying || enemy.type === 'bloomlord' ? 0.16 : groundAuraAlpha).setBlendMode(Phaser.BlendModes.ADD);
  const actionRig = scene.add.container(0, 0);
  const idleRig = scene.add.container(0, 0);
  const frameLayout = enemyFrameLayouts[enemy.type];
  const sprite = scene.add.image(0, frameLayout.y, enemyActionTextures[enemy.type], 0).setOrigin(0.5, 1);
  fitFrameToHeight(sprite, frameLayout.displayHeight);
  const enemyGrade = sprite.preFX?.addColorMatrix(); enemyGrade?.brightness(enemy.type === 'bloomlord' ? 1.27 : 1.14); enemyGrade?.saturate(0.07, true);
  const engagementGlow = enemy.type === 'marauder' || enemy.type === 'brute'
    ? sprite.preFX?.addGlow(0xffbc8d, 0.42, 0.04, false, 0.1, 3)
    : undefined;
  const motionColor = enemy.type === 'wisp' ? 0x7eefff : enemy.type === 'bloomlord' ? 0xff6689 : enemy.type === 'brute' ? 0xe1a462 : 0xff9a72;
  const motionAccent = makeMotionAccent(scene, motionColor, -height * 0.34, Math.max(14, height * 0.38));
  idleRig.add(sprite); actionRig.add([motionAccent, idleRig]);
  const hpWidth = Math.max(32, Math.min(76, height * 0.72));
  const hpY = -height + 2;
  const hpBack = scene.add.rectangle(0, hpY, hpWidth + 5, 9, 0x120b10, 0.96).setStrokeStyle(1, 0xe7d7a2, 0.42);
  const hp = scene.add.rectangle(-hpWidth / 2, hpY, hpWidth, 5, definition.id === 'bloomlord' ? 0xff5f8f : 0xd8e7b3).setOrigin(0, 0.5);
  const status = scene.add.circle(height * 0.31, hpY, 5, 0x8bdcf4, 0).setStrokeStyle(1, 0xffffff, 0);
  const status2 = scene.add.circle(height * 0.31 + 11, hpY, 4, 0xff8f54, 0).setStrokeStyle(1, 0xffffff, 0);
  const core = scene.add.circle(0, enemy.type === 'bloomlord' ? -62 : -24, enemy.type === 'bloomlord' ? 12 : 5, enemy.type === 'wisp' ? 0xe6fff7 : 0xffb2bf, enemy.type === 'wisp' || enemy.type === 'bloomlord' ? 0.34 : 0).setBlendMode(Phaser.BlendModes.ADD);
  const rootPlane = scene.add.ellipse(0, -18, 102, 42, 0x9a5541, enemy.type === 'bloomlord' ? 0.14 : 0).setStrokeStyle(2, 0x24150f, enemy.type === 'bloomlord' ? 0.45 : 0);
  const torsoPlane = scene.add.ellipse(-3, -67, 61, 65, 0x4b7b67, enemy.type === 'bloomlord' ? 0.12 : 0).setBlendMode(Phaser.BlendModes.ADD);
  const crown = scene.add.polygon(0, -height + 15, [0, -13, 8, -3, 14, -8, 12, 7, 0, 12, -12, 7, -14, -8, -8, -3], 0xff7796, enemy.type === 'bloomlord' ? 0.28 : 0).setStrokeStyle(2, 0xffc191, enemy.type === 'bloomlord' ? 0.45 : 0).setBlendMode(Phaser.BlendModes.ADD);
  const phaseWings = [scene.add.polygon(-47, -84, [0, -23, 13, -5, 24, 8, 5, 4, -8, 22, -5, 3, -23, -4], 0x7a2947, 0), scene.add.polygon(47, -84, [0, -23, -13, -5, -24, 8, -5, 4, 8, 22, 5, 3, 23, -4], 0x7a2947, 0)];
  container.add([contact, aura, actionRig, rootPlane, torsoPlane, core, crown, ...phaseWings, hpBack, hp, status, status2]);
  container.setData({ hp, hpBack, hpWidth, sprite, status, status2, core, crown, phaseWings, aura, actionRig, idleRig, motionAccent, motionAccentColor: motionColor, engagementGlow, enemyType: enemy.type, bossPhase: 0, pendingDamage: 0, lastHp: enemy.hp, lastCooldown: enemy.attackCooldown, lastWorldX: enemy.x, lastWorldY: enemy.y, poseLockUntil: 0, healthVisibleUntil: 0, presentationSeed: presentationSeed(`enemy:${enemy.uid}`), motionBaseY: definition.flying ? -5 : 0, gaitPhase: presentationSeed(`stride:${enemy.uid}`) * Math.PI * 2, animationActionToken: 0, actionSerial: 0 });

  if (definition.flying || enemy.type === 'bloomlord') scene.tweens.add({ targets: [aura, core], alpha: { from: 0.09, to: 0.34 }, scale: { from: 0.88, to: 1.12 }, duration: 880, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return container;
}

export function animateEnemyAttackView(container: Phaser.GameObjects.Container): void {
  if (!container.active) return;
  const type = container.getData('enemyType') as EnemyId | undefined;
  const profile = type ? ENEMY_MOTION[type] : undefined;
  if (!profile) return;
  animateCharacterAttack(container, profile);
}

export function animateEnemyHitView(container: Phaser.GameObjects.Container): void {
  if (!container.active) return;
  const type = container.getData('enemyType') as EnemyId | undefined;
  const profile = type ? ENEMY_MOTION[type] : undefined;
  if (!profile) return;
  animateCharacterHit(container, profile);
}

export function refreshEnemyView(container: Phaser.GameObjects.Container, enemy: EnemyState): void {
  const hp = container.getData('hp') as Phaser.GameObjects.Rectangle;
  const width = container.getData('hpWidth') as number;
  const pendingDamage = container.getData('pendingDamage') as number;
  const presentedHp = Math.min(enemy.maxHp, enemy.hp + pendingDamage);
  hp.displayWidth = Phaser.Math.Linear(hp.displayWidth, Math.max(0, width * presentedHp / enemy.maxHp), 0.2);
  const hpBack = container.getData('hpBack') as Phaser.GameObjects.Rectangle;
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  sprite.setTint(enemy.slow > 0 ? 0xbceeff : 0xffffff);
  const engagementGlow = container.getData('engagementGlow') as Phaser.FX.Glow | undefined;
  if (engagementGlow) engagementGlow.outerStrength = enemy.engagedAllyUid ? 1.08 : 0.42;
  const lastWorldX = container.getData('lastWorldX') as number;
  const lastWorldY = container.getData('lastWorldY') as number;
  const moving = Math.hypot(enemy.x - lastWorldX, enemy.y - lastWorldY) > 0.13;
  if (Math.abs(enemy.x - lastWorldX) > 0.15) sprite.setFlipX(enemy.x < lastWorldX);
  updateCharacterLocomotion(container, enemy.x, enemy.y, moving, ENEMY_MOTION[enemy.type]);
  container.setData('lastWorldX', enemy.x);
  container.setData('lastWorldY', enemy.y);

  const status = container.getData('status') as Phaser.GameObjects.Arc;
  if (enemy.mark > 0) status.setFillStyle(0xffd85d, 1).setStrokeStyle(1, 0xffffff, 0.8);
  else if (enemy.slow > 0) status.setFillStyle(0x8bdcf4, 1).setStrokeStyle(1, 0xffffff, 0.7);
  else status.setFillStyle(0x000000, 0).setStrokeStyle(1, 0xffffff, 0);
  const status2 = container.getData('status2') as Phaser.GameObjects.Arc;
  if (enemy.burn > 0) status2.setFillStyle(0xff7042, 1).setStrokeStyle(1, 0xffd08d, 0.9);
  else if (enemy.exposed > 0) status2.setFillStyle(0xa76cff, 1).setStrokeStyle(1, 0xf1d8ff, 0.9);
  else status2.setFillStyle(0x000000, 0).setStrokeStyle(1, 0xffffff, 0);

  const lastHp = container.getData('lastHp') as number;
  if (enemy.hp < lastHp - 0.01) {
    container.setData('healthVisibleUntil', container.scene.time.now + 720);
  }
  const healthAlpha = enemy.type === 'bloomlord' ? 0 : presentedHp < enemy.maxHp * 0.95 && container.scene.time.now < (container.getData('healthVisibleUntil') as number) ? 1 : 0;
  hp.setAlpha(healthAlpha); hpBack.setAlpha(healthAlpha);
  container.setData('lastHp', enemy.hp);
  container.setData('lastCooldown', enemy.attackCooldown);

  if (enemy.type === 'bloomlord' && container.getData('bossPhase') !== enemy.bossPhase) {
    const crown = container.getData('crown') as Phaser.GameObjects.Polygon;
    const core = container.getData('core') as Phaser.GameObjects.Arc;
    const phaseWings = container.getData('phaseWings') as Phaser.GameObjects.Polygon[];
    crown.setScale(1 + enemy.bossPhase * 0.24).setAlpha(0.34 + enemy.bossPhase * 0.2).setRotation(enemy.bossPhase * 0.26);
    core.setRadius(12 + enemy.bossPhase * 5).setFillStyle(enemy.bossPhase > 1 ? 0xff5479 : 0xffb2bf, 0.52);
    phaseWings.forEach((wing, index) => wing.setAlpha(0.24 + enemy.bossPhase * 0.2).setScale(1 + enemy.bossPhase * 0.18).setRotation((index ? 1 : -1) * enemy.bossPhase * 0.14));
    container.scene.tweens.add({ targets: [crown, core, ...phaseWings], scaleX: { from: 1.8, to: crown.scaleX }, scaleY: { from: 1.8, to: crown.scaleY }, duration: 520, ease: 'Back.Out' });
    container.setData('bossPhase', enemy.bossPhase);
  }
}

export function createHeroView(scene: Phaser.Scene, hero: HeroState): Phaser.GameObjects.Container {
  const visualHeight = hero.id === 'kael' ? 96 : 92;
  const spriteY = 13;
  const characterTop = hero.id === 'kael' ? -80 : -76;
  const container = scene.add.container(hero.x, hero.y).setDepth(60 + hero.y * 0.02);
  installViewScope(container);
  const contact = scene.add.ellipse(0, 10, hero.id === 'kael' ? 43 : 36, 14, 0x03100d, 0.64).setStrokeStyle(1, hero.accent, 0.2);
  const leftBracket = scene.add.polygon(-26, 4, [-4, -11, -4, 11, 3, 15, 3, 9, 0, 7, 0, -7, 3, -9, 3, -15], hero.accent, 0.68);
  const rightBracket = scene.add.polygon(26, 4, [4, -11, 4, 11, -3, 15, -3, 9, 0, 7, 0, -7, -3, -9, -3, -15], hero.accent, 0.68);
  const actionRig = scene.add.container(0, 0);
  const idleRig = scene.add.container(0, 0);
  const sprite = scene.add.image(0, spriteY, heroActionTextures[hero.id], 0).setOrigin(0.5, 1);
  fitFrameToHeight(sprite, visualHeight);
  const heroGrade = sprite.preFX?.addColorMatrix(); heroGrade?.brightness(1.1); heroGrade?.saturate(0.04, true);
  sprite.preFX?.addGlow(hero.accent, 0.38, 0.03, false, 0.1, 3);
  const motionAccent = makeMotionAccent(scene, hero.accent, hero.id === 'kael' ? -39 : -45, hero.id === 'kael' ? 40 : 36);
  idleRig.add(sprite); actionRig.add([motionAccent, idleRig]);
  const hpWidth = hero.id === 'kael' ? 47 : 42;
  const hpY = characterTop;
  const hpBack = scene.add.rectangle(0, hpY, hpWidth + 4, 7, 0x0a1614, 0).setStrokeStyle(1, 0xe9dba8, 0);
  const hp = scene.add.rectangle(-hpWidth / 2, hpY, hpWidth, 4, hero.accent, 0).setOrigin(0, 0.5);
  container.add([contact, leftBracket, rightBracket, actionRig, hpBack, hp]);
  container.setData({ leftBracket, rightBracket, sprite, actionRig, idleRig, motionAccent, motionAccentColor: hero.accent, hp, hpBack, hpWidth, lastCooldown: hero.attackCooldown, lastWorldX: hero.x, lastWorldY: hero.y, lastAlive: hero.alive, poseLockUntil: 0, isHeroView: true, heroId: hero.id, presentationSeed: presentationSeed(`hero:${hero.id}`), motionBaseY: 0, gaitPhase: presentationSeed(`stride:hero:${hero.id}`) * Math.PI * 2, animationActionToken: 0, actionSerial: 0 });
  scene.tweens.add({ targets: [leftBracket, rightBracket], alpha: { from: 0.38, to: 0.88 }, duration: 900, yoyo: true, repeat: -1 });
  return container;
}

export function animateAllyAttackView(container: Phaser.GameObjects.Container): void {
  const heroId = container.getData('heroId') as HeroId | undefined;
  animateCharacterAttack(container, heroId ? HERO_MOTION[heroId] : DEFENDER_MOTION);
}

export function animateAllyHitView(container: Phaser.GameObjects.Container): void {
  const heroId = container.getData('heroId') as HeroId | undefined;
  animateCharacterHit(container, heroId ? HERO_MOTION[heroId] : DEFENDER_MOTION);
}

export function refreshHeroView(container: Phaser.GameObjects.Container, hero: HeroState): void {
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const lastX = container.getData('lastWorldX') as number;
  const lastY = container.getData('lastWorldY') as number;
  const moving = Math.hypot(hero.x - lastX, hero.y - lastY) > 0.17;
  if (Math.abs(hero.x - lastX) > 0.14) sprite.setFlipX(hero.x < lastX);
  if (hero.alive) updateCharacterLocomotion(container, hero.x, hero.y, moving, HERO_MOTION[hero.id]);
  container.setData('lastWorldX', hero.x); container.setData('lastWorldY', hero.y);
  const hp = container.getData('hp') as Phaser.GameObjects.Rectangle;
  const hpBack = container.getData('hpBack') as Phaser.GameObjects.Rectangle;
  const hpWidth = container.getData('hpWidth') as number;
  const healthRatio = Phaser.Math.Clamp(hero.hp / hero.maxHp, 0, 1);
  // World health is an authoritative combat readout: expose the first hit,
  // track recovery without a stale easing window, and retire only at full HP
  // or defeat. The DOM card and canvas bar must never contradict each other.
  hp.displayWidth = hpWidth * healthRatio;
  const healthAlpha = hero.alive && healthRatio < 0.999 ? 1 : 0;
  hp.setAlpha(healthAlpha); hpBack.setFillStyle(0x0a1614, healthAlpha ? 0.94 : 0).setStrokeStyle(1, 0xe9dba8, healthAlpha ? 0.45 : 0);
  const actionRig = container.getData('actionRig') as Phaser.GameObjects.Container;
  actionRig.setAlpha(hero.alive ? 1 : 0.23);
  (container.getData('leftBracket') as Phaser.GameObjects.Polygon).setVisible(hero.alive);
  (container.getData('rightBracket') as Phaser.GameObjects.Polygon).setVisible(hero.alive);
  container.setData('lastCooldown', hero.attackCooldown);
  const lastAlive = container.getData('lastAlive') as boolean;
  if (lastAlive && !hero.alive) animateCharacterDefeat(container, HERO_MOTION[hero.id]);
  else if (!lastAlive && hero.alive) animateCharacterRespawn(container);
  container.setData('lastAlive', hero.alive);
}

export function createDefenderView(scene: Phaser.Scene, defender: DefenderState): Phaser.GameObjects.Container {
  const container = scene.add.container(defender.x, defender.y).setDepth(58 + defender.y * 0.02);
  installViewScope(container);
  const contact = scene.add.ellipse(0, 11, 42, 14, 0x03100d, 0.68).setStrokeStyle(1, 0x8ff0c1, 0.26);
  const silhouetteLift = scene.add.ellipse(0, -24, 32, 56, defender.slot % 2 ? 0x81dfff : 0x8ff0c1, 0.035).setBlendMode(Phaser.BlendModes.ADD);
  const actionRig = scene.add.container(0, 0);
  const idleRig = scene.add.container(0, 0);
  const sprite = scene.add.image(0, 13, ASSETS.units.aegisDefender, defender.slot % 2).setOrigin(0.5, 1);
  fitFrameToHeight(sprite, 72);
  const grade = sprite.preFX?.addColorMatrix(); grade?.brightness(1.13); grade?.saturate(0.08, true);
  sprite.preFX?.addGlow(defender.slot % 2 ? 0x9fe8ff : 0x8ff0c1, 0.5, 0.04, false, 0.1, 3);
  const motionAccent = makeMotionAccent(scene, defender.slot % 2 ? 0x9fe8ff : 0x8ff0c1, -31, 30);
  idleRig.add(sprite); actionRig.add([motionAccent, idleRig]);
  const hpWidth = 32;
  const hpX = [-4, 0, 4, -3, 3][defender.slot] ?? 0;
  const hpY = -58 - defender.slot % 2 * 5;
  const hpBack = scene.add.rectangle(hpX, hpY, hpWidth + 4, 7, 0x071613, 0).setStrokeStyle(1, 0xdff9e8, 0);
  const hp = scene.add.rectangle(hpX - hpWidth / 2, hpY, hpWidth, 4, 0x79dfb1, 0).setOrigin(0, 0.5);
  const slotMark = scene.add.circle(0, 12, 4, defender.slot % 2 ? 0x9fe8ff : 0x77d69c, 0.82).setBlendMode(Phaser.BlendModes.ADD);
  container.add([contact, silhouetteLift, actionRig, slotMark, hpBack, hp]);
  container.setData({ sprite, actionRig, idleRig, motionAccent, motionAccentColor: defender.slot % 2 ? 0x9fe8ff : 0x8ff0c1, hp, hpBack, hpWidth, lastHp: defender.hp, lastCooldown: defender.attackCooldown, lastWorldX: defender.x, lastWorldY: defender.y, lastAlive: defender.alive, poseLockUntil: 0, healthVisibleUntil: 0, isDefenderView: true, presentationSeed: presentationSeed(`defender:${defender.uid}`), motionBaseY: 0, gaitPhase: presentationSeed(`stride:defender:${defender.uid}`) * Math.PI * 2, animationActionToken: 0, actionSerial: defender.slot });
  scene.tweens.add({ targets: slotMark, alpha: { from: 0.25, to: 0.9 }, scale: { from: 0.8, to: 1.3 }, duration: 740, yoyo: true, repeat: -1 });
  return container;
}

export function animateDefenderAttackView(container: Phaser.GameObjects.Container): void {
  animateCharacterAttack(container, DEFENDER_MOTION);
}

export function refreshDefenderView(container: Phaser.GameObjects.Container, defender: DefenderState): void {
  const sprite = container.getData('sprite') as Phaser.GameObjects.Image;
  const actionRig = container.getData('actionRig') as Phaser.GameObjects.Container;
  const lastX = container.getData('lastWorldX') as number;
  const lastY = container.getData('lastWorldY') as number;
  const moving = Math.hypot(defender.x - lastX, defender.y - lastY) > 0.18;
  if (Math.abs(defender.x - lastX) > 0.12) sprite.setFlipX(defender.x < lastX);
  if (defender.alive) updateCharacterLocomotion(container, defender.x, defender.y, moving, DEFENDER_MOTION);
  container.setData('lastWorldX', defender.x); container.setData('lastWorldY', defender.y);
  const hp = container.getData('hp') as Phaser.GameObjects.Rectangle;
  const hpBack = container.getData('hpBack') as Phaser.GameObjects.Rectangle;
  const hpWidth = container.getData('hpWidth') as number;
  hp.displayWidth = Phaser.Math.Linear(hp.displayWidth, Math.max(0, hpWidth * defender.hp / defender.maxHp), 0.26);
  const lastHp = container.getData('lastHp') as number;
  if (defender.hp < lastHp - 0.01) container.setData('healthVisibleUntil', container.scene.time.now + 680);
  const healthAlpha = defender.alive && defender.hp < defender.maxHp * 0.97 && container.scene.time.now < (container.getData('healthVisibleUntil') as number) ? 1 : 0;
  hp.setAlpha(healthAlpha); hpBack.setFillStyle(0x071613, healthAlpha ? 0.94 : 0).setStrokeStyle(1, 0xdff9e8, healthAlpha ? 0.42 : 0);

  if (defender.hp < lastHp - 0.01) {
    container.setData('healthVisibleUntil', container.scene.time.now + 680);
  }
  container.setData('lastHp', defender.hp);
  container.setData('lastCooldown', defender.attackCooldown);
  actionRig.setAlpha(defender.alive ? 1 : 0.2);
  const lastAlive = container.getData('lastAlive') as boolean;
  if (lastAlive && !defender.alive) animateCharacterDefeat(container, DEFENDER_MOTION);
  else if (!lastAlive && defender.alive) animateCharacterRespawn(container);
  container.setData('lastAlive', defender.alive);
}
