import { flushSync } from 'react-dom';

/*
 * The shared photograph: a cookbook tile's picture grows into the recipe's own
 * (APP_FEEL_DEBATE §5, "An enhancement, built last").
 *
 * React Router's `viewTransition` needs a data router, and the app uses
 * <BrowserRouter>, so the tile starts the View Transition itself. The clicked
 * tile's plate is named for the recipe; the recipe page's hero carries the
 * same name; the browser morphs one into the other over 340 ms (index.css).
 *
 * The browser holds the screen still while the new page is being drawn, and
 * the recipe is read from IndexedDB, so the update waits — briefly — for the
 * hero to appear. If it is slow (a first visit's code, a cold read), the
 * navigation goes ahead as a plain fade rather than keeping a tap waiting.
 *
 * Only a warm, in-app press morphs. A browser without the API, reduced
 * motion, and a press with a modifier key all navigate as they always did.
 */

const HERO_WAIT_MS = 250;

/** A recipe's `view-transition-name`. It must be a CSS identifier. */
export const photoName = (recipeId: string) => `photo-${recipeId.replace(/[^\w-]/g, '-')}`;

type StartViewTransition = (update: () => Promise<void> | void) => { finished: Promise<void> };

export function canMorph(): boolean {
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  if (typeof start !== 'function') return false;
  return !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/*
 * PageTransition's own slide would run under the morph and fight it, and its
 * exit waits on animation frames the browser is not giving out while it holds
 * the screen. It asks here, once per change of page, whether to stand aside.
 */
let morphing = false;
export function takeMorph(): boolean {
  const was = morphing;
  morphing = false;
  return was;
}

function whenPresent(selector: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) return resolve();
    // Not requestAnimationFrame: frames are paused while the transition holds.
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) done();
    });
    const timer = window.setTimeout(() => done(), HERO_WAIT_MS);
    function done() {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    }
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

/** Opens a recipe with its photograph carried over from `plate`. */
export function openWithPhoto(plate: HTMLElement | null, recipeId: string, go: () => void): void {
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition!.bind(document);
  const name = photoName(recipeId);
  if (plate) plate.style.viewTransitionName = name;
  const transition = start(async () => {
    if (plate) plate.style.viewTransitionName = '';
    morphing = true;
    flushSync(go);
    await whenPresent(`[data-photo="${name}"]`);
  });
  transition.finished.catch(() => undefined).finally(() => {
    morphing = false;
  });
}
