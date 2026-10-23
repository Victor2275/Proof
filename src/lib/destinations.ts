/*
 * The four places in the app, and which one a screen belongs to.
 *
 * Cookbook, Bakes, Shop and Discover replace thirteen entries spread over a
 * sidebar and a More drawer (UI overhaul, changes 19–25). A screen that is not
 * itself a destination still belongs to one — a recipe is a page of the
 * cookbook, so the Cookbook tab stays lit while you read it — and a few belong
 * to none: Settings and the operator's queue sit behind the avatar.
 */

export type Destination = 'cookbook' | 'bakes' | 'shop' | 'discover';

export const DESTINATIONS: { id: Destination; to: string; label: string }[] = [
  { id: 'cookbook', to: '/', label: 'Cookbook' },
  { id: 'bakes', to: '/bakes', label: 'Bakes' },
  { id: 'shop', to: '/shop', label: 'Shop' },
  { id: 'discover', to: '/discover', label: 'Discover' },
];

/** The destination a path belongs to, or null for one that sits outside them. */
export function destinationOf(pathname: string): Destination | null {
  if (pathname === '/' || /^\/(recipe|new|edit|notes)(\/|$)/.test(pathname)) return 'cookbook';
  if (/^\/bakes(\/|$)/.test(pathname)) return 'bakes';
  if (/^\/shop(\/|$)/.test(pathname)) return 'shop';
  if (/^\/discover(\/|$)/.test(pathname)) return 'discover';
  return null;
}

/** Whether a path is one of the four destinations itself, not a page inside one. */
export function isDestinationRoot(pathname: string): boolean {
  return DESTINATIONS.some((d) => d.to === pathname);
}

/*
 * Pages a stranger reaches from a shared link: a published recipe and a
 * baker's profile. They render without the app's navigation — a tab bar of a
 * cookbook the visitor does not have yet is chrome for a product they have not
 * chosen (change 28). Baking mode is chrome-free too, for its own reason: the
 * whole screen is the step.
 */
export function isChromeFree(pathname: string): boolean {
  return /^\/r\//.test(pathname) || /^\/@/.test(pathname) || /^\/recipe\/[^/]+\/bake$/.test(pathname);
}
