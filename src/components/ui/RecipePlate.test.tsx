import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RecipePlate } from './RecipePlate';

describe('RecipePlate', () => {
  it('shows the photograph, named by the recipe it belongs to', () => {
    render(<RecipePlate src="https://example.com/sourdough.jpg" alt="Country Sourdough" />);
    const img = screen.getByRole('img', { name: 'Country Sourdough' });
    expect(img).toHaveAttribute('src', 'https://example.com/sourdough.jpg');
  });

  it('defers loading, so a 200-row library does not fetch 200 photographs up front', () => {
    render(<RecipePlate src="https://example.com/a.jpg" alt="A" />);
    expect(screen.getByRole('img', { name: 'A' })).toHaveAttribute('loading', 'lazy');
  });

  it('renders an unlit plate rather than an image when the recipe has no photograph', () => {
    render(<RecipePlate alt="No Photo Recipe" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls back to the unlit plate when the photograph fails to load', () => {
    render(<RecipePlate src="https://example.com/dead.jpg" alt="Broken" />);
    const img = screen.getByRole('img', { name: 'Broken' });
    fireEvent.error(img);
    // A dead URL must not leave a broken-image glyph in the row.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps the same footprint with or without a photograph, so a row never shifts', () => {
    const { container: withPhoto } = render(<RecipePlate src="https://example.com/a.jpg" alt="A" />);
    const { container: without } = render(<RecipePlate alt="B" />);
    expect(withPhoto.firstElementChild?.className).toBe(without.firstElementChild?.className);
  });
});
