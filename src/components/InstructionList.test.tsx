import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import InstructionList from './InstructionList';
import StepText from './StepText';
import { findTimers } from '../lib/stepTimers';
import { bakePhases, printedSections } from '../lib/method';

const items = () => screen.getAllByRole('listitem');

describe('the method', () => {
  it("prints the recipe's own headings as subheads, not as numbered steps", () => {
    render(<InstructionList recipe={{ title: 'Cheesecake', instructions: ['--- Crust ---', 'Press.', '--- Cheesecake ---', 'Beat.', 'Bake.'] }} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Crust' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Cheesecake' })).toBeInTheDocument();
    expect(items().map((li) => li.getAttribute('value'))).toEqual(['1', '2', '3']);
    expect(screen.queryByText(/---/)).not.toBeInTheDocument();
  });

  it('prints every step in full, with no "Read more"', () => {
    const long = 'Beat the cream cheese until smooth. '.repeat(10).trim();
    render(<InstructionList recipe={{ title: 'X', instructions: [long] }} />);
    expect(screen.getByText(long)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /read more/i })).not.toBeInTheDocument();
  });

  it('gives a soup no invented headings, and a proven bread its phases', () => {
    expect(printedSections(['Chop the onions.', 'Simmer for 20 minutes.']).map((s) => s.heading)).toEqual([null]);
    const bread = ['Mix the flour, water and yeast.', 'Let the dough rise until doubled.', 'Shape into a boule.', 'Bake for 40 minutes.'];
    expect(printedSections(bread).map((s) => s.heading)).toEqual(['Mix', 'Bulk', 'Shape', 'Bake']);
  });

  it('decodes what an import left behind', () => {
    render(<InstructionList recipe={{ title: 'X', instructions: ['Don&#39;t over-beat ((it)).'] }} />);
    expect(screen.getByText("Don't over-beat (it).")).toBeInTheDocument();
  });

  it("pencils the last bake's note beside its step", () => {
    render(
      <InstructionList
        recipe={{ title: 'X', instructions: ['Mix.', 'Bake.'] }}
        marginNotes={new Map([[1, { stepIndex: 1, text: 'Pulled at 55 min.', at: '2026-10-17T10:00:00.000Z' }]])}
      />,
    );
    expect(items()[1]).toHaveTextContent('Oct 17: Pulled at 55 min.');
    expect(items()[0]).not.toHaveTextContent('Pulled');
  });

  it('offers a sub-recipe as "See also", opening it', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    render(
      <InstructionList
        recipe={{ title: 'Tart', instructions: ['Fill with pastry cream.'], instructionLinks: [{ stepIndex: 0, recipeId: 'pc', recipeTitle: 'Pastry cream' }] }}
        onOpenSubRecipe={open}
      />,
    );
    await user.click(screen.getByRole('button', { name: /See also: Pastry cream/ }));
    expect(open).toHaveBeenCalledWith('pc');
  });
});

describe('baking mode phases', () => {
  it("follow the recipe's own sections, over real steps only", () => {
    expect(bakePhases(['--- Crust ---', 'Press.', '--- Filling ---', 'Beat.', 'Bake.'])).toEqual([
      { id: 'section-0', label: 'Crust', stepIndices: [1] },
      { id: 'section-1', label: 'Filling', stepIndices: [3, 4] },
    ]);
  });
});

describe('times in a step', () => {
  it('finds each time as one timer, a range starting at its shorter end', () => {
    expect(findTimers('Bake for 50–60 min, then rest 1.5 hours and 30 seconds.')).toEqual([
      expect.objectContaining({ label: '50–60 min', seconds: 3000 }),
      expect.objectContaining({ label: '1.5 hours', seconds: 5400 }),
      expect.objectContaining({ label: '30 seconds', seconds: 30 }),
    ]);
    expect(findTimers('2 medium eggs')).toEqual([]);
  });

  it('turns them into butter chips that start a timer named for the step', () => {
    const spy = vi.spyOn(window, 'dispatchEvent');
    render(<StepText text="Bake for 10 minutes." name="Step 3" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start a 10 minutes timer' }));
    const event = spy.mock.calls.map((c) => c[0]).find((e) => e.type === 'add-timer') as CustomEvent;
    expect(event.detail).toEqual({ durationSecs: 600, name: 'Step 3 · 10 minutes', forceStart: true });
    expect(screen.getByRole('button')).toHaveClass('bg-butter');
    spy.mockRestore();
  });

  it('leaves a step with no time as plain words', () => {
    render(<StepText text="Mix the dough." name="Step 1" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
