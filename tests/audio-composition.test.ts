import { describe, expect, it } from 'vitest';
import {
  advanceScoreModeGate,
  ADAPTIVE_ARRANGEMENT,
  dbToGain,
  MUSIC_CUES,
  requestedScoreMode,
  SCORE_ACCENT_FORM_STEPS,
  SCORE_ACCENT_PATTERNS,
  SCORE_FORM,
  type ScoreModeGateState,
  SCORE_STEPS,
  validateComposition,
} from '../src/game/audio/ScoreComposition';

describe('long-form score composition', () => {
  it('defines three complete validated music programs', () => {
    expect(SCORE_STEPS).toBe(256);
    expect(SCORE_FORM).toEqual(['menu-theme', 'battle-theme', 'boss-theme']);
    expect(Object.keys(MUSIC_CUES)).toHaveLength(3);
    expect(validateComposition()).toEqual([]);
  });

  it('keeps one uninterrupted battle program and gives the boss distinct authored music', () => {
    expect(ADAPTIVE_ARRANGEMENT.calm.loop).toBe('battle-theme');
    expect(ADAPTIVE_ARRANGEMENT.active.loop).toBe('battle-theme');
    expect(ADAPTIVE_ARRANGEMENT.crisis.loop).toBe('battle-theme');
    expect(ADAPTIVE_ARRANGEMENT.boss.loop).toBe('boss-theme');
    expect(MUSIC_CUES['menu-theme'].path).not.toBe(MUSIC_CUES['battle-theme'].path);
    expect(MUSIC_CUES['boss-theme'].path).not.toBe(MUSIC_CUES['battle-theme'].path);
    expect(ADAPTIVE_ARRANGEMENT.crisis.percussionDensity)
      .toBeGreaterThan(ADAPTIVE_ARRANGEMENT.active.percussionDensity);
    expect(ADAPTIVE_ARRANGEMENT.boss.percussionDensity)
      .toBeGreaterThan(ADAPTIVE_ARRANGEMENT.crisis.percussionDensity);
  });

  it('uses browser-native assets with measured, non-clipping gain staging', () => {
    for (const cue of Object.values(MUSIC_CUES)) {
      expect(cue.path).toMatch(/\.ogg$/);
      expect(cue.duration).toBeGreaterThan(240);
      expect(cue.measuredTruePeakDb).toBeLessThanOrEqual(-1);
      expect(dbToGain(cue.normalizationGainDb)).toBeGreaterThan(0);
      expect(dbToGain(cue.normalizationGainDb)).toBeLessThanOrEqual(1);
    }
    expect(MUSIC_CUES['battle-theme'].duration).toBeGreaterThanOrEqual(300);
    expect(MUSIC_CUES['boss-theme'].duration).toBeGreaterThanOrEqual(300);
  });

  it('uses an eight-bar reinforcement form without replacing the battle composition', () => {
    expect(SCORE_ACCENT_FORM_STEPS).toBe(64);
    for (const mode of ['active', 'crisis', 'boss'] as const) {
      const blocks = Array.from({ length: 8 }, (_, block) => SCORE_ACCENT_PATTERNS[mode].percussion
        .filter((step) => Math.floor(step / 8) === block)
        .map((step) => step % 8)
        .join(','));
      expect(new Set(blocks).size).toBeGreaterThan(2);
    }
  });

  it('holds pressure through a 20/13 hysteresis band and rejects the captured mode-flap chronology', () => {
    const pressure = (alive: number, current: 'active' | 'crisis') => requestedScoreMode({
      hasBoss: false, alive, lives: 20, startingLives: 20, waveActive: true,
    }, current);
    expect(pressure(19, 'active')).toBe('active');
    expect(pressure(20, 'active')).toBe('crisis');
    expect(pressure(13, 'crisis')).toBe('crisis');
    expect(pressure(12, 'crisis')).toBe('active');

    let gate: ScoreModeGateState = { mode: 'calm', modeSince: 0, candidate: 'calm', candidateSince: 0 };
    gate = advanceScoreModeGate(gate, 'active', .2);
    gate = advanceScoreModeGate(gate, 'active', 2.7);
    expect(gate.mode).toBe('active');

    // The former transport entered crisis/active/crisis in 324 ms here.
    gate = advanceScoreModeGate(gate, 'crisis', 39.843);
    gate = advanceScoreModeGate(gate, 'active', 40.011);
    gate = advanceScoreModeGate(gate, 'crisis', 40.167);
    gate = advanceScoreModeGate(gate, 'active', 40.32);
    expect(gate.mode).toBe('active');

    // Inter-wave calm windows shorter than ten seconds never restart the score.
    gate = advanceScoreModeGate(gate, 'calm', 42);
    gate = advanceScoreModeGate(gate, 'active', 50.9);
    gate = advanceScoreModeGate(gate, 'calm', 52);
    gate = advanceScoreModeGate(gate, 'active', 59.9);
    expect(gate.mode).toBe('active');
  });
});
