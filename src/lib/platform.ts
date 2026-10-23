/** Whether the keyboard's command key is ⌘ (Apple) rather than Ctrl. */
export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
