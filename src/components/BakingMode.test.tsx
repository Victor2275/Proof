import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import BakingMode from './BakingMode';
import { repo } from '../lib/repo';
import SpeechRecognition from 'react-speech-recognition';
import { publishRunningTimers } from '../lib/timerBus';
import { makeRecipe, seed, testQueryClient } from '../test/utils';

const renderBaking = () =>
  render(
    <QueryClientProvider client={testQueryClient()}>
      <MemoryRouter>
        <BakingMode />
      </MemoryRouter>
    </QueryClientProvider>,
  );

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: '1' })
  };
});

let registeredCommands: any[] = [];
vi.mock('react-speech-recognition', () => {
  return {
    default: {
      startListening: vi.fn(),
      stopListening: vi.fn(),
    },
    useSpeechRecognition: (options: any) => {
      if (options?.commands) {
        registeredCommands = options.commands;
      }
      return {
        listening: false,
        browserSupportsSpeechRecognition: true,
        transcript: '',
        resetTranscript: vi.fn()
      };
    }
  };
});

// Mock Capacitor Haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn()
  },
  ImpactStyle: {
    Light: 'LIGHT'
  }
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false
  }
}));

// The scale is a Web Bluetooth device, so it can only ever be faked here. The
// handle is hoisted because vi.mock factories run before the file body.
const scaleMock = vi.hoisted(() => ({ onWeight: null as ((m: any) => void) | null }));
vi.mock('../lib/bluetoothScale', () => ({
  scaleService: {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    onWeightChange: (cb: (m: any) => void) => { scaleMock.onWeight = cb; },
    onDisconnect: vi.fn(),
  },
}));

const mockRecipe = makeRecipe({
  _id: '1',
  title: 'Test Sourdough',
  instructions: ['Step 1: Mix', 'Step 2: Fold', 'Step 3: Bake'],
  ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }],
});

