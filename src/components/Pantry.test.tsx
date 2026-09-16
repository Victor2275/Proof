import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pantry from './Pantry';

// Mock the API calls
vi.mock('../lib/api', () => ({
  api: {
    getPantry: vi.fn().mockResolvedValue([
      { _id: '1', name: 'Bread Flour' },
      { _id: '2', name: 'Active Dry Yeast' }
    ]),
    addPantryItem: vi.fn(),
    deletePantryItem: vi.fn(),
  }
}));

describe('Pantry Component', () => {
  it('shows a skeleton while loading, then the stock list', async () => {
    render(<Pantry />);

    // A skeleton rather than the word "Loading" — the shape of the list
    // arrives before its contents do.
    expect(screen.getByLabelText(/Loading pantry/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Bread Flour')).toBeDefined();
      expect(screen.getByText('Active Dry Yeast')).toBeDefined();
    });
  });

  it('counts what is in stock and lets a lamp be put out', async () => {
    render(<Pantry />);
    await waitFor(() => expect(screen.getByText('Bread Flour')).toBeDefined());

    expect(screen.getByText('2 items in stock')).toBeInTheDocument();
    // Every row is removable, and the control names what it removes rather
    // than being an anonymous cross.
    expect(
      screen.getByRole('button', { name: /Remove Bread Flour from the pantry/i }),
    ).toBeInTheDocument();
  });
});
