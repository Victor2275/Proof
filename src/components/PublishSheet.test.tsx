import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PublishSheet from './PublishSheet';
import PublicationStrip from './PublicationStrip';
import { api, ApiError } from '../lib/api';
import { setAccount, type Account } from '../lib/session';
import { creditFromUrl, publicationState, publishBody } from '../lib/publication';
import { savePhoto } from '../lib/repo/photos';
import type { Publication } from '../lib/types';
import { makeRecipe, renderScreen } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: {
    publishRecipe: vi.fn(),
    unpublishRecipe: vi.fn(),
    getMyPublications: vi.fn(),
  },
}));

const ADA: Account = {
  id: 'u1', email: 'ada@example.com', handle: 'ada', displayName: '', bio: '', emailVerified: true,
  plan: 'free', pro: false, joinedAt: '2026-10-01', planExpiresAt: null,
};

const RYE = makeRecipe({
  _id: 'r1',
  title: 'Dark Rye',
  ingredients: [{ name: 'Rye flour', quantity: 500, unit: 'g' }],
  instructions: ['Mix.', 'Bake.'],
  updatedAt: '2026-10-10T10:00:00.000Z',
});

const publication = (over: Partial<Publication> = {}): Publication => ({
  _id: 'p1', slug: 'dark-rye', title: 'Dark Rye', description: '', imageUrls: [], servings: 2, difficulty: '',
  prepTime: '', cookTime: '', tags: [], folder: '', authorHandle: 'ada', sourceAttribution: '',
  publishedAt: '2026-10-10T10:00:00.000Z', sourceLocalId: 'r1', sourceUpdatedAt: '2026-10-10T10:00:00.000Z',
  moderation: { state: 'approved', reason: '' }, unpublishedAt: null, ...over,
});

afterEach(() => setAccount(null));

describe('where a recipe stands', () => {
  it('reads local, waiting, live, live with edits, and held back', () => {
    expect(publicationState(RYE, undefined)).toBe('local');
    expect(publicationState(RYE, publication({ unpublishedAt: '2026-10-11' }))).toBe('local');
    expect(publicationState(RYE, publication({ moderation: { state: 'pending', reason: '' } }))).toBe('pending');
    expect(publicationState(RYE, publication())).toBe('live');
    expect(publicationState({ updatedAt: '2026-10-12T00:00:00.000Z' }, publication())).toBe('edits');
    expect(publicationState(RYE, publication({ moderation: { state: 'rejected', reason: 'x' } }))).toBe('rejected');
  });

  it('starts a credit from the site the recipe came from', () => {
    expect(creditFromUrl('https://www.someblog.com/rye')).toBe('someblog.com');
    expect(creditFromUrl(undefined)).toBe('');
  });

  it('sends photographs from the device as data, and the recipe as it stands', async () => {
    const ref = await savePhoto(new Blob(['crumb'], { type: 'image/webp' }));
    const body = await publishBody(
      { ...RYE, imageUrls: [ref, 'https://elsewhere.example/p.jpg'], forkedFrom: { publishedId: 'p0', slug: 's', authorHandle: 'proof', title: 'Rye' } },
      { sourceAttribution: '  ', ownWords: false },
    );
    expect(body.photos[0]).toMatch(/^data:image\/webp;base64,/);
    expect(body.photos[1]).toBe('https://elsewhere.example/p.jpg');
    expect(body).toMatchObject({ sourceLocalId: 'r1', sourceUpdatedAt: RYE.updatedAt, sourceAttribution: undefined });
    expect(body.forkedFrom).toEqual({ publishedId: 'p0', authorHandle: 'proof', title: 'Rye' });
  });
});

