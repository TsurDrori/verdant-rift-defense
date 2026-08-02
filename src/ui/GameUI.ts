import { TOWERS } from '../game/content/towers';
import { HERO_LEVEL_THRESHOLDS, HERO_MILESTONE_NAMES, heroXpProgress } from '../game/content/heroProgression';
import type { HeroId, TowerBranch, TowerId } from '../game/content/types';
import { WAVES } from '../game/content/waves';
import type { GameEvent, HeroState, TowerState } from '../game/simulation/state';
import { BUILD_PADS } from '../game/simulation/geometry';
import { assetUrl } from '../game/assets/url';
import { CampaignProfileStore } from '../game/campaign/CampaignProfile';
import { heroById, stageById, type CampaignStageId, type InsightUpgradeId, type MenuHeroId } from '../game/campaign/content';
import type { DifficultyId } from '../game/simulation/state';
import { GameController } from '../phaser/adapters/GameController';
import { renderFrontEndContent, renderFrontEndFrame, type FrontEndRenderState, type FrontEndRoute } from './FrontEndShell';

const towerGlyph: Record<TowerId, string> = { thorn: '➶', ember: '✹', aegis: '♜', astral: '✦' };

export function starRating(victory: boolean, lives: number, startingLives: number): string {
  if (!victory) return '☆☆☆';
  const integrity = startingLives > 0 ? lives / startingLives : 0;
  return integrity >= 0.9 ? '★★★' : integrity >= 0.5 ? '★★☆' : '★☆☆';
}

type AudioChannel = 'master' | 'music' | 'sfx' | 'ambience';
type AudioMix = Record<AudioChannel, number>;

const defaultAudioMix: AudioMix = { master: 0.82, music: 0.72, sfx: 0.88, ambience: 0.62 };

function storedAudioMix(): AudioMix {
  try {
    const stored = JSON.parse(localStorage.getItem('verdant-rift:audio-mix') ?? '{}') as Partial<AudioMix>;
    return Object.fromEntries((Object.keys(defaultAudioMix) as AudioChannel[]).map((channel) => {
      const value = Number(stored[channel]);
      return [channel, Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : defaultAudioMix[channel]];
    })) as AudioMix;
  } catch {
    return { ...defaultAudioMix };
  }
}

export class GameUI {
  private controller: GameController;
  private root: HTMLElement;
  private scheduled = false;
  private lastSelection = '';
  private lastPhase = '';
  private lastWaveCard = '';
  private lastHeroDock = '';
  private lastBoss = '';
  private pendingGold = 0;
  private readonly campaign = new CampaignProfileStore();
  private frontEndRoute: FrontEndRoute = 'campaign';
  private selectedMenuHero: MenuHeroId = 'kael';
  private audioMix = storedAudioMix();
  private muted = localStorage.getItem('verdant-rift:muted') === 'true';
  private highContrast = localStorage.getItem('verdant-rift:contrast') === 'true';
  private reducedMotion = localStorage.getItem('verdant-rift:motion') === 'reduced';
  private viewMode: 'focus' | 'overview' = window.matchMedia('(max-width: 620px)').matches ? 'focus' : 'overview';
  private focusWorldX = 800;
  private portraitLayout = window.matchMedia('(max-width: 620px)').matches;
  private contextPaused = false;
  private activeModal: HTMLElement | null = null;
  private focusBeforeModal: HTMLElement | null = null;

  constructor(root: HTMLElement, controller: GameController) {
    this.root = root;
    this.controller = controller;
    this.controller.setInsightLoadout(this.campaign.snapshot().insightLoadout);
    this.root.innerHTML = this.shell();
    this.syncModalAccessibility();
    document.documentElement.classList.toggle('high-contrast', this.highContrast);
    document.documentElement.classList.toggle('reduce-motion', this.reducedMotion);
    this.bind();
    this.applyViewMode(false);
    controller.addEventListener('state', () => this.scheduleRender());
    controller.addEventListener('game-event', ((event: CustomEvent<GameEvent>) => this.onGameEvent(event.detail)) as EventListener);
    controller.addEventListener('presentation-event', ((event: CustomEvent<GameEvent>) => this.onPresentationEvent(event.detail)) as EventListener);
    controller.addEventListener('runtime-ready', () => this.revealRuntimeReady());
    this.campaign.addEventListener('change', () => {
      this.controller.setInsightLoadout(this.campaign.snapshot().insightLoadout);
      this.renderFrontEnd();
    });
    this.render();
  }

