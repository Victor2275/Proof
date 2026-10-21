import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import Pantry from './Pantry';
import { repo } from '../lib/repo';
import { makePantryItem, renderScreen, seed } from '../test/utils';

describe('Pantry Component', () => {
  beforeEach(async () => {
    await seed('pantry', [
      makePantryItem({ _id: 'p1', name: 'Bread Flour', createdAt: '2026-08-01T00:00:00.000Z' }),
      makePantryItem({ _id: 'p2', name: 'Active Dry Yeast', createdAt: '2026-08-02T00:00:00.000Z' }),
    ]);
  });

  it('reads the stock list from the device', async () => {
    renderScreen(<Pantry />);
    expect(await screen.findByText('Bread Flour')).toBeInTheDocument();
    expect(screen.getByText('Active Dry Yeast')).toBeInTheDocument();
  });

  it('counts what is in stock and lets a lamp be put out', async () => {
    renderScreen(<Pantry />);
    await screen.findByText('Bread Flour');

    expect(screen.getByText('2 items in stock')).toBeInTheDocument();
    // Every row is removable, and the control names what it removes rather
    // than being an anonymous cross.
    await userEvent.click(screen.getByRole('button', { name: /Remove Bread Flour from the pantry/i }));

    await waitFor(() => expect(screen.queryByText('Bread Flour')).not.toBeInTheDocument());
    expect(screen.getByText('1 item in stock')).toBeInTheDocument();
    // A removal is a tombstone, so a later sync can tell it from "never had it".
    expect((await repo.getPantry()).map((p) => p.name)).toEqual(['Active Dry Yeast']);
  });
});
