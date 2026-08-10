import Phaser from 'phaser';
import { GameController } from './adapters/GameController';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';

export function createGame(parent: string, controller: GameController): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1600,
    height: 900,
    backgroundColor: '#071310',
    antialias: true,
    render: { pixelArt: false, roundPixels: false, antialias: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    // AudioDirector owns the complete mix graph. Disabling Phaser's unused
    // sound manager prevents a second suspended AudioContext from surviving
    // beside the real engine.
    audio: { noAudio: true },
    // Feed the deterministic simulation real frame deltas. Phaser's default
    // history smoothing masks sudden slow frames, so 2x combat can appear to
    // stop precisely when a burst makes rendering expensive; the simulation's
    // own bounded fixed-step catch-up is the correct place to absorb that load.
    fps: { target: 60, min: 10, smoothStep: false },
    scene: [BootScene, new BattleScene(controller)],
    input: { activePointers: 3 },
    banner: false,
  });
  // Mobile browser chrome and physical rotation can resize the visual viewport
  // without delivering one clean window resize. Refreshing on all standardized
  // signals keeps Phaser's CSS scale and pointer bounds synchronized.
  const refreshScale = (): void => {
    requestAnimationFrame(() => {
      game.scale.refresh();
      game.scale.updateBounds();
    });
  };
  window.addEventListener('orientationchange', refreshScale);
  window.visualViewport?.addEventListener('resize', refreshScale);
  window.screen.orientation?.addEventListener('change', refreshScale);
  return game;
}
