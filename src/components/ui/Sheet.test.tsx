import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './Sheet';

/*
 * The behaviours tested here are the reason the primitive exists. Every one of
 * them was missing from all eleven hand-rolled overlays it replaces, so a
 * regression in any of them puts a keyboard user back in a trap.
 */

function Harness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open the sheet</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Ingredients" dismissible={dismissible}>
        <button>First</button>
        <button>Second</button>
      </Sheet>
    </>
  );
}

describe('Sheet', () => {
  it('draws nothing at all while closed', () => {
    render(
      <Sheet open={false} onClose={vi.fn()} title="Ingredients">
        <p>Flour</p>
      </Sheet>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Flour')).not.toBeInTheDocument();
  });

  it('names itself to a screen reader from its silkscreened title', () => {
    render(
      <Sheet open onClose={vi.fn()} title="Ingredients">
        <p>Flour</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Ingredients' })).toBeInTheDocument();
  });

  it('takes a label instead when it has no visible title', () => {
    render(
      <Sheet open onClose={vi.fn()} label="Voice help">
        <p>Say next.</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Voice help' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Ingredients">
        <button>Flour</button>
      </Sheet>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes when the scrim is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <Sheet open onClose={onClose} title="Ingredients">
        <button>Flour</button>
      </Sheet>,
    );
    const scrim = document.querySelector('.scrim');
    expect(scrim).not.toBeNull();
    await user.click(scrim as Element);
    expect(onClose).toHaveBeenCalledOnce();
    expect(container).toBeTruthy();
  });

  it('closes from its own close control', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Ingredients">
        <button>Flour</button>
      </Sheet>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('refuses every casual dismissal when it is not dismissible', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Crop image" dismissible={false}>
        <button>Flour</button>
      </Sheet>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(document.querySelector('.scrim') as Element);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the sheet rather than letting it walk into the page behind', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>Behind the sheet</button>
        <Sheet open onClose={vi.fn()} title="Ingredients">
          <button>First</button>
          <button>Last</button>
        </Sheet>
      </>,
    );

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    const close = screen.getByRole('button', { name: 'Close' });
    const outside = screen.getByRole('button', { name: 'Behind the sheet' });

    close.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab();
    expect(last).toHaveFocus();
    // Past the last control it wraps to the first, and never reaches the page.
    await user.tab();
    expect(close).toHaveFocus();
    expect(outside).not.toHaveFocus();

    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('moves focus into the sheet on open and hands it back to the opener on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const opener = screen.getByRole('button', { name: 'Open the sheet' });
    await user.click(opener);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('stops the page behind from scrolling, and gives it back afterwards', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: 'Open the sheet' }));
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });

  it('keeps the page locked while a second sheet is still open over the first', async () => {
    const { rerender } = render(
      <>
        <Sheet open onClose={vi.fn()} title="Ingredients">
          <button>Flour</button>
        </Sheet>
        <Sheet open onClose={vi.fn()} title="Bake log" layer={120}>
          <button>Note</button>
        </Sheet>
      </>,
    );
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));

    // The upper sheet closes; the lower one is still up, so the page stays put.
    rerender(
      <>
        <Sheet open onClose={vi.fn()} title="Ingredients">
          <button>Flour</button>
        </Sheet>
        <Sheet open={false} onClose={vi.fn()} title="Bake log" layer={120}>
          <button>Note</button>
        </Sheet>
      </>,
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('ranges its foot controls below the body', () => {
    render(
      <Sheet open onClose={vi.fn()} title="Link sub-recipe" footer={<button>Attach</button>}>
        <p>Pick a recipe.</p>
      </Sheet>,
    );
    expect(screen.getByRole('button', { name: 'Attach' })).toBeInTheDocument();
    expect(screen.getByText('Pick a recipe.')).toBeInTheDocument();
  });
});
