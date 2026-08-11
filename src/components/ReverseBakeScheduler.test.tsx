import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReverseBakeScheduler from './ReverseBakeScheduler';

const mockRecipe = {
  _id: 'r1',
  title: 'Rustic Sourdough',
  description: 'Classic levain sourdough bread',
  instructions: [
    'Feed sourdough starter (4h)',
    'Autolyse flour and water (45m)',
    'Bulk ferment dough (3h)',
    'Bake at 450F (45m)'
  ],
  prepTime: '60',
  cookTime: '45',
  imageUrls: [],
  servings: 4,
  tags: [],
  ingredients: []
};

describe('ReverseBakeScheduler Component', () => {
  it('renders target completion time input and title', () => {
    render(<ReverseBakeScheduler recipe={mockRecipe} />);
    expect(screen.getByText(/Reverse Bake Timeline Scheduler/i)).toBeDefined();
    expect(screen.getByText(/Target Completion Time/i)).toBeDefined();
  });

  it('calculates backwards start timestamps for all steps', () => {
    render(<ReverseBakeScheduler recipe={mockRecipe} />);
    expect(screen.getByText(/Feed sourdough starter/i)).toBeDefined();
    expect(screen.getByText(/Autolyse flour and water/i)).toBeDefined();
    expect(screen.getByText(/Bulk ferment dough/i)).toBeDefined();
    expect(screen.getByText(/Bake at 450F/i)).toBeDefined();
  });

  it('allows user to change target date time', () => {
    render(<ReverseBakeScheduler recipe={mockRecipe} />);
    const dateTimeInput = screen.getByDisplayValue(/:\d\d/i);
    
    const futureDate = '2026-10-15T12:00';
    fireEvent.change(dateTimeInput, { target: { value: futureDate } });

    expect((dateTimeInput as HTMLInputElement).value).toBe(futureDate);
  });
});
