import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Menu, MenuItem } from './Menu';

function Harness({ onCopy = vi.fn() }: { onCopy?: () => void }) {
  return (
    <MemoryRouter>
      <Menu label="Share" trigger={(props) => <button {...props}>Share</button>}>
        <MenuItem onSelect={onCopy}>Copy link</MenuItem>
        <MenuItem onSelect={vi.fn()}>QR code</MenuItem>
        <MenuItem to="/elsewhere">Open</MenuItem>
      </Menu>
      <button>Outside</button>
    </MemoryRouter>
  );
}

describe('Menu', () => {
  it('opens from its trigger and says so', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Share' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Share' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy link' })).toHaveFocus());
  });

  it('walks its items with the arrow keys, wrapping at either end', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Copy link' })).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'QR code' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Open' })).toHaveFocus();
  });

  // The three hand-rolled dropdowns it replaced stayed open until clicked again.
  it('closes on Escape and hands focus back to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Share' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when anything else is pressed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('runs the chosen action and closes', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<Harness onCopy={onCopy} />);
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copy link' }));
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
