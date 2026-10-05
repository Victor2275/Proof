import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import OnboardingModal from './OnboardingModal';

describe('OnboardingModal', () => {
  it('is a dialog that names where in the tour you are', async () => {
    render(<OnboardingModal open onClose={vi.fn()} />);
    expect(await screen.findByRole('dialog', { name: /getting started · 1 of 3/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Browse & Discover' })).toBeInTheDocument();
  });

  it('draws its progress as a step row, not a pager of dots', () => {
    render(<OnboardingModal open onClose={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Tour: Browse, Cook, Log' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('walks forward and back, and finishes on the last screen', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<OnboardingModal open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Cook Hands-Free' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Browse & Discover' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: "Let's Bake" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // It used to be a scrim with no way out by keyboard.
  it('can be left with Escape or skipped', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<OnboardingModal open onClose={onClose} />);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
