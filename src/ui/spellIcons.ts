import type { HeroActiveSpellId } from '../game/content/types';

const iconBodies: Readonly<Record<HeroActiveSpellId, string>> = {
  'rift-quake': `
    <path d="M3 15.5h5l2-2 2.2 2.4 2.1-2.7 2.3 2.3H21"/>
    <path d="m11 3-1.2 5.1 2.5 2-2.4 3.4 1.8 1.9-2.6 5.6"/>
    <path d="m15.2 5.4-1.8 3 2.5 1.7-1.6 3.1"/>
  `,
  'warden-pulse': `
    <path class="spell-icon-fill" d="M12 2.8 19 5.6v5.7c0 4.5-2.8 7.9-7 10-4.2-2.1-7-5.5-7-10V5.6L12 2.8Z"/>
    <path class="spell-icon-cut" d="M12 7v8M8 11h8"/>
    <path d="M2.5 8.2h2M19.5 8.2h2M3.2 14.8h2.1M18.7 14.8h2.1"/>
  `,
  starfall: `
    <path class="spell-icon-fill" d="m16.8 11.2 1.1 2.3 2.6.4-1.9 1.9.5 2.6-2.3-1.2-2.3 1.2.5-2.6-1.9-1.9 2.6-.4 1.1-2.3Z"/>
    <path d="M4 4.5h7.5M3 8h6.5M6 11.5h3"/>
    <path d="m13 3-2.8 7.2M17 4.5l-3.4 6.7"/>
  `,
  'falling-constellation': `
    <path d="m5 6 6 3 6-4M11 9l2 6 5 3M13 15l-7 3"/>
    <circle class="spell-icon-fill" cx="5" cy="6" r="2"/>
    <circle class="spell-icon-fill" cx="17" cy="5" r="2"/>
    <circle class="spell-icon-fill" cx="11" cy="9" r="1.7"/>
    <circle class="spell-icon-fill" cx="13" cy="15" r="2"/>
    <path d="m13 17.2-1 4M9.5 18.8l2.5-1.6M16 20l-2-2.8"/>
  `,
};

export function spellIconMarkup(id: HeroActiveSpellId): string {
  return `<svg class="spell-icon" data-icon="${id}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconBodies[id]}</svg>`;
}

export function cancelIconMarkup(): string {
  return '<svg class="spell-icon spell-icon-cancel" data-icon="cancel" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5 5 19"/></svg>';
}
