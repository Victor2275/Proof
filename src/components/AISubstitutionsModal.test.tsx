import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AISubstitutionsModal from './AISubstitutionsModal';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getAISubstitutions: vi.fn()
  }
}));

describe('AISubstitutionsModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders ingredient name and generate button', () => {
    render(<AISubstitutionsModal ingredientName="Buttermilk" onClose={() => {}} />);
    expect(screen.getByText(/Buttermilk/i)).toBeDefined();
    expect(screen.getByText(/Generate Substitutions/i)).toBeDefined();
  });

  it('dispatches auth-required event if not admin when generate clicked', async () => {
    const authListener = vi.fn();
    window.addEventListener('auth-required', authListener);

    render(<AISubstitutionsModal ingredientName="Buttermilk" onClose={() => {}} />);
    const genBtn = screen.getByRole('button', { name: /Generate Substitutions/i });
    fireEvent.click(genBtn);

    expect(authListener).toHaveBeenCalled();
    window.removeEventListener('auth-required', authListener);
  });

  it('fetches and displays AI substitutions when admin token is set', async () => {
    localStorage.setItem('adminToken', 'admin-token');
    vi.mocked(api.getAISubstitutions).mockResolvedValue({
      substitutions: [
        { substitute: 'Milk + Lemon Juice', ratio: '1 cup milk + 1 tbsp lemon', notes: 'Curdles in 5 mins' }
      ]
    });

    render(<AISubstitutionsModal ingredientName="Buttermilk" onClose={() => {}} />);
    const genBtn = screen.getByRole('button', { name: /Generate Substitutions/i });
    fireEvent.click(genBtn);

    await waitFor(() => {
      expect(screen.getByText('Milk + Lemon Juice')).toBeDefined();
      expect(screen.getByText(/Curdles in 5 mins/i)).toBeDefined();
    });
  });
});
