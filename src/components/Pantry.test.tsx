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
  it('renders loading state initially, then shows fetched items', async () => {
    render(<Pantry />);
    
    // Check loading state
    expect(screen.getByText(/Loading pantry/i)).toBeDefined();
    
    // Check if items are rendered after fetch
    await waitFor(() => {
      expect(screen.getByText('Bread Flour')).toBeDefined();
      expect(screen.getByText('Active Dry Yeast')).toBeDefined();
    });
  });
});
