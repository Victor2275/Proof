import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InstructionList from './InstructionList';
import type { Recipe } from '../lib/api';

const base: Recipe = {
  _id: 'r1',
  title: 'Country Sourdough',
  description: '',
  imageUrls: [],
  servings: 4,
  prepTime: '30',
  cookTime: '45',
  tags: [],
  ingredients: [],
  instructions: [
    'Feed the levain and let it ripen for 6 hours.',
    'Autolyse the flour and water for 1 hour.',
    'Bulk ferment for 4 hours.',
    'Bake at 250C for 30 minutes.',
  ],
};

describe('InstructionList', () => {
  it('prints the steps under the phases the step row shows', () => {
    render(<InstructionList recipe={base} />);
    // These are the phase headings the dashboard's mini step row draws keys for.
    expect(screen.getByText('Levain')).toBeInTheDocument();
    expect(screen.getByText('Bake')).toBeInTheDocument();
  });

  it('keeps step numbering absolute across phases, as Baking Mode counts it', () => {
    render(<InstructionList recipe={base} />);
    // "Bake at 250C" is the fourth instruction overall; grouping must not
    // restart the count at 01 inside its phase, or "step 4" would mean two
    // different things on two screens.
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('shows every instruction exactly once', () => {
    const { container } = render(<InstructionList recipe={base} />);
    // Grouping by phase must not drop or duplicate a step.
    expect(screen.getAllByRole('listitem')).toHaveLength(base.instructions.length);
    // Steps are read against the container's text rather than with getByText:
    // renderWithTimers splits a step into spans wherever it finds a duration,
    // so no single element holds the whole sentence.
    base.instructions.forEach((step) => {
      expect(container.textContent).toContain(step.slice(0, 20));
    });
  });

  it('renders nothing but its heading for a recipe with no instructions', () => {
    render(<InstructionList recipe={{ ...base, instructions: [] }} />);
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
