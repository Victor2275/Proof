import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import html2canvas from 'html2canvas';
import InstagramExporter from './InstagramExporter';
import type { Recipe } from '../lib/types';
import { makeBakeLog, makeRecipe } from '../test/utils';

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/jpeg;base64,mock' }),
}));

const RECIPE: Recipe = makeRecipe({
  title: 'Country Loaf',
  description: 'A delicious Danish Bread dish.',
  prepTime: '20',
  cookTime: '40',
  servings: 2,
  folder: 'Breads',
  ingredients: [
    { name: 'Flour (500g)', quantity: 4, unit: 'cup' },
    { name: 'Salt', quantity: 0.13, unit: 'tsp' },
  ],
  instructions: ['--- Dough ---', 'Mix.', 'Bake.'],
  imageUrls: ['https://example.com/img.jpg'],
});

const cards = () => screen.getAllByText('Proof').filter((el) => el.closest('[style*="1080"]'));

describe('sharing as a card', () => {
  it('opens on one card: the recipe as a page, its facts in a line, nothing the recipe cannot prove', () => {
    render(<InstagramExporter recipe={RECIPE} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Share as a card' })).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
    expect(screen.getByText('Serves 2 · Prep 20 min · Cook 40 min · Medium')).toBeInTheDocument();
    expect(screen.queryByText(/A delicious/)).not.toBeInTheDocument();
  });

  it('draws every page when asked: the recipe, the ingredients in fractions, the method without headings as steps', async () => {
    const user = userEvent.setup();
    render(<InstagramExporter recipe={RECIPE} onClose={vi.fn()} />);
    await user.click(screen.getByRole('radio', { name: 'All 3' }));
    expect(cards()).toHaveLength(3);
    expect(screen.getByText('⅛ tsp')).toBeInTheDocument();
    expect(screen.getByText('Flour')).toBeInTheDocument();
    expect(screen.queryByText(/---/)).not.toBeInTheDocument();
  });

  it('leads with the bake when sharing one: its stars, its words and its note to next time', () => {
    const bake = makeBakeLog({ notes: 'Best crumb yet.', rating: 4, nextTime: 'Less salt.' });
    render(<InstagramExporter recipe={RECIPE} bakeLog={bake} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Share this bake' })).toBeInTheDocument();
    expect(screen.getByText('★★★★☆')).toBeInTheDocument();
    expect(screen.getByText('“Best crumb yet.”')).toBeInTheDocument();
    expect(screen.getByText(/Next time: Less salt\./)).toBeInTheDocument();
  });

  it('draws each card full size, whatever size the preview is showing', async () => {
    render(<InstagramExporter recipe={RECIPE} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download the card' }));
    await waitFor(() => expect(html2canvas).toHaveBeenCalled());
    expect(vi.mocked(html2canvas).mock.calls[0][1]).toMatchObject({ width: 1080, height: 1350 });
  });

  it('closes like any sheet', () => {
    const onClose = vi.fn();
    render(<InstagramExporter recipe={RECIPE} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
