import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Discover from './Discover';
import Profile from './Profile';
import Moderation from './Moderation';
import SharedRecipeCommunity from './SharedRecipeCommunity';
import { api, ApiError } from '../lib/api';
import { setAccount, setOperatorToken, type Account } from '../lib/session';
import type { PublishedRecipe } from '../lib/types';
import { renderScreen } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: {
    getPublishedIndex: vi.fn(),
    getProfile: vi.fn(),
    getMyRating: vi.fn(),
    rateRecipe: vi.fn(),
    getComments: vi.fn(),
    postComment: vi.fn(),
    deleteComment: vi.fn(),
    report: vi.fn(),
    getModerationQueue: vi.fn(),
    moderateRecipe: vi.fn(),
    moderateComment: vi.fn(),
    resolveReport: vi.fn(),
  },
}));

const ADA: Account = {
  id: 'u1', email: 'ada@example.com', handle: 'ada', displayName: '', bio: '', emailVerified: true,
  plan: 'free', pro: false, joinedAt: '2026-10-01', planExpiresAt: null,
};

const shared = (over: Partial<PublishedRecipe>): PublishedRecipe => ({
  _id: 'p1', slug: 'rye', title: 'Rye', description: '', imageUrls: [], servings: 2, difficulty: '',
  prepTime: '', cookTime: '', tags: [], folder: '', authorHandle: 'proof', sourceAttribution: '',
  publishedAt: '2026-08-01T00:00:00.000Z', stats: { saves: 0, bakedCount: 0, ratingSum: 0, ratingCount: 0 },
  ...over,
});

const INDEX = [
  shared({ _id: 'a', slug: 'focaccia', title: 'Focaccia', tags: ['bread'], publishedAt: '2026-08-01T00:00:00.000Z', stats: { saves: 0, bakedCount: 9, ratingSum: 0, ratingCount: 0 } }),
  shared({ _id: 'b', slug: 'babka', title: 'Babka', tags: ['bread', 'sweet'], publishedAt: '2026-09-01T00:00:00.000Z', stats: { saves: 0, bakedCount: 1, ratingSum: 10, ratingCount: 2 } }),
  shared({ _id: 'c', slug: 'chili', title: 'Chili', tags: ['sweet'], authorHandle: 'bea', publishedAt: '2026-07-01T00:00:00.000Z' }),
];

const titles = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

afterEach(() => {
  setAccount(null);
  setOperatorToken(null);
});

