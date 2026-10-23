import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import BakingMode from './BakingMode';
import { ToastProvider } from './ui';
import { repo } from '../lib/repo';
import { getActiveBake, startActiveBake } from '../lib/activeBake';
import { publishRunningTimers } from '../lib/timerBus';
import { makeBakeLog, makeRecipe, seed, testQueryClient } from '../test/utils';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate, useParams: () => ({ id: '1' }) };
});

let registeredCommands: { command: string[]; callback: () => void }[] = [];
vi.mock('react-speech-recognition', () => ({
  default: { startListening: vi.fn(), stopListening: vi.fn() },
  useSpeechRecognition: (options?: { commands?: typeof registeredCommands }) => {
    if (options?.commands) registeredCommands = options.commands;
    return { listening: false, browserSupportsSpeechRecognition: true, transcript: '', resetTranscript: vi.fn() };
  },
}));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn() }, ImpactStyle: { Light: 'LIGHT' } }));

const scaleMock = vi.hoisted(() => ({ onWeight: null as ((m: { weight: number; unit: string }) => void) | null }));
vi.mock('../lib/bluetoothScale', () => ({
  scaleService: {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    onWeightChange: (cb: (m: { weight: number; unit: string }) => void) => {
      scaleMock.onWeight = cb;
    },
    onDisconnect: vi.fn(),
  },
}));

const RECIPE = makeRecipe({
  _id: '1',
  title: 'Cheesecake',
  instructions: ['--- Crust ---', 'Mix the flour and the butter.', '--- Bake ---', 'Bake for 10 minutes.', 'Cool on a rack.'],
  ingredients: [
    { name: 'Flour', quantity: 500, unit: 'g' },
    { name: 'Butter, melted', quantity: 0.5, unit: 'cup' },
  ],
});

const renderBaking = (entry = '/recipe/1/bake') =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[entry]}>
          <BakingMode />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );

const stepText = () => screen.getByText(/Mix the flour|Bake for|Cool on/, { selector: 'p, p *' });

beforeEach(async () => {
  localStorage.clear();
  registeredCommands = [];
  navigate.mockReset();
  publishRunningTimers([]);
  await seed('recipes', [RECIPE]);
});

describe('baking mode, one step at a time', () => {
  it('opens on the first real step, counting real steps only', async () => {
    renderBaking();
    expect(await screen.findByText('Mix the flour and the butter.')).toBeInTheDocument();
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
    expect(screen.getAllByText('Crust').length).toBeGreaterThan(0);
  });

  it('moves with Next and Back, and with the arrow keys', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('hides Back on the first step, keeping its place', async () => {
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    const backButton = screen.getByText('Back').closest('button')!;
    expect(backButton).toHaveClass('invisible');
    expect(backButton).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows what this step needs', async () => {
    renderBaking();
    const needs = (await screen.findAllByRole('heading', { name: 'You need' }))[0].closest('section')!;
    expect(within(needs).getByText('500 g')).toBeInTheDocument();
    expect(within(needs).getByText('Butter')).toBeInTheDocument();
    expect(within(needs).getByText('½ cup')).toBeInTheDocument();
  });

  it("offers the step's timer as one big press", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(window, 'dispatchEvent');
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    await user.click(screen.getByRole('button', { name: 'Start 10 minutes' }));
    const event = spy.mock.calls.map((c) => c[0]).find((e) => e.type === 'add-timer') as CustomEvent;
    expect(event.detail).toMatchObject({ durationSecs: 600, name: 'Step 2 · 10 minutes' });
    // It remembers the recipe and step, so its notification can lead back.
    expect(event.detail.from).toEqual({ recipeId: '1', step: 2 });
    spy.mockRestore();
  });

  it("opens at the step a timer's notification asks for, over a resumed one", async () => {
    startActiveBake('1', 'Cheesecake', 1);
    renderBaking('/recipe/1/bake?step=3');
    expect(await screen.findByText('3 of 3')).toBeInTheDocument();
    expect(screen.getByText('Cool on a rack.')).toBeInTheDocument();
  });

  it('ignores a step that is not in the recipe', async () => {
    renderBaking('/recipe/1/bake?step=9');
    expect(await screen.findByText('1 of 3')).toBeInTheDocument();
  });

  it('counts the running timer down on that same press, in butter', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    act(() => publishRunningTimers([{ id: 't', name: 'Step 2 · 10 minutes', remainingMs: 9 * 60_000 + 3000, running: true }]));
    expect(screen.getByRole('button', { name: /09:03 of 10 minutes/ })).toHaveClass('bg-butter');
  });

  it('jumps to a part of the bake from the phase line', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: /^Bake/ }));
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('shows every step from the menu, each one a way back into focus', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Ingredients, all steps, scale and voice' }));
    await user.click(screen.getByRole('menuitem', { name: 'All steps' }));
    await user.click(screen.getByRole('button', { name: /Cool on a rack/ }));
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
  });

  it('resumes a bake left running at its step', async () => {
    startActiveBake('1', 'Cheesecake', 3);
    renderBaking();
    expect(await screen.findByText('2 of 3')).toBeInTheDocument();
  });

  it('tells the rest of the app which step this is', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    expect(getActiveBake()).toMatchObject({ recipeId: '1', stepIndex: 3 });
  });
});

