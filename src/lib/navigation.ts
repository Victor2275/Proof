import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType, type NavigationType } from 'react-router-dom';
import { destinationOf, isDestinationRoot } from './destinations';

/*
 * Which way a change of page goes, for PageTransition: from one destination to
 * another (a tab), deeper in (a push), back out (a pop), or none at all — the
 * first page of a visit, a refresh, a deep link, a redirect.
 */
export type TransitionKind = 'none' | 'tab' | 'push' | 'pop';

export function transitionKind(prev: string | null, next: string, nav: NavigationType): TransitionKind {
  if (prev === null || prev === next || nav === 'REPLACE') return 'none';
  if (isDestinationRoot(next) && (isDestinationRoot(prev) || destinationOf(prev) !== destinationOf(next))) return 'tab';
  return nav === 'POP' ? 'pop' : 'push';
}

/*
 * Scroll that is remembered: going back returns to where you were on the page
 * you left, and a tab returns to where you left it. Anything else starts at
 * the top. The app scrolls inside <main>, not the window, so the browser's own
 * restoration never sees it.
 */
const saved = new Map<string, number>();

export function useScrollMemory(scroller: RefObject<HTMLElement | null>) {
  const location = useLocation();
  const nav = useNavigationType();
  const current = useRef({ key: location.key, path: location.pathname });

  // Record as the page scrolls, against both the history entry and, for a
  // destination's own page, the destination.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      saved.set(`key:${current.current.key}`, el.scrollTop);
      if (isDestinationRoot(current.current.path)) saved.set(`tab:${current.current.path}`, el.scrollTop);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scroller]);

  useLayoutEffect(() => {
    const el = scroller.current;
    const previous = current.current;
    current.current = { key: location.key, path: location.pathname };
    if (!el || previous.path === location.pathname) return;

    const target =
      nav === 'POP'
        ? (saved.get(`key:${location.key}`) ?? 0)
        : isDestinationRoot(location.pathname) && transitionKind(previous.path, location.pathname, nav) === 'tab'
          ? (saved.get(`tab:${location.pathname}`) ?? 0)
          : 0;

    el.scrollTop = target;
    if (target === 0) return;
    // The page may still be arriving (a lazy screen, a local read): keep
    // trying for a moment until it is tall enough to hold the position.
    let frames = 0;
    let raf = requestAnimationFrame(function retry() {
      el.scrollTop = target;
      if (Math.abs(el.scrollTop - target) > 1 && ++frames < 30) raf = requestAnimationFrame(retry);
    });
    return () => cancelAnimationFrame(raf);
  }, [location.key, location.pathname, nav, scroller]);
}
