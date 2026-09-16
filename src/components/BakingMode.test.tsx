import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BakingMode from './BakingMode';
import { api } from '../lib/api';
import SpeechRecognition from 'react-speech-recognition';
import { publishRunningTimers } from '../lib/timerBus';

vi.mock('../lib/api', () => ({
  api: {
    getRecipe: vi.fn(),
    uploadImage: vi.fn(),
    createBakeLog: vi.fn(),
    getPantry: vi.fn().mockResolvedValue([])
  }
}));

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

const mockRecipe = {
  _id: '1',
  title: 'Test Sourdough',
  instructions: ['Step 1: Mix', 'Step 2: Fold', 'Step 3: Bake'],
  ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }]
};

describe('BakingMode Component', () => {
  beforeEach(() => {
    vi.mocked(api.getRecipe).mockResolvedValue(mockRecipe as any);
    registeredCommands = [];
    window.confirm = vi.fn().mockReturnValue(true);
    // Voice commands and wave-to-advance are opt-in, so a leftover value from an
    // earlier test would change which controls render.
    localStorage.clear();
  });

  it('renders Focus Mode by default and shows first step', async () => {
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Step 1: Mix')).toBeDefined();
    });
  });

  it('advances to next step on arrow right key', async () => {
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    await new Promise(r => setTimeout(r, 50));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('Step 2: Fold')).toBeDefined();
    });
  });

  it('goes back to previous step on arrow left key', async () => {
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
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
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    const toggleBtn = screen.getByText('Show All');
    fireEvent.click(toggleBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Step 2: Fold')).toBeDefined();
      expect(screen.getByText('Step 3: Bake')).toBeDefined();
    });
  });

  it('shows Finish Recipe button on last step in Focus Mode', async () => {
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
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
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
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
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    // "Step 3: Bake" reads as the cook phase; its key is the way a baker who
    // walked back into the kitchen gets there without tapping Next three times.
    fireEvent.click(screen.getByRole('button', { name: /Cook/i }));

    await waitFor(() => {
      expect(screen.getByText('Step 3: Bake')).toBeInTheDocument();
    });
  });

  it('names the running phase and the step position', async () => {
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    expect(screen.getByText('STEP 01 / 03')).toBeInTheDocument();
  });

  it('docks a running timer as a readout instead of floating it over the step', async () => {
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
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
    vi.mocked(api.getRecipe).mockResolvedValue({
      _id: '1',
      title: 'Weighed Loaf',
      instructions: ['Add the flour to the bowl'],
      ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }],
    } as any);

    render(<MemoryRouter><BakingMode /></MemoryRouter>);
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

  it('registers advanced voice commands including read, timer, and help', async () => {
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());

    expect(registeredCommands.length).toBeGreaterThan(5);
    
    // Check that 'help' command exists and triggers modal
    const helpCmd = registeredCommands.find(c => c.command.includes('help'));
    expect(helpCmd).toBeDefined();
    
    // Trigger help command
    act(() => {
      helpCmd.callback();
    });
    
    // Check if Voice Commands modal opened
    expect(screen.getByText('Voice Commands')).toBeInTheDocument();
    
    // Check close command
    const closeCmd = registeredCommands.find(c => c.command.includes('close'));
    act(() => {
      closeCmd.callback();
    });
    
    expect(screen.queryByText('Voice Commands')).not.toBeInTheDocument();
  });
});
