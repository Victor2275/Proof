import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './Settings';
import { setOperatorToken } from '../lib/session';
import { exportCookbook } from '../lib/repo/backup';
import { makeRecipe, renderScreen, seed } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: {
    health: vi.fn().mockRejectedValue(new Error('offline')),
    rehostImages: vi.fn(),
    downloadServerBackup: vi.fn(),
    getServerLibrary: vi.fn(),
  },
}));

vi.mock('../lib/settings', () => ({
  hapticsEnabled: true,
  ttsEnabled: true,
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('Settings', () => {
  it('draws every preference as a latching key that reports its state in words', () => {
    renderScreen(<Settings />);
    // Haptics is on by default in this build, so the key is down and says so.
    const haptics = screen.getByRole('button', { name: 'Haptics' });
    expect(haptics).toHaveTextContent('On');
    expect(haptics).toHaveAttribute('aria-pressed', 'true');

    const wave = screen.getByRole('button', { name: 'Wave to advance' });
    expect(wave).toHaveTextContent('Off');
    expect(wave).toHaveAttribute('aria-pressed', 'false');
  });

  it('latches a key and writes the preference through', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);

    const wave = screen.getByRole('button', { name: 'Wave to advance' });
    await user.click(wave);

    expect(wave).toHaveTextContent('On');
    expect(wave).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('waveToAdvance')).toBe('true');
  });

  it('carries its state by more than colour', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);
    const voice = screen.getByRole('button', { name: 'Voice commands' });

    // The word changes as well as the fill, so the control survives a colour
    // vision difference and a screen reader both.
    expect(voice).toHaveTextContent('Off');
    await user.click(voice);
    expect(voice).toHaveTextContent('On');
  });

  it('runs the theme as a bank where exactly one key is down', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);

    const light = screen.getByRole('button', { name: 'Light' });
    const dark = screen.getByRole('button', { name: 'Dark' });

    await user.click(dark);
    expect(dark).toHaveAttribute('aria-pressed', 'true');
    expect(light).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(light);
    expect(light).toHaveAttribute('aria-pressed', 'true');
    expect(dark).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('forgets the stored theme when it is handed back to the system', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('keeps the operator tools behind the operator PIN', async () => {
    const user = userEvent.setup();
    const asked = vi.fn();
    window.addEventListener('auth-required', asked);
    renderScreen(<Settings />);

    // A stranger sees what the tools are for, not the tools.
    expect(screen.queryByRole('button', { name: /Re-host/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(asked).toHaveBeenCalled();
    window.removeEventListener('auth-required', asked);
  });

  it('shows the operator tools once the PIN has been given', async () => {
    setOperatorToken('token');
    renderScreen(<Settings />);
    expect(screen.getByRole('button', { name: /Re-host/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
    setOperatorToken(null);
  });

  it('says where the cookbook lives, and that the server is not needed for it', async () => {
    renderScreen(<Settings />);
    expect(screen.getByText(/Stored on this device/)).toBeInTheDocument();
    expect(await screen.findByText(/your own cookbook does not/i)).toBeInTheDocument();
  });

  it('imports an export, and reports what it brought in', async () => {
    const user = userEvent.setup();
    await seed('recipes', [makeRecipe({ _id: 'r1', title: 'Rye' })]);
    const archive = await exportCookbook();
    // A fresh device: the same archive brings one recipe in.
    globalThis.indexedDB = new (await import('fake-indexeddb')).IDBFactory();
    await (await import('../lib/repo/db')).closeDB();

    renderScreen(<Settings />);
    const file = new File([archive], 'proof-cookbook.zip', { type: 'application/zip' });
    await user.upload(screen.getByLabelText('Choose an export to import'), file);

    expect(await screen.findByText(/1 added/)).toBeInTheDocument();
  });

  it('names the problem when the file is not a backup', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);
    const file = new File(['not a zip'], 'notes.zip', { type: 'application/zip' });
    await user.upload(screen.getByLabelText('Choose an export to import'), file);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not a Proof backup/i));
  });
});
