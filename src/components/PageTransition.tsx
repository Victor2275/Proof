import { useRef, type ReactNode } from 'react';
import { AnimatePresence, motion, type TargetAndTransition } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import { transitionKind, type TransitionKind } from '../lib/navigation';
import { takeMorph } from '../lib/sharedPhoto';

/*
 * How one screen gives way to the next (APP_FEEL_DEBATE §5).
 *
 *   tab   one destination to another: a 140 ms cross-fade, no slide, because
 *         the four tabs are peers and none is "further in" than another
 *   push  going deeper: the new page arrives 24 px from the right as it fades
 *         in, over 220 ms
 *   pop   coming back: the same from the left, quicker, over 180 ms
 *   none  the first page of a visit, a refresh, a deep link, a redirect
 *
 * Only the arriving page moves. The leaving one goes at once, so a press is
 * answered on the next frame rather than after an exit animation. Under
 * reduced motion, MotionConfig in App drops the slide and keeps the fade.
 *
 * A tile opening its recipe with the shared photograph is the exception: the
 * browser's View Transition moves the page, so this one stays still and swaps
 * its contents in place, without waiting on an exit (lib/sharedPhoto).
 */
const EASE = [0.2, 0.8, 0.2, 1] as const;

const ENTER: Record<TransitionKind, { initial: TargetAndTransition | false; duration: number }> = {
  none: { initial: false, duration: 0 },
  tab: { initial: { opacity: 0 }, duration: 0.14 },
  push: { initial: { opacity: 0, x: 24 }, duration: 0.22 },
  pop: { initial: { opacity: 0, x: -24 }, duration: 0.18 },
};

export default function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const nav = useNavigationType();
  const last = useRef<string | null>(null);
  const kind = useRef<TransitionKind>('none');
  const page = useRef(0);

  // Worked out once per change of page, during the render that shows it.
  if (last.current !== location.pathname) {
    const morph = takeMorph();
    kind.current = morph ? 'none' : transitionKind(last.current, location.pathname, nav);
    if (!morph) page.current += 1;
    last.current = location.pathname;
  }
  const { initial, duration } = ENTER[kind.current];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={page.current}
        initial={initial}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, transition: { duration: 0 } }}
        transition={{ duration, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