  private shell(): string {
    return `
      <div class="hud" aria-live="polite">
        <section class="resource-ribbon panel" aria-label="Battle status">
          <div class="brand-mark"><span class="brand-rune">V</span><span><b>VERDANT RIFT</b><small>THE SUNKEN WAY</small></span></div>
          <div class="resource"><span class="resource-icon gold">◆</span><span><b data-gold>310</b><small>sunshards</small></span></div>
          <div class="resource"><span class="resource-icon lives">♥</span><span><b data-lives>20</b><small>gate</small></span></div>
          <div class="resource wave-resource"><span class="resource-icon wave">≋</span><span><b data-wave>0 / 12</b><small>wave</small></span></div>
        </section>

        <nav class="battle-controls panel" aria-label="Battle controls">
          <button class="icon-button" data-action="pause" aria-label="Pause"><span data-pause-icon>Ⅱ</span><small>ESC</small></button>
          <button class="icon-button" data-action="speed" aria-label="Toggle battle speed"><span data-speed>1×</span><small>F</small></button>
        </nav>

        <nav class="view-controls panel" data-view-controls data-mode="${this.viewMode}" aria-label="Map view controls">
          <button data-action="view-pan" data-direction="-1" aria-label="Pan battlefield left"><span>‹</span></button>
          <button class="view-mode-button" data-action="view-mode" aria-label="Show battlefield overview"><b data-view-title>OVERVIEW</b><small data-view-hint>FULL MAP</small></button>
          <button data-action="view-pan" data-direction="1" aria-label="Pan battlefield right"><span>›</span></button>
        </nav>

        <section class="boss-strip panel" data-boss-strip aria-label="Boss health">
          <div class="boss-copy"><small>SOVEREIGN • <span data-boss-phase>PHASE I</span></small><strong>THE HOLLOW BLOOM</strong></div>
          <div class="boss-meter"><i data-boss-health></i><span class="boss-break one"></span><span class="boss-break two"></span></div>
          <b data-boss-percent>100%</b>
        </section>
        <section class="wave-card panel" data-wave-card></section>
        <section class="selection-panel panel" data-selection-panel aria-label="Tower controls"></section>
        <button class="panel-scroll-affordance panel" data-panel-scroll-cue data-action="panel-scroll" aria-label="Show more tower controls"><span>MORE CONTROLS</span><b>↓</b></button>
        <section class="hero-dock" data-hero-dock></section>
        <div class="toast-stack" data-toast-stack></div>
      </div>

      ${renderFrontEndFrame(this.frontEndState())}

      <div class="modal-layer" data-pause-modal role="dialog" aria-modal="true" aria-labelledby="pause-title" tabindex="-1">
        <div class="pause-card panel-ornate"><div class="kicker">BATTLE SUSPENDED</div><h2 id="pause-title">The forest holds its breath.</h2><div class="settings-row" aria-label="Accessibility settings"><button data-action="mute"><span>Sound</span><b data-mute-label>${this.muted ? 'OFF' : 'ON'}</b></button><button data-action="contrast"><span>Contrast</span><b data-contrast-label>${this.highContrast ? 'HIGH' : 'STANDARD'}</b></button><button data-action="motion"><span>Motion</span><b data-motion-label>${this.reducedMotion ? 'REDUCED' : 'FULL'}</b></button></div>${this.audioMixerMarkup()}<button class="primary-button" data-action="pause">RETURN TO BATTLE</button></div>
      </div>
      <div class="modal-layer" data-end-modal role="dialog" aria-modal="true" aria-labelledby="end-title" tabindex="-1"></div>
    `;
  }

