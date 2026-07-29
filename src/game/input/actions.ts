export type InputAction =
  | 'pause'
  | 'speed'
  | 'call-wave'
  | 'ability-warden'
  | 'ability-seer'
  | 'cancel';

export const KEY_BINDINGS: Record<string, InputAction> = {
  Escape: 'pause',
  Space: 'call-wave',
  Digit1: 'ability-warden',
  Digit2: 'ability-seer',
  KeyF: 'speed',
};
