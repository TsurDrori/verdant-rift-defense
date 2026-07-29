export const SCORE_BPM = 82;
export const SCORE_STEPS = 256;
/** Eight bars of eighth-note slots: 23.41 seconds before an accent form repeats. */
export const SCORE_ACCENT_FORM_STEPS = 64;
export const SCORE_SAFE_TRANSITION_STEPS = 16;

export type ScoreMode = 'calm' | 'active' | 'crisis' | 'boss';
export type MusicCueId =
  | 'intro-calm'
  | 'intro-pressure'
  | 'calm-loop'
  | 'active-loop'
  | 'boss-loop'
  | 'boss-end'
  | 'active-to-boss';

export interface MusicCue {
  id: MusicCueId;
  path: string;
  role: 'intro' | 'loop' | 'transition' | 'ending';
  loop: boolean;
  duration: number;
  measuredLufs: number;
  measuredTruePeakDb: number;
  /** Gain that stages every supplied segment close to -16 LUFS pre-bus. */
  normalizationGainDb: number;
}

export interface CompoundCueRelationship {
  from: MusicCueId;
  to: MusicCueId;
  sharedPrefixSeconds: number;
  purpose: 'intensity-extension' | 'transition' | 'ending';
}

/**
 * Crocdent's CC0 "Last Journey" package is a real horizontally authored game
 * score: two introductions, three loops, a loop-to-loop transition, and an
 * ending. The measurements below come from ffmpeg loudnorm/true-peak analysis
 * of the exact source archive pinned in docs/AUDIO_ASSET_MANIFEST.md.
 */
export const MUSIC_CUES: Readonly<Record<MusicCueId, MusicCue>> = {
  'intro-calm': {
    id: 'intro-calm', path: '/assets/audio/music/Intro1.ogg', role: 'intro', loop: false,
    duration: 25.846145, measuredLufs: -14.8, measuredTruePeakDb: -1.2, normalizationGainDb: -1.2,
  },
  'intro-pressure': {
    id: 'intro-pressure', path: '/assets/audio/music/Intro2.ogg', role: 'intro', loop: false,
    duration: 40.615374, measuredLufs: -14.2, measuredTruePeakDb: -1.2, normalizationGainDb: -1.8,
  },
  'calm-loop': {
    id: 'calm-loop', path: '/assets/audio/music/Loop1.ogg', role: 'loop', loop: true,
    duration: 36.923084, measuredLufs: -14.0, measuredTruePeakDb: -1.3, normalizationGainDb: -2,
  },
  'active-loop': {
    id: 'active-loop', path: '/assets/audio/music/Loop2.ogg', role: 'loop', loop: true,
    duration: 14.769229, measuredLufs: -13.5, measuredTruePeakDb: -2.4, normalizationGainDb: -2.5,
  },
  'boss-loop': {
    id: 'boss-loop', path: '/assets/audio/music/Loop3.ogg', role: 'loop', loop: true,
    duration: 12.923084, measuredLufs: -9.9, measuredTruePeakDb: -0.1, normalizationGainDb: -6.1,
  },
  'boss-end': {
    id: 'boss-end', path: '/assets/audio/music/Loop3End.ogg', role: 'ending', loop: false,
    duration: 18.461542, measuredLufs: -10.0, measuredTruePeakDb: -0.1, normalizationGainDb: -6,
  },
  'active-to-boss': {
    id: 'active-to-boss', path: '/assets/audio/music/Transi2to3.ogg', role: 'transition', loop: false,
    duration: 14.769229, measuredLufs: -13.5, measuredTruePeakDb: -2.4, normalizationGainDb: -2.5,
  },
} as const;

/**
 * These source files are compound alternatives, not independent phrases to
 * concatenate at arbitrary times. Their prefixes are phase-compatible. The
 * transport may therefore transfer at the current offset without replaying
 * the beginning of the phrase.
 */
export const COMPOUND_CUE_RELATIONSHIPS = [
  { from: 'intro-calm', to: 'intro-pressure', sharedPrefixSeconds: MUSIC_CUES['intro-calm'].duration, purpose: 'intensity-extension' },
  { from: 'active-loop', to: 'active-to-boss', sharedPrefixSeconds: MUSIC_CUES['active-loop'].duration, purpose: 'transition' },
  { from: 'boss-loop', to: 'boss-end', sharedPrefixSeconds: MUSIC_CUES['boss-loop'].duration, purpose: 'ending' },
] as const satisfies readonly CompoundCueRelationship[];

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
    mode: 'calm', loop: 'calm-loop', firstEntrance: 'intro-calm',
    percussionDensity: 0, lowBrass: false,
    description: 'Long-form forest introduction into the spacious primary loop.',
  },
  active: {
    mode: 'active', loop: 'active-loop', firstEntrance: 'intro-pressure',
    percussionDensity: 1, lowBrass: false,
    description: 'Authored pressure introduction and compact combat loop.',
  },
  crisis: {
    mode: 'crisis', loop: 'active-loop',
    percussionDensity: 2, lowBrass: true,
    description: 'The active loop persists for continuity while a syncopated frame-drum and low-reed layer enters.',
  },
  boss: {
    mode: 'boss', loop: 'boss-loop',
    percussionDensity: 3, lowBrass: true,
    description: 'A dedicated authored transition resolves into the climactic third loop.',
  },
} as const;

export const SCORE_FORM = [
  'intro-calm',
  'calm-loop',
  'intro-pressure',
  'active-loop',
  'active-to-boss',
  'boss-loop',
  'boss-end',
] as const satisfies readonly MusicCueId[];

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
    if (cue.loop !== (cue.role === 'loop')) errors.push(`${cue.id} loop flag disagrees with its role.`);
  }
  for (const arrangement of Object.values(ADAPTIVE_ARRANGEMENT)) {
    if (!ids.has(arrangement.loop)) errors.push(`${arrangement.mode} has no loop.`);
    if (arrangement.firstEntrance && !ids.has(arrangement.firstEntrance)) errors.push(`${arrangement.mode} has no entrance.`);
  }
  if (MUSIC_CUES['active-to-boss'].duration !== MUSIC_CUES['active-loop'].duration) {
    errors.push('The authored active-to-boss transition must match the active-loop duration.');
  }
  for (const relationship of COMPOUND_CUE_RELATIONSHIPS) {
    const from = MUSIC_CUES[relationship.from];
    const to = MUSIC_CUES[relationship.to];
    if (relationship.sharedPrefixSeconds > Math.min(from.duration, to.duration)) {
      errors.push(`${relationship.from} -> ${relationship.to} exceeds its shared prefix.`);
    }
  }
  for (const [mode, pattern] of Object.entries(SCORE_ACCENT_PATTERNS)) {
    const steps = [...pattern.percussion, ...pattern.strong, ...pattern.lowBrass];
    if (steps.some((step) => step < 0 || step >= SCORE_ACCENT_FORM_STEPS)) errors.push(`${mode} accent exceeds its form.`);
  }
  return errors;
}
