import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { hapticsEnabled } from './settings';

/*
 * One vocabulary of touch feedback.
 *
 * Each kind of moment gets one kind of tick, so the app feels the same under
 * the thumb everywhere instead of every screen choosing its own strength:
 *
 *   selection  a choice moved: a segmented control, a tab, a letter on the rail
 *   light      a small commit: a toggle, an item ticked off, added to a list
 *   medium     a bigger commit: Start cooking, a sheet snapping to a detent
 *   success    something was saved: a bake logged, a timer finished
 *   warning    a destructive action that can still be undone
 *
 * A no-op on the web and when the person has switched haptics off in Settings.
 * Never fired on scroll.
 */
export type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'warning';

export function haptic(kind: HapticKind): void {
  if (!Capacitor.isNativePlatform() || !hapticsEnabled()) return;
  const done = (() => {
    switch (kind) {
      case 'selection':
        return Haptics.selectionChanged();
      case 'light':
        return Haptics.impact({ style: ImpactStyle.Light });
      case 'medium':
        return Haptics.impact({ style: ImpactStyle.Medium });
      case 'success':
        return Haptics.notification({ type: NotificationType.Success });
      case 'warning':
        return Haptics.notification({ type: NotificationType.Warning });
    }
  })();
  // Feedback is best-effort: a device without a motor must not surface an error.
  void done.catch(() => undefined);
}