  private bind(): void {
    // Phaser listens on the canvas beneath this transparent HUD. Consume the
    // complete pointer sequence for actual HUD controls so a button press can
    // never also select or command the world behind it.
    for (const eventName of ['pointerdown', 'pointerup', 'contextmenu']) {
      this.root.addEventListener(eventName, (event) => event.stopPropagation());
    }
    this.root.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const towerUid = button.dataset.towerUid ? Number(button.dataset.towerUid) : undefined;
      if (action === 'menu-route') {
        const route = button.dataset.route as FrontEndRoute;
        if (['campaign', 'heroes', 'upgrades', 'codex', 'settings'].includes(route)) {
          this.frontEndRoute = route;
          this.renderFrontEnd();
          this.root.querySelector<HTMLElement>('[data-front-end-content] h1')?.focus({ preventScroll: true });
        }
      }
      else if (action === 'menu-stage') {
        const stage = stageById(button.dataset.stage as CampaignStageId);
        this.campaign.selectStage(stage.id);
        this.root.querySelector<HTMLElement>(`[data-stage="${stage.id}"]`)?.focus({ preventScroll: true });
      }
      else if (action === 'menu-hero') {
        this.selectedMenuHero = heroById(button.dataset.menuHero as MenuHeroId).id;
        this.renderFrontEnd();
        this.root.querySelector<HTMLElement>(`[data-menu-hero="${this.selectedMenuHero}"]`)?.focus({ preventScroll: true });
      }
      else if (action === 'begin') {
        const stage = stageById(this.campaign.snapshot().selectedStageId);
        if (!stage.playable || !this.controller.isRuntimeReady()) return;
        this.controller.begin();
        this.root.querySelector('[data-briefing]')?.classList.remove('is-open');
        this.syncModalAccessibility();
        (document.activeElement as HTMLElement | null)?.blur();
        // Establish portrait world coordinates before the next pointer can be
        // delivered. Deferring all centering by multiple animation frames let
        // a fast pan/build gesture race against the initial scroll position.
        this.applyViewMode(false);
        requestAnimationFrame(() => { document.scrollingElement?.scrollTo(0, 0); document.querySelector<HTMLElement>('#app')?.scrollTo(0, 0); });
      }
      else if (action === 'pause') {
        // A portrait context panel owns the pause it opened. Treat the global
        // pause command as "close and resume" so combat can never restart
        // beneath a panel that still claims the battle is suspended.
        if (this.contextPaused) this.closeContextPanel();
        else this.controller.togglePause();
      }
      else if (action === 'speed' && !this.controlsAreGated()) this.controller.toggleSpeed();
      else if (action === 'wave' && !this.controlsAreGated()) this.controller.startWave();
      else if (action === 'upgrade') this.controller.upgrade(towerUid, this.contextPaused);
      else if (action === 'sell') this.controller.sell(towerUid, this.contextPaused);
      else if (action === 'priority') this.controller.cyclePriority(towerUid, this.contextPaused);
      else if (action === 'close') this.closeContextPanel();
      else if (action === 'build') this.controller.build(button.dataset.tower as TowerId, this.contextPaused);
      else if (action === 'branch') this.controller.branch(button.dataset.branch as TowerBranch, towerUid, this.contextPaused);
      else if (action === 'hero') { this.controller.selectHero(button.dataset.hero as HeroId); this.resumeContextPause(); }
      else if (action === 'ability') this.controller.armAbility(button.dataset.hero as HeroId);
      else if (action === 'view-mode' && !this.controlsAreGated()) this.setViewMode(this.viewMode === 'focus' ? 'overview' : 'focus');
      else if (action === 'view-pan' && !this.controlsAreGated()) this.panFocusedView(Number(button.dataset.direction) || 0);
      else if (action === 'panel-scroll') this.scrollContextPanel();
      else if (action === 'difficulty') {
        this.controller.setDifficulty(button.dataset.difficulty as DifficultyId);
        this.root.querySelectorAll('[data-action="difficulty"]').forEach((option) => option.classList.toggle('is-selected', option === button));
      }
      else if (action === 'insight') {
        const id = button.dataset.upgrade as InsightUpgradeId;
        this.campaign.toggleInsight(id);
        this.root.querySelector<HTMLElement>(`[data-upgrade="${id}"]`)?.focus({ preventScroll: true });
      }
      else if (action === 'insight-reset') this.campaign.resetInsight();
      else if (action === 'restart') window.location.reload();
      else if (action === 'mute') {
        this.muted = !this.muted; localStorage.setItem('verdant-rift:muted', String(this.muted)); this.setText('[data-mute-label]', this.muted ? 'OFF' : 'ON');
        this.root.dispatchEvent(new CustomEvent('audio-toggle', { detail: { muted: this.muted } }));
      } else if (action === 'contrast') {
        this.highContrast = !this.highContrast; localStorage.setItem('verdant-rift:contrast', String(this.highContrast)); document.documentElement.classList.toggle('high-contrast', this.highContrast); this.setText('[data-contrast-label]', this.highContrast ? 'HIGH' : 'STANDARD');
      } else if (action === 'motion') {
        this.reducedMotion = !this.reducedMotion; localStorage.setItem('verdant-rift:motion', this.reducedMotion ? 'reduced' : 'full'); document.documentElement.classList.toggle('reduce-motion', this.reducedMotion); this.setText('[data-motion-label]', this.reducedMotion ? 'REDUCED' : 'FULL');
      }
      this.render();
    });
    this.root.addEventListener('input', (event) => {
      const input = (event.target as HTMLElement).closest<HTMLInputElement>('input[data-audio-channel]');
      if (!input) return;
      const channel = input.dataset.audioChannel as AudioChannel;
      if (!(channel in this.audioMix)) return;
      const value = Math.max(0, Math.min(1, Number(input.value)));
      this.audioMix[channel] = value;
      localStorage.setItem('verdant-rift:audio-mix', JSON.stringify(this.audioMix));
      const output = this.root.querySelector<HTMLOutputElement>(`[data-audio-value="${channel}"]`);
      if (output) output.value = `${Math.round(value * 100)}%`;
      this.root.dispatchEvent(new CustomEvent('audio-settings', { detail: { [channel]: value } }));
    });
    // Capture before Phaser or browser shortcuts can redirect focus outside an
    // active dialog. Inert remains the structural backstop for pointer/AT use.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') this.trapModalFocus(event);
    }, true);
    document.addEventListener('focusin', (event) => {
      const modal = this.root.querySelector<HTMLElement>('.modal-layer.is-open');
      if (modal && !modal.contains(event.target as Node)) this.focusModal(modal);
    }, true);
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') {
        if (this.contextPaused) this.closeContextPanel();
        else if (this.root.querySelector('[data-pause-modal].is-open')) this.controller.togglePause();
        return;
      }
      if (this.controlsAreGated()) return;
      if (event.code === 'Space') { event.preventDefault(); this.controller.startWave(); }
      if (event.code === 'KeyF') this.controller.toggleSpeed();
      if (event.code === 'KeyQ') this.controller.selectAdjacentPad(-1);
      if (event.code === 'KeyE') this.controller.selectAdjacentPad(1);
      if (event.code === 'KeyZ') { this.controller.selectHero('kael'); this.resumeContextPause(); }
      if (event.code === 'KeyX') { this.controller.selectHero('lyra'); this.resumeContextPause(); }
      if (event.code === 'KeyW') this.controller.nudgeSelectedHero(0, -55);
      if (event.code === 'KeyS') this.controller.nudgeSelectedHero(0, 55);
      if (event.code === 'KeyA') this.controller.nudgeSelectedHero(-55, 0);
      if (event.code === 'KeyD') this.controller.nudgeSelectedHero(55, 0);
      if (event.code === 'Digit1') this.controller.castAtFrontline('kael');
      if (event.code === 'Digit2') this.controller.castAtFrontline('lyra');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.controller.snapshot().phase === 'playing') this.controller.togglePause();
    });
    document.querySelector<HTMLElement>('#game-root')?.addEventListener('scroll', () => this.captureFocusedWorld(), { passive: true });
    this.root.querySelector<HTMLElement>('[data-selection-panel]')?.addEventListener('scroll', () => this.syncPanelScrollAffordance(), { passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(() => this.syncResponsiveLayout()));
  }

  private applyViewMode(smooth: boolean): void {
    const focused = this.portraitLayout && this.viewMode === 'focus';
    document.documentElement.classList.toggle('portrait-focus', focused);
    const controls = this.root.querySelector<HTMLElement>('[data-view-controls]');
    if (controls) controls.dataset.mode = this.viewMode;
    this.setText('[data-view-title]', this.viewMode === 'focus' ? 'OVERVIEW' : 'FOCUS MAP');
    this.setText('[data-view-hint]', this.viewMode === 'focus' ? 'FULL MAP' : 'TACTICAL ZOOM');
    const toggle = this.root.querySelector<HTMLElement>('[data-action="view-mode"]');
    toggle?.setAttribute('aria-label', this.viewMode === 'focus' ? 'Show battlefield overview' : 'Focus battlefield for touch play');
    if (focused) {
      if (smooth) requestAnimationFrame(() => requestAnimationFrame(() => this.centerFocusedWorld(this.focusWorldX, true)));
      else this.centerFocusedWorld(this.focusWorldX, false);
    }
    else document.querySelector<HTMLElement>('#game-root')?.scrollTo({ left: 0, behavior: 'auto' });
  }

  private setViewMode(mode: 'focus' | 'overview', worldX = this.focusWorldX): void {
    if (this.viewMode === 'focus') this.captureFocusedWorld();
    this.viewMode = mode;
    this.focusWorldX = Math.max(0, Math.min(1600, worldX));
    this.applyViewMode(true);
  }

  private panFocusedView(direction: number): void {
    if (!this.portraitLayout) return;
    if (this.viewMode !== 'focus') { this.setViewMode('focus'); return; }
    const root = document.querySelector<HTMLElement>('#game-root');
    if (!root) return;
    // Arrow commands are discrete tactical steps. Snap to the resolved offset
    // so a follow-up tap cannot race a still-moving canvas and command the
    // wrong world coordinate; ornamental easing is reserved for mode changes.
    const target = root.scrollLeft + direction * Math.max(220, root.clientWidth * 0.68);
    const inlineScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    root.scrollLeft = Math.max(0, Math.min(root.scrollWidth - root.clientWidth, target));
    root.style.scrollBehavior = inlineScrollBehavior;
    this.captureFocusedWorld();
  }

  private captureFocusedWorld(): void {
    if (!this.portraitLayout || this.viewMode !== 'focus') return;
    const root = document.querySelector<HTMLElement>('#game-root');
    const canvas = root?.querySelector<HTMLCanvasElement>('canvas');
    if (!root || !canvas || canvas.offsetWidth === 0) return;
    this.focusWorldX = Math.max(0, Math.min(1600, ((root.scrollLeft + root.clientWidth / 2 - canvas.offsetLeft) / canvas.offsetWidth) * 1600));
  }

  private centerFocusedWorld(worldX: number, smooth = false): void {
    const root = document.querySelector<HTMLElement>('#game-root');
    const canvas = root?.querySelector<HTMLCanvasElement>('canvas');
    if (!root || !canvas) return;
    const left = canvas.offsetLeft + canvas.offsetWidth * (worldX / 1600) - root.clientWidth / 2;
    root.scrollTo({ left: Math.max(0, Math.min(root.scrollWidth - root.clientWidth, left)), behavior: smooth && !this.reducedMotion ? 'smooth' : 'auto' });
  }

  private syncResponsiveLayout(): void {
    const portrait = window.matchMedia('(max-width: 620px)').matches;
    if (this.portraitLayout && !portrait) {
      this.captureFocusedWorld();
      this.resumeContextPause();
    }
    this.portraitLayout = portrait;
    if (this.contextPaused && !this.usesTacticalContextPause()) this.resumeContextPause();
    this.applyViewMode(false);
  }

  private usesTacticalContextPause(): boolean {
    return this.portraitLayout || window.matchMedia('(max-height: 620px) and (min-width: 621px)').matches;
  }

  private pauseForContextPanel(): void {
    if (!this.usesTacticalContextPause() || this.contextPaused || this.controller.snapshot().phase !== 'playing') return;
    this.contextPaused = true;
    document.documentElement.classList.add('tactical-context-pause');
    this.controller.togglePause();
  }

  private resumeContextPause(): void {
    if (!this.contextPaused) return;
    this.contextPaused = false;
    document.documentElement.classList.remove('tactical-context-pause');
    if (this.controller.snapshot().phase === 'paused') this.controller.togglePause();
  }

  private controlsAreGated(): boolean {
    return this.contextPaused || Boolean(this.root.querySelector('.modal-layer.is-open'));
  }

  private trapModalFocus(event: KeyboardEvent): boolean {
    const modal = this.root.querySelector<HTMLElement>('.modal-layer.is-open');
    if (!modal) return false;
    const focusable = [...modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
    if (focusable.length === 0) { event.preventDefault(); modal.focus(); return true; }
    const current = document.activeElement as HTMLElement | null;
    const index = current ? focusable.indexOf(current) : -1;
    event.preventDefault();
    const nextIndex = index < 0
      ? (event.shiftKey ? focusable.length - 1 : 0)
      : (index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
    focusable[nextIndex]?.focus();
    return true;
  }

  private focusModal(modal: HTMLElement): void {
    const preferred = modal.matches('[data-briefing]')
      ? modal.querySelector<HTMLElement>('[data-action="difficulty"].is-selected, [data-action="menu-route"].is-selected')
      : modal.querySelector<HTMLElement>('.primary-button, button:not(:disabled), input:not(:disabled)');
    (preferred ?? modal).focus();
  }

  private syncModalAccessibility(): void {
    const modal = this.root.querySelector<HTMLElement>('.modal-layer.is-open');
    const hud = this.root.querySelector<HTMLElement>('.hud');
    if (hud) {
      hud.inert = Boolean(modal);
      if (modal) hud.setAttribute('aria-hidden', 'true'); else hud.removeAttribute('aria-hidden');
    }
    for (const candidate of this.root.querySelectorAll<HTMLElement>('.modal-layer')) {
      const isActive = candidate === modal;
      candidate.inert = !isActive;
      candidate.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    }
    if (modal === this.activeModal) return;
    const previousModal = this.activeModal;
    if (modal && !previousModal) this.focusBeforeModal = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.activeModal = modal;
    if (modal) {
      this.focusModal(modal);
    } else if (previousModal) {
      const restore = this.focusBeforeModal;
      this.focusBeforeModal = null;
      requestAnimationFrame(() => {
        if (restore?.isConnected && !restore.closest('[inert]')) restore.focus();
      });
    }
  }

  private closeContextPanel(): void {
    this.controller.clearSelection();
    // Release DOM/canvas ownership synchronously. Waiting for the memoized
    // render pass could leave `context-panel-open` on <html> for one frame,
    // swallowing a fast follow-up tower tap even though the panel was gone.
    const panel = this.root.querySelector<HTMLElement>('[data-selection-panel]');
    panel?.classList.remove('is-visible');
    if (panel) panel.innerHTML = '';
    this.lastSelection = '';
    document.documentElement.classList.remove('context-panel-open');
    this.syncPanelScrollAffordance();
    this.resumeContextPause();
  }

  private scrollContextPanel(): void {
    const panel = this.root.querySelector<HTMLElement>('[data-selection-panel]');
    panel?.scrollBy({ top: Math.max(120, panel.clientHeight * 0.72), behavior: this.reducedMotion ? 'auto' : 'smooth' });
    requestAnimationFrame(() => this.syncPanelScrollAffordance());
  }

  private syncPanelScrollAffordance(): void {
    const panel = this.root.querySelector<HTMLElement>('[data-selection-panel]');
    const cue = this.root.querySelector<HTMLElement>('[data-panel-scroll-cue]');
    if (!panel || !cue) return;
    const shallow = window.matchMedia('(max-height: 620px) and (min-width: 621px)').matches;
    const remaining = panel.scrollHeight - panel.clientHeight - panel.scrollTop;
    const finalOathVisible = Boolean(panel.querySelector('.branch-grid'));
    cue.classList.toggle('is-visible', shallow && panel.classList.contains('is-visible') && !finalOathVisible && remaining > 4);
    cue.dataset.side = panel.dataset.side ?? 'right';
  }

  private queuePanelScrollAffordance(): void {
    requestAnimationFrame(() => requestAnimationFrame(() => this.syncPanelScrollAffordance()));
  }

  private contextPauseMarkup(): string {
    return '<div class="context-pause-banner"><span>Ⅱ</span><b>TACTICAL PAUSE</b><small>Close to resume battle</small></div>';
  }

  private frontEndState(): FrontEndRenderState {
    return {
      route: this.frontEndRoute,
      profile: this.campaign.snapshot(),
      selectedHeroId: this.selectedMenuHero,
      difficulty: this.controller.snapshot().difficulty,
      muted: this.muted,
      highContrast: this.highContrast,
      reducedMotion: this.reducedMotion,
      runtimeReady: this.controller.isRuntimeReady(),
      audioMixer: this.audioMixerMarkup(),
    };
  }

  private renderFrontEnd(): void {
    const state = this.frontEndState();
    const content = this.root.querySelector<HTMLElement>('[data-front-end-content]');
    if (content) content.innerHTML = renderFrontEndContent(state);
    this.root.querySelectorAll<HTMLElement>('[data-action="menu-route"]').forEach((button) => {
      const selected = button.dataset.route === state.route;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
  }

  private revealRuntimeReady(): void {
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="begin"]');
    if (button) {
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
    }
    this.setText('[data-runtime-label]', 'FIRST CLEAR REWARD');
    const profile = this.campaign.snapshot();
    this.setText('[data-runtime-status]', profile.insightEarned > 0 ? `${profile.insightLoadout.length} / ${profile.insightEarned} insight equipped` : 'UNLOCKS AFTER YOUR FIRST CLEAR');
  }

  private audioMixerMarkup(): string {
    const labels: Record<AudioChannel, string> = { master: 'Master', music: 'Music', sfx: 'Combat', ambience: 'World' };
    return `<section class="audio-mixer" aria-label="Audio mix"><header><small>AUDIO MIX</small><span>Drag to balance</span></header><div>${(Object.keys(labels) as AudioChannel[]).map((channel) => {
      const percent = Math.round(this.audioMix[channel] * 100);
      return `<label class="audio-channel"><span>${labels[channel]}<output data-audio-value="${channel}">${percent}%</output></span><input type="range" min="0" max="1" step="0.01" value="${this.audioMix[channel]}" data-audio-channel="${channel}" aria-label="${labels[channel]} volume"></label>`;
    }).join('')}</div></section>`;
  }

  private scheduleRender(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => { this.scheduled = false; this.render(); });
  }

  private render(): void {
    const snapshot = this.controller.snapshot();
    this.setText('[data-gold]', String(Math.max(0, snapshot.gold - this.pendingGold)));
    this.setText('[data-lives]', String(snapshot.lives));
    this.setText('[data-wave]', `${snapshot.wave} / ${snapshot.waveTotal}`);
    this.setText('[data-speed]', `${snapshot.speed}×`);
    const pauseModal = this.root.querySelector('[data-pause-modal]');
    pauseModal?.classList.toggle('is-open', snapshot.phase === 'paused' && !this.contextPaused);
    this.renderWaveCard();
    this.renderBoss();
    this.renderHeroes(snapshot.heroes);
    const selectionKey = JSON.stringify([this.controller.selection, snapshot.gold, snapshot.towers.map((tower) => [tower.uid, tower.level, tower.branch, tower.priority])]);
    if (selectionKey !== this.lastSelection) { this.lastSelection = selectionKey; this.renderSelection(); }
    const presentedPhase = snapshot.phase === 'victory' && this.controller.hasPendingLethalPresentation() ? 'playing' : snapshot.phase;
    if (presentedPhase !== this.lastPhase) { this.lastPhase = presentedPhase; this.renderEnd(presentedPhase); }
    this.syncModalAccessibility();
  }

  private renderWaveCard(): void {
    const target = this.root.querySelector<HTMLElement>('[data-wave-card]');
    if (!target) return;
    const snapshot = this.controller.snapshot();
    const next = WAVES[snapshot.wave];
    const alive = snapshot.enemies.filter((enemy) => enemy.alive).length;
    const hidden = !next || snapshot.phase === 'victory' || snapshot.phase === 'defeat';
    const mode = hidden ? 'hidden' : snapshot.waveActive && !snapshot.canCallWave ? 'live' : 'callable';
    // Structural state is deliberately independent of rapidly changing values
    // such as alive count and intermission bonus. Replacing innerHTML while the
    // Call Wave button is under a pointer detaches the interaction target and
    // makes valid early calls intermittently impossible at 2x speed.
    const renderKey = `${mode}:${snapshot.wave}:${next?.label ?? ''}`;
    if (renderKey !== this.lastWaveCard) {
      this.lastWaveCard = renderKey;
      if (mode === 'live') {
        target.innerHTML = '<div class="wave-live"><span class="pulse-dot"></span><div><small data-wave-live-title></small><b data-wave-alive></b></div></div>';
      } else if (mode === 'callable') {
        target.innerHTML = `
          <div class="wave-intel"><div><small data-wave-next></small><b data-wave-label></b><p data-wave-intel></p></div>
          <button class="call-wave" data-action="wave"><span class="call-icon">⚔</span><span>CALL WAVE<small data-wave-bonus></small></span></button></div>`;
      }
    }
    if (hidden) { target.classList.remove('is-visible'); return; }
    target.classList.add('is-visible');
    if (mode === 'live') {
      this.setText('[data-wave-live-title]', `WAVE ${snapshot.wave} IN MOTION`);
      this.setText('[data-wave-alive]', `${alive} ${alive === 1 ? 'foe' : 'foes'} on the road`);
    } else if (next) {
      const bonus = snapshot.wave === 0 ? 0 : Math.min(45, Math.floor(snapshot.intermission * 2.2));
      this.setText('[data-wave-next]', `NEXT • WAVE ${snapshot.wave + 1}`);
      this.setText('[data-wave-label]', next.label);
      this.setText('[data-wave-intel]', next.intel);
      this.setText('[data-wave-bonus]', bonus > 0 ? `+${bonus} ◆ EARLY` : 'SPACE');
    }
  }

  private renderBoss(): void {
    const target = this.root.querySelector<HTMLElement>('[data-boss-strip]');
    if (!target) return;
    const boss = this.controller.snapshot().enemies.find((enemy) => enemy.alive && enemy.type === 'bloomlord');
    const key = boss ? `${Math.ceil(boss.hp)}:${boss.bossPhase}` : 'none';
    if (key === this.lastBoss) return;
    this.lastBoss = key;
    target.classList.toggle('is-visible', Boolean(boss));
    if (!boss) return;
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    const health = target.querySelector<HTMLElement>('[data-boss-health]');
    if (health) health.style.transform = `scaleX(${ratio})`;
    this.setText('[data-boss-percent]', `${Math.ceil(ratio * 100)}%`);
    this.setText('[data-boss-phase]', `PHASE ${['I', 'II', 'III'][boss.bossPhase] ?? 'III'}`);
  }

  private renderHeroes(heroes: readonly HeroState[]): void {
    const dock = this.root.querySelector<HTMLElement>('[data-hero-dock]');
    if (!dock) return;
    const renderKey = JSON.stringify([this.controller.selection, this.controller.armedAbility, heroes.map((hero) => [Math.ceil(hero.ultimateCooldown), Math.ceil(hero.hp), Math.ceil(hero.maxHp), hero.alive, Math.ceil(hero.respawnTime), hero.engagedEnemyUid, hero.level, hero.xp, hero.ownKills, hero.milestones, hero.starseedPrimed])]);
    if (renderKey === this.lastHeroDock) return;
    this.lastHeroDock = renderKey;
    dock.innerHTML = heroes.map((hero, index) => {
      const selected = this.controller.selection.kind === 'hero' && this.controller.selection.heroId === hero.id;
      const cooldown = Math.ceil(hero.ultimateCooldown);
      const charge = Math.max(0, 1 - hero.ultimateCooldown / hero.ultimateMax);
      const health = Math.max(0, hero.hp / hero.maxHp);
      const respawn = Math.ceil(hero.respawnTime);
      const xp = heroXpProgress(hero.level, hero.xp);
      const maxLevel = hero.level >= HERO_LEVEL_THRESHOLDS.length;
      const milestoneLevels = [2, 4, 6];
      const milestonePips = milestoneLevels.map((level, milestoneIndex) => {
        const milestone = hero.milestones[milestoneIndex];
        const label = milestone ? HERO_MILESTONE_NAMES[milestone] : `Unlocks at level ${level}`;
        return `<i class="hero-milestone ${hero.level >= level ? 'is-earned' : ''}" title="${label}" aria-label="${label}"></i>`;
      }).join('');
      return `<article class="hero-card panel ${selected ? 'is-selected' : ''} ${hero.alive ? '' : 'is-down'}" data-hero-card="${hero.id}" style="--hero:#${hero.accent.toString(16).padStart(6, '0')}">
        <button class="hero-portrait" data-action="hero" data-hero="${hero.id}" aria-label="Select ${hero.name} • ${hero.alive ? `${Math.ceil(hero.hp)} health` : `respawns in ${respawn}` }" title="${hero.name}"><img src="${assetUrl(`assets/heroes/${hero.id}.png`)}" alt="" draggable="false"><i class="hero-charge" style="--charge:${charge}"></i><span class="hero-health" style="--health:${health}"></span>${hero.alive ? '' : `<strong class="hero-respawn">${respawn}</strong>`}</button>
        <div class="hero-copy"><small><span class="hero-rank-label">CHAMPION ${index + 1} • </span><strong data-hero-level>LV ${hero.level}</strong></small><b>${hero.name.split(' • ')[0]}</b><span data-hero-hp>HP ${Math.ceil(hero.hp)} / ${Math.ceil(hero.maxHp)}</span><div class="hero-xp-row"><span data-hero-xp>${maxLevel ? `${hero.xp} / ${hero.xp} MASTERED` : `${xp.current} / ${xp.required} XP`}</span><em>${milestonePips}</em></div><div class="hero-xp-track" role="progressbar" aria-label="${hero.name} experience" aria-valuemin="0" aria-valuemax="${xp.required}" aria-valuenow="${xp.current}"><i style="--xp:${xp.ratio}"></i></div></div>
        <button class="ability-button ${this.controller.armedAbility === hero.id ? 'is-armed' : ''}" data-action="ability" data-hero="${hero.id}" ${cooldown > 0 || !hero.alive ? 'disabled' : ''} aria-label="${hero.alive ? `Use ${hero.name} ultimate` : `${hero.name} respawns in ${respawn}`}">
          <span>${hero.id === 'kael' ? '❈' : '✧'}</span><b>${hero.alive ? (cooldown > 0 ? cooldown : index + 1) : respawn}</b>
        </button>
      </article>`;
    }).join('');
  }

  private renderSelection(): void {
    const panel = this.root.querySelector<HTMLElement>('[data-selection-panel]');
    if (!panel) return;
    const selection = this.controller.selection;
    if (selection.kind === 'none' || selection.kind === 'hero') { panel.classList.remove('is-visible'); panel.innerHTML = ''; delete panel.dataset.side; document.documentElement.classList.remove('context-panel-open'); this.syncPanelScrollAffordance(); return; }
    panel.classList.add('is-visible');
    // Phaser's input manager listens above the canvas. Explicitly gate canvas
    // input while a DOM context panel is active so pointer-down cannot select a
    // hero behind a build/upgrade button before the DOM click is handled.
    document.documentElement.classList.add('context-panel-open');
    if (selection.kind === 'pad') {
      this.pauseForContextPanel();
      if (this.portraitLayout && this.viewMode === 'focus') this.centerFocusedWorld(BUILD_PADS[selection.padIndex]!.x, true);
      panel.dataset.side = selection.padIndex >= 2 && selection.padIndex <= 7 ? 'left' : 'right';
      panel.innerHTML = `${this.contextPauseMarkup()}<header><div><small>FOUNDATION ${selection.padIndex + 1}</small><h3>Choose a covenant</h3></div><button data-action="close" class="close-button" aria-label="Close tower controls and resume battle">×</button></header>
        <div class="tower-grid">${(Object.keys(TOWERS) as TowerId[]).map((id) => {
          const tower = TOWERS[id];
          const canBuy = this.controller.snapshot().gold >= tower.cost;
          return `<button class="tower-option" data-action="build" data-tower="${id}" ${canBuy ? '' : 'disabled'} style="--tower:#${tower.accent.toString(16).padStart(6, '0')}">
            <span class="tower-glyph">${towerGlyph[id]}</span><span><b>${tower.name}</b><small>${tower.role}</small></span><em>${tower.cost} ◆</em>
          </button>`;
        }).join('')}</div>`;
      panel.scrollTop = 0;
      this.queuePanelScrollAffordance();
      return;
    }
    const tower = this.controller.selectedTower();
    if (!tower) { panel.classList.remove('is-visible'); panel.innerHTML = ''; delete panel.dataset.towerUid; document.documentElement.classList.remove('context-panel-open'); this.syncPanelScrollAffordance(); return; }
    panel.dataset.towerUid = String(tower.uid);
    this.pauseForContextPanel();
    if (this.portraitLayout && this.viewMode === 'focus') this.centerFocusedWorld(BUILD_PADS[tower.padIndex]!.x, true);
    panel.dataset.side = tower.padIndex >= 2 && tower.padIndex <= 7 ? 'left' : 'right';
    const definition = TOWERS[tower.type];
    const next = tower.level < 3 ? definition.upgrades[tower.level - 1] : undefined;
    panel.innerHTML = `${this.contextPauseMarkup()}<header><div><small>${tower.branch ? definition.branches[tower.branch].name.toUpperCase() : `RANK ${tower.level} • ${definition.role.toUpperCase()}`}</small><h3>${definition.name}</h3></div><button data-action="close" class="close-button" aria-label="Close tower controls and resume battle">×</button></header>
      <p class="tower-description">${tower.branch ? definition.branches[tower.branch].description : definition.description}</p>
      <div class="tower-stats"><span><i>DMG</i><b>${this.towerDamage(tower)}</b></span><span><i>RANGE</i><b>${this.towerRange(tower)}</b></span><span><i>TAKEDOWNS</i><b>${tower.kills}</b></span></div>
      <button class="priority-button" data-action="priority" data-tower-uid="${tower.uid}"><span>Target priority</span><b>${tower.priority.toUpperCase()}</b></button>
      ${next ? `<button class="wide-upgrade" data-action="upgrade" data-tower-uid="${tower.uid}" ${this.controller.snapshot().gold < next.cost ? 'disabled' : ''}><span><b>RAISE TO RANK ${tower.level + 1}</b><small>Damage, range & tempo</small></span><em>${next.cost} ◆</em></button>` : ''}
      ${tower.level === 3 && !tower.branch ? `<div class="branch-label"><span></span>CHOOSE FINAL OATH<span></span></div><div class="branch-grid">${(['left', 'right'] as TowerBranch[]).map((branch) => {
        const option = definition.branches[branch];
        return `<button class="branch-option" data-action="branch" data-branch="${branch}" data-tower-uid="${tower.uid}" ${this.controller.snapshot().gold < option.cost ? 'disabled' : ''} style="--branch:#${option.color.toString(16).padStart(6, '0')}"><b>${option.name}</b><small>${option.description}</small><em>${option.cost} ◆</em></button>`;
      }).join('')}</div>` : ''}
      <button class="sell-button" data-action="sell" data-tower-uid="${tower.uid}">Dismantle <span>+${Math.floor(tower.totalSpent * 0.7)} ◆</span></button>`;
    panel.scrollTop = 0;
    this.queuePanelScrollAffordance();
  }

  private towerDamage(tower: TowerState): string {
    const definition = TOWERS[tower.type];
    const base = tower.level === 1 ? definition.damage : definition.upgrades[tower.level - 2]!.damage;
    return String(Math.round(base * (tower.branch ? definition.branches[tower.branch].damageMultiplier : 1)));
  }

  private towerRange(tower: TowerState): string {
    const definition = TOWERS[tower.type];
    const base = tower.level === 1 ? definition.range : definition.upgrades[tower.level - 2]!.range;
    return String(Math.round(base * (tower.branch ? definition.branches[tower.branch].rangeMultiplier : 1)));
  }

  private onGameEvent(event: GameEvent): void {
    if (event.type === 'enemy-hit' && event.lethal) { this.pendingGold += event.bounty; this.scheduleRender(); }
    else if (event.type === 'hero-level-up') {
      const hero = this.controller.snapshot().heroes.find((candidate) => candidate.id === event.hero);
      const unlock = event.unlocked ? ` • ${HERO_MILESTONE_NAMES[event.unlocked]} unlocked` : '';
      this.toast(`${hero?.name.split(' • ')[0] ?? event.hero} reaches LV ${event.level}${unlock}`, 'good');
    }
    else if (event.type === 'toast') this.toast(event.message, event.tone);
    else if (event.type === 'wave-started') this.toast(`Wave ${event.wave} marches${event.bonus ? ` • +${event.bonus} early bonus` : ''}`, 'info');
    else if (event.type === 'wave-cleared') this.toast(`Wave ${event.wave} broken. The rift yields.`, 'good');
  }

  private onPresentationEvent(event: GameEvent): void {
    if (event.type !== 'enemy-hit' || !event.lethal) return;
    this.pendingGold = Math.max(0, this.pendingGold - event.bounty);
    this.scheduleRender();
  }

  private toast(message: string, tone: 'good' | 'danger' | 'info'): void {
    const stack = this.root.querySelector<HTMLElement>('[data-toast-stack]');
    if (!stack) return;
    // Keep rapid build/branch actions from erecting a banner wall over combat.
    // Two compact notices preserve feedback without obscuring the lane.
    while (stack.children.length >= 2) stack.firstElementChild?.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.innerHTML = `<span>${tone === 'good' ? '✦' : tone === 'danger' ? '!' : '◆'}</span><p>${message}</p>`;
    stack.append(toast);
    window.setTimeout(() => toast.classList.add('leaving'), 2600);
    window.setTimeout(() => toast.remove(), 3100);
  }

  private renderEnd(phase: string): void {
    const modal = this.root.querySelector<HTMLElement>('[data-end-modal]');
    if (!modal) return;
    if (phase !== 'victory' && phase !== 'defeat') { modal.classList.remove('is-open'); return; }
    const victory = phase === 'victory';
    const snapshot = this.controller.snapshot();
    let insight = '';
    const stars = starRating(victory, snapshot.lives, snapshot.startingLives);
    if (victory) {
      const filledStars = stars.split('').filter((star) => star === '★').length as 1 | 2 | 3;
      const clear = this.campaign.recordStageClear('sunken-way', filledStars, snapshot.score, snapshot.difficulty);
      insight = clear.firstClear
        ? `<div class="insight-reward">✦ FIRST CLEAR • +${clear.insightAwarded} INSIGHT <small>Spend it in the Insight Grove before your next deployment.</small></div>`
        : '<div class="insight-reward muted">REPLAY CLEAR • BEST RESULTS PRESERVED</div>';
    }
    const heroResults = snapshot.heroes.map((hero) => `<span data-result-hero="${hero.id}"><b>${hero.name.split(' • ')[0]} • LV ${hero.level}</b><small>${hero.ownKills} OWN KILLS • ${hero.xp} XP</small></span>`).join('');
    modal.innerHTML = `<div class="end-card panel-ornate ${victory ? 'victory' : 'defeat'}"><div class="end-sigil">${victory ? '✦' : '✕'}</div><div class="kicker">${victory ? 'THE RIFT ENDURES' : 'THE GATE HAS FALLEN'}</div><h2 id="end-title">${victory ? 'A green dawn returns.' : 'The Hollow Bloom takes root.'}</h2><div class="star-rating" aria-label="${stars.replaceAll('★','filled ').replaceAll('☆','empty ')}">${stars}</div><p>${victory ? 'Your rival covenants stood as one. The forest will remember this defense.' : 'Change your damage mix, specialize sooner, and move your champions where the line bends.'}</p>${insight}<div class="result-stats"><span><b>${snapshot.score.toLocaleString()}</b><small>RENOWN</small></span><span><b>${snapshot.lives}</b><small>GATE</small></span><span><b>${snapshot.towers.length}</b><small>TOWERS</small></span></div><div class="hero-results">${heroResults}</div><button class="primary-button" data-action="restart">${victory ? 'DEFEND AGAIN' : 'RETAKE THE RIFT'}</button></div>`;
    modal.classList.add('is-open');
  }

  private setText(selector: string, value: string): void { const element = this.root.querySelector(selector); if (element && element.textContent !== value) element.textContent = value; }
}
