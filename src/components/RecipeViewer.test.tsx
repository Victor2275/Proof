import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecipeViewer from './RecipeViewer';
import { api } from '../lib/api';

/*
 * The viewer's structure: the order a baker reads it in, and what stays put
 * when the view changes. The selected make has its own file.
 */

const RECIPE = {
  _id: 'r1',
  title: 'Country Sourdough',
  description: '',
  imageUrls: [],
  servings: 2,
  difficulty: 'Hard',
  prepTime: '45',
  cookTime: '40',
  tags: [],
  ingredients: [{ name: 'Strong white flour', quantity: 900, unit: 'g' }],
  instructions: ['Feed the levain.', 'Bake.'],
  labNotes: 'Half the salt next time.',
};

const LOG = {
  _id: 'b1',
  recipeId: 'r1',
  date: '2026-08-09T17:41:22.000Z',
  notes: 'Crumb still tight.',
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
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/recipe/r1']}>
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
});

describe('RecipeViewer — layout', () => {
  it('puts the title before any control that changes the recipe', async () => {
    renderViewer();
    const title = await screen.findByRole('heading', { level: 1, name: 'Country Sourdough' }, { timeout: 5000 });
    const view = screen.getByRole('group', { name: 'View' });
    const scale = screen.getByRole('group', { name: 'Scale recipe' });

    // DOM order is reading and focus order: title, then the view switch, then
    // the scale bank down with the ingredients it scales.
    expect(title.compareDocumentPosition(view) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.compareDocumentPosition(scale) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the masthead when the view switches to previous makes', async () => {
    const user = userEvent.setup();
    renderViewer();
    const view = await screen.findByRole('group', { name: 'View' }, { timeout: 5000 });

    await user.click(await within(view).findByRole('button', { name: /Previous makes \(1\)/ }));

    expect(screen.getByRole('heading', { level: 1, name: 'Country Sourdough' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Previous makes' })).toBeInTheDocument();
    // The recipe's own controls belong to the recipe view.
    expect(screen.queryByRole('group', { name: 'Scale recipe' })).not.toBeInTheDocument();
  });

  it('reads the lab notes with the ingredients, before the method', async () => {
    renderViewer();
    const notes = await screen.findByText('Half the salt next time.', undefined, { timeout: 5000 });
    const ingredients = screen.getByRole('heading', { name: 'Ingredients' });
    const method = screen.getByRole('heading', { name: 'Method' });

    expect(ingredients.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(method) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('RecipeViewer — paths that used to go nowhere', () => {
  it('opens the schedule from the previous makes view, in the recipe view', async () => {
    const user = userEvent.setup();
    renderViewer();
    const view = await screen.findByRole('group', { name: 'View' }, { timeout: 5000 });
    await user.click(await within(view).findByRole('button', { name: /Previous makes/ }));

    // The phone's Start key is the last control with that name.
    const starts = screen.getAllByRole('button', { name: 'Start recipe' });
    await user.click(starts[starts.length - 1]);
    const sheet = await screen.findByRole('dialog', { name: 'Start recipe' });
    await user.click(within(sheet).getByRole('button', { name: 'Schedule bake' }));

    expect(await screen.findByText(/Reverse bake schedule/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Scale recipe' })).toBeInTheDocument();
  });

  it('reports a missing recipe with the way back, not a bare sentence', async () => {
    vi.mocked(api.getRecipe).mockRejectedValue(new Error('404'));
    renderViewer();

    expect(
      await screen.findByRole('heading', { name: 'Nothing at this address' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the cookbook' })).toHaveAttribute('href', '/');
  });

  it('titles a make the way its tile does, and dates it without seconds', async () => {
    const user = userEvent.setup();
    renderViewer();
    const view = await screen.findByRole('group', { name: 'View' }, { timeout: 5000 });
    await user.click(await within(view).findByRole('button', { name: /Previous makes/ }));
    await user.click(await screen.findByRole('button', { name: /^Make 1,/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Make 1' });
    const baked = within(dialog).getByText('Baked').parentElement!;
    expect(baked.textContent).toMatch(/2026/);
    expect(baked.textContent).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});
