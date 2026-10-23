import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimerManager from './TimerManager';
import { setAccount, type Account } from '../lib/session';
import { OPEN_TIMERS_EVENT } from '../lib/timerBus';

const socket = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }));
vi.mock('socket.io-client', () => ({ io: () => socket }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn() }, ImpactStyle: { Heavy: 'HEAVY' } }));

const askForTimer = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent('add-timer', { detail: { durationSecs: 1800, name: 'Bulk ferment' } }));
  });

const ACCOUNT = { id: 'u1', handle: 'ada', email: 'a@example.com' } as Account;

// The running timers live in a sheet the timer pill opens.
const openTimers = () =>
  act(() => {
    window.dispatchEvent(new Event(OPEN_TIMERS_EVENT));
  });

describe('TimerManager start prompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAccount(null);
  });

  it('asks in a dialog, reading the duration on a segment display', async () => {
    render(<TimerManager />);
    askForTimer();
    expect(await screen.findByRole('dialog', { name: 'Start timer' })).toBeInTheDocument();
    expect(screen.getByText('Bulk ferment')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '30:00' })).toBeInTheDocument();
  });

  it('starts the timer on the device, with no account and no connection', async () => {
    const user = userEvent.setup();
    render(<TimerManager />);
    askForTimer();
    await user.click(await screen.findByRole('button', { name: 'Start' }));

    openTimers();
    expect(await screen.findByRole('dialog', { name: 'Timers' })).toBeInTheDocument();
    expect(screen.getByText('Bulk ferment')).toBeInTheDocument();
    // Nothing is sent anywhere for a signed-out device.
    expect(socket.emit).not.toHaveBeenCalled();
    // And a reload mid-bake finds it still running.
    expect(JSON.parse(localStorage.getItem('proof.timers')!)[0]).toMatchObject({ name: 'Bulk ferment' });
  });

  it("syncs to the account's other devices when signed in", async () => {
    const user = userEvent.setup();
    setAccount('token', ACCOUNT);
    render(<TimerManager />);
    askForTimer();
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(socket.emit).toHaveBeenCalledWith('timer:add', expect.objectContaining({ name: 'Bulk ferment' }));
    setAccount(null);
  });

  it('resumes the timers this device was running', () => {
    localStorage.setItem(
      'proof.timers',
      JSON.stringify([{ id: 't1', name: 'Proof', endTime: null, remainingMs: 60_000, hasRung: false }]),
    );
    render(<TimerManager />);
    openTimers();
    expect(screen.getByText('· paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume Proof timer' })).toBeInTheDocument();
  });

  it('pauses and removes a timer from its sheet', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'proof.timers',
      JSON.stringify([{ id: 't1', name: 'Oven', endTime: Date.now() + 60_000, remainingMs: 60_000, hasRung: false }]),
    );
    render(<TimerManager />);
    openTimers();
    await user.click(screen.getByRole('button', { name: 'Pause Oven timer' }));
    expect(screen.getByRole('button', { name: 'Resume Oven timer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Oven timer' }));
    expect(JSON.parse(localStorage.getItem('proof.timers')!)).toEqual([]);
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
