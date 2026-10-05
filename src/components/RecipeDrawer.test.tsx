import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RecipeDrawer from './RecipeDrawer';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getRecipe: vi.fn(),
  },
}));

describe('RecipeDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<RecipeDrawer isOpen={false} onClose={() => {}} recipeId="123" />);
    expect(screen.queryByTestId('recipe-drawer-content')).not.toBeInTheDocument();
  });

  it('renders loading state initially when opened', async () => {
    (api.getRecipe as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    
    // A skeleton, never the word "Loading".
    expect(screen.getByRole('status', { name: /loading sub-recipe/i })).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('is a dialog that names the sub-recipe once it has loaded', async () => {
    (api.getRecipe as any).mockResolvedValue({
      _id: '123',
      title: 'Vanilla Frosting',
      ingredients: [],
      instructions: [],
    });
    render(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    expect(await screen.findByRole('dialog', { name: 'Vanilla Frosting' })).toBeInTheDocument();
  });

  it('names the failure and offers a retry instead of failing silently', async () => {
    (api.getRecipe as any).mockRejectedValueOnce(new Error('offline'));
    render(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load this sub-recipe/i);

    (api.getRecipe as any).mockResolvedValue({
      _id: '123',
      title: 'Vanilla Frosting',
      ingredients: [],
      instructions: [],
    });
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('dialog', { name: 'Vanilla Frosting' })).toBeInTheDocument();
  });

  it('renders recipe data correctly', async () => {
    (api.getRecipe as any).mockResolvedValue({
      _id: '123',
      title: 'Vanilla Frosting',
      ingredients: [{ name: 'Butter', quantity: 1, unit: 'cup' }],
      instructions: ['Mix butter.', 'Add sugar.'],
    });

    render(<RecipeDrawer isOpen={true} onClose={() => {}} recipeId="123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Vanilla Frosting')).toBeInTheDocument();
    });

    expect(screen.getByText('Butter')).toBeInTheDocument();
    expect(screen.getByText('Mix butter.')).toBeInTheDocument();
    expect(screen.getByText('Add sugar.')).toBeInTheDocument();
  });

  it('calls onClose when Finish button is clicked', async () => {
    const mockOnClose = vi.fn();
    (api.getRecipe as any).mockResolvedValue({
      _id: '123',
      title: 'Vanilla Frosting',
      ingredients: [],
      instructions: [],
    });

    render(<RecipeDrawer isOpen={true} onClose={mockOnClose} recipeId="123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Finish Vanilla Frosting')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Finish Vanilla Frosting'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
