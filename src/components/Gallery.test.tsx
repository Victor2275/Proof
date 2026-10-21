import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import Gallery from './Gallery';
import { makeBakeLog, makeRecipe, renderScreen, seed } from '../test/utils';

const LOGS = [
  makeBakeLog({ _id: '1', recipeId: 'r1', date: '2023-01-01T10:00:00.000Z', notes: 'Dense', imageUrls: ['img1.jpg'] }),
  makeBakeLog({ _id: '2', recipeId: 'r2', date: '2023-02-02T10:00:00.000Z', notes: 'Great', imageUrls: ['img2.jpg', 'img3.jpg'] }),
  makeBakeLog({ _id: '3', recipeId: 'r1', date: '2023-01-03T10:00:00.000Z', notes: 'Better crumb', imageUrls: ['img4.jpg'] }),
  makeBakeLog({ _id: '4', recipeId: 'r1', date: '2023-01-05T10:00:00.000Z', notes: 'No photo', imageUrls: [] }),
];

describe('Gallery Component', () => {
  beforeEach(async () => {
    await seed('recipes', [makeRecipe({ _id: 'r1', title: 'Sourdough' }), makeRecipe({ _id: 'r2', title: 'Cookies' })]);
  });

  it("groups a recipe's bakes into one row and counts every attempt", async () => {
    await seed('bakeLogs', LOGS);
    renderScreen(<Gallery />);

    expect(await screen.findByRole('heading', { name: 'Sourdough' })).toBeInTheDocument();
    // A bake with no photograph is still a bake: Analytics counts it, so the
    // history does too, drawn as an unlit plate.
    expect(screen.getByText('3 bakes')).toBeInTheDocument();
    expect(screen.getByText('1 bake')).toBeInTheDocument();
  });

  it('counts one tile per bake, not one per photograph', async () => {
    await seed('bakeLogs', LOGS);
    renderScreen(<Gallery />);

    // Three logs carry photos (one of them carries two), so three photographs.
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3));
  });

  it('runs each row oldest first, so the row reads as progress', async () => {
    await seed('bakeLogs', LOGS);
    renderScreen(<Gallery />);
    await screen.findByRole('heading', { name: 'Sourdough' });

    const sourdoughTiles = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/recipe/r1?makeId='));

    expect(sourdoughTiles.map((t) => t.getAttribute('href'))).toEqual([
      '/recipe/r1?makeId=1',
      '/recipe/r1?makeId=3',
      '/recipe/r1?makeId=4',
    ]);
  });

  it('switches to a date reading, cut into months', async () => {
    await seed('bakeLogs', LOGS);
    renderScreen(<Gallery />);
    await screen.findByText('3 bakes');

    fireEvent.click(screen.getByText('By Date'));

    await waitFor(() => {
      expect(screen.getByText(/February 2023/i)).toBeInTheDocument();
      expect(screen.getByText(/January 2023/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('3 bakes')).not.toBeInTheDocument();
  });

  it('shows a bake whose photographs are only in its labelled list', async () => {
    await seed('bakeLogs', [
      makeBakeLog({ _id: '7', recipeId: 'r1', imageUrls: [], images: [{ url: 'labelled.jpg', label: 'Crumb' }] }),
    ]);
    renderScreen(<Gallery />);
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'labelled.jpg');
  });

  it("keeps the bakes of a deleted recipe, and says whose they were", async () => {
    await seed('bakeLogs', [makeBakeLog({ _id: '9', recipeId: 'gone', imageUrls: ['x.jpg'] })]);
    renderScreen(<Gallery />);
    expect(await screen.findByRole('heading', { name: 'A deleted recipe' })).toBeInTheDocument();
  });

  it('draws an unlit invitation when nothing has been logged', async () => {
    renderScreen(<Gallery />);
    expect(await screen.findByText(/No bakes logged yet/i)).toBeInTheDocument();
  });
});
