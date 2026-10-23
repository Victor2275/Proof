import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, NavigationType, useLocation } from 'react-router-dom';
import TabBar from './TabBar';
import TopBar from './TopBar';
import TimerPill from './TimerPill';
import BakesPage from './BakesPage';
import ShopPage from './ShopPage';
import PublishedPage from './PublishedPage';
import { AccountSheetButton } from './AccountMenu';
import App from '../App';
import { destinationOf, isChromeFree, isDestinationRoot } from '../lib/destinations';
import { transitionKind } from '../lib/navigation';
import { leadTimer, OPEN_TIMERS_EVENT, publishRunningTimers } from '../lib/timerBus';
import { clearActiveBake, startActiveBake } from '../lib/activeBake';
import { setAccount, setOperatorToken, type Account } from '../lib/session';
import { api } from '../lib/api';
import type { Publication } from '../lib/types';
import { makeRecipe, renderScreen, seed, testQueryClient } from '../test/utils';
import { QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: { getMyPublications: vi.fn(), me: vi.fn(), getPublishedIndex: vi.fn() },
}));

const ADA: Account = {
  id: 'u1', email: 'ada@example.com', handle: 'ada', displayName: 'Ada Lovelace', bio: '', emailVerified: true,
  plan: 'free', pro: false, joinedAt: '2026-10-01', planExpiresAt: null,
};

/** Shows where the router is, so a test can see a link was followed. */
function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}

const at = (path: string, ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
      <Where />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  setAccount(null);
  setOperatorToken(null);
  publishRunningTimers([]);
});

describe('where a screen belongs', () => {
  it('puts every screen in one of four destinations, or none', () => {
    expect(destinationOf('/')).toBe('cookbook');
    expect(destinationOf('/recipe/r1')).toBe('cookbook');
    expect(destinationOf('/edit/r1')).toBe('cookbook');
    expect(destinationOf('/new')).toBe('cookbook');
    expect(destinationOf('/notes')).toBe('cookbook');
    expect(destinationOf('/bakes')).toBe('bakes');
    expect(destinationOf('/shop')).toBe('shop');
    expect(destinationOf('/discover')).toBe('discover');
    expect(destinationOf('/settings')).toBeNull();
    expect(destinationOf('/moderation')).toBeNull();
  });

  it('knows the destinations themselves from the pages inside them', () => {
    expect(isDestinationRoot('/')).toBe(true);
    expect(isDestinationRoot('/bakes')).toBe(true);
    expect(isDestinationRoot('/recipe/r1')).toBe(false);
  });

  it('draws no app chrome on a shared recipe, a profile or baking mode', () => {
    expect(isChromeFree('/r/rye')).toBe(true);
    expect(isChromeFree('/@ada')).toBe(true);
    expect(isChromeFree('/recipe/r1/bake')).toBe(true);
    expect(isChromeFree('/recipe/r1')).toBe(false);
    expect(isChromeFree('/discover')).toBe(false);
  });
});

describe('page transitions', () => {
  it('cross-fades between destinations, slides in deeper, slides back out', () => {
    expect(transitionKind('/', '/bakes', NavigationType.Push)).toBe('tab');
    expect(transitionKind('/recipe/r1', '/shop', NavigationType.Push)).toBe('tab');
    expect(transitionKind('/', '/recipe/r1', NavigationType.Push)).toBe('push');
    expect(transitionKind('/recipe/r1', '/', NavigationType.Pop)).toBe('pop');
    expect(transitionKind('/recipe/r1', '/edit/r1', NavigationType.Pop)).toBe('pop');
  });

  it('does not animate the first page, a redirect, or a change within the page', () => {
    expect(transitionKind(null, '/', NavigationType.Pop)).toBe('none');
    expect(transitionKind('/gallery', '/bakes', NavigationType.Replace)).toBe('none');
    expect(transitionKind('/bakes', '/bakes', NavigationType.Push)).toBe('none');
  });
});

