import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLocation } from 'react-router-dom';
import BakesPage from './BakesPage';
import { ToastProvider } from './ui';
import { summaryLine } from '../lib/cookbook';
import { makeBakeLog, makeRecipe, renderScreen, seed } from '../test/utils';

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}
const render = (route = '/bakes') =>
  renderScreen(
    <ToastProvider>
      <BakesPage />
      <Where />
    </ToastProvider>,
    { route },
  );

const RECIPES = [
  makeRecipe({ _id: 'cake', title: 'Cheesecake' }),
  makeRecipe({ _id: 'loaf', title: 'Country Loaf' }),
  makeRecipe({ _id: 'pie', title: 'Apple Pie' }),
];
const BAKES = [
  makeBakeLog({ _id: 'c1', recipeId: 'cake', date: '2026-09-02T10:00:00.000Z', rating: 3, notes: 'Cracked.' }),
  makeBakeLog({ _id: 'c2', recipeId: 'cake', date: '2026-09-20T10:00:00.000Z', rating: 4 }),
  makeBakeLog({ _id: 'c3', recipeId: 'cake', date: '2026-10-17T10:00:00.000Z', rating: 5, isPersonalBest: true, notes: 'Perfect.' }),
  makeBakeLog({ _id: 'l1', recipeId: 'loaf', date: '2026-10-05T10:00:00.000Z', rating: 2 }),
  makeBakeLog({ _id: 'l2', recipeId: 'loaf', date: '2026-10-12T10:00:00.000Z', rating: 3 }),
  makeBakeLog({ _id: 'p1', recipeId: 'pie', date: '2026-10-01T10:00:00.000Z' }),
];

beforeEach(async () => {
  await seed('recipes', RECIPES);
  await seed('bakeLogs', BAKES);
});

describe('the summary line', () => {
  it('says only what the log supports: bakes, recipes, and a best only when one stands out', () => {
    const byId = new Map(RECIPES.map((r) => [r._id, r]));
    expect(summaryLine(BAKES, byId)).toBe('6 bakes · 3 recipes · best: Cheesecake');
    expect(summaryLine([BAKES[0]], byId)).toBe('1 bake · 1 recipe');
    expect(summaryLine([], byId)).toBe('');
  });
});

describe('the journal', () => {
  it('runs by month, newest first, each bake with its recipe, number and first line', async () => {
    render();
    expect(await screen.findByText('6 bakes · 3 recipes · best: Cheesecake')).toBeInTheDocument();
    const months = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(months).toEqual(['October 2026', 'September 2026']);
    const october = screen.getByRole('heading', { name: 'October 2026' }).closest('section')!;
    const first = within(october).getAllByRole('button')[0];
    expect(first).toHaveTextContent('Cheesecake');
    expect(first).toHaveTextContent('Oct 17 · Bake 3');
    expect(first).toHaveTextContent('“Perfect.”');
    expect(within(first).getByRole('img', { name: 'Personal best' })).toBeInTheDocument();
  });

  it('opens a bake in its sheet', async () => {
    const user = userEvent.setup();
    render();
    const october = (await screen.findByRole('heading', { name: 'October 2026' })).closest('section')!;
    await user.click(within(october).getAllByRole('button')[0]);
    expect(await screen.findByRole('dialog', { name: 'Bake 3' })).toHaveTextContent('Perfect.');
  });

  it('narrows to one recipe from ?recipe=, with the way back to every recipe', async () => {
    const user = userEvent.setup();
    render('/bakes?recipe=loaf');
    expect(await screen.findByRole('heading', { level: 1, name: 'Country Loaf' })).toBeInTheDocument();
    expect(await screen.findByText('2 bakes · 1 recipe')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Every recipe' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/bakes$/);
  });
});

describe('by recipe', () => {
  it('keeps each recipe oldest to newest, draws its stars from three rated bakes, and gathers the baked-once', async () => {
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('radio', { name: 'By recipe' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/bakes?view=recipe');
    const cake = screen.getByRole('heading', { name: 'Cheesecake' }).closest('section')!;
    expect(within(cake).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Bake 1, Sep 2, 3 of 5 stars',
      'Bake 2, Sep 20, 4 of 5 stars',
      'Bake 3, Oct 17, 5 of 5 stars',
    ]);
    expect(within(cake).getByRole('img', { name: /stars over 3 bakes, oldest first: 3, 4, 5/ })).toBeInTheDocument();
    // Two bakes are a pair, not a trend.
    const loaf = screen.getByRole('heading', { name: 'Country Loaf' }).closest('section')!;
    expect(within(loaf).queryByRole('img', { name: /stars over/ })).not.toBeInTheDocument();
    const once = screen.getByRole('heading', { name: 'Baked once' }).closest('section')!;
    expect(within(once).getByRole('button', { name: /Apple Pie/ })).toBeInTheDocument();
  });
});

describe('compare', () => {
  it('ticks two bakes and sets them side by side', async () => {
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('button', { name: 'Compare' }));
    const compare = screen.getByRole('button', { name: 'Compare (0)' });
    expect(compare).toBeDisabled();
    const sept = screen.getByRole('heading', { name: 'September 2026' }).closest('section')!;
    const [c2, c1] = within(sept).getAllByRole('button');
    await user.click(c1);
    await user.click(c2);
    expect(c1).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Compare (2)' }));
    const sheet = await screen.findByRole('dialog', { name: 'Compare two bakes' });
    expect(within(sheet).getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual([
      'Cheesecake, Sep 2, 2026',
      'Cheesecake, Sep 20, 2026',
    ]);
    expect(sheet).toHaveTextContent('Cracked.');
  });
});

describe('logging', () => {
  it('logs a bake by choosing the recipe first', async () => {
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('button', { name: 'Log bake' }));
    const picker = await screen.findByRole('dialog', { name: 'Log a bake of…' });
    await user.type(within(picker).getByRole('searchbox', { name: 'Find a recipe' }), 'apple');
    await user.click(within(picker).getByRole('button', { name: /Apple Pie/ }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/recipe/pie?log=1'));
  });

  it('says what the log is for when there is nothing in it', async () => {
    await seed('bakeLogs', BAKES.map((b) => ({ ...b, deletedAt: '2026-10-20T00:00:00.000Z' })));
    render();
    expect(await screen.findByText(/No bakes yet/)).toBeInTheDocument();
  });
});
