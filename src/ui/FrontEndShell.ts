import { assetUrl } from '../game/assets/url';
import type { CampaignProfile } from '../game/campaign/CampaignProfile';
import {
  CAMPAIGN_STAGES,
  CODEX_TOPICS,
  INSIGHT_UPGRADES,
  MENU_HEROES,
  heroById,
  stageById,
  type CampaignStageDefinition,
  type MenuHeroId,
} from '../game/campaign/content';
import type { DifficultyId } from '../game/simulation/state';

export type FrontEndRoute = 'campaign' | 'heroes' | 'upgrades' | 'codex' | 'settings';

export interface FrontEndRenderState {
  route: FrontEndRoute;
  profile: Readonly<CampaignProfile>;
  selectedHeroId: MenuHeroId;
  difficulty: DifficultyId;
  muted: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  runtimeReady: boolean;
  audioMixer: string;
}

const routes: readonly { id: FrontEndRoute; glyph: string; label: string; hint: string }[] = [
  { id: 'campaign', glyph: '⌖', label: 'Campaign', hint: 'Choose a stage' },
  { id: 'heroes', glyph: '♞', label: 'Heroes', hint: 'Inspect the alliance' },
  { id: 'upgrades', glyph: '✦', label: 'Insight', hint: 'Permanent upgrades' },
  { id: 'codex', glyph: '▤', label: 'Field guide', hint: 'Rules and controls' },
  { id: 'settings', glyph: '⚙', label: 'Settings', hint: 'Audio and access' },
] as const;

function starMarkup(stars: number): string {
  return Array.from({ length: 3 }, (_, index) => index < stars ? '★' : '☆').join('');
}

function stageStatus(stage: CampaignStageDefinition, profile: Readonly<CampaignProfile>): 'available' | 'cleared' | 'locked' | 'planned' {
  if (profile.stages[stage.id]?.cleared) return 'cleared';
  if (!stage.playable) return stage.unlockAfter && profile.stages[stage.unlockAfter]?.cleared ? 'planned' : 'locked';
  if (!stage.unlockAfter || profile.stages[stage.unlockAfter]?.cleared) return 'available';
  return 'locked';
}

export function renderFrontEndFrame(state: FrontEndRenderState): string {
  return `
    <div class="modal-layer is-open front-end-layer" data-briefing role="dialog" aria-modal="true" aria-label="Verdant Rift command menu" tabindex="-1" style="--campaign-art:url('${assetUrl('assets/environment/verdant-rift.png')}')">
      <div class="front-end-art" aria-hidden="true"></div>
      <section class="front-end-shell">
        <aside class="front-end-rail">
          <header class="front-end-brand">
            <span class="front-end-sigil">V</span>
            <span><small>THE ALLIANCE CHRONICLES</small><b>VERDANT<br>RIFT</b></span>
          </header>
          <nav class="front-end-nav" data-front-end-nav aria-label="Main menu">
            ${routes.map((route) => `<button data-action="menu-route" data-route="${route.id}" class="${state.route === route.id ? 'is-selected' : ''}" aria-current="${state.route === route.id ? 'page' : 'false'}"><span>${route.glyph}</span><span><b>${route.label}</b><small>${route.hint}</small></span></button>`).join('')}
          </nav>
          <footer class="front-end-profile">
            <span class="profile-seal">I</span><span><small>WARDEN PROFILE</small><b>Chapter I</b></span>
            <em>${state.profile.insightEarned} ✦</em>
          </footer>
        </aside>
        <main class="front-end-content" data-front-end-content>${renderFrontEndContent(state)}</main>
      </section>
    </div>`;
}

export function renderFrontEndContent(state: FrontEndRenderState): string {
  if (state.route === 'heroes') return renderHeroes(state);
  if (state.route === 'upgrades') return renderUpgrades(state);
  if (state.route === 'codex') return renderCodex();
  if (state.route === 'settings') return renderSettings(state);
  return renderCampaign(state);
}

