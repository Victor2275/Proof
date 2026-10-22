import { describe, it, expect, beforeEach, vi } from 'vitest';

const native = vi.hoisted(() => ({ value: true }));
const calls = vi.hoisted(() => ({ impact: vi.fn(), selection: vi.fn(), notification: vi.fn() }));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));
vi.mock('@capacitor/haptics', () => ({
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING' },
  Haptics: {
    impact: (o: unknown) => (calls.impact(o), Promise.resolve()),
    selectionChanged: () => (calls.selection(), Promise.resolve()),
    notification: (o: unknown) => (calls.notification(o), Promise.resolve()),
  },
}));

import { haptic } from './haptics';

describe('haptic', () => {
  beforeEach(() => {
    native.value = true;
    localStorage.clear();
    Object.values(calls).forEach((fn) => fn.mockClear());
  });

  it('gives each kind of moment its own tick', () => {
    haptic('selection');
    haptic('light');
    haptic('medium');
    haptic('success');
    haptic('warning');
    expect(calls.selection).toHaveBeenCalledTimes(1);
    expect(calls.impact).toHaveBeenNthCalledWith(1, { style: 'LIGHT' });
    expect(calls.impact).toHaveBeenNthCalledWith(2, { style: 'MEDIUM' });
    expect(calls.notification).toHaveBeenNthCalledWith(1, { type: 'SUCCESS' });
    expect(calls.notification).toHaveBeenNthCalledWith(2, { type: 'WARNING' });
  });

  it('is silent on the web', () => {
    native.value = false;
    haptic('light');
    expect(calls.impact).not.toHaveBeenCalled();
  });

  it('is silent when switched off in Settings', () => {
    localStorage.setItem('hapticsEnabled', 'false');
    haptic('success');
    expect(calls.notification).not.toHaveBeenCalled();
  });
});
