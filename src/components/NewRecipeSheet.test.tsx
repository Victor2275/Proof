import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NewRecipeDoors, NewRecipeSheet } from './NewRecipeSheet';
import { saveRecipeDraft } from '../lib/recipeDraft';
import { makeRecipe, renderScreen } from '../test/utils';

describe('New recipe', () => {
  it('offers the three ways in, each starting afresh', () => {
    renderScreen(<NewRecipeSheet open onClose={() => undefined} />);
    expect(screen.getByRole('link', { name: /Write it/ })).toHaveAttribute('href', '/new?start=blank');
    expect(screen.getByRole('link', { name: /Paste a link or text/ })).toHaveAttribute('href', '/new?start=paste');
    expect(screen.queryByRole('link', { name: /Continue your draft/ })).not.toBeInTheDocument();
  });

  it('leads with the unsaved draft, by name, when there is one', () => {
    saveRecipeDraft('new', { ...makeRecipe({ title: 'Rye loaf' }) });
    renderScreen(<NewRecipeDoors />);
    const resume = screen.getByRole('link', { name: /Continue your draft/ });
    expect(resume).toHaveAttribute('href', '/new');
    expect(resume).toHaveTextContent('Rye loaf');
    expect(screen.getByText(/replaces the draft/)).toBeInTheDocument();
  });
});
