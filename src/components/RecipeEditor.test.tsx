import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RecipeEditor from './RecipeEditor';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getRecipe: vi.fn(),
    getRecipes: vi.fn().mockResolvedValue([]),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    deleteRecipe: vi.fn(),
    extractRecipe: vi.fn(),
    restructureRecipe: vi.fn(),
    getRecipeBakeLogs: vi.fn().mockResolvedValue([]),
  },
}));

// react-image-crop wants one.
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function renderNew() {
  return act(async () => {
    render(
      <MemoryRouter>
        <RecipeEditor />
      </MemoryRouter>,
    );
  });
}

function renderExisting(id = 'r1') {
  return act(async () => {
    render(
      <MemoryRouter initialEntries={[`/edit/${id}`]}>
        <Routes>
          <Route path="/edit/:id" element={<RecipeEditor />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

describe('RecipeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getRecipes).mockResolvedValue([]);
    vi.mocked(api.getRecipeBakeLogs).mockResolvedValue([]);
  });

  it('renders correctly for a new recipe', async () => {
    await renderNew();
    expect(screen.getByRole('button', { name: /Create recipe/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/72-Hour Sourdough/i)).toBeInTheDocument();
  });

  it('blocks submission if the title is missing', async () => {
    await renderNew();
    fireEvent.click(screen.getByRole('button', { name: /Create recipe/i }));
    expect(api.createRecipe).not.toHaveBeenCalled();
  });

  it('reports what the recipe amounts to as it is built', async () => {
    await renderNew();
    // Both counts start at nothing, and the bar says so in the plural.
    expect(screen.getByText('ingredients')).toBeInTheDocument();
    expect(screen.getByText('steps')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /Add row/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add step/i }));

    // One of each, and the bar switches to the singular rather than "1 steps".
    expect(screen.getByText('ingredient')).toBeInTheDocument();
    expect(screen.getByText('step')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);
  });

  it('allows adding a new ingredient dynamically', async () => {
    await renderNew();
    fireEvent.click(screen.getByRole('button', { name: /Add row/i }));
    expect(screen.getAllByPlaceholderText(/Ingredient name/i)).toHaveLength(1);
  });

  it('allows adding an instruction dynamically', async () => {
    await renderNew();
    fireEvent.click(screen.getByRole('button', { name: /Add step/i }));
    expect(screen.getAllByPlaceholderText(/Describe step/i)).toHaveLength(1);
  });

  it('displays the URL extractor', async () => {
    await renderNew();
    fireEvent.click(screen.getByRole('button', { name: /^Open$/i }));
    expect(screen.getByPlaceholderText(/allrecipes\.com/i)).toBeInTheDocument();
  });

  it('calls extractRecipe when a URL is pasted and the button clicked', async () => {
    vi.mocked(api.extractRecipe).mockResolvedValue({ title: 'Extracted Title' } as any);
    await renderNew();
    fireEvent.click(screen.getByRole('button', { name: /^Open$/i }));

    fireEvent.change(screen.getByPlaceholderText(/allrecipes\.com/i), {
      target: { value: 'https://example.com/recipe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Extract/i }));

    await waitFor(() => {
      expect(api.extractRecipe).toHaveBeenCalledWith('https://example.com/recipe');
      expect(screen.getByPlaceholderText(/72-Hour Sourdough/i)).toHaveValue('Extracted Title');
    });
  });

  it('links a sub-recipe to a step, searching rather than listing the whole library', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getRecipes).mockResolvedValue([
      { _id: 'rec1', title: 'Frosting', ingredients: [], instructions: [] },
      { _id: 'rec2', title: 'Ganache', ingredients: [], instructions: [] },
    ] as any);
    await renderNew();

    fireEvent.click(screen.getByRole('button', { name: /Add step/i }));
    await user.click(await screen.findByRole('button', { name: /Link recipe/i }));

    const dialog = await screen.findByRole('dialog', { name: /Link a recipe to step 1/i });
    expect(dialog).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Search recipes/i), 'gana');
    expect(screen.queryByRole('button', { name: 'Frosting' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ganache' }));
    expect(await screen.findByText('Ganache')).toBeInTheDocument();
  });

  it('asks before deleting a recipe', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getRecipe).mockResolvedValue({
      _id: 'r1',
      title: 'Prawn stir-fry',
      ingredients: [],
      instructions: [],
      tags: [],
    } as any);
    await renderExisting();

    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await screen.findByRole('dialog', { name: /Delete recipe/i });
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(api.deleteRecipe).not.toHaveBeenCalled();
  });

  /*
   * The regression this phase found. The time fields were `type="number"`
   * while 199 of the 203 live recipes store "20 mins" / "30 mins", so the
   * browser rendered them empty and any save wiped both values.
   */
  describe('times that the library actually stores', () => {
    beforeEach(() => {
      vi.mocked(api.getRecipe).mockResolvedValue({
        _id: 'r1',
        title: 'Prawn stir-fry',
        prepTime: '20 mins',
        cookTime: '1 hr 30 mins',
        servings: 4,
        tags: [],
        ingredients: [],
        instructions: [],
      } as any);
    });

    it('shows a unit-annotated time rather than an empty field', async () => {
      await renderExisting();
      await waitFor(() => expect(screen.getByLabelText('Prep time')).toHaveValue('20'));
      expect(screen.getByLabelText('Cook time')).toHaveValue('90');
    });

    it('does not wipe the times when the recipe is saved untouched', async () => {
      const user = userEvent.setup();
      vi.mocked(api.updateRecipe).mockResolvedValue({ _id: 'r1' } as any);
      await renderExisting();
      await waitFor(() => expect(screen.getByLabelText('Prep time')).toHaveValue('20'));

      await user.click(screen.getByRole('button', { name: /Save recipe/i }));

      await waitFor(() => expect(api.updateRecipe).toHaveBeenCalled());
      const [, saved] = vi.mocked(api.updateRecipe).mock.calls[0];
      expect(saved.prepTime).toBe('20 mins');
      expect(saved.cookTime).toBe('1 hr 30 mins');
    });

    it('writes a retyped time back as bare minutes, the schema convention', async () => {
      const user = userEvent.setup();
      vi.mocked(api.updateRecipe).mockResolvedValue({ _id: 'r1' } as any);
      await renderExisting();
      await waitFor(() => expect(screen.getByLabelText('Prep time')).toHaveValue('20'));

      const prep = screen.getByLabelText('Prep time');
      await user.clear(prep);
      await user.type(prep, '45');
      await user.click(screen.getByRole('button', { name: /Save recipe/i }));

      await waitFor(() => expect(api.updateRecipe).toHaveBeenCalled());
      const [, saved] = vi.mocked(api.updateRecipe).mock.calls[0];
      expect(saved.prepTime).toBe('45');
    });
  });
});
