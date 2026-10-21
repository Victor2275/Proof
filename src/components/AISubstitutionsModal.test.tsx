import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AISubstitutionsModal from './AISubstitutionsModal';
import { api } from '../lib/api';
import { setOperatorToken } from '../lib/session';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: {
    getAISubstitutions: vi.fn(),
  },
}));

const renderModal = () =>
  render(
    <MemoryRouter>
      <AISubstitutionsModal ingredientName="Buttermilk" onClose={() => {}} />
    </MemoryRouter>,
  );

describe('AISubstitutionsModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('names the ingredient', () => {
    renderModal();
    expect(screen.getByText(/Buttermilk/i)).toBeInTheDocument();
  });

  it('explains why the AI is closed, rather than asking a stranger for a PIN', () => {
    const asked = vi.fn();
    window.addEventListener('auth-required', asked);
    renderModal();

    expect(screen.queryByRole('button', { name: /Generate Substitutions/i })).not.toBeInTheDocument();
    expect(screen.getByText(/runs on Proof's server/i)).toBeInTheDocument();
    expect(asked).not.toHaveBeenCalled();
    window.removeEventListener('auth-required', asked);
  });

  describe('for the operator', () => {
    beforeEach(() => setOperatorToken('operator-token'));
    afterEach(() => setOperatorToken(null));

    it('fetches and displays AI substitutions', async () => {
      vi.mocked(api.getAISubstitutions).mockResolvedValue({
        substitutions: [{ substitute: 'Milk + Lemon Juice', ratio: '1 cup milk + 1 tbsp lemon', notes: 'Curdles in 5 mins' }],
      });
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /Generate Substitutions/i }));

      await waitFor(() => {
        expect(screen.getByText('Milk + Lemon Juice')).toBeInTheDocument();
        expect(screen.getByText(/Curdles in 5 mins/i)).toBeInTheDocument();
      });
    });

    it('says so when nothing comes back, rather than drawing an empty dialog', async () => {
      vi.mocked(api.getAISubstitutions).mockResolvedValue({ substitutions: [] });
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /Generate Substitutions/i }));
      expect(await screen.findByText(/No substitutions came back for Buttermilk/i)).toBeInTheDocument();
    });

    it('names a failure and offers the request again', async () => {
      vi.mocked(api.getAISubstitutions).mockRejectedValue(new Error('The AI service is unavailable.'));
      renderModal();
      fireEvent.click(screen.getByRole('button', { name: /Generate Substitutions/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(/unavailable/i);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('is a dialog, so it can be left by keyboard', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: /AI substitutions/i })).toBeInTheDocument();
  });
});