function renderCampaign(state: FrontEndRenderState): string {
  const selected = stageById(state.profile.selectedStageId);
  const status = stageStatus(selected, state.profile);
  const result = state.profile.stages[selected.id];
  const playable = status === 'available' || status === 'cleared';
  return `
    <section class="campaign-view menu-view" aria-labelledby="briefing-title">
      <header class="menu-view-heading">
        <div><small>CHAPTER I • THE VERDANT FRONTIER</small><h1 tabindex="-1">Choose the next stand</h1></div>
        <div class="campaign-tally"><span><b>${Object.values(state.profile.stages).filter((entry) => entry?.cleared).length}</b><small>STAGES HELD</small></span><span><b>${Object.values(state.profile.stages).reduce((sum, entry) => sum + (entry?.stars ?? 0), 0)} / 15</b><small>VICTORY STARS</small></span></div>
      </header>
      <div class="campaign-layout">
        <section class="campaign-map" aria-label="Chapter I stage map">
          <div class="map-vignette"></div>
          <svg class="campaign-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M17 70 C25 66 27 56 35 53 S46 62 53 68 S63 61 70 45 S80 34 86 25"/><path class="route-glow" d="M17 70 C25 66 27 56 35 53 S46 62 53 68 S63 61 70 45 S80 34 86 25"/></svg>
          <div class="map-chapter-label"><small>THE OLD KINGDOM ROAD</small><b>Five stands to the forest heart</b></div>
          ${CAMPAIGN_STAGES.map((stage) => {
            const stageState = stageStatus(stage, state.profile);
            const stars = state.profile.stages[stage.id]?.stars ?? 0;
            return `<button class="stage-node is-${stageState} ${selected.id === stage.id ? 'is-selected' : ''}" style="--stage-x:${stage.mapPosition.x}%;--stage-y:${stage.mapPosition.y}%" data-action="menu-stage" data-stage="${stage.id}" aria-label="Stage ${stage.order}: ${stage.name}, ${stageState}">
              <span class="stage-node-ring"><i>${stageState === 'locked' || stageState === 'planned' ? '◆' : stage.order}</i></span>
              <span class="stage-node-copy"><small>${stageState === 'planned' ? 'IN DEVELOPMENT' : `STAGE ${stage.order}`}</small><b>${stage.name}</b><em>${stars ? starMarkup(stars) : stageState === 'cleared' ? 'CLEARED' : stageState.toUpperCase()}</em></span>
            </button>`;
          }).join('')}
        </section>
        <article class="stage-dossier ${playable ? '' : 'is-locked'}">
          <header><div><small>STAGE ${String(selected.order).padStart(2, '0')} • ${selected.threat.toUpperCase()}</small><h2 id="briefing-title">${selected.mission}</h2></div><span class="dossier-stars" aria-label="${result?.stars ?? 0} of 3 stars">${starMarkup(result?.stars ?? 0)}</span></header>
          <p class="lead">${selected.description}</p>
          <div class="stage-intel">
            <span><small>OBJECTIVE</small><b>${selected.objective}</b></span>
            <span><small>ENEMY INTEL</small><b>${selected.enemies.join(' • ')}</b></span>
          </div>
          <div class="briefing-grid" aria-label="Mission tactics">
            <div><span class="brief-icon">◉</span><b>Build & specialize</b><small>Every tower branches after rank III.</small></div>
            <div><span class="brief-icon">♜</span><b>Command the pair</b><small>Kael holds ground; Lyra covers the sky.</small></div>
            <div><span class="brief-icon">⚡</span><b>Call waves early</b><small>Trade preparation time for sunshards.</small></div>
          </div>
          ${playable ? `
            <div class="difficulty-picker" role="group" aria-label="Difficulty">
              <button data-action="difficulty" data-difficulty="wanderer" class="${state.difficulty === 'wanderer' ? 'is-selected' : ''}"><b>Wanderer</b><small>25 gate • forgiving foes</small></button>
              <button data-action="difficulty" data-difficulty="warden" class="${state.difficulty === 'warden' ? 'is-selected' : ''}"><b>Warden</b><small>20 gate • intended tactics</small></button>
              <button data-action="difficulty" data-difficulty="mythic" class="${state.difficulty === 'mythic' ? 'is-selected' : ''}"><b>Mythic</b><small>15 gate • relentless pressure</small></button>
            </div>
            <div class="launch-row"><span><small data-runtime-label>${state.runtimeReady ? 'FIRST CLEAR REWARD' : 'PREPARING THE BATTLEFIELD'}</small><b>${result?.cleared ? 'Claimed' : `${selected.reward} INSIGHT ✦`}</b><em data-runtime-status>${state.runtimeReady ? (state.profile.insightEarned > 0 ? `${state.profile.insightLoadout.length} / ${state.profile.insightEarned} insight equipped` : 'UNLOCKS AFTER YOUR FIRST CLEAR') : 'Loading battle art and animation rigs…'}</em></span><button class="primary-button" data-action="begin" ${state.runtimeReady ? '' : 'disabled'} aria-busy="${state.runtimeReady ? 'false' : 'true'}">ENTER THE RIFT <span>→</span></button></div>
          ` : `<div class="planned-stage"><span>◆</span><div><small>${status === 'planned' ? 'CAMPAIGN EXPANSION' : 'ROUTE SEALED'}</small><b>${status === 'planned' ? 'Stage framework ready; battle content is still in development.' : `Complete ${selected.unlockAfter ? stageById(selected.unlockAfter).name : 'the previous stand'} to reveal this route.`}</b></div></div>`}
        </article>
      </div>
    </section>`;
}

