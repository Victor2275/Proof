import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import html2canvas from 'html2canvas';
import InstagramExporter from './InstagramExporter';
import type { Recipe } from '../lib/api';

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/jpeg;base64,mock',
  }),
}));

const mockRecipe: Recipe = {
  title: 'Test Bread',
  description: 'A test description',
  prepTime: '20',
  cookTime: '40',
  servings: 1,
  tags: ['bread', 'test'],
  ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }],
  instructions: ['Mix', 'Bake'],
  imageUrls: ['https://example.com/img.jpg'],
};

describe('InstagramExporter', () => {
  it('renders the carousel by default, with the pattern card first', () => {
    render(<InstagramExporter recipe={mockRecipe} onClose={vi.fn()} />);

    // The recipe leads the pattern card and the link card, so its name appears
    // on more than one slide.
    expect(screen.getAllByRole('heading', { name: 'Test Bread' }).length).toBeGreaterThan(0);
    // "Ingredients" reads twice: as the count on the pattern card and as the
    // head of the slide that lists them.
    expect(screen.getAllByText('Ingredients')).toHaveLength(2);
    expect(screen.getByText('Method')).toBeInTheDocument();
  });

  it('exports the pattern card alone in single mode', () => {
    render(<InstagramExporter recipe={mockRecipe} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText(/Single card/i));

    // Only the pattern card's own ingredient count survives; the slide that
    // listed them is gone.
    expect(screen.getAllByText('Ingredients')).toHaveLength(1);
    expect(screen.queryByText('Method')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Test Bread' }).length).toBe(1);
  });

  it('reads a real timing onto the card', () => {
    render(<InstagramExporter recipe={mockRecipe} onClose={vi.fn()} />);
    // 20 prep + 40 cook = 60 minutes, which a display reads as 1:00 HR.
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('HR')).toBeInTheDocument();
  });

  it('refuses to print the import placeholder as a timing', () => {
    render(
      <InstagramExporter
        recipe={{ ...mockRecipe, prepTime: '20 mins', cookTime: '30 mins' }}
        onClose={vi.fn()}
      />,
    );
    // No fabricated 50 MIN on a card someone else will read: the display is
    // dropped rather than filled in.
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });

  it('counts a generic recipe in steps rather than inventing phase names', () => {
    render(<InstagramExporter recipe={mockRecipe} onClose={vi.fn()} />);
    // "Mix" then "Bake" reads as the generic prep/cook shape, not a bread bake,
    // so the keys are the steps themselves.
    expect(screen.getAllByText('2 steps').length).toBeGreaterThan(0);
  });

  it('labels the keys when the recipe proved its phases', () => {
    render(
      <InstagramExporter
        recipe={{
          ...mockRecipe,
          instructions: [
            'Feed the levain and let it ripen.',
            'Autolyse the flour and water.',
            'Bulk ferment with stretch and fold.',
            'Shape the loaf.',
            'Proof overnight in a banneton.',
            'Bake in a dutch oven.',
          ],
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Levain').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bulk').length).toBeGreaterThan(0);
  });

  it('renders every card at 1080, whatever size the preview is showing', async () => {
    render(<InstagramExporter recipe={mockRecipe} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Download/i }));

    await waitFor(() => expect(html2canvas).toHaveBeenCalled());
    // The preview is a scaled copy; captured through that transform a card
    // exported from a phone came out under 900px square.
    expect(vi.mocked(html2canvas).mock.calls[0][1]).toMatchObject({
      width: 1080,
      height: 1080,
      scale: 2,
    });
  });

  it('adds the log slide only when a bake actually has notes', () => {
    const { rerender } = render(
      <InstagramExporter recipe={{ ...mockRecipe, description: '' }} onClose={vi.fn()} />,
    );
    expect(screen.queryByText(/Baker's log/i)).not.toBeInTheDocument();

    rerender(
      <InstagramExporter
        recipe={{ ...mockRecipe, description: '' }}
        bakeLog={{ recipeId: 'r1', date: '2026-09-16', notes: 'Longer bulk next time.', imageUrls: [] }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/Baker's log/i)).toBeInTheDocument();
  });
});