describe('BakingMode Component', () => {
  beforeEach(async () => {
    await seed('recipes', [mockRecipe]);
    registeredCommands = [];
    window.confirm = vi.fn().mockReturnValue(true);
    // Voice commands and wave-to-advance are opt-in, so a leftover value from an
    // earlier test would change which controls render.
    localStorage.clear();
  });

  it('renders Focus Mode by default and shows first step', async () => {
    renderBaking();
    await waitFor(() => {
      expect(screen.getByText('Step 1: Mix')).toBeDefined();
    });
  });

  it('advances to next step on arrow right key', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    await new Promise(r => setTimeout(r, 50));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('Step 2: Fold')).toBeDefined();
    });
  });

  it('goes back to previous step on arrow left key', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    await new Promise(r => setTimeout(r, 50));
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // Go to Step 2
    await waitFor(() => expect(screen.getByText('Step 2: Fold')).toBeDefined());
    
    await new Promise(r => setTimeout(r, 50));
    fireEvent.keyDown(window, { key: 'ArrowLeft' }); // Go to Step 1
    await waitFor(() => {
      expect(screen.getByText('Step 1: Mix')).toBeDefined();
    });
  });

  it('toggles list view and renders all steps', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    const toggleBtn = screen.getByText('Show All');
    fireEvent.click(toggleBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Step 2: Fold')).toBeDefined();
      expect(screen.getByText('Step 3: Bake')).toBeDefined();
    });
  });

  it('shows Finish Recipe button on last step in Focus Mode', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    await new Promise(r => setTimeout(r, 50));
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // Step 2
    await waitFor(() => expect(screen.getByText('Step 2: Fold')).toBeDefined());

    await new Promise(r => setTimeout(r, 50));
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // Step 3
    await waitFor(() => expect(screen.getByText('Step 3: Bake')).toBeDefined());

    await new Promise(r => setTimeout(r, 50));
    fireEvent.keyDown(window, { key: 'ArrowRight' }); // Finished
    await waitFor(() => {
      expect(screen.getByText('Finish Recipe')).toBeDefined();
    });
  });

  it('toggles the microphone on click', async () => {
    // The mic only renders when the Voice Commands setting is on.
    localStorage.setItem('voiceCommands', 'true');
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    const micBtn = screen.getByTitle(/Toggle Voice Commands/i);
    fireEvent.click(micBtn);
    
    expect(SpeechRecognition.startListening).toHaveBeenCalledWith({ continuous: true });
  });

  /*
   * Phase 4 — the step row is the navigation, and the header only reports what
   * it can actually measure.
   */

  it('jumps to the first step of a phase when its key is pressed', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    // "Step 3: Bake" reads as the cook phase; its key is the way a baker who
    // walked back into the kitchen gets there without tapping Next three times.
    fireEvent.click(screen.getByRole('button', { name: /Cook/i }));

    await waitFor(() => {
      expect(screen.getByText('Step 3: Bake')).toBeInTheDocument();
    });
  });

  it('names the running phase and the step position', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    expect(screen.getByText('STEP 01 / 03')).toBeInTheDocument();
  });

  it('docks a running timer as a readout instead of floating it over the step', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    act(() => {
      publishRunningTimers([
        { id: 't1', name: 'Bulk', remainingMs: 12 * 60 * 1000 + 40 * 1000, running: true },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Bulk 12:40/ })).toBeInTheDocument();
    });
  });

  it('shows the scale target only once a scale is connected', async () => {
    await seed('recipes', [
      makeRecipe({
        _id: '1',
        title: 'Weighed Loaf',
        instructions: ['Add the flour to the bowl'],
        ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }],
      }),
    ]);

    renderBaking();
    await waitFor(() => expect(screen.getByText('Add the flour to the bowl')).toBeDefined());

    // Nothing is connected, so there is no weight to report and no empty
    // display pretending otherwise.
    expect(screen.queryByRole('img', { name: /Target/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle(/Connect a Bluetooth scale/i));

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Target 500 G/i })).toBeInTheDocument();
    });

    act(() => {
      scaleMock.onWeight?.({ weight: 412, unit: 'g' });
    });

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /On scale 412 g/i })).toBeInTheDocument();
    });
  });

  /*
   * Baking Mode is operated at arm's length with floured hands. An operating
   * system dialog appearing mid-bake has to be dismissed with a precise tap
   * before anything else can happen, and cannot be read from across a counter.
   * Three of them used to live here.
   */
  it('asks about finishing on the panel, not through a browser confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    const finishCmd = registeredCommands.find((c) => c.command.includes('finish'));
    expect(finishCmd).toBeDefined();

    act(() => {
      finishCmd.callback();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('dialog', { name: /Finish the bake/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Keep baking/i })).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('reports a failed bake log in the panel, keeping what was typed', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const saveSpy = vi.spyOn(repo, 'createBakeLog').mockRejectedValue(new Error('QuotaExceededError'));

    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    const finishCmd = registeredCommands.find((c) => c.command.includes('finish'));
    act(() => {
      finishCmd.callback();
    });
    fireEvent.click(await screen.findByRole('button', { name: /^Finish$/i }));

    const notes = await screen.findByLabelText(/Bake notes/i);
    fireEvent.change(notes, { target: { value: 'Crumb still tight.' } });
    fireEvent.submit(notes.closest('form')!);

    const alertBar = await screen.findByRole('alert');
    expect(alertBar).toHaveTextContent(/still here/i);
    expect(alertSpy).not.toHaveBeenCalled();
    // What was typed survives the failure — there is nothing to retype.
    expect(notes).toHaveValue('Crumb still tight.');

    saveSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('logs a finished bake on this device, with no account and no connection', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    const finishCmd = registeredCommands.find((c) => c.command.includes('finish'));
    act(() => {
      finishCmd.callback();
    });
    fireEvent.click(await screen.findByRole('button', { name: /^Finish$/i }));

    const notes = await screen.findByLabelText(/Bake notes/i);
    fireEvent.change(notes, { target: { value: 'Open crumb at last.' } });
    fireEvent.submit(notes.closest('form')!);

    await waitFor(async () => {
      const logs = await repo.getRecipeBakeLogs('1');
      expect(logs.map((l) => l.notes)).toEqual(['Open crumb at last.']);
    });
  });

  it('says the recipe is gone, rather than drawing an empty machine', async () => {
    await repo.deleteRecipe('1');
    renderBaking();
    expect(await screen.findByText(/This recipe is not in the cookbook/i)).toBeInTheDocument();
  });

  it('registers advanced voice commands including read, timer, and help', async () => {
    renderBaking();
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    expect(registeredCommands.length).toBeGreaterThan(5);
    
    // Check that 'help' command exists and triggers modal
    const helpCmd = registeredCommands.find(c => c.command.includes('help'));
    expect(helpCmd).toBeDefined();
    
    // Trigger help command
    act(() => {
      helpCmd.callback();
    });
    
    // Check if Voice Commands sheet opened
    expect(await screen.findByRole('dialog', { name: /voice commands/i })).toBeInTheDocument();
    
    // Check close command
    const closeCmd = registeredCommands.find(c => c.command.includes('close'));
    act(() => {
      closeCmd.callback();
    });
    
    expect(screen.queryByText('Voice Commands')).not.toBeInTheDocument();
  });
});
