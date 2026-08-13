import Phaser from 'phaser';
import { ASSET_PATHS, SPRITESHEETS } from '../../game/assets/manifest';
import { assetUrl } from '../../game/assets/url';
import { GameController } from '../adapters/GameController';

export class BootScene extends Phaser.Scene {
  constructor(private readonly controller: GameController) { super('boot'); }

  preload(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const plate = this.add.graphics();
    plate.fillGradientStyle(0x081513, 0x081513, 0x152725, 0x152725, 1);
    plate.fillRect(0, 0, width, height);
    const title = this.add.text(width / 2, height / 2 - 30, 'VERDANT RIFT', {
      fontFamily: 'Georgia, serif', fontSize: '34px', color: '#f3deb0', letterSpacing: 7,
    }).setOrigin(0.5);
    const barBack = this.add.rectangle(width / 2, height / 2 + 26, 310, 7, 0x172a25).setStrokeStyle(1, 0x9e8658);
    const bar = this.add.rectangle(width / 2 - 154, height / 2 + 26, 0, 5, 0x7dd9b1).setOrigin(0, 0.5);
    this.load.on('progress', (progress: number) => { bar.width = 308 * progress; });
    Object.entries(ASSET_PATHS).forEach(([key, path]) => this.load.image(key, path));
    const staticKeys = new Set(Object.keys(ASSET_PATHS));
    this.controller.run.assets.images.forEach((image) => {
      if (!staticKeys.has(image.key)) this.load.image(image.key, assetUrl(image.path));
    });
    Object.entries(SPRITESHEETS).forEach(([key, sheet]) => this.load.spritesheet(key, sheet.path, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    }));
    this.load.once('complete', () => { plate.destroy(); title.destroy(); barBack.destroy(); bar.destroy(); });
  }

  create(): void { this.scene.start('battle'); }
}
