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

vi.mock('../lib/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/settings')>()),
  hapticsEnabled: true,
  ttsEnabled: true,
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('Settings', () => {
  it('draws every preference as a switch, with one plain line saying what it does', () => {
    renderScreen(<Settings />);
    // Haptics is on by default in this build.
    const haptics = screen.getByRole('switch', { name: 'Haptics' });
    expect(haptics).toHaveAttribute('aria-checked', 'true');
    expect(haptics).toHaveAccessibleDescription(/A small buzz/);

    expect(screen.getByRole('switch', { name: 'Wave to advance' })).toHaveAttribute('aria-checked', 'false');
  });

  it('turns a switch on and writes the preference through', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);
    const wave = screen.getByRole('switch', { name: 'Wave to advance' });
    await user.click(wave);
    expect(wave).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('waveToAdvance')).toBe('true');
  });

  it('sets bake notes in a handwriting face when asked, and back again', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);
    const hand = screen.getByRole('switch', { name: 'Handwritten notes' });
    expect(hand).toHaveAttribute('aria-checked', 'false');
    await user.click(hand);
    expect(document.documentElement.dataset.hand).toBe('on');
    expect(localStorage.getItem('handwritingNotes')).toBe('true');
    await user.click(hand);
    expect(document.documentElement.dataset.hand).toBeUndefined();
  });

  it('is laid out as Appearance, While you bake, Your cookbook, Account, Help', () => {
    renderScreen(<Settings />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Appearance',
      'While you bake',
      'Your cookbook',
      'Account',
      'Help',
      'Operator',
    ]);
  });

  it('opens help in a sheet', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);
    await user.click(screen.getByRole('button', { name: 'How Proof works' }));
    expect(await screen.findByRole('dialog', { name: 'Help' })).toBeInTheDocument();
  });

  it('opens on paper when no theme has been chosen', () => {
    renderScreen(<Settings />);
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('runs the theme as a segmented choice where exactly one is checked', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);

    const light = screen.getByRole('radio', { name: 'Light' });
    const dark = screen.getByRole('radio', { name: 'Dark' });

    await user.click(dark);
    expect(dark).toHaveAttribute('aria-checked', 'true');
    expect(light).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(light);
    expect(light).toHaveAttribute('aria-checked', 'true');
    expect(dark).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('remembers a choice to follow the device, rather than forgetting it', async () => {
    const user = userEvent.setup();
    renderScreen(<Settings />);
    await user.click(screen.getByRole('radio', { name: 'System' }));
    // An absent key means "never chosen", which is paper; "system" must be
    // stored or it would silently turn back into light on the next launch.
    expect(localStorage.getItem('theme')).toBe('system');
  });

  it('keeps the operator tools behind the operator PIN', async () => {
    const user = userEvent.setup();
    const asked = vi.fn();
    window.addEventListener('auth-required', asked);
    renderScreen(<Settings />);

    // A stranger sees what the tools are for, not the tools.
    expect(screen.queryByRole('button', { name: /Re-host/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Operator sign-in' }));
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
