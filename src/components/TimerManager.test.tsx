import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TimerManager from './TimerManager';
import { setAccount, type Account } from '../lib/session';
import { OPEN_TIMERS_EVENT } from '../lib/timerBus';

const socket = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), disconnect: vi.fn() }));
vi.mock('socket.io-client', () => ({ io: () => socket }));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn() }, ImpactStyle: { Heavy: 'HEAVY' } }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => ({ ...(await vi.importActual('react-router-dom')), useNavigate: () => navigate }));

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

describe('a timer that leads back to its step (change 31)', () => {
  const notes: { title: string; body?: string; onclick: (() => void) | null; close: () => void }[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setAccount(null);
    notes.length = 0;
    class FakeNotification {
      static permission = 'granted';
      static requestPermission = vi.fn();
      onclick: (() => void) | null = null;
      close = vi.fn();
      constructor(title: string, options?: { body?: string }) {
        notes.push(Object.assign(this, { title, body: options?.body }));
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    vi.stubGlobal('Audio', class { play = () => Promise.resolve(); });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const ring = (timer: Record<string, unknown>) => {
    vi.useFakeTimers();
    localStorage.setItem(
      'proof.timers',
      JSON.stringify([{ id: 't1', endTime: Date.now() - 1, remainingMs: 0, hasRung: false, ...timer }]),
    );
    render(<TimerManager />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  };

  it('says what is up and, pressed, opens baking mode at that step', () => {
    ring({ name: 'Step 4 · 12 min', from: { recipeId: 'r1', step: 4 } });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ title: 'Step 4 · 12 min is up', body: 'Tap to go back to step 4.' });
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => {});
    notes[0].onclick!();
    expect(focus).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/recipe/r1/bake?step=4');
    expect(notes[0].close).toHaveBeenCalled();
  });

  it('has nowhere to lead for a timer with no step', () => {
    ring({ name: 'Proof' });
    expect(notes[0]).toMatchObject({ title: 'Proof is up', onclick: null });
  });

  it("keeps where a timer came from across a server sync, and never sends it", async () => {
    setAccount('token', ACCOUNT);
    render(<TimerManager />);
    act(() => {
      window.dispatchEvent(
        new CustomEvent('add-timer', {
          detail: { durationSecs: 60, name: 'Step 2 · 1 min', forceStart: true, from: { recipeId: 'r1', step: 2 } },
        }),
      );
    });
    const sent = socket.emit.mock.calls.find((c) => c[0] === 'timer:add')![1];
    expect(sent).not.toHaveProperty('from');

    const sync = socket.on.mock.calls.find((c) => c[0] === 'timers:sync')![1];
    act(() => sync([sent]));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('proof.timers')!)[0].from).toEqual({ recipeId: 'r1', step: 2 }),
    );
    setAccount(null);
  });
});
