import { assetUrl } from '../assets/url';

export const SCORE_BPM = 82;
export const SCORE_STEPS = 256;
/** Eight bars of eighth-note slots: 23.41 seconds before an accent form repeats. */
export const SCORE_ACCENT_FORM_STEPS = 64;

export type ScoreMode = 'calm' | 'active' | 'crisis' | 'boss';
export type MusicCueId = 'menu-theme' | 'battle-theme' | 'boss-theme';

export interface MusicCue {
  id: MusicCueId;
  path: string;
  role: 'menu' | 'battle' | 'boss';
  loop: boolean;
  duration: number;
  measuredLufs: number;
  measuredTruePeakDb: number;
  /** Runtime trim after offline normalization near -16 LUFS-I. */
  normalizationGainDb: number;
}

/**
 * Three complete pieces replace the former 12–37 second fragments. The
 * battle program now runs for more than five minutes before a repeat; menu and
 * boss use wholly separate compositions. Measurements are from the exact
 * normalized runtime files pinned in docs/AUDIO_ASSET_MANIFEST.md.
 */
export const MUSIC_CUES: Readonly<Record<MusicCueId, MusicCue>> = {
  'menu-theme': {
    id: 'menu-theme', path: assetUrl('assets/audio/music/menu-theme.ogg'), role: 'menu', loop: true,
    duration: 280.6065, measuredLufs: -16, measuredTruePeakDb: -1.4, normalizationGainDb: 0,
  },
  'battle-theme': {
    id: 'battle-theme', path: assetUrl('assets/audio/music/battle-theme.ogg'), role: 'battle', loop: true,
    duration: 315.7065, measuredLufs: -15.8, measuredTruePeakDb: -1.6, normalizationGainDb: -.2,
  },
  'boss-theme': {
    id: 'boss-theme', path: assetUrl('assets/audio/music/boss-theme.ogg'), role: 'boss', loop: true,
    duration: 305.221208, measuredLufs: -16, measuredTruePeakDb: -2.6, normalizationGainDb: 0,
  },
} as const;

export interface ScoreAccentPattern {
  percussion: readonly number[];
  strong: readonly number[];
  lowBrass: readonly number[];
}

/**
 * An eight-bar form replaces the old one-bar cell. Hits remain synchronized to
 * 82 BPM, but neither percussion nor low brass repeats every 2.93 seconds.
 */
export const SCORE_ACCENT_PATTERNS: Readonly<Record<ScoreMode, ScoreAccentPattern>> = {
  calm: { percussion: [], strong: [], lowBrass: [] },
  active: {
    percussion: [0, 7, 12, 18, 26, 31, 37, 44, 50, 57, 61],
    strong: [0, 18, 37, 50],
    lowBrass: [],
  },
  crisis: {
    percussion: [0, 3, 7, 10, 14, 18, 21, 25, 29, 32, 35, 39, 43, 46, 50, 54, 57, 61, 63],
    strong: [0, 14, 29, 43, 57],
    lowBrass: [0, 18, 35, 54],
  },
  boss: {
    percussion: [0, 2, 5, 7, 10, 13, 16, 18, 21, 23, 26, 29, 31, 34, 37, 39, 42, 45, 47, 50, 53, 55, 58, 61, 63],
    strong: [0, 13, 26, 39, 53],
    lowBrass: [0, 13, 29, 45, 61],
  },
} as const;

export interface ScorePressureState {
  hasBoss: boolean;
  alive: number;
  lives: number;
  startingLives: number;
  waveActive: boolean;
}

export interface ScoreModeGateState {
  mode: ScoreMode;
  modeSince: number;
  candidate: ScoreMode;
  candidateSince: number;
}

export const SCORE_MODE_DWELL_SECONDS: Readonly<Record<ScoreMode, number>> = {
  calm: 10,
  active: .35,
  crisis: 1.5,
  boss: 0,
};

export const SCORE_MINIMUM_MODE_SECONDS = 2.5;

