import { describe, expect, it } from 'vitest';
import { resolveAssetUrl } from '../src/game/assets/url';

describe('deployment asset URLs', () => {
  it('resolves a relative Vite base against the page, not the emitted stylesheet', () => {
    expect(resolveAssetUrl(
      'assets/environment/verdant-rift.png',
      './',
      'https://example.github.io/verdant-rift-defense/',
    )).toBe('https://example.github.io/verdant-rift-defense/assets/environment/verdant-rift.png');
  });

  it('normalizes slashes without losing an absolute deployment base', () => {
    expect(resolveAssetUrl(
      '/assets/audio/music/menu-theme.ogg',
      '/verdant-rift-defense',
      'https://example.github.io/verdant-rift-defense/',
    )).toBe('https://example.github.io/verdant-rift-defense/assets/audio/music/menu-theme.ogg');
  });
});
