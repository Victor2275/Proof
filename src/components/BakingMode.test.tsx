import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BakingMode from './BakingMode';
import { api } from '../lib/api';
import SpeechRecognition from 'react-speech-recognition';

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

vi.mock('react-speech-recognition', () => {
  return {
    default: {
      startListening: vi.fn(),
      stopListening: vi.fn(),
    },
    useSpeechRecognition: () => ({
      listening: false,
      browserSupportsSpeechRecognition: true
    })
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

const mockRecipe = {
  _id: '1',
  title: 'Test Sourdough',
  instructions: ['Step 1: Mix', 'Step 2: Fold', 'Step 3: Bake'],
  ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }]
};

describe('BakingMode Component', () => {
  beforeEach(() => {
    vi.mocked(api.getRecipe).mockResolvedValue(mockRecipe as any);
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
    
    const toggleBtn = screen.getByText('Show All Steps');
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
    render(<MemoryRouter><BakingMode /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Step 1: Mix')).toBeDefined());
    
    const micBtn = screen.getByTitle(/Toggle Voice Commands/i);
    fireEvent.click(micBtn);
    
    expect(SpeechRecognition.startListening).toHaveBeenCalledWith({ continuous: true });
  });
});
