import type { GameEvent, GameSnapshot } from '../simulation/state';
import type { EnemyId } from '../content/types';
import type { GameController } from '../../phaser/adapters/GameController';
import { BUILD_PADS } from '../simulation/geometry';
import { assetUrl } from '../assets/url';
import {
  advanceScoreModeGate,
  ADAPTIVE_ARRANGEMENT,
  dbToGain,
  MUSIC_CUES,
  requestedScoreMode,
  SCORE_ACCENT_FORM_STEPS,
  SCORE_ACCENT_PATTERNS,
  SCORE_BPM,
  SCORE_STEPS,
  type MusicCueId,
  type ScoreModeGateState,
  type ScoreMode,
} from './ScoreComposition';

interface AudioMix {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
}

type BusName = 'music' | 'sfx' | 'ambience';
type VoicePriority = 0 | 1 | 2;

interface VoiceCounts {
  ambient: number;
  standard: number;
  critical: number;
}

interface MusicVoice {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  cue: MusicCueId;
  startAt: number;
  offset: number;
  loop: boolean;
}

type MusicTransportEventKind = 'mode-request' | 'mode-enter' | 'source-start' | 'source-stop' | 'program-switch';

interface MusicTransportEvent {
  sequence: number;
  kind: MusicTransportEventKind;
  at: number;
  mode: ScoreMode;
  cue?: MusicCueId;
  fromCue?: MusicCueId;
  offset?: number;
  reason?: string;
}

type CriticalCue = 'leak' | 'boss' | 'ability-ready' | 'hero-defeat' | 'wave';

const DEFAULT_MIX: AudioMix = { master: .82, music: .72, sfx: .88, ambience: .62 };
const ACCENT_STEP_SECONDS = 60 / SCORE_BPM / 2;
const STANDARD_VOICE_LIMIT = 48;
const AMBIENT_VOICE_LIMIT = 30;

const audioAsset = (path: string): string => assetUrl(`assets/audio/${path}`);

const SFX_FAMILIES = {
  ui: ['sfx/ui/click_001.ogg', 'sfx/ui/click_002.ogg', 'sfx/ui/click_003.ogg'].map(audioAsset),
  invalid: ['sfx/ui/error_001.ogg', 'sfx/ui/error_002.ogg', 'sfx/ui/error_003.ogg'].map(audioAsset),
  confirm: ['sfx/ui/confirmation_001.ogg', 'sfx/ui/confirmation_002.ogg', 'sfx/ui/confirmation_003.ogg'].map(audioAsset),
  select: ['sfx/ui/select_001.ogg', 'sfx/ui/select_002.ogg', 'sfx/ui/select_003.ogg'].map(audioAsset),
  wood: ['sfx/impact/impactWood_light_000.ogg', 'sfx/impact/impactWood_light_001.ogg', 'sfx/impact/impactWood_light_002.ogg'].map(audioAsset),
  metal: ['sfx/impact/impactMetal_medium_000.ogg', 'sfx/impact/impactMetal_medium_001.ogg', 'sfx/impact/impactMetal_medium_002.ogg'].map(audioAsset),
  glass: ['sfx/impact/impactGlass_medium_000.ogg', 'sfx/impact/impactGlass_medium_001.ogg', 'sfx/impact/impactGlass_medium_002.ogg'].map(audioAsset),
  body: ['sfx/impact/impactPunch_medium_000.ogg', 'sfx/impact/impactPunch_medium_001.ogg', 'sfx/impact/impactPunch_medium_002.ogg'].map(audioAsset),
  heavyBody: ['sfx/impact/impactPunch_heavy_000.ogg', 'sfx/impact/impactPunch_heavy_001.ogg', 'sfx/impact/impactPunch_heavy_002.ogg'].map(audioAsset),
  softBody: ['sfx/impact/impactSoft_medium_000.ogg', 'sfx/impact/impactSoft_medium_001.ogg', 'sfx/impact/impactSoft_medium_002.ogg'].map(audioAsset),
  heavySoft: ['sfx/impact/impactSoft_heavy_000.ogg', 'sfx/impact/impactSoft_heavy_001.ogg', 'sfx/impact/impactSoft_heavy_002.ogg'].map(audioAsset),
  plate: ['sfx/impact/impactPlate_heavy_000.ogg', 'sfx/impact/impactPlate_heavy_001.ogg', 'sfx/impact/impactPlate_heavy_002.ogg'].map(audioAsset),
  bell: ['sfx/impact/impactBell_heavy_000.ogg', 'sfx/impact/impactBell_heavy_001.ogg', 'sfx/impact/impactBell_heavy_002.ogg'].map(audioAsset),
  blade: ['sfx/rpg/knifeSlice.ogg', 'sfx/rpg/knifeSlice2.ogg', 'sfx/rpg/chop.ogg'].map(audioAsset),
  creak: ['sfx/rpg/creak1.ogg', 'sfx/rpg/creak2.ogg', 'sfx/rpg/creak3.ogg'].map(audioAsset),
  vessel: ['sfx/rpg/metalPot1.ogg', 'sfx/rpg/metalPot2.ogg', 'sfx/rpg/metalPot3.ogg'].map(audioAsset),
} as const;

type SampleFamily = keyof typeof SFX_FAMILIES;

const ALL_SAMPLE_PATHS = [...new Set(Object.values(SFX_FAMILIES).flat())];

function storedMix(): AudioMix {
  try {
    const value = JSON.parse(localStorage.getItem('verdant-rift:audio-mix') ?? '{}') as Partial<AudioMix>;
    return {
      master: Number.isFinite(value.master) ? Math.max(0, Math.min(1, value.master!)) : DEFAULT_MIX.master,
      music: Number.isFinite(value.music) ? Math.max(0, Math.min(1, value.music!)) : DEFAULT_MIX.music,
      sfx: Number.isFinite(value.sfx) ? Math.max(0, Math.min(1, value.sfx!)) : DEFAULT_MIX.sfx,
      ambience: Number.isFinite(value.ambience) ? Math.max(0, Math.min(1, value.ambience!)) : DEFAULT_MIX.ambience,
    };
  } catch {
    return { ...DEFAULT_MIX };
  }
}

