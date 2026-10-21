import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GeneralNotes from './GeneralNotes';
import { repo } from '../lib/repo';
import { makeNote, renderScreen, seed } from '../test/utils';

// Newest first: the starter note was edited most recently, so it opens.
const NOTES = [
  makeNote({ _id: 'n1', title: 'Starter timing', content: 'Fed at 0700.', updatedAt: '2026-08-02T00:00:00.000Z' }),
  makeNote({ _id: 'n2', title: 'Oven calibration', content: 'Runs 15C cold.', updatedAt: '2026-08-01T00:00:00.000Z' }),
];

beforeEach(async () => {
  await seed('notes', NOTES);
});

const opened = () => waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

describe('GeneralNotes', () => {
  it('opens on the most recent note rather than an empty editor', async () => {
    renderScreen(<GeneralNotes />);
    await opened();
    expect(screen.getByLabelText('Note')).toHaveValue('Fed at 0700.');
  });

  it('reports saved until something is typed, then saves to the device', async () => {
    const user = userEvent.setup();
    renderScreen(<GeneralNotes />);
    await opened();

    // Nothing to do, so no control offering to do it.
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Note'), ' Doubled by 1130.');
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(async () => {
      const notes = await repo.getNotes();
      expect(notes.find((n) => n._id === 'n1')?.content).toBe('Fed at 0700. Doubled by 1130.');
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('switches between notes from the list', async () => {
    const user = userEvent.setup();
    renderScreen(<GeneralNotes />);
    await opened();

    await user.click(screen.getByRole('button', { name: 'Oven calibration' }));
    expect(screen.getByLabelText('Note')).toHaveValue('Runs 15C cold.');
  });

  it('asks before deleting, and does nothing if the answer is no', async () => {
    const user = userEvent.setup();
    renderScreen(<GeneralNotes />);
    await opened();

    await user.click(screen.getByRole('button', { name: 'Delete Starter timing' }));
    expect(await screen.findByRole('dialog', { name: 'Delete note' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(await repo.getNotes()).toHaveLength(2);
  });

  it('deletes on confirmation', async () => {
    const user = userEvent.setup();
    renderScreen(<GeneralNotes />);
    await opened();

    await user.click(screen.getByRole('button', { name: 'Delete Starter timing' }));
    await screen.findByRole('dialog', { name: 'Delete note' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(async () => expect((await repo.getNotes()).map((n) => n._id)).toEqual(['n2']));
  });

  it('starts a blank note without touching the stored one', async () => {
    const user = userEvent.setup();
    renderScreen(<GeneralNotes />);
    await opened();

    await user.click(screen.getByRole('button', { name: 'New' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Note')).toHaveValue('');
    expect((await repo.getNotes()).find((n) => n._id === 'n1')?.content).toBe('Fed at 0700.');
  });

  it('keeps what was typed when the save fails', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(repo, 'updateNote').mockRejectedValueOnce(new Error('quota exceeded'));
    renderScreen(<GeneralNotes />);
    await opened();

    await user.type(screen.getByLabelText('Note'), ' more');
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/nothing has been lost/i);
    expect(screen.getByLabelText('Note')).toHaveValue('Fed at 0700. more');
    spy.mockRestore();
  });

  it('reaches the note list on a phone, where the rail is not drawn', async () => {
    const user = userEvent.setup();
    renderScreen(<GeneralNotes />);
    await opened();

    await user.click(screen.getByRole('button', { name: /All notes/i }));
    expect(await screen.findByRole('dialog', { name: /Notes/ })).toBeInTheDocument();
  });
});
