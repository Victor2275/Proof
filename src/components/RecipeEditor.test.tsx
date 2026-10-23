import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RecipeEditor from './RecipeEditor';
import { api } from '../lib/api';
import { repo } from '../lib/repo';
import { setOperatorToken } from '../lib/session';
import { makeRecipe, renderScreen, seed } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: {
    extractRecipe: vi.fn(),
    restructureRecipe: vi.fn(),
  },
}));

// react-image-crop wants one.
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const renderNew = async () => {
  const utils = renderScreen(<RecipeEditor />, { route: '/new', path: '/new' });
  await screen.findByRole('button', { name: /Create recipe/i });
  return utils;
};

const renderExisting = (id = 'r1') => renderScreen(<RecipeEditor />, { route: `/edit/${id}`, path: '/edit/:id' });

const STIR_FRY = makeRecipe({
  _id: 'r1',
  title: 'Prawn stir-fry',
  prepTime: '20 mins',
  cookTime: '1 hr 30 mins',
  servings: 4,
});

describe('RecipeEditor', () => {
  it('renders correctly for a new recipe', async () => {
    await renderNew();
    expect(screen.getByPlaceholderText(/72-Hour Sourdough/i)).toBeInTheDocument();
  });

  it('opens with the import ready when New was "Paste a link or text"', async () => {
    renderScreen(<RecipeEditor />, { route: '/new?start=paste', path: '/new' });
    expect(await screen.findByRole('textbox', { name: 'Recipe URL' })).toBeInTheDocument();
  });

  it('opens on a blank page when New was "Write it"', async () => {
    await renderNew();
    expect(screen.queryByRole('textbox', { name: 'Recipe URL' })).not.toBeInTheDocument();
  });

  it('blocks submission if the title is missing', async () => {
    await renderNew();
    fireEvent.click(screen.getByRole('button', { name: /Create recipe/i }));
    await new Promise((r) => setTimeout(r, 20));
    expect(await repo.getRecipes()).toHaveLength(0);
  });

  it('creates the recipe on this device and opens it', async () => {
    const user = userEvent.setup();
    await renderNew();
    await user.type(screen.getByPlaceholderText(/72-Hour Sourdough/i), 'Rye loaf');
    await user.click(screen.getByRole('button', { name: /Create recipe/i }));

    await waitFor(async () => expect((await repo.getRecipes()).map((r) => r.title)).toEqual(['Rye loaf']));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
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

  it('explains the AI import instead of calling it, for someone it is not open to', async () => {
    await renderNew();
    fireEvent.click(screen.getByRole('button', { name: /^Open$/i }));
    fireEvent.change(screen.getByPlaceholderText(/allrecipes\.com/i), {
      target: { value: 'https://example.com/recipe' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Extract/i }));

    expect(await screen.findByRole('dialog', { name: 'Import from a URL' })).toBeInTheDocument();
    expect(api.extractRecipe).not.toHaveBeenCalled();
  });

  describe('for the operator', () => {
    beforeEach(() => setOperatorToken('operator-token'));
    afterEach(() => setOperatorToken(null));

    it('calls extractRecipe when a URL is pasted and the button clicked', async () => {
      vi.mocked(api.extractRecipe).mockResolvedValue({ title: 'Extracted Title' });
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
  });

  it('links a sub-recipe to a step, searching rather than listing the whole library', async () => {
    const user = userEvent.setup();
    await seed('recipes', [makeRecipe({ _id: 'rec1', title: 'Frosting' }), makeRecipe({ _id: 'rec2', title: 'Ganache' })]);
    await renderNew();

    fireEvent.click(screen.getByRole('button', { name: /Add step/i }));
    await user.click(await screen.findByRole('button', { name: /Link recipe/i }));

    expect(await screen.findByRole('dialog', { name: /Link a recipe to step 1/i })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Search recipes/i), 'gana');
    expect(screen.queryByRole('button', { name: 'Frosting' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Ganache' }));
    expect(await screen.findByText('Ganache')).toBeInTheDocument();
  });

  it('asks before deleting a recipe', async () => {
    const user = userEvent.setup();
    await seed('recipes', [STIR_FRY]);
    renderExisting();

    await user.click(await screen.findByRole('button', { name: /Delete/i }));
    await screen.findByRole('dialog', { name: /Delete recipe/i });
    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(await repo.getRecipe('r1')).not.toBeNull();
  });

  /*
   * Audit #1: the editor used to render a blank form, with live Save and
   * Delete, over a recipe it had failed to load. Saving wrote the blank over
   * the real recipe.
   */
  it('offers no form, and no Save or Delete, for a recipe that is not here', async () => {
    renderExisting('missing');
    expect(await screen.findByText(/This recipe is not in the cookbook/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save recipe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
  });

  it('offers no form when the recipe cannot be read, and leaves it untouched', async () => {
    await seed('recipes', [STIR_FRY]);
    const spy = vi.spyOn(repo, 'getRecipe').mockRejectedValue(new Error('blocked'));
    renderExisting();
    expect(await screen.findByText(/Couldn't open this recipe on this device/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save recipe/i })).not.toBeInTheDocument();
    spy.mockRestore();
  });

  /*
   * The time fields were `type="number"` while 199 of the 203 live recipes
   * store "20 mins" / "30 mins", so the browser rendered them empty and any
   * save wiped both values.
   */
  describe('times that the library actually stores', () => {
    beforeEach(async () => {
      await seed('recipes', [STIR_FRY]);
    });

    it('shows a unit-annotated time rather than an empty field', async () => {
      renderExisting();
      await waitFor(() => expect(screen.getByLabelText('Prep time')).toHaveValue('20'));
      expect(screen.getByLabelText('Cook time')).toHaveValue('90');
    });

    it('does not wipe the times when the recipe is saved untouched', async () => {
      const user = userEvent.setup();
      renderExisting();
      await waitFor(() => expect(screen.getByLabelText('Prep time')).toHaveValue('20'));

      await user.click(screen.getByRole('button', { name: /Save recipe/i }));

      await screen.findByTestId('elsewhere');
      const saved = await repo.getRecipe('r1');
      expect(saved?.prepTime).toBe('20 mins');
      expect(saved?.cookTime).toBe('1 hr 30 mins');
    });

    it('writes a retyped time back as bare minutes, the schema convention', async () => {
      const user = userEvent.setup();
      renderExisting();
      await waitFor(() => expect(screen.getByLabelText('Prep time')).toHaveValue('20'));

      const prep = screen.getByLabelText('Prep time');
      await user.clear(prep);
      await user.type(prep, '45');
      await user.click(screen.getByRole('button', { name: /Save recipe/i }));

      await screen.findByTestId('elsewhere');
      expect((await repo.getRecipe('r1'))?.prepTime).toBe('45');
    });
  });
});
