import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AIReviewSheet from './AIReviewSheet';

const CURRENT = {
  title: 'Sourdough',
  description: 'A loaf.',
  prepTime: '20 mins',
  cookTime: '30 mins',
  servings: 4,
  tags: ['bread'],
  ingredients: [{ name: 'Flour', quantity: 500, unit: 'g' }],
  instructions: ['Mix.', 'Bake.'],
} as any;

describe('AIReviewSheet', () => {
  it('draws only the fields the model actually changed', async () => {
    render(
      <AIReviewSheet
        open
        current={CURRENT}
        proposed={{ title: '72-Hour Sourdough' } as any}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: /Proposed · 1 field/i })).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    // The model said nothing about these, so they are not a change.
    expect(screen.queryByText('Servings')).not.toBeInTheDocument();
    expect(screen.queryByText('Method')).not.toBeInTheDocument();
  });

  it('treats a field the model echoed back unchanged as no change at all', () => {
    render(
      <AIReviewSheet
        open
        current={CURRENT}
        proposed={{ title: 'Sourdough', servings: 8 } as any}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog', { name: /1 field/i })).toBeInTheDocument();
    expect(screen.getByText('Servings')).toBeInTheDocument();
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
  });

  it('shows both readings, so the current value is never guessed at', () => {
    render(
      <AIReviewSheet
        open
        current={CURRENT}
        proposed={{ title: '72-Hour Sourdough' } as any}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText('Proposed')).toBeInTheDocument();
    expect(screen.getByText('Sourdough')).toBeInTheDocument();
    expect(screen.getByText('72-Hour Sourdough')).toBeInTheDocument();
  });

  it('applies only what was kept, so a good title survives a bad ingredient list', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(
      <AIReviewSheet
        open
        current={CURRENT}
        proposed={
          {
            title: '72-Hour Sourdough',
            ingredients: [{ name: 'Plain flour', quantity: 1, unit: 'bag' }],
          } as any
        }
        onApply={onApply}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Reject the proposed Ingredients/i }));
    await user.click(screen.getByRole('button', { name: /Apply 1 change/i }));

    expect(onApply).toHaveBeenCalledWith({ title: '72-Hour Sourdough' });
  });

  it('cannot apply nothing', async () => {
    const user = userEvent.setup();
    render(
      <AIReviewSheet
        open
        current={CURRENT}
        proposed={{ title: '72-Hour Sourdough' } as any}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Reject the proposed Title/i }));
    expect(screen.getByRole('button', { name: /Nothing kept/i })).toBeDisabled();
  });

  it('says so plainly when the model proposed nothing', () => {
    render(
      <AIReviewSheet
        open
        current={CURRENT}
        proposed={{ title: 'Sourdough' } as any}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog', { name: /Nothing to change/i })).toBeInTheDocument();
    expect(screen.getByText(/proposed nothing different/i)).toBeInTheDocument();
  });

  it('reads ingredients and steps as lines rather than as JSON', () => {
    render(
      <AIReviewSheet
        open
        current={CURRENT}
        proposed={{ instructions: ['Mix.', 'Prove.', 'Bake.'] } as any}
        onApply={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('2. Prove.')).toBeInTheDocument();
    expect(screen.getAllByText('1. Mix.')).toHaveLength(2);
  });
});