describe('the phone tab bar', () => {
  it('has exactly four tabs, and no More and no floating New', () => {
    at('/', <TabBar />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Cookbook', 'Bakes', 'Shop', 'Discover']);
    expect(screen.queryByText('More')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new/i })).not.toBeInTheDocument();
  });

  it('marks the tab of the screen you are on, a recipe being a page of the cookbook', () => {
    at('/recipe/r1', <TabBar />);
    expect(screen.getByRole('link', { name: 'Cookbook' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Bakes' })).not.toHaveAttribute('aria-current');
  });

  it('marks nothing on a screen behind the avatar', () => {
    at('/settings', <TabBar />);
    expect(screen.getByRole('navigation', { name: 'Main' }).querySelector('[aria-current]')).toBeNull();
  });

  it('goes where each tab says', async () => {
    const user = userEvent.setup();
    at('/', <TabBar />);
    await user.click(screen.getByRole('link', { name: 'Shop' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/shop');
  });

  it('stays out of baking mode and of the pages a stranger opens from a link', () => {
    for (const path of ['/recipe/r1/bake', '/r/rye', '/@ada']) {
      const { unmount } = at(path, <TabBar />);
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('the desktop top bar', () => {
  it('has a home wordmark and the four destinations as navigation', () => {
    at('/bakes', <TopBar />);
    expect(screen.getByRole('link', { name: 'Proof, go to the cookbook' })).toHaveAttribute('href', '/');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Bakes' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
  });

  it('opens New as a sheet of the ways in', async () => {
    const user = userEvent.setup();
    at('/', <TopBar />);
    await user.click(screen.getByRole('button', { name: 'New' }));
    const sheet = await screen.findByRole('dialog', { name: 'New recipe' });
    expect(within(sheet).getByRole('link', { name: /Write it/ })).toHaveAttribute('href', '/new');
    expect(within(sheet).getByRole('link', { name: /Paste a link or text/ })).toHaveAttribute('href', '/new?start=paste');
  });

  it('is not drawn on a shared page', () => {
    at('/r/rye', <TopBar />);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});

describe('the avatar', () => {
  it('holds settings, account, published recipes, export and help, signed out', async () => {
    const user = userEvent.setup();
    at('/', <TopBar />);
    await user.click(screen.getByRole('button', { name: 'Your account and settings' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Settings',
      'Sign in',
      'My published recipes',
      'Export or import',
      'Help',
    ]);
    expect(within(menu).getByRole('menuitem', { name: 'Export or import' })).toHaveAttribute('href', '/settings#cookbook');
  });

  it('names the account and links to it, signed in; the operator also gets the queue', async () => {
    const user = userEvent.setup();
    setAccount('token', ADA);
    setOperatorToken('op');
    at('/', <TopBar />);
    expect(screen.getByRole('button', { name: 'Your account and settings' })).toHaveTextContent('AL');
    await user.click(screen.getByRole('button', { name: 'Your account and settings' }));
    expect(screen.getByText('@ada')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Account' })).toHaveAttribute('href', '/settings#account');
    expect(screen.getByRole('menuitem', { name: 'Moderation' })).toHaveAttribute('href', '/moderation');
  });

  it('opens Help', async () => {
    const user = userEvent.setup();
    at('/', <TopBar />);
    await user.click(screen.getByRole('button', { name: 'Your account and settings' }));
    await user.click(screen.getByRole('menuitem', { name: 'Help' }));
    expect(await screen.findByRole('dialog', { name: 'Help' })).toHaveTextContent('It stays on this device');
  });

  it('rises as a sheet on a phone', async () => {
    const user = userEvent.setup();
    at('/', <AccountSheetButton />);
    await user.click(screen.getByRole('button', { name: 'Your account and settings' }));
    const sheet = await screen.findByRole('dialog', { name: 'You' });
    await user.click(within(sheet).getByRole('link', { name: 'Settings' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/settings');
  });
});

describe('the running-timer pill', () => {
  afterEach(() => clearActiveBake());

  it('is not there when nothing is baking and no timer runs', () => {
    at('/', <TimerPill />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('names the timer nearest its end, counts the rest, and returns to baking mode', () => {
    startActiveBake('r1', 'Cheesecake', 3);
    publishRunningTimers([
      { id: 'a', name: 'Cool', remainingMs: 30 * 60_000, running: true },
      { id: 'b', name: 'Oven', remainingMs: 12 * 60_000 + 4000, running: true },
    ]);
    at('/bakes', <TimerPill />);
    const pill = screen.getByRole('link', { name: /Return to baking Cheesecake, Oven timer/ });
    expect(pill).toHaveAttribute('href', '/recipe/r1/bake');
    expect(pill).toHaveTextContent('Oven · 12:04');
    expect(pill).toHaveTextContent('+1');
  });

  it('opens the timers themselves when no bake is open', async () => {
    const user = userEvent.setup();
    publishRunningTimers([{ id: 'a', name: 'Proof', remainingMs: 60_000, running: true }]);
    const opened = vi.fn();
    window.addEventListener(OPEN_TIMERS_EVENT, opened);
    at('/', <TimerPill />);
    await user.click(screen.getByRole('button', { name: /Open timers, Proof timer/ }));
    expect(opened).toHaveBeenCalled();
    window.removeEventListener(OPEN_TIMERS_EVENT, opened);
  });

  it('marks a timer past its end with a minus sign, not an alarm colour', () => {
    publishRunningTimers([{ id: 'a', name: 'Oven', remainingMs: -42_000, running: true }]);
    at('/', <TimerPill />);
    expect(screen.getByRole('button')).toHaveTextContent('Oven · −00:42');
    expect(screen.getByRole('button')).toHaveClass('bg-butter');
  });

  it('stays out of baking mode, which shows its own timers', () => {
    startActiveBake('r1', 'Cheesecake', 0);
    at('/recipe/r1/bake', <TimerPill />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('follows the clock as the manager publishes it', () => {
    publishRunningTimers([{ id: 'a', name: 'Oven', remainingMs: 60_000, running: true }]);
    at('/', <TimerPill />);
    act(() => publishRunningTimers([{ id: 'a', name: 'Oven', remainingMs: 59_000, running: true }]));
    expect(screen.getByRole('button')).toHaveTextContent('00:59');
  });

  it('leads with a running timer over a paused one', () => {
    expect(
      leadTimer([
        { id: 'p', name: 'Paused', remainingMs: 1000, running: false },
        { id: 'r', name: 'Running', remainingMs: 90_000, running: true },
      ])?.name,
    ).toBe('Running');
  });
});

describe('Bakes and Shop', () => {
  it('Bakes switches between the history and its totals in place, keeping the view in the address', async () => {
    const user = userEvent.setup();
    renderScreen(
      <>
        <BakesPage />
        <Where />
      </>,
      { route: '/bakes' },
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Bakes' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'History' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Totals' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/bakes?view=totals');
    expect(await screen.findByText('Bakes logged')).toBeInTheDocument();
  });

  it('Shop holds what to buy and what is in the cupboard', async () => {
    const user = userEvent.setup();
    renderScreen(
      <>
        <ShopPage />
        <Where />
      </>,
      { route: '/shop' },
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Shop' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'In the cupboard' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/shop?view=cupboard');
    expect(await screen.findByRole('textbox', { name: /ingredient/i })).toBeInTheDocument();
  });
});

describe('My published recipes', () => {
  it('asks a stranger to sign in, and says why', () => {
    renderScreen(<PublishedPage />, { route: '/published' });
    expect(screen.getByText(/needs an account/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it("lists the signed-in baker's published recipes and where each stands", async () => {
    setAccount('token', ADA);
    await seed('recipes', [makeRecipe({ _id: 'r1', title: 'Rye', updatedAt: '2026-08-01T12:00:00.000Z' })]);
    vi.mocked(api.getMyPublications).mockResolvedValue({
      items: [
        {
          _id: 'p1', slug: 'rye', title: 'Rye', sourceLocalId: 'r1', sourceUpdatedAt: '2026-08-01T12:00:00.000Z',
          moderation: { state: 'approved', reason: '' }, unpublishedAt: null,
        } as Publication,
      ],
    });
    renderScreen(<PublishedPage />, { route: '/published' });
    const row = await screen.findByRole('link', { name: /Rye/ });
    expect(row).toHaveAttribute('href', '/recipe/r1');
    expect(row).toHaveTextContent('Public in the shared cookbook');
  });
});

describe('the app', () => {
  beforeEach(() => localStorage.setItem('hasVisited', 'true'));
  const renderApp = () =>
    render(
      <QueryClientProvider client={testQueryClient()}>
        <App />
      </QueryClientProvider>,
    );

  it.each([
    ['/gallery', '/bakes'],
    ['/analytics', '/bakes'],
    ['/grocery', '/shop'],
    ['/pantry', '/shop'],
  ])('sends the old address %s to its new home', async (from, to) => {
    window.history.pushState({}, '', from);
    renderApp();
    await waitFor(() => expect(window.location.pathname).toBe(to));
    expect(await screen.findByRole('heading', { level: 1, name: to === '/bakes' ? 'Bakes' : 'Shop' })).toBeInTheDocument();
  });

  it('keeps the view the old address meant', async () => {
    window.history.pushState({}, '', '/pantry');
    renderApp();
    await waitFor(() => expect(window.location.search).toBe('?view=cupboard'));
  });

  it('draws the tab bar and the top bar around an ordinary page', async () => {
    window.history.pushState({}, '', '/bakes');
    renderApp();
    expect(await screen.findAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
  });
});