function renderHeroes(state: FrontEndRenderState): string {
  const selected = heroById(state.selectedHeroId);
  return `
    <section class="heroes-view menu-view" aria-labelledby="front-end-title">
      <header class="menu-view-heading"><div><small>THE RIFT ALLIANCE</small><h1 id="front-end-title" tabindex="-1">Champion hall</h1></div><div class="roster-count"><b>2 / 2</b><small>ACTIVE SLOTS</small></div></header>
      <div class="heroes-layout">
        <div class="hero-roster" role="list" aria-label="Hero roster">
          ${MENU_HEROES.map((hero) => `<button role="listitem" data-action="menu-hero" data-menu-hero="${hero.id}" class="roster-hero ${hero.id === selected.id ? 'is-selected' : ''} ${hero.playable ? '' : 'is-locked'}" aria-label="Inspect ${hero.name}, ${hero.epithet}">
            <span class="roster-portrait">${hero.playable ? `<img src="${assetUrl(`assets/heroes/${hero.id}.png`)}" alt="" draggable="false">` : '<i>?</i>'}</span>
            <span><small>${hero.playable ? 'DEPLOYED' : 'LOCKED'}</small><b>${hero.name}</b><em>${hero.epithet}</em></span><strong>${hero.playable ? '✓' : '◆'}</strong>
          </button>`).join('')}
        </div>
        <article class="hero-dossier ${selected.playable ? '' : 'is-locked'}">
          <div class="hero-key-art">${selected.playable ? `<img src="${assetUrl(`assets/heroes/${selected.id}.png`)}" alt="${selected.name}, ${selected.epithet}">` : '<span>?</span>'}<i></i></div>
          <div class="hero-biography"><small>${selected.unlockCopy.toUpperCase()}</small><h2>${selected.name}</h2><h3>${selected.epithet}</h3><p>${selected.summary}</p><span class="role-chip">${selected.role}</span></div>
          <div class="hero-ratings" aria-label="Hero ratings">${[['Attack', selected.attack], ['Defense', selected.defense], ['Control', selected.control]].map(([label, value]) => `<span><small>${label}</small><i>${Array.from({ length: 5 }, (_, index) => `<b class="${index < Number(value) ? 'is-filled' : ''}"></b>`).join('')}</i></span>`).join('')}</div>
          <section class="hero-ability"><span>✦</span><div><small>SIGNATURE COMMAND</small><b>${selected.ability}</b><p>${selected.abilityDescription}</p></div></section>
          <section class="hero-mastery"><header><small>BATTLE MASTERY</small><b>Resets each mission</b></header><div>${selected.milestones.map((milestone, index) => `<span><i>${index + 1}</i><b>${milestone}</b><small>Level ${[2, 4, 6][index]}</small></span>`).join('')}</div></section>
        </article>
      </div>
    </section>`;
}

