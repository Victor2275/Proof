import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimerManager from './TimerManager';

const socket = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }));
vi.mock('socket.io-client', () => ({ io: () => socket }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn() }, ImpactStyle: { Heavy: 'HEAVY' } }));

const askForTimer = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent('add-timer', { detail: { durationSecs: 1800, name: 'Bulk ferment' } }));
  });

describe('TimerManager start prompt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks in a dialog, reading the duration on a segment display', async () => {
    render(<TimerManager />);
    askForTimer();
    expect(await screen.findByRole('dialog', { name: 'Start timer' })).toBeInTheDocument();
    expect(screen.getByText('Bulk ferment')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '30:00' })).toBeInTheDocument();
  });

  it('starts the timer on Start', async () => {
    const user = userEvent.setup();
    render(<TimerManager />);
    askForTimer();
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(socket.emit).toHaveBeenCalledWith('timer:add', expect.objectContaining({ name: 'Bulk ferment' }));
  });

  // The old prompt was a bare overlay with no Escape.
  it('can be dismissed with Escape, starting nothing', async () => {
    const user = userEvent.setup();
    render(<TimerManager />);
    askForTimer();
    await screen.findByRole('dialog', { name: 'Start timer' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(socket.emit).not.toHaveBeenCalledWith('timer:add', expect.anything());
  });
});