describe('the publish sheet', () => {
  it('asks a stranger to sign in, and says what publishing is', () => {
    renderScreen(<PublishSheet open onClose={() => {}} recipe={RYE} />);
    expect(screen.getByText(/needs an account with a confirmed email/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('tells an unconfirmed account where the link is', () => {
    setAccount('tok', { ...ADA, emailVerified: false });
    renderScreen(<PublishSheet open onClose={() => {}} recipe={RYE} />);
    expect(screen.getByText(/sent to ada@example.com/)).toBeInTheDocument();
  });

  it('says what will happen, publishes, and says where it landed', async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.publishRecipe).mockResolvedValue({ recipe: publication(), droppedPhotos: 1 });
    renderScreen(<PublishSheet open onClose={() => {}} recipe={RYE} />);

    expect(screen.getByText(/goes into the shared cookbook as @ada/)).toBeInTheDocument();
    expect(screen.getByText(/stay private until you push them/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(await screen.findByText('Live in the shared cookbook.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the public page' })).toHaveAttribute('href', '/r/dark-rye');
    expect(screen.getByText(/One photograph stayed behind/)).toBeInTheDocument();
  });

  it('says a held recipe is waiting, with the reason', async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.publishRecipe).mockResolvedValue({
      recipe: publication({ moderation: { state: 'pending', reason: 'Looks copied.' } }),
      droppedPhotos: 0,
    });
    renderScreen(<PublishSheet open onClose={() => {}} recipe={RYE} />);
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText(/Waiting for a look before it goes live. Looks copied./)).toBeInTheDocument();
  });

  it('asks an imported recipe for its credit, starting from the site', async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.publishRecipe).mockRejectedValue(
      new ApiError('Credit the source, or confirm the words are yours.', 400, false, 'sourceAttribution'),
    );
    renderScreen(<PublishSheet open onClose={() => {}} recipe={{ ...RYE, sourceUrl: 'https://www.someblog.com/rye' }} />);

    expect(screen.getByLabelText('Credit')).toHaveValue('someblog.com');
    await user.clear(screen.getByLabelText('Credit'));
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText(/Credit the source/)).toBeInTheDocument();
    expect(screen.getByLabelText('Credit')).toHaveAttribute('aria-invalid', 'true');
  });

  it('pushes an update, and unpublishes only after a second press', async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.unpublishRecipe).mockResolvedValue({ recipe: publication({ unpublishedAt: '2026-10-12' }) });
    const onClose = vi.fn();
    renderScreen(<PublishSheet open onClose={onClose} recipe={RYE} publication={publication()} />);

    expect(screen.getByRole('button', { name: 'Push update' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(api.unpublishRecipe).not.toHaveBeenCalled();
    expect(screen.getByText(/takes the public page down/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unpublish now' }));
    await waitFor(() => expect(api.unpublishRecipe).toHaveBeenCalledWith('p1'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('the publication strip', () => {
  beforeEach(() => setAccount('tok', ADA));

  it('reads live with edits, and offers to push them', async () => {
    vi.mocked(api.getMyPublications).mockResolvedValue({ items: [publication({ sourceUpdatedAt: '2026-10-01T00:00:00.000Z' })] });
    renderScreen(<PublicationStrip recipe={RYE} />);
    expect(await screen.findByText('Public · edits not yet shared')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Push update' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Public page' })).toHaveAttribute('href', '/r/dark-rye');
  });

  it('says why a recipe was held back, and how to fix it, without red', async () => {
    vi.mocked(api.getMyPublications).mockResolvedValue({
      items: [publication({ moderation: { state: 'rejected', reason: 'Credit the source.' } })],
    });
    renderScreen(<PublicationStrip recipe={RYE} />);
    expect(await screen.findByText(/Held back: Credit the source. Edit the recipe, then publish again./)).toBeInTheDocument();
    expect(screen.getByText('Private · only on this device')).toBeInTheDocument();
  });

  it('is simply local when signed out', () => {
    setAccount(null);
    renderScreen(<PublicationStrip recipe={RYE} />);
    expect(screen.getByText('Private · only on this device')).toBeInTheDocument();
    expect(api.getMyPublications).not.toHaveBeenCalled();
  });
});
