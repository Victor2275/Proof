import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecipeDrawer from './RecipeDrawer';
import { repo } from '../lib/repo';
import { makeRecipe, renderScreen, seed } from '../test/utils';

const FROSTING = makeRecipe({
  _id: '123',
  title: 'Vanilla Frosting',
  ingredients: [{ name: 'Butter', quantity: 1, unit: 'cup' }],
  instructions: ['Mix butter.', 'Add sugar.'],
});

describe('RecipeDrawer', () => {
  beforeEach(async () => {
    await seed('recipes', [FROSTING]);
  });

  it('does not render when isOpen is false', () => {
    renderScreen(<RecipeDrawer isOpen={false} onClose={() => {}} recipeId="123" />);
    expect(screen.queryByTestId('recipe-drawer-content')).not.toBeInTheDocument();
  });

  it('draws nothing, not the word loading, while the device is read', () => {
    const spy = vi.spyOn(repo, 'getRecipe').mockReturnValue(new Promise(() => {}));
    renderScreen(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('is a dialog that names the sub-recipe once it is read', async () => {
    renderScreen(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    expect(await screen.findByRole('dialog', { name: 'Vanilla Frosting' })).toBeInTheDocument();
  });

  it('names the failure and offers a retry instead of failing silently', async () => {
    const spy = vi.spyOn(repo, 'getRecipe').mockRejectedValueOnce(new Error('blocked'));
    renderScreen(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't read this sub-recipe/i);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('dialog', { name: 'Vanilla Frosting' })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('says so when the linked recipe has been deleted', async () => {
    renderScreen(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="gone" />);
    expect(await screen.findByText(/no longer in the cookbook/i)).toBeInTheDocument();
  });

  it('prints the ingredients and the method', async () => {
    renderScreen(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    expect(await screen.findByText('Butter')).toBeInTheDocument();
    expect(screen.getByText('1 cup')).toBeInTheDocument();
    expect(screen.getByText('Mix butter.')).toBeInTheDocument();
    expect(screen.getByText('Add sugar.')).toBeInTheDocument();
  });

  it('calls onClose when Finish button is clicked', async () => {
    const onClose = vi.fn();
    renderScreen(<RecipeDrawer isOpen={true} onClose={onClose} recipeId="123" />);
    fireEvent.click(await screen.findByText('Finish Vanilla Frosting'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