/** Pressure uses a 20/13 Schmitt trigger instead of flapping at one threshold. */
export function requestedScoreMode(state: ScorePressureState, current: ScoreMode): ScoreMode {
  if (state.hasBoss) return 'boss';
  if (state.lives <= state.startingLives * .35) return 'crisis';
  if (state.alive >= (current === 'crisis' ? 13 : 20)) return 'crisis';
  if (state.waveActive || state.alive > 0) return 'active';
  return 'calm';
}

export function advanceScoreModeGate(state: ScoreModeGateState, requested: ScoreMode, at: number): ScoreModeGateState {
  if (requested === state.mode) {
    return state.candidate === requested ? state : { ...state, candidate: requested, candidateSince: at };
  }
  if (requested !== state.candidate) return { ...state, candidate: requested, candidateSince: at };
  const candidateReady = at - state.candidateSince >= SCORE_MODE_DWELL_SECONDS[requested];
  const currentReady = requested === 'boss' || at - state.modeSince >= SCORE_MINIMUM_MODE_SECONDS;
  return candidateReady && currentReady
    ? { mode: requested, modeSince: at, candidate: requested, candidateSince: at }
    : state;
}

export interface AdaptiveArrangement {
  mode: ScoreMode;
  loop: MusicCueId;
  firstEntrance?: MusicCueId;
  percussionDensity: 0 | 1 | 2 | 3;
  lowBrass: boolean;
  description: string;
}

export const ADAPTIVE_ARRANGEMENT: Readonly<Record<ScoreMode, AdaptiveArrangement>> = {
  calm: {
    mode: 'calm', loop: 'battle-theme',
    percussionDensity: 0, lowBrass: false,
    description: 'The full battle composition remains uninterrupted during preparation.',
  },
  active: {
    mode: 'active', loop: 'battle-theme',
    percussionDensity: 1, lowBrass: false,
    description: 'The same long-form battle composition continues under a restrained tactical pulse.',
  },
  crisis: {
    mode: 'crisis', loop: 'battle-theme',
    percussionDensity: 2, lowBrass: true,
    description: 'The battle composition persists while a syncopated frame-drum and low-reed layer enters.',
  },
  boss: {
    mode: 'boss', loop: 'boss-theme',
    percussionDensity: 3, lowBrass: true,
    description: 'A separate five-minute choir-and-orchestra composition announces the sovereign.',
  },
} as const;

export const SCORE_FORM = ['menu-theme', 'battle-theme', 'boss-theme'] as const satisfies readonly MusicCueId[];

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

export function validateComposition(): string[] {
  const errors: string[] = [];
  const ids = new Set<MusicCueId>();
  for (const cue of Object.values(MUSIC_CUES)) {
    if (ids.has(cue.id)) errors.push(`Duplicate music cue: ${cue.id}`);
    ids.add(cue.id);
    if (!cue.path.endsWith('.ogg')) errors.push(`${cue.id} is not browser-native OGG.`);
    if (!(cue.duration > 0)) errors.push(`${cue.id} has no measured duration.`);
    if (cue.measuredTruePeakDb > 0) errors.push(`${cue.id} clips before staging.`);
    if (!cue.loop) errors.push(`${cue.id} must be a continuous long-form program.`);
  }
  for (const arrangement of Object.values(ADAPTIVE_ARRANGEMENT)) {
    if (!ids.has(arrangement.loop)) errors.push(`${arrangement.mode} has no loop.`);
    if (arrangement.firstEntrance && !ids.has(arrangement.firstEntrance)) errors.push(`${arrangement.mode} has no entrance.`);
  }
  if (MUSIC_CUES['battle-theme'].duration < 300) errors.push('Battle music repeats before five minutes.');
  if (MUSIC_CUES['boss-theme'].path === MUSIC_CUES['battle-theme'].path) errors.push('Boss music must be distinct from battle music.');
  if (MUSIC_CUES['menu-theme'].path === MUSIC_CUES['battle-theme'].path) errors.push('Menu music must be distinct from battle music.');
  for (const [mode, pattern] of Object.entries(SCORE_ACCENT_PATTERNS)) {
    const steps = [...pattern.percussion, ...pattern.strong, ...pattern.lowBrass];
    if (steps.some((step) => step < 0 || step >= SCORE_ACCENT_FORM_STEPS)) errors.push(`${mode} accent exceeds its form.`);
  }
  return errors;
}
