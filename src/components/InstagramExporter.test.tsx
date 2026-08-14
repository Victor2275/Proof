import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InstagramExporter from './InstagramExporter';
import type { Recipe } from '../lib/api';

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/jpeg;base64,mock',
  }),
}));

describe('InstagramExporter', () => {
  const mockRecipe: Recipe = {
    title: 'Test Bread',
    description: 'A test description',
    prepTime: '20',
    cookTime: '40',
    servings: 1,
    tags: ['bread', 'test'],
    ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }],
    instructions: ['Mix', 'Bake'],
    imageUrls: ['https://example.com/img.jpg'],
  };

  it('renders the carousel view by default', () => {
    render(<InstagramExporter recipe={mockRecipe} onClose={vi.fn()} />);
    expect(screen.getByText('Test Bread')).toBeInTheDocument();
    expect(screen.getByText('Ingredients')).toBeInTheDocument();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
  });

  it('switches to single post mode', () => {
    render(<InstagramExporter recipe={mockRecipe} onClose={vi.fn()} />);
    const singleBtn = screen.getByText(/Single Polaroid Only/i);
    fireEvent.click(singleBtn);
    
    // Ingredients should no longer be rendered as a header
    expect(screen.queryByText('Ingredients')).not.toBeInTheDocument();
    // But title should still be there
    expect(screen.getByText('Test Bread')).toBeInTheDocument();
  });
});
