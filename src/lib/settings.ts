/*
 * Single source of truth for user-preference keys.
 *
 * These were previously read as inline localStorage string literals at each call
 * site, which let the names drift: Settings wrote 'ttsEnabled' while TimerManager
 * read 'audioAnnouncementsEnabled', so the toggle silently did nothing. Reading
 * preferences through here keeps the writer and the readers on the same key.
 */

export const SETTINGS_KEYS = {
  haptics: 'hapticsEnabled',
  tts: 'ttsEnabled',
  voiceCommands: 'voiceCommands',
  waveToAdvance: 'waveToAdvance',
  defaultBakersMath: 'defaultBakersMath',
  theme: 'theme',
  handwriting: 'handwritingNotes',
} as const;

/** Preferences that stay on until explicitly switched off. */
const readEnabledByDefault = (key: string) => localStorage.getItem(key) !== 'false';

/** Preferences that stay off until explicitly switched on. */
const readDisabledByDefault = (key: string) => localStorage.getItem(key) === 'true';

export const hapticsEnabled = () => readEnabledByDefault(SETTINGS_KEYS.haptics);
export const ttsEnabled = () => readEnabledByDefault(SETTINGS_KEYS.tts);
export const voiceCommandsEnabled = () => readDisabledByDefault(SETTINGS_KEYS.voiceCommands);
export const waveToAdvanceEnabled = () => readDisabledByDefault(SETTINGS_KEYS.waveToAdvance);
export const handwritingEnabled = () => readDisabledByDefault(SETTINGS_KEYS.handwriting);

/** Sets bake notes in the handwriting face, or back in the reading face (change 18). */
export function applyHandwriting(on: boolean) {
  if (on) document.documentElement.dataset.hand = 'on';
  else delete document.documentElement.dataset.hand;
}
