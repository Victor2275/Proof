import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Cupboard from './Cupboard';
import { ToastProvider } from './ui';
import { repo } from '../lib/repo';
import { makePantryItem, renderScreen, seed } from '../test/utils';

const show = () =>
  renderScreen(
    <ToastProvider>
      <Cupboard />
    </ToastProvider>,
  );

describe('In the cupboard', () => {
  it('says what it is for, and what to start with when empty', async () => {
    show();
    expect(screen.getByText(/recipes will tell you what's missing/)).toBeInTheDocument();
    expect(await screen.findByText(/Nothing marked yet/)).toBeInTheDocument();
  });

  it('reads the cupboard from the device as chips, A to Z', async () => {
    await seed('pantry', [makePantryItem({ _id: 'p1', name: 'Yeast' }), makePantryItem({ _id: 'p2', name: 'Bread flour' })]);
    show();
    expect(await screen.findByRole('heading', { name: '2 in the cupboard' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Bread flour', 'Yeast']);
  });

  it('adds a thing, and will not add it twice', async () => {
    const user = userEvent.setup();
    show();
    const field = await screen.findByRole('textbox', { name: 'Add to the cupboard' });
    await user.type(field, 'Salt{Enter}');
    expect(await screen.findByText('Salt')).toBeInTheDocument();
    await user.type(field, 'salt{Enter}');
    expect(await screen.findByText('salt is already in the cupboard.')).toBeInTheDocument();
    expect(await repo.getPantry()).toHaveLength(1);
  });

  it('takes a thing out, with Undo', async () => {
    const user = userEvent.setup();
    await seed('pantry', [makePantryItem({ _id: 'p1', name: 'Butter' })]);
    show();
    await user.click(await screen.findByRole('button', { name: 'Take Butter out of the cupboard' }));
    await waitFor(async () => expect(await repo.getPantry()).toHaveLength(0));
    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await repo.getPantry()).toHaveLength(1));
  });
});