describe('notes and the last bake', () => {
  it('files a note against the step it was written on', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Note on step 1' }));
    const sheet = await screen.findByRole('dialog', { name: 'A note on step 1' });
    await user.type(within(sheet).getByRole('textbox', { name: 'What you noticed' }), 'Butter too cold.');
    await user.click(screen.getAllByRole('button', { name: 'Save the note' }).at(-1)!);
    expect(getActiveBake()?.notes).toEqual([expect.objectContaining({ stepIndex: 1, text: 'Butter too cold.' })]);
    expect(await screen.findByText('Noted on step 1')).toBeInTheDocument();
  });

  it('shows what the last bake noted about this step, and its note for next time at the start', async () => {
    await seed('bakeLogs', [
      makeBakeLog({
        recipeId: '1',
        nextTime: 'Chill the crust first.',
        stepNotes: [{ stepIndex: 1, text: 'Crust was pale.', at: '2026-10-17T10:00:00.000Z' }],
      }),
    ]);
    renderBaking();
    expect(await screen.findByText('Chill the crust first.')).toBeInTheDocument();
    expect((await screen.findAllByText('“Crust was pale.”'))[0].parentElement).toHaveTextContent('Last time on this step · Oct 17');
  });

  it('asks how it went at the end, and logs the bake with its step notes', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Note on step 1' }));
    const noteSheet = await screen.findByRole('dialog', { name: 'A note on step 1' });
    await user.type(within(noteSheet).getByRole('textbox', { name: 'What you noticed' }), 'Butter too cold.');
    await user.click(screen.getAllByRole('button', { name: 'Save the note' }).at(-1)!);
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    await user.click(screen.getByRole('button', { name: 'How did it go?' }));
    const sheet = await screen.findByRole('dialog', { name: 'How did it go?' });
    expect(sheet).toHaveTextContent('Step 1: Butter too cold.');
    await user.click(within(sheet).getByRole('radio', { name: '4 stars' }));
    await user.click(screen.getByRole('button', { name: 'Log this bake' }));

    await waitFor(async () => expect(await repo.getRecipeBakeLogs('1')).toHaveLength(1));
    const [log] = await repo.getRecipeBakeLogs('1');
    expect(log).toMatchObject({ rating: 4, stepNotes: [expect.objectContaining({ stepIndex: 1, text: 'Butter too cold.' })] });
    expect(getActiveBake()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(`/recipe/1?logged=${log._id}`);
  });

  it('reports a failed log in the sheet, keeping what was written', async () => {
    const user = userEvent.setup();
    vi.spyOn(repo, 'createBakeLog').mockRejectedValueOnce(new Error('The device is full.'));
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Ingredients, all steps, scale and voice' }));
    await user.click(screen.getByRole('menuitem', { name: 'Finish and log' }));
    await user.type(await screen.findByRole('textbox', { name: 'What happened' }), 'Good.');
    await user.click(screen.getByRole('button', { name: 'Log this bake' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The device is full.');
    expect(screen.getByRole('textbox', { name: 'What happened' })).toHaveValue('Good.');
  });

  it('can stop a bake without logging it', async () => {
    const user = userEvent.setup();
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    await user.click(screen.getByRole('button', { name: 'Ingredients, all steps, scale and voice' }));
    await user.click(screen.getByRole('menuitem', { name: 'Stop without logging' }));
    expect(getActiveBake()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/recipe/1');
  });
});

describe('hands-free', () => {
  it('registers the voice commands', async () => {
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    const said = registeredCommands.flatMap((c) => c.command);
    for (const word of ['next', 'back', 'read', 'ingredients', 'start timer', 'quiet', 'show all', 'help', 'finish']) {
      expect(said).toContain(word);
    }
  });

  it('turns the page on "next"', async () => {
    renderBaking();
    await screen.findByText('Mix the flour and the butter.');
    act(() => registeredCommands.find((c) => c.command.includes('next'))!.callback());
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('shows the scale against the step target once connected, and moves on when it is reached', async () => {
    const user = userEvent.setup();
    const flourOnly = makeRecipe({ _id: '1', title: 'Bread', instructions: ['Weigh the flour.', 'Mix.'], ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }] });
    await seed('recipes', [flourOnly]);
    renderBaking();
    await screen.findByText('Weigh the flour.');
    expect(screen.queryByRole('img', { name: /Target/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ingredients, all steps, scale and voice' }));
    await user.click(screen.getByRole('menuitem', { name: 'Connect a Bluetooth scale' }));
    expect((await screen.findAllByRole('img', { name: 'Target 500 g' }))[0]).toBeInTheDocument();
    act(() => scaleMock.onWeight?.({ weight: 490, unit: 'g' }));
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });

  it('says the recipe is gone, rather than drawing an empty page', async () => {
    await repo.deleteRecipe('1');
    renderBaking();
    expect(await screen.findByText('This recipe is not in the cookbook')).toBeInTheDocument();
  });
});

void stepText;
