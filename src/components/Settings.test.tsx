import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './Settings';

vi.mock('../lib/api', () => ({
  API_URL: 'http://localhost:3001/api',
  api: { rehostImages: vi.fn() },
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
    render(<Settings />);
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
    render(<Settings />);

    const wave = screen.getByRole('button', { name: 'Wave to advance' });
    await user.click(wave);

    expect(wave).toHaveTextContent('On');
    expect(wave).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('waveToAdvance')).toBe('true');
  });

  it('carries its state by more than colour', async () => {
    const user = userEvent.setup();
    render(<Settings />);
    const voice = screen.getByRole('button', { name: 'Voice commands' });

    // The word changes as well as the fill, so the control survives a colour
    // vision difference and a screen reader both.
    expect(voice).toHaveTextContent('Off');
    await user.click(voice);
    expect(voice).toHaveTextContent('On');
  });

  it('runs the theme as a bank where exactly one key is down', async () => {
    const user = userEvent.setup();
    render(<Settings />);

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
    render(<Settings />);
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(localStorage.getItem('theme')).toBe('dark');

    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('names the admin PIN as the recovery when a backup is refused', async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await user.click(screen.getByRole('button', { name: /Download/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/admin PIN/i);
  });
});