/**
 * Authored adaptive music, sampled material SFX, spatial routing, and protected
 * mastering. Phaser's unused audio subsystem is disabled, so this class owns
 * the page's only AudioContext and explicitly tears it down.
 */
export class AudioDirector {
  private context?: AudioContext;
  private master?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private limiter?: DynamicsCompressorNode;
  private meter?: AnalyserNode;
  private reverb?: ConvolverNode;
  private reverbReturn?: GainNode;
  private buses?: Record<BusName, GainNode>;
  private noiseBuffer?: AudioBuffer;
  private schedulerId?: number;
  private schedulerCount = 0;
  private deferredTimers = new Set<number>();
  private nextAccentTime = 0;
  private accentStep = 0;
  private scoreEpoch = 0;
  private currentMusic?: MusicVoice;
  private musicVoices = new Set<MusicVoice>();
  private currentCue?: MusicCueId;
  private musicMode: ScoreMode = 'calm';
  private requestedMusicMode: ScoreMode = 'calm';
  private modeGate: ScoreModeGateState = { mode: 'calm', modeSince: 0, candidate: 'calm', candidateSince: 0 };
  private transportSequence = 0;
  private transportEvents: MusicTransportEvent[] = [];
  private stoppedMusicElements = new WeakSet<HTMLMediaElement>();
  private sourceStarts = 0;
  private sourceStops = 0;
  private programChanges = 0;
  private midPhraseRestarts = 0;
  private modeChanges = 0;
  private lastModeChangeAt?: number;
  private minimumModeChangeInterval = Number.POSITIVE_INFINITY;
  private decoded = new Map<string, AudioBuffer>();
  private streamedMusic = new Set<MusicCueId>();
  private assetsLoaded = false;
  private assetsFailed = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private ambienceSources = new Set<AudioBufferSourceNode>();
  private voiceCounts: VoiceCounts = { ambient: 0, standard: 0, critical: 0 };
  private voiceHighWater = 0;
  private criticalCueCounts: Record<CriticalCue, number> = {
    leak: 0, boss: 0, 'ability-ready': 0, 'hero-defeat': 0, wave: 0,
  };
  private criticalCuesDropped = 0;
  private variantCursor = new Map<SampleFamily, number>();
  private familyLastPlayed = new Map<SampleFamily, number>();
  private cosmeticSeed = 0x71f37a9d;
  private lastHit = 0;
  private allyImpactDelayQueues = new Map<string, number[]>();
  private latestAllyHitDelay = new Map<string, number>();
  private lastBossPhase = -1;
  private previousHeroCooldown = new Map<string, number>();
  private peakHoldDb = -120;
  private snapshot: GameSnapshot;
  private mix = storedMix();
  private muted = localStorage.getItem('verdant-rift:muted') === 'true';
  private disposed = false;
  private resumeAttempts = 0;
  private teardown = new AbortController();