function renderUpgrades(state: FrontEndRenderState): string {
  const available = Math.max(0, state.profile.insightEarned - state.profile.insightLoadout.length);
  return `
    <section class="upgrades-view menu-view" aria-labelledby="front-end-title">
      <header class="menu-view-heading"><div><small>PERMANENT CAMPAIGN POWER</small><h1 id="front-end-title" tabindex="-1">The Insight Grove</h1></div><div class="insight-balance"><span>✦</span><b>${available}</b><small>AVAILABLE</small></div></header>
      <div class="upgrade-intro"><p>Insight changes your opening strategy without replacing in-battle tower choices. Equip one boon per point earned; respec freely before deployment.</p><button data-action="insight-reset" ${state.profile.insightLoadout.length ? '' : 'disabled'}>RESET ALL BOONS</button></div>
      <div class="insight-tree" data-insight-board>
        <div class="insight-trunk" aria-hidden="true"></div>
        ${INSIGHT_UPGRADES.map((upgrade, index) => {
          const active = state.profile.insightLoadout.includes(upgrade.id);
          const disabled = !active && available === 0;
          return `<button class="insight-branch insight-node ${active ? 'is-active' : ''}" style="--branch-order:${index}" data-action="insight" data-upgrade="${upgrade.id}" ${disabled ? 'disabled' : ''}><span>${upgrade.glyph}</span><small>${upgrade.discipline.toUpperCase()}</small><b>${upgrade.name}</b><p>${upgrade.effect}</p><em>${active ? 'EQUIPPED' : '1 ✦'}</em></button>`;
        }).join('')}
      </div>
      <footer class="upgrade-note"><span>i</span><p><b>Why this structure?</b> Campaign rewards create long-term choices, while free respecs keep each stage a tactical puzzle instead of a permanent build trap.</p></footer>
    </section>`;
}

function renderCodex(): string {
  return `
    <section class="codex-view menu-view" aria-labelledby="front-end-title">
      <header class="menu-view-heading"><div><small>WARDEN FIELD MANUAL</small><h1 id="front-end-title" tabindex="-1">Learn the defense</h1></div><div class="codex-mark">▤</div></header>
      <div class="codex-layout">
        <aside class="codex-index"><small>CONTENTS</small>${CODEX_TOPICS.map((topic, index) => `<a href="#guide-${topic.id}"><span>${String(index + 1).padStart(2, '0')}</span>${topic.name}</a>`).join('')}</aside>
        <div class="codex-pages">
          <section class="codex-welcome"><span>V</span><div><small>START HERE</small><h2>The road, the gate, the choice</h2><p>Verdant Rift is won through preparation, coverage, and timely champion movement—not by filling every foundation with the same tower.</p></div></section>
          ${CODEX_TOPICS.map((topic) => `<article id="guide-${topic.id}"><span>${topic.glyph}</span><div><h2>${topic.name}</h2><p>${topic.copy}</p></div></article>`).join('')}
          <section class="tower-roles"><header><small>THE FOUR COVENANTS</small><b>Read the lane before you build</b></header><div><span><i>➶</i><b>Thornwatch</b><small>Rapid physical</small></span><span><i>✹</i><b>Ember Shrine</b><small>Splash and burn</small></span><span><i>♜</i><b>Aegis Bastion</b><small>Ground defenders</small></span><span><i>✦</i><b>Astral Spire</b><small>Arcane anti-air</small></span></div></section>
        </div>
      </div>
    </section>`;
}

function renderSettings(state: FrontEndRenderState): string {
  return `
    <section class="settings-view menu-view" aria-labelledby="front-end-title">
      <header class="menu-view-heading"><div><small>COMMAND CONFIGURATION</small><h1 id="front-end-title" tabindex="-1">Settings</h1></div><div class="settings-mark">⚙</div></header>
      <div class="settings-layout">
        <section><header><small>ACCESSIBILITY</small><h2>Presentation</h2></header><div class="settings-row"><button data-action="mute"><span>Sound</span><b data-mute-label>${state.muted ? 'OFF' : 'ON'}</b></button><button data-action="contrast"><span>Contrast</span><b data-contrast-label>${state.highContrast ? 'HIGH' : 'STANDARD'}</b></button><button data-action="motion"><span>Motion</span><b data-motion-label>${state.reducedMotion ? 'REDUCED' : 'FULL'}</b></button></div></section>
        <section><header><small>SOUND DIRECTION</small><h2>Dynamic mix</h2></header>${state.audioMixer}</section>
        <section class="settings-credits"><header><small>CREDITS &amp; LICENSES</small><h2>Music</h2></header><p>“Angevin”, “Noble Race” and “Killers” by Kevin MacLeod, licensed under CC BY 4.0.</p><div><a href="https://incompetech.com/" target="_blank" rel="noreferrer">Artist site ↗</a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">License ↗</a></div></section>
      </div>
    </section>`;
}
