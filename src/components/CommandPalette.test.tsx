import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import { makeRecipe, renderScreen, seed } from '../test/utils';

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname + search}</output>;
}
const render = () =>
  renderScreen(
    <>
      <TopBar />
      <Where />
    </>,
  );

beforeEach(async () => {
  await seed('recipes', [
    makeRecipe({ _id: 'r1', title: 'Country Sourdough', folder: 'Breads', ingredients: [{ name: 'Rye flour', quantity: 50, unit: 'g' }] }),
    makeRecipe({ _id: 'r2', title: 'Apple Pie', folder: 'Desserts' }),
  ]);
});

describe('search or jump to (⌘K)', () => {
  it('opens from the top bar and from ⌘K or Ctrl+K, with the field ready', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: /Search or jump to/ }));
    expect(await screen.findByRole('combobox', { name: 'Search or jump to' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('combobox', { name: 'Search or jump to' })).toBeInTheDocument();
  });

  it('finds a recipe by an ingredient and opens it with Enter', async () => {
    const user = userEvent.setup();
    render();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const field = await screen.findByRole('combobox', { name: 'Search or jump to' });
    await user.type(field, 'rye');
    expect(await screen.findByRole('option', { name: /Country Sourdough/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/recipe/r1');
  });

  it('reaches a chapter and a place, moving with the arrow keys', async () => {
    const user = userEvent.setup();
    render();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const field = await screen.findByRole('combobox', { name: 'Search or jump to' });
    await user.type(field, 'des');
    const chapter = await screen.findByRole('option', { name: /Desserts/ });
    while (chapter.getAttribute('aria-selected') !== 'true') await user.keyboard('{ArrowDown}');
    expect(field).toHaveAttribute('aria-activedescendant', chapter.id);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/?chapter=Desserts');
  });

  it('offers to write a new recipe', async () => {
    const user = userEvent.setup();
    render();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await user.type(await screen.findByRole('combobox'), 'new');
    await user.click(screen.getByRole('option', { name: 'Write a new recipe' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/new');
  });
});