describe('Discover', () => {
  beforeEach(() => vi.mocked(api.getPublishedIndex).mockResolvedValue({ items: INDEX }));

  it('lists the shared cookbook newest first, each linking to its public page', async () => {
    renderScreen(<Discover />);
    await screen.findByText('Babka');
    expect(titles()).toEqual(['Babka', 'Focaccia', 'Chili']);
    expect(screen.getByRole('link', { name: /Focaccia/ })).toHaveAttribute('href', '/r/focaccia');
  });

  it('sorts by most baked and by rating, and filters by tag', async () => {
    const user = userEvent.setup();
    renderScreen(<Discover />);
    await screen.findByText('Babka');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'Most baked');
    expect(titles()).toEqual(['Focaccia', 'Babka', 'Chili']);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'Top rated');
    expect(titles()[0]).toBe('Babka');

    await user.click(screen.getByRole('button', { name: 'Tags' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Tags' })).getByRole('button', { name: /sweet/ }));
    expect(titles().sort()).toEqual(['Babka', 'Chili']);
    // The tag in force is a chip that takes itself off.
    await user.click(screen.getByRole('button', { name: 'Showing sweet; show every tag' }));
    expect(titles()).toHaveLength(3);
  });

  it('leads with one recipe across the page, then two to a row, with who made it and how often', async () => {
    renderScreen(<Discover />);
    await screen.findByText('Babka');
    const lead = screen.getByRole('link', { name: /Babka/ });
    expect(within(lead).getByRole('heading', { level: 3 })).toHaveClass('text-3xl');
    expect(screen.getByText('@proof · baked 9 times')).toBeInTheDocument();
    expect(screen.getByText('@proof · baked once')).toBeInTheDocument();
  });

  it('searches on the device, by baker as well as title', async () => {
    const user = userEvent.setup();
    renderScreen(<Discover />);
    await screen.findByText('Babka');
    await user.type(screen.getByPlaceholderText(/Search recipes/), 'bea');
    expect(titles()).toEqual(['Chili']);
  });

});

describe('Discover, offline', () => {
  it('says the shared cookbook needs a connection, rather than drawing it empty', async () => {
    vi.mocked(api.getPublishedIndex).mockImplementation(() => Promise.reject(new ApiError('Not available.', 404)));
    renderScreen(<Discover />);
    expect(await screen.findByText(/needs a connection/)).toBeInTheDocument();
  });
});

describe('a baker\'s page', () => {
  it('shows the baker, their bio as their own words, a PRO tag, and their recipes', async () => {
    vi.mocked(api.getProfile).mockResolvedValue({
      profile: { handle: 'ada', displayName: 'Ada', bio: 'Rye, mostly.', pro: true, joinedAt: '2026-01-01' },
      recipes: [INDEX[0]],
      stats: { published: 1, baked: 9 },
    });
    renderScreen(<Profile />, { route: '/@ada', path: '/:at' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Ada' })).toBeInTheDocument();
    expect(screen.getByText(/@ada · 1 recipe · baked 9 times by others/)).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Rye, mostly.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'On the shelf' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Focaccia/ })).toHaveAttribute('href', '/r/focaccia');
    expect(api.getProfile).toHaveBeenCalledWith('ada');
  });

  it('shares the page through the system sheet, or copies its address', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getProfile).mockResolvedValue({
      profile: { handle: 'ada', displayName: '', bio: '', pro: false, joinedAt: '2026-01-01' },
      recipes: [],
      stats: { published: 0, baked: 0 },
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderScreen(<Profile />, { route: '/@ada', path: '/:at' });
    await user.click(await screen.findByRole('button', { name: 'Share profile' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/@ada`);
    expect(screen.getByText('Nothing published yet.')).toBeInTheDocument();
  });

  it('is a 404 for an address without @, and for nobody', async () => {
    renderScreen(<Profile />, { route: '/nonsense', path: '/:at' });
    expect(screen.getByText(/That page isn't in this book/)).toBeInTheDocument();
    expect(api.getProfile).not.toHaveBeenCalled();
  });
});

describe('a shared recipe\'s conversation', () => {
  const RYE = shared({ stats: { saves: 3, bakedCount: 2, ratingSum: 9, ratingCount: 2 } });
  beforeEach(() => {
    vi.mocked(api.getComments).mockResolvedValue({
      items: [
        { _id: 'c1', authorHandle: 'bea', body: 'Lovely crumb.', createdAt: '2026-09-01T00:00:00.000Z', pending: false, mine: false },
        { _id: 'c2', authorHandle: 'ada', body: 'Mine.', createdAt: '2026-09-02T00:00:00.000Z', pending: true, mine: true },
      ],
    });
    vi.mocked(api.getMyRating).mockResolvedValue({ stars: null, baked: false });
  });

  it('prints the readings it has, and invites a first bake when it has none', async () => {
    const { unmount } = renderScreen(<SharedRecipeCommunity recipe={RYE} />);
    expect(screen.getByText(/4\.5 of 5 from 2 ratings · baked 2 times · saved 3 times/)).toBeInTheDocument();
    unmount();
    renderScreen(<SharedRecipeCommunity recipe={shared({})} />);
    expect(screen.getByText('Be the first to bake this.')).toBeInTheDocument();
    expect(screen.queryByText(/of 5/)).not.toBeInTheDocument();
  });

  it('sets what bakers wrote as pencilled notes in the margin', async () => {
    renderScreen(<SharedRecipeCommunity recipe={RYE} />);
    expect(screen.getByRole('heading', { name: 'What bakers noticed' })).toBeInTheDocument();
    expect(await screen.findByText('Lovely crumb.')).toHaveClass('text-pencil');
  });

  it('asks a stranger to sign in to rate or comment', async () => {
    renderScreen(<SharedRecipeCommunity recipe={RYE} />);
    expect(screen.getByRole('button', { name: 'Sign in to rate it' })).toBeInTheDocument();
    expect(await screen.findByText('Lovely crumb.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in to add a note' })).toBeInTheDocument();
  });

  it('rates, and says "I baked this"', async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.rateRecipe).mockResolvedValue({ rating: { stars: 4, baked: false }, stats: RYE.stats! });
    renderScreen(<SharedRecipeCommunity recipe={RYE} />);
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await waitFor(() => expect(api.rateRecipe).toHaveBeenCalledWith('p1', { stars: 4 }));
    await user.click(screen.getByRole('button', { name: 'I baked this' }));
    await waitFor(() => expect(api.rateRecipe).toHaveBeenCalledWith('p1', { baked: true }));
  });

  it("marks the author's own held comment, and lets them delete it", async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.deleteComment).mockResolvedValue({ ok: true });
    renderScreen(<SharedRecipeCommunity recipe={RYE} />);
    expect(await screen.findByText(/only you can see it/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(api.deleteComment).toHaveBeenCalledWith('c2'));
  });

  it("shows the server's reason a comment can't be posted, keeping what was typed", async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.postComment).mockRejectedValue(new ApiError('New accounts can comment after their first day.', 403));
    renderScreen(<SharedRecipeCommunity recipe={RYE} />);
    await user.type(screen.getByLabelText('What you noticed'), 'Hello');
    await user.click(screen.getByRole('button', { name: 'Add the note' }));
    expect(await screen.findByText(/after their first day/)).toBeInTheDocument();
    expect(screen.getByLabelText('What you noticed')).toHaveValue('Hello');
  });

  it('reports a comment with a reason', async () => {
    const user = userEvent.setup();
    vi.mocked(api.report).mockResolvedValue({ ok: true });
    renderScreen(<SharedRecipeCommunity recipe={RYE} />);
    await screen.findByText('Lovely crumb.');
    await user.click(screen.getAllByRole('button', { name: 'Report' })[0]);
    await user.type(await screen.findByLabelText("What's wrong with it?"), 'Spam');
    await user.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(api.report).toHaveBeenCalledWith({ targetType: 'comment', targetId: 'c1', reason: 'Spam' }));
    expect(await screen.findByText(/The operator will look at it/)).toBeInTheDocument();
  });
});

describe('the moderation queue', () => {
  it('is nothing at all to anyone but the operator', () => {
    renderScreen(<Moderation />);
    expect(screen.getByText(/That page isn't in this book/)).toBeInTheDocument();
    expect(api.getModerationQueue).not.toHaveBeenCalled();
  });

  it('lets the operator approve a held recipe and hold one back with a reason', async () => {
    const user = userEvent.setup();
    setOperatorToken('op');
    vi.mocked(api.getModerationQueue).mockResolvedValue({
      recipes: [
        { ...shared({ _id: 'h1', title: 'Held Rye', authorHandle: 'bea', instructions: ['Mix.'] }), sourceLocalId: 'x', sourceUpdatedAt: null, unpublishedAt: null, moderation: { state: 'pending', reason: 'Looks copied.' } },
      ],
      comments: [],
      reports: [],
    });
    vi.mocked(api.moderateRecipe).mockResolvedValue({ ok: true });
    renderScreen(<Moderation />);

    expect(await screen.findByText('Held Rye')).toBeInTheDocument();
    expect(screen.getByText('Screen: Looks copied.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reason'), 'Credit the source.');
    await user.click(screen.getByRole('button', { name: 'Hold back' }));
    await waitFor(() => expect(api.moderateRecipe).toHaveBeenCalledWith('h1', 'reject', 'Credit the source.'));
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.moderateRecipe).toHaveBeenCalledWith('h1', 'approve'));
  });
});
