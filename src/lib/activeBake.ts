/**
 * The currently running bake, if any.
 *
 * Nothing in the app tracked this before Phase 2: `currentStep` lived as local
 * React state inside BakingMode and vanished the moment you navigated away. The
 * dashboard's signature behavior — one row lit red because a bake is running —
 * needs that state to survive navigation, so it is lifted here.
 *
 * Backed by localStorage rather than a query cache: this is a single device's
 * notion of "what I am doing right now," not server state, and it has to work
 * fully offline in a kitchen with no signal.
 */

const STORAGE_KEY = 'activeBake';
const CHANGE_EVENT = 'active-bake-changed';

export interface ActiveBake {
  recipeId: string;
  recipeTitle: string;
  /** Index into the recipe's `instructions` array. */
  stepIndex: number;
  /** ISO timestamp, set once when the bake starts and never touched again. */
  startedAt: string;
}

function read(): ActiveBake | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.recipeId !== 'string') return null;
    return parsed as ActiveBake;
  } catch {
    // A corrupt value reads as "no active bake" rather than throwing into
    // whatever screen happened to ask.
    return null;
  }
}

function write(bake: ActiveBake | null) {
  if (bake) localStorage.setItem(STORAGE_KEY, JSON.stringify(bake));
  else localStorage.removeItem(STORAGE_KEY);
  // `storage` only fires in other tabs/windows, never the one that wrote the
  // value — this event is how the writing tab's own UI (BakingMode) tells the
  // rest of that same tab (the dashboard, once mounted again) to re-read.
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getActiveBake(): ActiveBake | null {
  return read();
}

/** Starts tracking a bake, or resumes one already running for this recipe. */
export function startActiveBake(recipeId: string, recipeTitle: string, stepIndex = 0): void {
  const existing = read();
  if (existing?.recipeId === recipeId) {
    // Already running: don't stomp startedAt, but do let a fresher step index
    // through if BakingMode is re-initializing from a stale mount.
    if (existing.stepIndex !== stepIndex) write({ ...existing, stepIndex });
    return;
  }
  write({ recipeId, recipeTitle, stepIndex, startedAt: new Date().toISOString() });
}

/** No-ops if `recipeId` is not the currently active bake — a stale tab cannot
 * clobber a bake that moved on. */
export function updateActiveBakeStep(recipeId: string, stepIndex: number): void {
  const existing = read();
  if (existing?.recipeId !== recipeId) return;
  if (existing.stepIndex === stepIndex) return;
  write({ ...existing, stepIndex });
}

export function clearActiveBake(recipeId?: string): void {
  const existing = read();
  if (recipeId && existing?.recipeId !== recipeId) return;
  write(null);
}

export function subscribeActiveBake(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}
