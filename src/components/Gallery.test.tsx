import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Gallery from './Gallery';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getBakeLogs: vi.fn(),
    getRecipes: vi.fn()
  }
}));

const mockBakeLogs = [
  { _id: '1', recipeId: { _id: 'r1', title: 'Sourdough' }, date: '2023-01-01', notes: 'Dense', imageUrls: ['img1.jpg'] },
  { _id: '2', recipeId: { _id: 'r2', title: 'Cookies' }, date: '2023-02-02', notes: 'Great', imageUrls: ['img2.jpg', 'img3.jpg'] },
  { _id: '3', recipeId: { _id: 'r1', title: 'Sourdough' }, date: '2023-01-03', notes: 'Better crumb', imageUrls: ['img4.jpg'] },
  { _id: '4', recipeId: { _id: 'r1', title: 'Sourdough' }, date: '2023-01-05', notes: 'No photo', imageUrls: [] },
];

describe('Gallery Component', () => {
  beforeEach(() => {
    vi.mocked(api.getBakeLogs).mockResolvedValue(mockBakeLogs as any);
  });

  it('renders without crashing while the logs are loading', async () => {
    await act(async () => {
      render(<MemoryRouter><Gallery /></MemoryRouter>);
    });
    expect(document.body).toBeDefined();
  });

  it('groups a recipe\'s bakes into one row and counts the attempts', async () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sourdough' })).toBeInTheDocument();
    });

    // Three Sourdough logs exist but one has no photograph, so the row is two
    // attempts — the count has to match what is actually drawn.
    expect(screen.getByText('2 bakes')).toBeInTheDocument();
    expect(screen.getByText('1 bake')).toBeInTheDocument();
  });

  it('counts one tile per bake, not one per photograph', async () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);

    await waitFor(() => {
      // Three logs carry photos (one of them carries two), so three tiles.
      expect(screen.getAllByRole('img')).toHaveLength(3);
    });
  });

  it('runs each row oldest first, so the row reads as progress', async () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sourdough' })).toBeInTheDocument());

    const sourdoughTiles = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/recipe/r1?makeId='));

    expect(sourdoughTiles[0]).toHaveAttribute('href', '/recipe/r1?makeId=1');
    expect(sourdoughTiles[1]).toHaveAttribute('href', '/recipe/r1?makeId=3');
  });

  it('switches to a date reading, cut into months', async () => {
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('2 bakes')).toBeInTheDocument());

    fireEvent.click(screen.getByText('By Date'));

    await waitFor(() => {
      expect(screen.getByText(/February 2023/i)).toBeInTheDocument();
      expect(screen.getByText(/January 2023/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('2 bakes')).not.toBeInTheDocument();
  });

  it('draws an unlit invitation when nothing has been logged', async () => {
    vi.mocked(api.getBakeLogs).mockResolvedValue([mockBakeLogs[3]] as any);
    render(<MemoryRouter><Gallery /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/No bakes logged yet/i)).toBeInTheDocument();
    });
  });
});
