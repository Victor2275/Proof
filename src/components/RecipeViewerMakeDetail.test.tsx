import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecipeViewer from './RecipeViewer';
import { repo } from '../lib/repo';
import { makeBakeLog, makeRecipe, renderScreen, seed } from '../test/utils';

/*
 * The selected-make detail. Phase 5 rebuilt the grid of makes and left this
 * behind in the previous world; it is a Sheet on the primitives now, and the
 * deletion that used to go through window.confirm asks in the world's own
 * voice. These cover the behaviours that changed, not the layout.
 */

// A copy saved from the shared cookbook, so it has an address to share.
const RECIPE = makeRecipe({
  _id: 'r1',
  title: 'Banana pudding',
  servings: 4,
  difficulty: 'Easy',
  prepTime: '20',
  cookTime: '30',
  instructions: ['Mix.', 'Chill.'],
  forkedFrom: { publishedId: 'p1', slug: 'banana-pudding', authorHandle: 'proof', title: 'Banana pudding' },
});

const LOG = makeBakeLog({ _id: 'b1', recipeId: 'r1', date: '2026-08-09T17:41:22.000Z', notes: 'Bananas should be less ripe.' });

const renderViewer = () => renderScreen(<RecipeViewer />, { route: '/recipe/r1?makeId=b1', path: '/recipe/:id' });

beforeEach(async () => {
  await seed('recipes', [RECIPE]);
  await seed('bakeLogs', [LOG]);
});

describe('RecipeViewer — the selected make', () => {
  it('opens the make named in the URL as a dialog, not a bare overlay', async () => {
    renderViewer();
    // The first render in this file pays for importing the whole viewer. Under
    // a full parallel run that alone can pass the default one-second wait, and
    // the assertion then fails on load rather than on behaviour.
    const dialog = await screen.findByRole('dialog', { name: /^Make 1$/i }, { timeout: 5000 });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Bananas should be less ripe.')).toBeInTheDocument();
  });

  it('asks before deleting a bake, instead of a browser confirm', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByRole('dialog', { name: /^Make 1$/i });

    await user.click(screen.getByRole('button', { name: /Delete entry/i }));
    expect(await screen.findByRole('dialog', { name: /Delete this bake/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(await repo.getRecipeBakeLogs('r1')).toHaveLength(1);
  });

  it('deletes the bake once that is confirmed', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByRole('dialog', { name: /^Make 1$/i });

    await user.click(screen.getByRole('button', { name: /Delete entry/i }));
    await screen.findByRole('dialog', { name: /Delete this bake/i });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect(await repo.getRecipeBakeLogs('r1')).toHaveLength(0));
  });

  it('latches the personal-best key rather than colouring a pill', async () => {
    const user = userEvent.setup();
    renderViewer();
    await screen.findByRole('dialog', { name: /^Make 1$/i });

    const mark = screen.getByRole('button', { name: /Mark as personal best/i });
    expect(mark).toHaveAttribute('aria-pressed', 'false');

    await user.click(mark);
    await waitFor(async () => expect((await repo.getRecipeBakeLogs('r1'))[0].isPersonalBest).toBe(true));
  });

  it('confirms a copied link with a status strip, not a browser alert', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom exposes navigator.clipboard as a getter only.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderViewer();
    await screen.findByRole('dialog', { name: /^Make 1$/i });
    await user.keyboard('{Escape}');

    const share = await screen.findByRole('button', { name: /^Share$/i });
    await user.click(share);
    // Share is a menu now: Escape and a click elsewhere close it.
    // A saved copy shares the original's address; this device's own id is no
    // use to anyone else.
    await user.click(await screen.findByRole('menuitem', { name: /Copy link to the original/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Link copied.');
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/r/banana-pudding`);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('reports a failure in the panel rather than through alert()', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const spy = vi.spyOn(repo, 'deleteBakeLog').mockRejectedValueOnce(new Error('blocked'));
    renderViewer();
    await screen.findByRole('dialog', { name: /^Make 1$/i });

    await user.click(screen.getByRole('button', { name: /Delete entry/i }));
    await screen.findByRole('dialog', { name: /Delete this bake/i });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not delete that bake log/i);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
    spy.mockRestore();
  });

  it('offers no link at all for a recipe that exists only on this device', async () => {
    const user = userEvent.setup();
    await seed('recipes', [{ ...RECIPE, forkedFrom: null }]);
    renderViewer();
    await screen.findByRole('dialog', { name: /^Make 1$/i });
    await user.keyboard('{Escape}');

    await user.click(await screen.findByRole('button', { name: /^Share$/i }));
    expect(screen.queryByRole('menuitem', { name: /Copy link/i })).not.toBeInTheDocument();
  });
});
