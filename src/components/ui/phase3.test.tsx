import { useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stars, StarRating } from './Stars';
import { Stamp } from './Stamp';
import { MarginNote } from './MarginNote';
import { DockedAction } from './DockedAction';

/* The primitives the recipe page and baking mode needed (UI overhaul Phase 3). */

describe('Stars', () => {
  it('reads as one value, and prints nothing for a bake with no rating', () => {
    const { rerender, container } = render(<Stars value={4} />);
    expect(screen.getByRole('img', { name: '4 of 5 stars' })).toBeInTheDocument();
    rerender(<Stars value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

function Rating() {
  const [value, setValue] = useState<number | null>(null);
  return <StarRating label="Stars" value={value} onChange={setValue} />;
}

describe('StarRating', () => {
  it('is a radio group reached once, moved by the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Rating />);
    expect(screen.getByRole('radiogroup', { name: 'Stars' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '4 stars' })).toHaveFocus();
    expect(screen.getAllByRole('radio').filter((r) => r.tabIndex === 0)).toHaveLength(1);
  });

  it('clears when the chosen star is pressed again: a bake need not be rated', async () => {
    const user = userEvent.setup();
    render(<Rating />);
    await user.click(screen.getByRole('radio', { name: '2 stars' }));
    await user.click(screen.getByRole('radio', { name: '2 stars' }));
    expect(screen.getAllByRole('radio').some((r) => r.getAttribute('aria-checked') === 'true')).toBe(false);
  });

  it('is a 44px target per star', () => {
    render(<Rating />);
    for (const star of screen.getAllByRole('radio')) expect(star).toHaveClass('h-11', 'w-11');
  });
});

describe('Stamp', () => {
  it('names the personal best, with its stars, and is pressed on only when fresh', () => {
    const { rerender } = render(<Stamp rating={4} />);
    expect(screen.getByRole('img', { name: 'Personal best' })).toHaveTextContent('Best★4');
    expect(screen.getByRole('img')).not.toHaveClass('stamp-thump');
    rerender(<Stamp rating={4} fresh />);
    expect(screen.getByRole('img')).toHaveClass('stamp-thump');
  });
});

describe('MarginNote', () => {
  it('is pencil, in the reading italic, with its lead', () => {
    render(<MarginNote lead="Next time">Ten minutes longer.</MarginNote>);
    const note = screen.getByText('Ten minutes longer.').closest('p')!;
    expect(note).toHaveClass('text-pencil', 'italic', 'font-prose');
    expect(note).toHaveTextContent('Next time: Ten minutes longer.');
  });
});

describe('DockedAction', () => {
  const observers: { cb: IntersectionObserverCallback }[] = [];
  const original = globalThis.IntersectionObserver;
  afterEach(() => {
    globalThis.IntersectionObserver = original;
    observers.length = 0;
  });

  function Docked() {
    const ref = useRef<HTMLButtonElement>(null);
    return (
      <>
        <button ref={ref} type="button">
          Start cooking
        </button>
        <DockedAction watch={ref}>
          <button type="button">Docked start</button>
        </DockedAction>
      </>
    );
  }

  it('appears only once the original has scrolled up off the screen', () => {
    globalThis.IntersectionObserver = vi.fn(function (this: unknown, cb: IntersectionObserverCallback) {
      observers.push({ cb });
      return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
    }) as unknown as typeof IntersectionObserver;
    render(<Docked />);
    const bar = screen.getByText('Docked start').parentElement!;
    expect(bar).toHaveAttribute('inert');
    const fire = (isIntersecting: boolean, top: number) =>
      act(() =>
        observers[0].cb([{ isIntersecting, boundingClientRect: { top } } as IntersectionObserverEntry], {} as IntersectionObserver),
      );
    fire(false, 900); // below the fold, not yet reached
    expect(bar).toHaveAttribute('inert');
    fire(false, -40); // scrolled away above
    expect(bar).not.toHaveAttribute('inert');
    fire(true, 100); // back in view
    expect(bar).toHaveAttribute('inert');
  });
});
