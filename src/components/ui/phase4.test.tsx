import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Ribbon } from './Ribbon';
import { LetterRail } from './LetterRail';
import { Sparkline } from './Sparkline';
import { RecipeTile } from './RecipeTile';
import { MemoryRouter } from 'react-router-dom';

/* The primitives the cookbook and Bakes needed (UI overhaul Phase 4). */

describe('Ribbon', () => {
  it('is decoration the card names, hidden from assistive technology', () => {
    const { container } = render(<Ribbon />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('LetterRail', () => {
  it('links each letter that has entries, prints the rest pale, and jumps', async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    render(<LetterRail letters={['A', 'C']} idFor={(l) => `i-${l}`} onJump={onJump} />);
    expect(screen.getByRole('navigation', { name: 'Jump to a letter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'C' })).toHaveAttribute('href', '#i-C');
    expect(screen.queryByRole('link', { name: 'B' })).not.toBeInTheDocument();
    expect(screen.getByText('B')).toHaveAttribute('aria-hidden', 'true');
    await user.click(screen.getByRole('link', { name: 'C' }));
    expect(onJump).toHaveBeenCalledWith('C');
  });

  it('is a 44px column', () => {
    render(<LetterRail letters={['A']} idFor={(l) => l} onJump={() => undefined} />);
    expect(screen.getByRole('navigation')).toHaveClass('w-11');
  });
});

describe('Sparkline', () => {
  it('draws nothing for fewer than three ratings', () => {
    const { container } = render(<Sparkline values={[4, 5]} label="Rye" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('carries every rating in its name, oldest first, on the stars’ own scale', () => {
    render(<Sparkline values={[2, 4, 5]} label="Rye" />);
    const chart = screen.getByRole('img', { name: 'Rye, stars over 3 bakes, oldest first: 2, 4, 5' });
    const points = chart.querySelector('polyline')!.getAttribute('points')!.split(' ').map((p) => Number(p.split(',')[1]));
    // Five stars sits at the top line, one star would be at the bottom.
    expect(points[2]).toBeCloseTo(3);
    expect(points[0]).toBeGreaterThan(points[1]);
  });
});

describe('RecipeTile', () => {
  it('prints the line it is given, and stamps the recipe with a best bake', () => {
    render(
      <MemoryRouter>
        <RecipeTile recipe={{ _id: 'r', title: 'Rye', imageUrls: [], prepTime: '', cookTime: '', folder: 'Bread' }} caption="Baked yesterday · ★4" best />
      </MemoryRouter>,
    );
    expect(screen.getByText('Baked yesterday · ★4')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Personal best' })).toBeInTheDocument();
  });

  it('never falls back to an ingredient count', () => {
    render(
      <MemoryRouter>
        <RecipeTile
          recipe={{ _id: 'r', title: 'Rye', imageUrls: [], prepTime: '20 mins', cookTime: '30 mins', folder: 'Bread', ingredients: [{ name: 'Flour', quantity: 1, unit: 'kg' }] }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Bread')).toBeInTheDocument();
    expect(screen.queryByText(/ingredient/)).not.toBeInTheDocument();
  });
});
