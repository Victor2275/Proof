import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeViewer from './RecipeViewer';
import { api } from '../lib/api';

/*
 * The selected-make detail. Phase 5 rebuilt the grid of makes and left this
 * behind in the previous world; it is a Sheet on the primitives now, and the
 * deletion that used to go through window.confirm asks in the world's own
 * voice. These cover the behaviours that changed, not the layout.
 */

const RECIPE = {
  _id: 'r1',
  title: 'Banana pudding',
  description: '',
  imageUrls: [],
  servings: 4,
  difficulty: 'Easy',
  prepTime: '20',
  cookTime: '30',
  tags: [],
  ingredients: [],
  instructions: ['Mix.', 'Chill.'],
};

const LOG = {
  _id: 'b1',
  recipeId: 'r1',
  date: '2026-08-09T17:41:22.000Z',
  notes: 'Bananas should be less ripe.',
  images: [],
  imageUrls: [],
  isPersonalBest: false,
};

vi.mock('../lib/api', () => ({
  api: {
    getRecipe: vi.fn(),
    getRecipeBakeLogs: vi.fn(),
    getPantry: vi.fn(),
    updateRecipe: vi.fn(),
    updateBakeLog: vi.fn(),
    deleteBakeLog: vi.fn(),
  },
}));

vi.mock('../lib/localDB', () => ({
  getLocalBakeLogs: vi.fn().mockResolvedValue([]),
  updateLocalBakeLog: vi.fn(),
  deleteLocalBakeLog: vi.fn(),
}));

function renderViewer() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/recipe/r1?makeId=b1']}>
        <Routes>
          <Route path="/recipe/:id" element={<RecipeViewer />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getRecipe).mockResolvedValue(RECIPE as any);
  vi.mocked(api.getRecipeBakeLogs).mockResolvedValue([LOG] as any);
  vi.mocked(api.getPantry).mockResolvedValue([] as any);
  vi.mocked(api.deleteBakeLog).mockResolvedValue(undefined as never);
  vi.mocked(api.updateBakeLog).mockResolvedValue({ ...LOG, isPersonalBest: true } as any);
});

describe('RecipeViewer — the selected make', () => {
  it('opens the make named in the URL as a dialog, not a bare overlay', async () => {
    renderViewer();
    // The first render in this file pays for importing the whole viewer. Under
    // a full parallel run that alone can pass the default one-second wait, and
    // the assertion then fails on load rather than on behaviour.
    const dialog = await screen.findByRole('dialog', { name: /Make #1/i }, { timeout: 5000 });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Bananas should be less ripe.')).toBeInTheDocument();
  });

  it('asks before deleting a bake, instead of a browser confirm', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByRole('dialog', { name: /Make #1/i });

    await user.click(screen.getByRole('button', { name: /Delete entry/i }));
    expect(await screen.findByRole('dialog', { name: /Delete this bake/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(api.deleteBakeLog).not.toHaveBeenCalled();
  });

  it('deletes the bake once that is confirmed', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByRole('dialog', { name: /Make #1/i });

    await user.click(screen.getByRole('button', { name: /Delete entry/i }));
    await screen.findByRole('dialog', { name: /Delete this bake/i });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.deleteBakeLog).toHaveBeenCalledWith('b1'));
  });

  it('latches the personal-best key rather than colouring a pill', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByRole('dialog', { name: /Make #1/i });

    const mark = screen.getByRole('button', { name: /Mark as personal best/i });
    expect(mark).toHaveAttribute('aria-pressed', 'false');

    await user.click(mark);
    await waitFor(() =>
      expect(api.updateBakeLog).toHaveBeenCalledWith('b1', { isPersonalBest: true }),
    );
  });

  it('confirms a copied link with a status strip, not a browser alert', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom exposes navigator.clipboard as a getter only.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderViewer();
    await screen.findByRole('dialog', { name: /Make #1/i });
    await user.keyboard('{Escape}');

    const share = await screen.findByRole('button', { name: /^Share$/i });
    await user.click(share);
    await user.click(await screen.findByRole('button', { name: /Copy link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Link copied.');
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('reports a failure in the panel rather than through alert()', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(api.deleteBakeLog).mockRejectedValueOnce(new Error('offline'));
    renderViewer();
    await screen.findByRole('dialog', { name: /Make #1/i });

    await user.click(screen.getByRole('button', { name: /Delete entry/i }));
    await screen.findByRole('dialog', { name: /Delete this bake/i });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not delete that bake log/i);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
