import { describe, expect, it } from 'vitest';
import type { HeroActiveSpellId } from '../src/game/content/types';
import { spellIconMarkup } from '../src/ui/spellIcons';

describe('semantic spell icons', () => {
  it('ships one distinct vector silhouette per active spell', () => {
    const ids: HeroActiveSpellId[] = ['rift-quake', 'warden-pulse', 'starfall', 'falling-constellation'];
    const icons = ids.map(spellIconMarkup);
    expect(new Set(icons).size).toBe(ids.length);
    ids.forEach((id, index) => {
      expect(icons[index]).toContain(`data-icon="${id}"`);
      expect(icons[index]).toMatch(/<(path|circle)/);
    });
  });
});
