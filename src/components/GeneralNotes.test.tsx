import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GeneralNotes from './GeneralNotes';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}));

const NOTES = [
  { _id: 'n1', title: 'Starter timing', content: 'Fed at 0700.' },
  { _id: 'n2', title: 'Oven calibration', content: 'Runs 15C cold.' },
];

beforeEach(() => {
  vi.mocked(api.getNotes).mockResolvedValue(NOTES);
  vi.mocked(api.updateNote).mockResolvedValue(NOTES[0]);
  vi.mocked(api.createNote).mockResolvedValue({ _id: 'n3', title: 'New', content: '' });
  vi.mocked(api.deleteNote).mockResolvedValue(undefined as never);
});

describe('GeneralNotes', () => {
  it('opens on the first note rather than an empty editor', async () => {
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));
    expect(screen.getByLabelText('Note')).toHaveValue('Fed at 0700.');
  });

  it('reports saved until something is typed, then offers to save', async () => {
    const user = userEvent.setup();
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

    // Nothing to do, so no control offering to do it.
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Note'), ' Doubled by 1130.');

    const save = await screen.findByRole('button', { name: 'Save' });
    await user.click(save);

    await waitFor(() =>
      expect(api.updateNote).toHaveBeenCalledWith('n1', {
        title: 'Starter timing',
        content: 'Fed at 0700. Doubled by 1130.',
      }),
    );
  });

  it('switches between notes from the list', async () => {
    const user = userEvent.setup();
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

    await user.click(screen.getByRole('button', { name: 'Oven calibration' }));
    expect(screen.getByLabelText('Note')).toHaveValue('Runs 15C cold.');
  });

  it('asks before deleting, and does nothing if the answer is no', async () => {
    const user = userEvent.setup();
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

    await user.click(screen.getByRole('button', { name: 'Delete Starter timing' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete note' });
    expect(dialog).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    expect(api.deleteNote).not.toHaveBeenCalled();
  });

  it('deletes on confirmation', async () => {
    const user = userEvent.setup();
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

    await user.click(screen.getByRole('button', { name: 'Delete Starter timing' }));
    await screen.findByRole('dialog', { name: 'Delete note' });
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.deleteNote).toHaveBeenCalledWith('n1'));
  });

  it('starts a blank note without touching the stored one', async () => {
    const user = userEvent.setup();
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

    await user.click(screen.getByRole('button', { name: 'New' }));
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Note')).toHaveValue('');
    expect(api.updateNote).not.toHaveBeenCalled();
  });

  it('keeps what was typed when the notebook cannot be reached', async () => {
    const user = userEvent.setup();
    vi.mocked(api.updateNote).mockRejectedValueOnce(new Error('offline'));
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

    await user.type(screen.getByLabelText('Note'), ' more');
    await user.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/nothing has been lost/i);
    expect(screen.getByLabelText('Note')).toHaveValue('Fed at 0700. more');
  });

  it('reaches the note list on a phone, where the rail is not drawn', async () => {
    const user = userEvent.setup();
    render(<GeneralNotes />);
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue('Starter timing'));

    await user.click(screen.getByRole('button', { name: /All notes/i }));
    expect(await screen.findByRole('dialog', { name: /Notes/ })).toBeInTheDocument();
  });
});
