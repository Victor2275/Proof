import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Disclosure } from './Disclosure';
import { ToastProvider } from './Toast';
import { TOAST_MS, useToast } from './toastContext';
import { Sheet } from './Sheet';
import { PageHeader } from './PageHeader';
import { useUndoableAction } from '../../lib/useUndoableAction';

/* The primitives the shell needed (UI overhaul Phase 2). */

describe('Disclosure', () => {
  it('opens and closes, saying so with aria-expanded', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="Show 5 more" openSummary="Show fewer">
        <a href="#pasta">Pasta</a>
      </Disclosure>,
    );
    const toggle = screen.getByRole('button', { name: 'Show 5 more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps a closed body out of reach of the keyboard and of assistive technology', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="More">
        <a href="#pasta">Pasta</a>
      </Disclosure>,
    );
    const body = document.getElementById(screen.getByRole('button').getAttribute('aria-controls')!)!;
    expect(body).toHaveAttribute('inert');
    expect(screen.queryByRole('link', { name: 'Pasta' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(body).not.toHaveAttribute('inert');
    expect(screen.getByRole('link', { name: 'Pasta' })).toBeInTheDocument();
  });

  it('can be controlled', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Disclosure summary="More" open onOpenChange={onOpenChange}>
        body
      </Disclosure>,
    );
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Still open: the owner decides.
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'true');
  });
});

function ToastButton({ undo = vi.fn() }: { undo?: () => void }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show({ message: 'Recipe deleted', action: { label: 'Undo', onAction: undo } })}>
      Delete
    </button>
  );
}

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('reports politely, in a live region that is there before the first report', () => {
    render(<ToastProvider><ToastButton /></ToastProvider>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(region).toHaveTextContent('Recipe deleted');
  });

  it('runs its action from a real button, by keyboard, and goes', async () => {
    const user = userEvent.setup();
    const undo = vi.fn();
    render(<ToastProvider><ToastButton undo={undo} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    screen.getByRole('button', { name: 'Undo' }).focus();
    await user.keyboard('{Enter}');
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Recipe deleted')).not.toBeInTheDocument();
  });

  it('leaves after six seconds', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastButton /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    act(() => vi.advanceTimersByTime(TOAST_MS - 100));
    expect(screen.getByText('Recipe deleted')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText('Recipe deleted')).not.toBeInTheDocument();
  });

  it('waits while the pointer is over it or focus is inside it', () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastButton /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const undo = screen.getByRole('button', { name: 'Undo' });
    fireEvent.pointerEnter(undo.parentElement!);
    act(() => vi.advanceTimersByTime(TOAST_MS * 3));
    expect(screen.getByText('Recipe deleted')).toBeInTheDocument();
    fireEvent.pointerLeave(undo.parentElement!);
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(screen.queryByText('Recipe deleted')).not.toBeInTheDocument();
  });

  it('shows one report at a time, the newest', () => {
    render(<ToastProvider><ToastButton /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getAllByText('Recipe deleted')).toHaveLength(1);
  });

  it('is a quiet no-op outside a provider', () => {
    render(<ToastButton />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Delete' }))).not.toThrow();
  });
});

function Undoable({ run, undo }: { run: () => Promise<unknown>; undo: () => Promise<unknown> }) {
  const act = useUndoableAction();
  return (
    <button type="button" onClick={() => void act({ message: 'Bake deleted', run, undo })}>
      Delete bake
    </button>
  );
}

describe('useUndoableAction', () => {
  it('acts at once, then offers Undo, which runs the inverse', async () => {
    const user = userEvent.setup();
    const run = vi.fn().mockResolvedValue(undefined);
    const undo = vi.fn().mockResolvedValue(undefined);
    render(<ToastProvider><Undoable run={run} undo={undo} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: 'Delete bake' }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Bake deleted')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('says the action failed instead of offering to undo it', async () => {
    const user = userEvent.setup();
    const run = vi.fn().mockRejectedValue(new Error('The device is out of space.'));
    const undo = vi.fn();
    render(<ToastProvider><Undoable run={run} undo={undo} /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: 'Delete bake' }));
    expect(await screen.findByText('The device is out of space.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });
});

function DetentSheet({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose();
        setOpen(false);
      }}
      title="New recipe"
      placement="bottom"
      detents
    >
      <a href="#write">Write it</a>
    </Sheet>
  );
}

describe('Sheet detents', () => {
  it('opens at half height, and its grabber is a button that cycles the detents', async () => {
    const user = userEvent.setup();
    render(<DetentSheet />);
    const dialog = await screen.findByRole('dialog', { name: 'New recipe' });
    expect(dialog.style.height).toContain('50dvh');
    await user.click(screen.getByRole('button', { name: 'Expand sheet' }));
    expect(dialog.style.height).toContain('92dvh');
    await user.click(screen.getByRole('button', { name: 'Shrink sheet' }));
    expect(dialog.style.height).toContain('50dvh');
  });

  it('always has a visible Done', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DetentSheet onClose={onClose} />);
    await user.click(await screen.findByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when dragged down past a third of the screen, and keeps focus inside while dragged', async () => {
    const onClose = vi.fn();
    render(<DetentSheet onClose={onClose} />);
    const grabber = await screen.findByRole('button', { name: 'Expand sheet' });
    grabber.focus();
    fireEvent.pointerDown(grabber, { clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(grabber, { clientY: 500, pointerId: 1 });
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    fireEvent.pointerUp(grabber, { clientY: 700, pointerId: 1 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('snaps to the nearer detent when let go', async () => {
    render(<DetentSheet />);
    const grabber = await screen.findByRole('button', { name: 'Expand sheet' });
    // Dragged up by most of the screen: it rests nearly full.
    fireEvent.pointerDown(grabber, { clientY: 600, pointerId: 1 });
    fireEvent.pointerUp(grabber, { clientY: 300, pointerId: 1 });
    expect(screen.getByRole('dialog').style.height).toContain('92dvh');
  });

  it('leaves a sheet without detents as it was: a close control, no resizing', async () => {
    render(
      <Sheet open onClose={() => {}} title="Plain" placement="bottom">
        body
      </Sheet>,
    );
    await screen.findByRole('dialog', { name: 'Plain' });
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expand sheet/i })).not.toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('names the page as its one heading, with its controls beside it', () => {
    render(<PageHeader title="Bakes" subtitle="17 bakes · 6 recipes" actions={<button type="button">Log bake</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bakes' })).toBeInTheDocument();
    expect(screen.getByText('17 bakes · 6 recipes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log bake' })).toBeInTheDocument();
  });
});
