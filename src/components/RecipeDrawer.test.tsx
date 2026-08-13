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
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading sub-recipe...')).toBeInTheDocument();
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