  constructor(private controller: GameController, unlockTarget: HTMLElement) {
    this.snapshot = controller.snapshot();
    const unlock = () => this.unlock();
    unlockTarget.addEventListener('pointerdown', unlock, { once: true, capture: true, signal: this.teardown.signal });
    unlockTarget.addEventListener('keydown', unlock, { once: true, capture: true, signal: this.teardown.signal });
    unlockTarget.addEventListener('pointerdown', () => this.ensureRunning(), { capture: true, signal: this.teardown.signal });
    unlockTarget.addEventListener('keydown', () => this.ensureRunning(), { capture: true, signal: this.teardown.signal });
    unlockTarget.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('button:not(:disabled)')) this.uiTick();
    }, { capture: true, signal: this.teardown.signal });

    const settingsTarget = unlockTarget.querySelector<HTMLElement>('#ui-root') ?? unlockTarget;
    settingsTarget.addEventListener('audio-toggle', ((event: CustomEvent<{ muted: boolean }>) => {
      this.muted = event.detail.muted;
      this.applyMix();
    }) as EventListener, { signal: this.teardown.signal });
    settingsTarget.addEventListener('audio-settings', ((event: CustomEvent<Partial<AudioMix>>) => {
      const next = { ...this.mix };
      (Object.keys(next) as Array<keyof AudioMix>).forEach((channel) => {
        const value = event.detail[channel];
        if (Number.isFinite(value)) next[channel] = Math.max(0, Math.min(1, value!));
      });
      this.mix = next;
      localStorage.setItem('verdant-rift:audio-mix', JSON.stringify(this.mix));
      this.applyMix();
    }) as EventListener, { signal: this.teardown.signal });

    controller.addEventListener('audio-invalid', () => this.invalidAction(), { signal: this.teardown.signal });
    controller.addEventListener('game-event', ((event: CustomEvent<GameEvent>) => {
      if (event.detail.type === 'enemy-hit') return;
      // The legacy ally-attack notification and the new release contract
      // describe the same swing. Weapon audio follows attack-release only.
      if (event.detail.type === 'ally-attack') return;
      if (event.detail.type === 'enemy-defeated' && event.detail.presentationDelayed) return;
      this.playEvent(event.detail);
    }) as EventListener, { signal: this.teardown.signal });
    controller.addEventListener('presentation-event', ((event: CustomEvent<GameEvent>) => this.playEvent(event.detail)) as EventListener, { signal: this.teardown.signal });
    controller.addEventListener('state', () => this.syncState(), { signal: this.teardown.signal });
  }

  diagnostics(): Readonly<{
    context: AudioContextState | 'locked';
    mode: ScoreMode;
    activeVoices: number;
    voices: VoiceCounts;
    voiceHighWater: number;
    scoreStep: number;
    currentCue?: MusicCueId;
    assetsLoaded: boolean;
    assetsFailed: number;
    decodedAssets: number;
    streamedMusicAssets: number;
    decodedMusicBytes: 0;
    schedulerCount: number;
    ambienceSources: number;
    criticalCueCounts: Record<CriticalCue, number>;
    criticalCuesDropped: number;
    peakHoldDb: number;
    mix: AudioMix;
    muted: boolean;
    disposed: boolean;
    resumeAttempts: number;
    midiPlayback: false;
    transport: {
      requestedMode: ScoreMode;
      candidateMode: ScoreMode;
      candidateFor: number;
      modeFor: number;
      sourceStarts: number;
      sourceStops: number;
      programChanges: number;
      midPhraseRestarts: number;
      modeChanges: number;
      minimumModeChangeInterval: number | null;
      currentOffset: number | null;
      currentDuration: number | null;
      recent: readonly MusicTransportEvent[];
    };
  }> {
    const activeVoices = this.voiceCounts.ambient + this.voiceCounts.standard + this.voiceCounts.critical;
    const elapsedSteps = this.context ? Math.floor(Math.max(0, this.context.currentTime - this.scoreEpoch) / (60 / SCORE_BPM / 4)) : 0;
    const now = this.context?.currentTime ?? 0;
    return {
      context: this.context?.state ?? 'locked',
      mode: this.musicMode,
      activeVoices,
      voices: { ...this.voiceCounts },
      voiceHighWater: this.voiceHighWater,
      scoreStep: elapsedSteps % SCORE_STEPS,
      currentCue: this.currentCue,
      assetsLoaded: this.assetsLoaded,
      assetsFailed: this.assetsFailed,
      decodedAssets: this.decoded.size,
      streamedMusicAssets: this.streamedMusic.size,
      decodedMusicBytes: 0,
      schedulerCount: this.schedulerCount,
      ambienceSources: this.ambienceSources.size,
      criticalCueCounts: { ...this.criticalCueCounts },
      criticalCuesDropped: this.criticalCuesDropped,
      peakHoldDb: this.peakHoldDb,
      mix: { ...this.mix },
      muted: this.muted,
      disposed: this.disposed,
      resumeAttempts: this.resumeAttempts,
      midiPlayback: false,
      transport: {
        requestedMode: this.requestedMusicMode,
        candidateMode: this.modeGate.candidate,
        candidateFor: Math.max(0, now - this.modeGate.candidateSince),
        modeFor: Math.max(0, now - this.modeGate.modeSince),
        sourceStarts: this.sourceStarts,
        sourceStops: this.sourceStops,
        programChanges: this.programChanges,
        midPhraseRestarts: this.midPhraseRestarts,
        modeChanges: this.modeChanges,
        minimumModeChangeInterval: Number.isFinite(this.minimumModeChangeInterval) ? this.minimumModeChangeInterval : null,
        currentOffset: this.currentMusic && this.context ? this.voiceOffset(this.currentMusic, this.context.currentTime) : null,
        currentDuration: this.currentCue ? MUSIC_CUES[this.currentCue].duration : null,
        recent: [...this.transportEvents],
      },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teardown.abort();
    if (this.schedulerId !== undefined) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = undefined;
      this.schedulerCount = 0;
    }
    this.deferredTimers.forEach((timer) => window.clearTimeout(timer));
    this.deferredTimers.clear();
    this.stopCurrentMusic(.02);
    [...this.activeSources, ...this.ambienceSources].forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
      source.disconnect();
    });
    this.activeSources.clear();
    this.ambienceSources.clear();
    this.master?.disconnect();
    this.compressor?.disconnect();
    this.limiter?.disconnect();
    this.reverb?.disconnect();
    this.reverbReturn?.disconnect();
    Object.values(this.buses ?? {}).forEach((bus) => bus.disconnect());
    if (this.context && this.context.state !== 'closed') void this.context.close();
  }

  private unlock(): void {
    if (this.disposed) return;
    if (this.context) {
      this.ensureRunning();
      return;
    }
    const context = new AudioContext({ latencyHint: 'interactive' });
    this.context = context;
    this.scoreEpoch = context.currentTime;
    this.modeGate = { mode: 'calm', modeSince: context.currentTime, candidate: 'calm', candidateSince: context.currentTime };

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 10;
    compressor.ratio.value = 3;
    compressor.attack.value = .008;
    compressor.release.value = .2;
    this.compressor = compressor;

    const master = context.createGain();
    this.master = master;

    const limiter = context.createDynamicsCompressor();
    // WebAudio's compressor is not a mathematical brick-wall limiter and
    // lossy Opus reconstruction can add inter-sample overs. The -3 dB working
    // ceiling plus final master trim holds captured true peak below -1 dBTP.
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = .001;
    limiter.release.value = .075;
    this.limiter = limiter;

    const meter = context.createAnalyser();
    meter.fftSize = 2048;
    meter.smoothingTimeConstant = 0;
    this.meter = meter;

    compressor.connect(master).connect(limiter).connect(meter).connect(context.destination);
    this.buses = {
      music: context.createGain(),
      sfx: context.createGain(),
      ambience: context.createGain(),
    };
    Object.values(this.buses).forEach((bus) => bus.connect(compressor));
    this.reverb = context.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.35, 3.1);
    this.reverbReturn = context.createGain();
    this.reverbReturn.gain.value = .15;
    this.reverb.connect(this.reverbReturn).connect(compressor);
    this.noiseBuffer = this.makeNoiseBuffer(4);
    this.applyMix(true);
    this.startAmbience();
    this.nextAccentTime = context.currentTime + .08;
    this.schedulerId = window.setInterval(() => this.schedule(), 36);
    this.schedulerCount = 1;
    context.addEventListener('statechange', () => {
      if (context.state === 'suspended' && this.snapshot.phase === 'playing' && !document.hidden && !this.disposed) {
        this.ensureRunning();
      }
    }, { signal: this.teardown.signal });
    // Long-form music streams through MediaElementAudioSourceNode instead of
    // expanding three compressed files into roughly 346 MB of resident PCM.
    // Starting inside the unlock gesture also satisfies mobile autoplay rules.
    this.syncMusicProgram(true);
    void this.loadAssets();
    this.schedule();
  }

  private ensureRunning(): void {
    if (!this.context || this.disposed || this.context.state !== 'suspended' || this.snapshot.phase !== 'playing' || document.hidden) return;
    this.resumeAttempts += 1;
    void this.context.resume().catch(() => undefined);
  }

  private async loadAssets(): Promise<void> {
    await Promise.all((Object.keys(MUSIC_CUES) as MusicCueId[]).map((cue) => this.loadMusicMetadata(cue)));
    if (this.disposed) return;
    await Promise.all(ALL_SAMPLE_PATHS.map((path) => this.loadBuffer(path)));
    if (!this.disposed) {
      this.assetsLoaded = this.streamedMusic.size === Object.keys(MUSIC_CUES).length
        && ALL_SAMPLE_PATHS.every((path) => this.decoded.has(path));
    }
  }

  private loadMusicMetadata(cueId: MusicCueId): Promise<void> {
    const cue = MUSIC_CUES[cueId];
    return fetch(cue.path, { method: 'HEAD' }).then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      this.streamedMusic.add(cueId);
    }).catch((error: unknown) => {
      this.assetsFailed += 1;
      console.warn(`Music asset failed to load: ${cue.path}`, error);
    });
  }

  private async loadBuffer(path: string): Promise<void> {
    if (!this.context || this.decoded.has(path)) return;
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer());
      this.decoded.set(path, buffer);
    } catch (error) {
      this.assetsFailed += 1;
      console.warn(`Audio asset failed to load: ${path}`, error);
    }
  }

  private syncState(): void {
    const next = this.controller.snapshot();
    if (this.context) {
      if (next.phase === 'paused' && this.context.state === 'running') void this.context.suspend();
      else if (next.phase === 'playing' && this.context.state === 'suspended' && !document.hidden) this.ensureRunning();

      next.heroes.forEach((hero) => {
        const before = this.previousHeroCooldown.get(hero.id) ?? hero.ultimateCooldown;
        if (before > 0 && hero.ultimateCooldown <= 0 && hero.alive) {
          this.criticalCue('ability-ready', () => this.abilityReady(hero.id === 'kael' ? -.45 : .45));
        }
        this.previousHeroCooldown.set(hero.id, hero.ultimateCooldown);
      });
      const boss = next.enemies.find((enemy) => enemy.alive && enemy.type === 'bloomlord');
      if (boss && boss.bossPhase !== this.lastBossPhase) {
        if (this.lastBossPhase < 0) this.criticalCue('boss', () => this.bossArrival());
        else this.criticalCue('boss', () => this.bossPhase(boss.bossPhase));
        this.lastBossPhase = boss.bossPhase;
      } else if (!boss) {
        this.lastBossPhase = -1;
      }
    }
    this.snapshot = next;
    this.updateStableMusicMode();
    this.syncMusicProgram();
  }

  private applyMix(immediate = false): void {
    if (!this.context || !this.master || !this.buses) return;
    const time = this.context.currentTime;
    const ramp = immediate ? .001 : .045;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.curve(this.mix.master) * .9, time, ramp);
    this.buses.music.gain.setTargetAtTime(this.curve(this.mix.music) * 1.35, time, ramp);
    this.buses.sfx.gain.setTargetAtTime(this.curve(this.mix.sfx) * 1.04, time, ramp);
    this.buses.ambience.gain.setTargetAtTime(this.curve(this.mix.ambience) * .34, time, ramp);
  }

  private curve(value: number): number {
    return Math.pow(value, 1.6);
  }

  private scoreRequest(): ScoreMode {
    const hasBoss = this.snapshot.enemies.some((enemy) => enemy.alive && enemy.type === 'bloomlord');
    const alive = this.snapshot.enemies.reduce((count, enemy) => count + Number(enemy.alive), 0);
    return requestedScoreMode({
      hasBoss,
      alive,
      lives: this.snapshot.lives,
      startingLives: this.snapshot.startingLives,
      waveActive: this.snapshot.waveActive,
    }, this.musicMode);
  }

  private updateStableMusicMode(): void {
    if (!this.context || this.disposed) return;
    const now = this.context.currentTime;
    const requested = this.scoreRequest();
    if (requested !== this.requestedMusicMode) {
      this.requestedMusicMode = requested;
      this.recordTransport({ kind: 'mode-request', at: now, mode: this.musicMode, reason: requested });
    }
    const next = advanceScoreModeGate(this.modeGate, requested, now);
    if (next.mode !== this.modeGate.mode) {
      const previous = this.modeGate.mode;
      if (this.lastModeChangeAt !== undefined) {
        this.minimumModeChangeInterval = Math.min(this.minimumModeChangeInterval, now - this.lastModeChangeAt);
      }
      this.lastModeChangeAt = now;
      this.modeChanges += 1;
      this.modeGate = next;
      this.musicMode = next.mode;
      this.recordTransport({ kind: 'mode-enter', at: now, mode: next.mode, reason: `${previous}->${next.mode}` });
      if (next.mode === 'crisis') this.pressureStinger(.7);
      else if (next.mode === 'active' && previous === 'crisis') this.pressureStinger(.35);
      return;
    }
    this.modeGate = next;
  }

  /**
   * Menu, battle, and boss are complete compositions. Intensity changes only
   * alter the restrained procedural reinforcement layer; they never restart
   * or swap the five-minute battle program.
   */
  private syncMusicProgram(initial = false): void {
    if (!this.context || !this.buses || this.disposed) return;
    if (this.snapshot.phase === 'victory' || this.snapshot.phase === 'defeat') return;
    const cue: MusicCueId = this.snapshot.phase === 'briefing'
      ? 'menu-theme'
      : ADAPTIVE_ARRANGEMENT[this.musicMode].loop;
    if (this.currentCue === cue && this.currentMusic) return;
    const previous = this.currentCue;
    this.playMusicCue(cue, true, initial ? .12 : cue === 'boss-theme' ? .6 : .35, `${this.snapshot.phase} program`, true);
    if (previous && previous !== cue) {
      this.programChanges += 1;
      this.recordTransport({ kind: 'program-switch', at: this.context.currentTime, mode: this.musicMode, cue, fromCue: previous, offset: 0, reason: `${previous}->${cue}` });
    }
  }

  private createMusicVoice(
    cueId: MusicCueId,
    loop: boolean,
    fade: number,
    offset = 0,
    reason = 'transport',
  ): MusicVoice | undefined {
    if (!this.context || !this.buses) return;
    const cue = MUSIC_CUES[cueId];
    const element = new Audio(cue.path);
    element.preload = 'auto';
    element.loop = loop;
    element.setAttribute('playsinline', '');
    const source = this.context.createMediaElementSource(element);
    const gain = this.context.createGain();
    const startAt = this.context.currentTime;
    gain.gain.setValueAtTime(.0001, startAt);
    source.connect(gain).connect(this.buses.music);
    const boundedOffset = Math.max(0, Math.min(cue.duration - .001, offset));
    if (boundedOffset > 0) {
      element.addEventListener('loadedmetadata', () => { element.currentTime = boundedOffset; }, { once: true });
    }
    element.addEventListener('ended', () => {
      this.musicVoices.delete(voice);
      if (this.currentMusic?.element === element) this.currentMusic = undefined;
    }, { once: true });
    element.addEventListener('playing', () => {
      if (!this.context || this.stoppedMusicElements.has(element)) return;
      const now = this.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001, dbToGain(cue.normalizationGainDb)), now + Math.max(.02, fade));
    }, { once: true });
    void element.play().catch((error: unknown) => {
      if (this.stoppedMusicElements.has(element) || (error instanceof DOMException && error.name === 'AbortError')) return;
      this.assetsFailed += 1;
      console.warn(`Music playback failed: ${cue.path}`, error);
      if (this.currentMusic?.element === element) this.currentMusic = undefined;
      source.disconnect();
      gain.disconnect();
    });
    this.sourceStarts += 1;
    this.recordTransport({ kind: 'source-start', at: startAt, mode: this.musicMode, cue: cueId, offset: boundedOffset, reason });
    const voice = { element, source, gain, cue: cueId, startAt, offset: boundedOffset, loop };
    this.musicVoices.add(voice);
    return voice;
  }

  private playMusicCue(cueId: MusicCueId, loop: boolean, fade: number, reason = 'direct cue', intentionalSwitch = false): void {
    if (!this.context) return;
    const previous = this.currentMusic;
    const replaced = Boolean(previous);
    const voice = this.createMusicVoice(cueId, loop, fade, 0, reason);
    if (!voice) return;
    if (replaced && !intentionalSwitch) this.midPhraseRestarts += 1;
    this.currentMusic = voice;
    this.currentCue = cueId;
    if (previous) {
      // A remote or cold-cache stream may need time to buffer. Keep the old
      // composition audible until the browser confirms the new one is playing;
      // only then begin the simple crossfade requested by the sound direction.
      voice.element.addEventListener('playing', () => this.stopMusicVoice(previous, fade), { once: true });
    }
  }

  private stopCurrentMusic(fade: number): void {
    if (!this.context) return;
    const voices = [...this.musicVoices];
    this.currentMusic = undefined;
    voices.forEach((voice) => this.stopMusicVoice(voice, fade));
  }

  private stopMusicVoice(voice: MusicVoice, fade: number): void {
    if (!this.context) return;
    if (this.stoppedMusicElements.has(voice.element)) return;
    this.stoppedMusicElements.add(voice.element);
    const now = this.context.currentTime;
    const stopOffset = this.voiceOffset(voice, now);
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(.0001, now, Math.max(.01, fade / 4));
    const release = (): void => {
      voice.element.pause();
      voice.element.removeAttribute('src');
      voice.element.load();
      voice.source.disconnect();
      voice.gain.disconnect();
      this.musicVoices.delete(voice);
    };
    if (this.disposed || fade <= .02) release();
    else this.defer(release, (Math.max(.04, fade) + .03) * 1000);
    this.sourceStops += 1;
    this.recordTransport({ kind: 'source-stop', at: now + Math.max(.04, fade), mode: this.musicMode, cue: voice.cue, offset: stopOffset, reason: 'fade stop' });
  }

  private voiceOffset(voice: MusicVoice, at: number): number {
    const duration = MUSIC_CUES[voice.cue].duration;
    const elapsed = Number.isFinite(voice.element.currentTime)
      ? voice.element.currentTime
      : Math.max(0, at - voice.startAt) + voice.offset;
    return voice.loop ? elapsed % duration : Math.min(duration, elapsed);
  }

  private recordTransport(event: Omit<MusicTransportEvent, 'sequence'>): void {
    this.transportEvents.push({ sequence: ++this.transportSequence, ...event });
    if (this.transportEvents.length > 64) this.transportEvents.splice(0, this.transportEvents.length - 64);
  }

  private schedule(): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.disposed) return;
    this.updateStableMusicMode();
    this.syncMusicProgram();
    this.sampleMeter();
    while (this.nextAccentTime < context.currentTime + .14) {
      this.scheduleAccent(this.nextAccentTime, this.accentStep);
      this.nextAccentTime += ACCENT_STEP_SECONDS;
      this.accentStep = (this.accentStep + 1) % SCORE_ACCENT_FORM_STEPS;
    }
  }

  private scheduleAccent(when: number, step: number): void {
    if (this.snapshot.phase === 'victory' || this.snapshot.phase === 'defeat') return;
    const mode = this.musicMode;
    const pattern = SCORE_ACCENT_PATTERNS[mode];
    const within = step % SCORE_ACCENT_FORM_STEPS;
    if (pattern.percussion.includes(within)) {
      const strong = pattern.strong.includes(within);
      this.noiseTransient(when, strong ? .075 : .035, strong ? 230 : 1300, 'music', strong ? -.18 : .2, 0);
    }
    if (pattern.lowBrass.includes(within)) {
      this.toneTransient(when, mode === 'boss' ? 49 : 58, .32, mode === 'boss' ? .07 : .04, 'music', 0, 0, 'triangle', -18);
    }
  }

  private sampleMeter(): void {
    if (!this.meter) return;
    const samples = new Float32Array(this.meter.fftSize);
    this.meter.getFloatTimeDomainData(samples);
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    if (peak > 0) this.peakHoldDb = Math.max(this.peakHoldDb, 20 * Math.log10(peak));
  }

  private playEvent(event: GameEvent): void {
    if (!this.context || !this.buses) return;
    if (event.type === 'enemy-hit') {
      if (this.context.currentTime - this.lastHit < .024) return;
      this.lastHit = this.context.currentTime;
      const pan = this.worldPan(event.source.x);
      if (event.style === 'ember') {
        this.playSample('heavyBody', pan, .42);
        this.toneTransient(this.context.currentTime, 73 + this.random() * 12, .17, .08, 'sfx', pan, .08, 'sine', -28, 1);
      } else if (event.style === 'thorn') {
        this.playSample('wood', pan, .38, 1.06);
      } else if (event.style === 'aegis') {
        this.playSample('metal', pan, .4);
      } else if (event.style === 'astral' || event.style === 'lyra') {
        this.playSample('glass', pan, .34, .97);
      } else if (event.style === 'kael') {
        this.playSample('blade', pan, .38);
      } else if (event.damageType === 'arcane') {
        this.playSample('glass', pan, .3);
      } else {
        this.playSample('body', pan, .34);
      }
      if (event.lethal) this.defer(() => this.enemyDeath(event.enemyUid), 42);
    } else if (event.type === 'ally-attack') {
      // Legacy compatibility event. The explicit attack-release event owns
      // the weapon cue so a swing is never double-triggered.
    } else if (event.type === 'attack-release') {
      this.deferAudio(() => this.weaponRelease(event), event.delay / this.snapshot.speed);
    } else if (event.type === 'attack-impact') {
      if (event.actor === 'enemy' && !event.targetUid.startsWith('tower:')) {
        const delay = event.delay / this.snapshot.speed;
        const queue = this.allyImpactDelayQueues.get(event.targetUid) ?? [];
        queue.push(delay);
        this.allyImpactDelayQueues.set(event.targetUid, queue);
        this.deferAudio(() => this.playSample('softBody', this.worldPan(event.target.x), .29, 1, 1, .035), delay);
      }
    } else if (event.type === 'attack-start') {
      // Windup is animated without audio. Release and impact own their cues.
    } else if (event.type === 'ally-hit') {
      const queue = this.allyImpactDelayQueues.get(event.allyUid);
      const delay = queue?.shift() ?? 0;
      if (queue?.length === 0) this.allyImpactDelayQueues.delete(event.allyUid);
      this.latestAllyHitDelay.set(event.allyUid, delay);
    } else if (event.type === 'ally-defeated') {
      const delay = this.latestAllyHitDelay.get(event.allyUid) ?? 0;
      this.latestAllyHitDelay.delete(event.allyUid);
      this.deferAudio(
        () => this.criticalCue('hero-defeat', () => this.defeatSting(event.allyUid.startsWith('hero:') ? .19 : .1)),
        delay,
      );
    } else if (event.type === 'ally-respawned') {
      this.respawnChime(this.worldPan(event.point.x));
    } else if (event.type === 'hero-level-up') {
      const pan = this.worldPan(event.point.x);
      this.respawnChime(pan);
      this.deferAudio(() => this.playSample('confirm', pan, .32, 1.08), .08);
    } else if (event.type === 'tower-built') {
      const tower = this.snapshot.towers.find((candidate) => candidate.uid === event.towerUid);
      this.buildSound(tower?.type ?? 'thorn', this.worldPan(BUILD_PADS[event.padIndex]?.x ?? 800));
    } else if (event.type === 'tower-upgraded') {
      const tower = this.snapshot.towers.find((candidate) => candidate.uid === event.towerUid);
      const point = tower ? BUILD_PADS[tower.padIndex] : undefined;
      this.upgradeFanfare(tower?.type ?? 'thorn', this.worldPan(point?.x ?? 800));
    } else if (event.type === 'tower-sold') {
      this.playSample('select', 0, .3, .86);
    } else if (event.type === 'enemy-leaked') {
      this.criticalCue('leak', () => this.leakAlarm());
    } else if (event.type === 'wave-started') {
      this.criticalCue('wave', () => this.waveHorn(event.bonus > 0));
    } else if (event.type === 'wave-cleared') {
      this.rewardCadence();
    } else if (event.type === 'ability') {
      event.hero === 'kael' ? this.kaelAbility(this.worldPan(event.point.x)) : this.lyraAbility(this.worldPan(event.point.x));
    } else if (event.type === 'boss-telegraph') {
      this.criticalCue('boss', () => this.bossWarning(this.worldPan(event.point.x)));
    } else if (event.type === 'tower-disabled') {
      const tower = this.snapshot.towers.find((candidate) => candidate.uid === event.towerUid);
      this.breakerSnap(this.worldPan(tower ? BUILD_PADS[tower.padIndex]?.x ?? 800 : 800));
    } else if (event.type === 'victory') {
      this.victoryFanfare();
      this.stopCurrentMusic(1.2);
    } else if (event.type === 'defeat') {
      this.defeatSting(0);
      this.stopCurrentMusic(1.1);
    }
  }

  private weaponRelease(event: Extract<GameEvent, { type: 'attack-release' }>): void {
    const pan = this.worldPan(event.source.x);
    if (event.actor === 'tower') {
      const towerFamily: Partial<Record<typeof event.style, SampleFamily>> = {
        thorn: 'creak',
        ember: 'vessel',
        aegis: 'blade',
        astral: 'glass',
      };
      const family = towerFamily[event.style] ?? 'body';
      this.playSample(family, pan, event.style === 'aegis' ? .22 : .18, event.style === 'thorn' ? 1.12 : 1, 1, .032);
      return;
    }
    if (event.actor === 'ally') {
      const family: SampleFamily = event.actorUid === 'hero:kael'
        ? 'blade'
        : event.actorUid === 'hero:lyra'
          ? 'glass'
          : 'metal';
      this.playSample(family, pan, .2, 1, 1, .035);
      return;
    }
    const enemyFamily: Partial<Record<typeof event.style, SampleFamily>> = {
      skitter: 'softBody',
      marauder: 'blade',
      brute: 'heavyBody',
      wisp: 'glass',
      bloomlord: 'plate',
    };
    this.playSample(enemyFamily[event.style] ?? 'body', pan, event.style === 'bloomlord' ? .34 : .17, .94, 1, .04);
  }

  private enemyDeath(enemyUid: number): void {
    const enemy = this.snapshot.enemies.find((candidate) => candidate.uid === enemyUid);
    const type = enemy?.type ?? 'marauder';
    const pan = this.worldPan(enemy?.x ?? 800);
    if (type === 'bloomlord') {
      this.bloomlordDeath(pan);
      return;
    }
    const family: Record<Exclude<EnemyId, 'bloomlord'>, SampleFamily> = {
      skitter: 'softBody',
      marauder: 'body',
      brute: 'heavyBody',
      wisp: 'glass',
    };
    const gains: Record<Exclude<EnemyId, 'bloomlord'>, number> = {
      skitter: .22,
      marauder: .3,
      brute: .5,
      wisp: .3,
    };
    const ordinary = type as Exclude<EnemyId, 'bloomlord'>;
    this.playSample(family[ordinary], pan, gains[ordinary], type === 'skitter' ? 1.12 : 1);
  }

  private bloomlordDeath(pan: number): void {
    this.playSample('plate', pan, .72, .72, 2);
    this.playSample('bell', -pan * .4, .48, .62, 2);
    this.playSample('heavySoft', pan, .65, .68, 2);
    if (this.context) this.toneTransient(this.context.currentTime, 42, 1.45, .22, 'sfx', pan, .24, 'sine', -25, 2);
  }

  private buildSound(type: 'thorn' | 'ember' | 'aegis' | 'astral', pan: number): void {
    const family: Record<typeof type, SampleFamily> = {
      thorn: 'creak', ember: 'vessel', aegis: 'metal', astral: 'glass',
    };
    this.playSample(family[type], pan, .38);
    this.playSample('confirm', pan * .6, .24, .92);
  }

  private upgradeFanfare(type: 'thorn' | 'ember' | 'aegis' | 'astral', pan: number): void {
    this.playSample('confirm', pan, .34, 1.03);
    const family: Record<typeof type, SampleFamily> = {
      thorn: 'wood', ember: 'heavyBody', aegis: 'bell', astral: 'glass',
    };
    this.defer(() => this.playSample(family[type], pan, .27, 1.08), 75);
  }

  private leakAlarm(): void {
    this.playSample('invalid', 0, .68, .72, 2);
    this.playSample('plate', 0, .48, .66, 2);
    if (this.context) this.toneTransient(this.context.currentTime, 82, .65, .18, 'sfx', 0, .1, 'sawtooth', -32, 2);
  }

  private waveHorn(early: boolean): void {
    this.playSample('bell', -.14, early ? .52 : .46, early ? 1.08 : .91, 2);
    this.playSample('confirm', .16, .42, early ? .9 : .82, 2);
    if (this.context) this.toneTransient(this.context.currentTime, early ? 73 : 65, .7, .14, 'sfx', 0, .12, 'triangle', -20, 2);
  }

  private rewardCadence(): void {
    this.playSample('confirm', -.12, .34, 1.05);
    this.defer(() => this.playSample('glass', .12, .24, 1.12), 95);
  }

  private abilityReady(pan: number): void {
    this.playSample('glass', pan, .42, 1.18, 2);
    this.playSample('confirm', pan * .5, .36, .96, 2);
  }

  private respawnChime(pan: number): void {
    this.playSample('confirm', pan, .38, .9);
    this.playSample('glass', -pan * .35, .28, 1.04);
  }

  private bossWarning(pan: number): void {
    this.playSample('plate', pan, .74, .7, 2);
    this.playSample('bell', -pan * .4, .58, .62, 2);
    if (this.context) this.toneTransient(this.context.currentTime, 46, .9, .22, 'sfx', pan, .2, 'sine', -16, 2);
  }

  private bossArrival(): void {
    this.bossWarning(0);
    this.defer(() => this.playSample('heavyBody', -.18, .66, .58, 2), 120);
    this.defer(() => this.playSample('plate', .18, .58, .52, 2), 260);
    if (this.context) this.toneTransient(this.context.currentTime, 31, 1.35, .3, 'sfx', 0, .22, 'sine', -13, 2);
  }

  private bossPhase(phase: number): void {
    this.bossWarning(0);
    this.defer(() => this.playSample('glass', 0, .44, .76 + phase * .1, 2), 160);
  }

  private kaelAbility(pan: number): void {
    this.playSample('blade', pan, .62, .72);
    this.playSample('heavyBody', pan, .55, .8);
  }

  private lyraAbility(pan: number): void {
    this.playSample('glass', pan, .58, .82);
    this.playSample('bell', -pan * .4, .44, 1.08);
  }

  private breakerSnap(pan: number): void {
    this.playSample('metal', pan, .52, .78);
    this.playSample('plate', pan, .38, .9);
  }

  private victoryFanfare(): void {
    this.playSample('confirm', -.25, .5, .82, 2);
    this.defer(() => this.playSample('bell', .25, .58, .92, 2), 150);
    this.defer(() => this.playSample('glass', 0, .4, 1.08, 2), 330);
  }

  private defeatSting(pan: number): void {
    this.playSample('heavySoft', pan, .5, .78, 2);
    this.playSample('plate', -pan * .3, .44, .64, 2);
    if (this.context) this.toneTransient(this.context.currentTime, 55, .72, .13, 'sfx', pan, .12, 'triangle', -20, 2);
  }

  private pressureStinger(weight: number): void {
    if (!this.context) return;
    this.playSample('plate', 0, .11 * weight, .72, 0);
    this.toneTransient(this.context.currentTime, 58, .38, .035 * weight, 'music', 0, .08, 'triangle', -12, 0);
  }

  private uiTick(): void {
    this.playSample('ui', 0, .18, 1, 1, .018);
  }

  private invalidAction(): void {
    this.playSample('invalid', 0, .32, .92, 1, .025);
  }

  private criticalCue(cue: CriticalCue, schedule: () => void): void {
    this.criticalCueCounts[cue] += 1;
    schedule();
  }

  private playSample(
    family: SampleFamily,
    pan: number,
    volume: number,
    rate = 1,
    priority: VoicePriority = 1,
    minimumSpacing = 0,
  ): boolean {
    if (!this.context || !this.buses || this.disposed) return false;
    const now = this.context.currentTime;
    const last = this.familyLastPlayed.get(family) ?? -Infinity;
    if (priority < 2 && now - last < minimumSpacing) return false;
    const paths = SFX_FAMILIES[family];
    const cursor = this.variantCursor.get(family) ?? 0;
    const path = paths[cursor % paths.length]!;
    const buffer = this.decoded.get(path);
    if (!buffer) return false;
    if (!this.reserveVoice(priority)) {
      if (priority === 2) this.criticalCuesDropped += 1;
      return false;
    }
    this.familyLastPlayed.set(family, now);
    this.variantCursor.set(family, (cursor + 1) % paths.length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    this.route(gain, 'sfx', pan, family === 'glass' || family === 'bell' ? .23 : .08);
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      this.releaseVoice(priority);
      source.disconnect();
    };
    source.start();
    return true;
  }

  private toneTransient(
    when: number,
    frequency: number,
    duration: number,
    volume: number,
    bus: BusName,
    pan: number,
    send: number,
    shape: OscillatorType,
    sweep: number,
    priority: VoicePriority = 0,
  ): void {
    if (!this.context || !this.reserveVoice(priority)) return;
    const oscillator = this.context.createOscillator();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(Math.max(24, frequency), when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(24, frequency + sweep), when + duration);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + Math.min(.025, duration * .2));
    gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(gain);
    this.route(gain, bus, pan, send);
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
    oscillator.onended = () => this.releaseVoice(priority);
  }

  private noiseTransient(
    when: number,
    volume: number,
    cutoff: number,
    bus: BusName,
    pan: number,
    priority: VoicePriority,
  ): void {
    if (!this.context || !this.noiseBuffer || !this.reserveVoice(priority)) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = cutoff > 3000 ? 'highpass' : 'bandpass';
    filter.frequency.value = cutoff;
    filter.Q.value = .9;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + .115);
    source.connect(filter).connect(gain);
    this.route(gain, bus, pan, .04);
    source.start(when, this.random() * 3.5, .13);
    source.onended = () => this.releaseVoice(priority);
  }

  private route(node: AudioNode, bus: BusName, pan: number, reverbSend: number): void {
    if (!this.context || !this.buses) return;
    const panner = this.context.createStereoPanner();
    panner.pan.value = Math.max(-.78, Math.min(.78, pan));
    node.connect(panner).connect(this.buses[bus]);
    if (this.reverb && reverbSend > 0) {
      const send = this.context.createGain();
      send.gain.value = reverbSend;
      panner.connect(send).connect(this.reverb);
    }
  }

  private reserveVoice(priority: VoicePriority): boolean {
    const ordinary = this.voiceCounts.ambient + this.voiceCounts.standard;
    if (priority === 0 && (this.voiceCounts.ambient >= AMBIENT_VOICE_LIMIT || ordinary >= STANDARD_VOICE_LIMIT)) return false;
    if (priority === 1 && ordinary >= STANDARD_VOICE_LIMIT) return false;
    // Tactical cues have a physically separate reserve. They never compete
    // with combat chatter, so a leak/boss/wave warning cannot be discarded.
    if (priority === 0) this.voiceCounts.ambient += 1;
    else if (priority === 1) this.voiceCounts.standard += 1;
    else this.voiceCounts.critical += 1;
    const total = this.voiceCounts.ambient + this.voiceCounts.standard + this.voiceCounts.critical;
    this.voiceHighWater = Math.max(this.voiceHighWater, total);
    return true;
  }

  private releaseVoice(priority: VoicePriority): void {
    if (priority === 0) this.voiceCounts.ambient = Math.max(0, this.voiceCounts.ambient - 1);
    else if (priority === 1) this.voiceCounts.standard = Math.max(0, this.voiceCounts.standard - 1);
    else this.voiceCounts.critical = Math.max(0, this.voiceCounts.critical - 1);
  }

  private startAmbience(): void {
    if (!this.context || !this.noiseBuffer || !this.buses) return;
    const wind = this.context.createBufferSource();
    wind.buffer = this.noiseBuffer;
    wind.loop = true;
    const windFilter = this.context.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 430;
    windFilter.Q.value = .5;
    const windGain = this.context.createGain();
    windGain.gain.value = .07;
    const windPan = this.context.createStereoPanner();
    windPan.pan.value = -.24;
    wind.connect(windFilter).connect(windGain).connect(windPan).connect(this.buses.ambience);
    wind.start();
    this.ambienceSources.add(wind);

    const water = this.context.createBufferSource();
    water.buffer = this.noiseBuffer;
    water.loop = true;
    water.playbackRate.value = .61;
    const waterFilter = this.context.createBiquadFilter();
    waterFilter.type = 'lowpass';
    waterFilter.frequency.value = 250;
    const waterGain = this.context.createGain();
    waterGain.gain.value = .052;
    const waterPan = this.context.createStereoPanner();
    waterPan.pan.value = .2;
    water.connect(waterFilter).connect(waterGain).connect(waterPan).connect(this.buses.ambience);
    water.start(0, 1.2);
    this.ambienceSources.add(water);
  }

  private makeNoiseBuffer(seconds: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * seconds), context.sampleRate);
    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      let held = 0;
      for (let index = 0; index < channel.length; index += 1) {
        if (index % 5 === 0) held = this.random() * 2 - 1;
        channel[index] = held * .68 + (this.random() * 2 - 1) * .32;
      }
    }
    return buffer;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const context = this.context!;
    const length = Math.ceil(context.sampleRate * seconds);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channelIndex = 0; channelIndex < 2; channelIndex += 1) {
      const channel = impulse.getChannelData(channelIndex);
      for (let index = 0; index < length; index += 1) {
        const envelope = Math.pow(1 - index / length, decay);
        channel[index] = (this.random() * 2 - 1) * envelope * (index < 48 ? index / 48 : 1);
      }
    }
    return impulse;
  }

  private defer(action: () => void, delayMs: number): void {
    if (this.disposed) return;
    const timer = window.setTimeout(() => {
      this.deferredTimers.delete(timer);
      if (!this.disposed) action();
    }, Math.max(0, delayMs));
    this.deferredTimers.add(timer);
  }

  /**
   * Defer against AudioContext time, which stops while suspended. This keeps
   * combat contact aligned with Phaser's paused presentation clock instead of
   * letting wall-clock timers expire underneath a tactical pause.
   */
  private deferAudio(action: () => void, delaySeconds: number): void {
    if (!this.context || delaySeconds <= 0) { action(); return; }
    const target = this.context.currentTime + delaySeconds;
    const poll = () => {
      if (!this.context || this.disposed) return;
      const remaining = target - this.context.currentTime;
      if (remaining <= .008) { action(); return; }
      this.defer(poll, Math.min(40, Math.max(8, remaining * 500)));
    };
    poll();
  }

  private worldPan(x: number): number {
    return Math.max(-.72, Math.min(.72, (x / 1600 - .5) * 1.35));
  }

  private random(): number {
    this.cosmeticSeed ^= this.cosmeticSeed << 13;
    this.cosmeticSeed ^= this.cosmeticSeed >>> 17;
    this.cosmeticSeed ^= this.cosmeticSeed << 5;
    return (this.cosmeticSeed >>> 0) / 0xffffffff;
  }
}
