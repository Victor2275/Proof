import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Analytics from './Analytics';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: { getRecipes: vi.fn(), getAllBakeLogs: vi.fn() },
}));

vi.mock('../lib/localDB', () => ({
  getAllLocalBakeLogs: vi.fn().mockResolvedValue([]),
}));

const RECIPES = Array.from({ length: 10 }, (_, i) => ({
  _id: `r${i}`,
  title: `Recipe ${i}`,
  ingredients: [],
  instructions: [],
}));

function log(id: string, recipeId: string, date: string, isPersonalBest = false) {
  return { _id: id, recipeId, date, isPersonalBest, images: [], imageUrls: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getRecipes).mockResolvedValue(RECIPES as any);
});

describe('Analytics', () => {
  it('says plainly when nothing has been logged, instead of drawing an empty chart', async () => {
    vi.mocked(api.getAllBakeLogs).mockResolvedValue([] as any);
    render(<Analytics />);

    expect(await screen.findByText(/No bakes logged yet/i)).toBeInTheDocument();
    expect(screen.getByText('0 bakes logged')).toBeInTheDocument();
  });

  it('reports the totals it can actually count', async () => {
    vi.mocked(api.getAllBakeLogs).mockResolvedValue([
      log('b1', 'r0', '2026-08-02T10:00:00.000Z'),
      log('b2', 'r1', '2026-08-20T10:00:00.000Z', true),
      log('b3', 'r2', '2026-09-05T10:00:00.000Z'),
    ] as any);
    render(<Analytics />);

    await waitFor(() => expect(screen.getByText('3 bakes logged')).toBeInTheDocument());
    expect(screen.getByText('Recipes baked').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('Personal bests').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Recipes in the library').nextSibling).toHaveTextContent('10');
  });

  /*
   * The point of the whole page. With three bakes the honest reading is "not
   * enough to read a trend", not eleven empty bars standing beside one.
   */
  it('draws only months that have a bake, and says when that is too few', async () => {
    vi.mocked(api.getAllBakeLogs).mockResolvedValue([
      log('b1', 'r0', '2026-08-02T10:00:00.000Z'),
      log('b2', 'r1', '2026-08-20T10:00:00.000Z'),
      log('b3', 'r2', '2026-09-05T10:00:00.000Z'),
    ] as any);
    render(<Analytics />);

    await waitFor(() => expect(screen.getByRole('meter', { name: 'Aug 2026' })).toBeInTheDocument());
    expect(screen.getByRole('meter', { name: 'Sep 2026' })).toBeInTheDocument();
    // The ten months with nothing in them are not drawn as zeroes.
    expect(screen.queryByRole('meter', { name: 'Jan 2026' })).not.toBeInTheDocument();
    expect(screen.getByText(/Not enough to read a trend yet/i)).toBeInTheDocument();
  });

  it('stops hedging once there are enough months to compare', async () => {
    vi.mocked(api.getAllBakeLogs).mockResolvedValue([
      log('b1', 'r0', '2026-07-02T10:00:00.000Z'),
      log('b2', 'r1', '2026-08-20T10:00:00.000Z'),
      log('b3', 'r2', '2026-09-05T10:00:00.000Z'),
    ] as any);
    render(<Analytics />);

    await waitFor(() => expect(screen.getByRole('meter', { name: 'Jul 2026' })).toBeInTheDocument());
    expect(screen.queryByText(/Not enough to read a trend yet/i)).not.toBeInTheDocument();
  });

  it('refuses to rank recipes that have all been baked exactly once', async () => {
    vi.mocked(api.getAllBakeLogs).mockResolvedValue([
      log('b1', 'r0', '2026-08-02T10:00:00.000Z'),
      log('b2', 'r1', '2026-08-20T10:00:00.000Z'),
      log('b3', 'r2', '2026-09-05T10:00:00.000Z'),
    ] as any);
    render(<Analytics />);

    expect(await screen.findByText(/Nothing has been baked twice yet/i)).toBeInTheDocument();
    expect(screen.queryByText('Recipe 0')).not.toBeInTheDocument();
  });

  it('ranks a recipe once it has actually been baked twice', async () => {
    vi.mocked(api.getAllBakeLogs).mockResolvedValue([
      log('b1', 'r4', '2026-08-02T10:00:00.000Z'),
      log('b2', 'r4', '2026-08-20T10:00:00.000Z'),
      log('b3', 'r2', '2026-09-05T10:00:00.000Z'),
    ] as any);
    render(<Analytics />);

    await waitFor(() => expect(screen.getByText('Recipe 4')).toBeInTheDocument());
    expect(screen.getByText('2 bakes')).toBeInTheDocument();
    // The one baked once is not padding out the list.
    expect(screen.queryByText('Recipe 2')).not.toBeInTheDocument();
  });

  it('merges offline logs with the ones from the server', async () => {
    const { getAllLocalBakeLogs } = await import('../lib/localDB');
    vi.mocked(api.getAllBakeLogs).mockResolvedValue([
      log('b1', 'r0', '2026-08-02T10:00:00.000Z'),
    ] as any);
    vi.mocked(getAllLocalBakeLogs).mockResolvedValue([
      log('local-1', 'r1', '2026-08-03T10:00:00.000Z'),
    ] as any);
    render(<Analytics />);

    await waitFor(() => expect(screen.getByText('2 bakes logged')).toBeInTheDocument());
  });

  it('shows a skeleton while reading, not the word loading', () => {
    vi.mocked(api.getAllBakeLogs).mockReturnValue(new Promise(() => {}) as any);
    const { container } = render(<Analytics />);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});
