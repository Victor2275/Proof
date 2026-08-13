import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RecipeEditor from './RecipeEditor';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getRecipe: vi.fn(),
    getRecipes: vi.fn().mockResolvedValue([]),
    createRecipe: vi.fn(),
    updateRecipe: vi.fn(),
    extractRecipe: vi.fn()
  }
}));


// Mock ResizeObserver which is often needed for complex UI libraries like react-image-crop
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('RecipeEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for a new recipe', () => {
    render(<MemoryRouter><RecipeEditor /></MemoryRouter>);
    expect(screen.getByText(/Create Recipe/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/72-Hour Sourdough/i)).toBeDefined();
  });

  it('blocks submission if title is missing', async () => {
    render(<MemoryRouter><RecipeEditor /></MemoryRouter>);
    // Don't fill title
    const saveBtn = screen.getByText('Create Recipe');
    fireEvent.click(saveBtn);
    // Since required is set on the input, the browser handles it, but in jsdom we can check API call
    expect(api.createRecipe).not.toHaveBeenCalled();
  });

  it('allows adding a new ingredient dynamically', () => {
    render(<MemoryRouter><RecipeEditor /></MemoryRouter>);
    const addIngBtn = screen.getByText('Add Row');
    fireEvent.click(addIngBtn);
    const nameInputs = screen.getAllByPlaceholderText(/Ingredient name/i);
    expect(nameInputs).toHaveLength(1);
  });

  it('allows adding an instruction dynamically', () => {
    render(<MemoryRouter><RecipeEditor /></MemoryRouter>);
    const addInstBtn = screen.getByText('Add Step');
    fireEvent.click(addInstBtn);
    const stepInputs = screen.getAllByPlaceholderText(/Describe step\.\.\./i);
    expect(stepInputs).toHaveLength(1);
  });

  it('displays the URL extractor UI', () => {
    render(<MemoryRouter><RecipeEditor /></MemoryRouter>);
    const importBtn = screen.getByRole('button', { name: /Import from URL/i });
    fireEvent.click(importBtn);
    expect(screen.getByPlaceholderText(/allrecipes\.com/i)).toBeDefined();
  });

  it('calls extractRecipe when a URL is pasted and button clicked', async () => {
    vi.mocked(api.extractRecipe).mockResolvedValue({ title: 'Extracted Title' });
    render(<MemoryRouter><RecipeEditor /></MemoryRouter>);
    const importBtn = screen.getByRole('button', { name: /Import from URL/i });
    fireEvent.click(importBtn);
    
    const urlInput = screen.getByPlaceholderText(/allrecipes\.com/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/recipe' } });
    
    const extractBtn = screen.getByText('Extract');
    await waitFor(() => expect((extractBtn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(extractBtn);
    
    await waitFor(() => {
      expect(api.extractRecipe).toHaveBeenCalledWith('https://example.com/recipe');
      const titleInput = screen.getByPlaceholderText(/72-Hour Sourdough/i) as HTMLInputElement;
      expect(titleInput.value).toBe('Extracted Title');
    });
  });

  it('allows linking a sub-recipe to an instruction step', async () => {
    vi.mocked(api.getRecipes).mockResolvedValue([
      { _id: 'rec1', title: 'Frosting', description: '', imageUrls: [], servings: 4, prepTime: '', cookTime: '', tags: [], ingredients: [], instructions: [] },
    ]);
    render(<MemoryRouter><RecipeEditor /></MemoryRouter>);
    
    // Add instruction
    const addInstBtn = screen.getByText('Add Step');
    fireEvent.click(addInstBtn);
    
    // Find the Link Recipe button
    const linkBtn = await screen.findByText('Link Recipe');
    expect(linkBtn).toBeInTheDocument();
    
    // Click Link Recipe
    fireEvent.click(linkBtn);
    
    // Modal should open with recipes
    const frostingBtn = await screen.findByText('Frosting');
    expect(frostingBtn).toBeInTheDocument();
    
    // Select Frosting
    fireEvent.click(frostingBtn);
    
    // The linked recipe badge should now be visible
    expect(await screen.findByText('Frosting')).toBeInTheDocument();
  });
});
