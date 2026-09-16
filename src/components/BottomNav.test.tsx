import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

const renderNav = (initialEntry = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BottomNav />
    </MemoryRouter>,
  );

describe('BottomNav', () => {
  it('renders exactly the four dock slots, not the previous five', () => {
    renderNav();
    ['Cookbook', 'Gallery', 'Pantry'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument();
    // The old dock's fifth slot was a "New Recipe" link in the bar itself —
    // it is now the floating action button instead, reachable by name.
    expect(screen.queryByText('New Recipe')).not.toBeInTheDocument();
  });

  it('offers Analytics, Grocery List, Notes and Settings only behind More', () => {
    renderNav();
    // The sheet stays mounted (for the slide transition) but inert while
    // closed, so its content exists in the DOM without being reachable.
    const sheet = screen.getByRole('dialog', { hidden: true });
    expect(sheet).toHaveAttribute('inert');

    fireEvent.click(screen.getByRole('button', { name: /more/i }));

    expect(sheet).not.toHaveAttribute('inert');
    ['Analytics', 'Grocery List', 'General Notes', 'Settings'].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
  });

  it('closes the More sheet from its own close button', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.getByRole('dialog')).toHaveClass('translate-y-full');
  });

  it('provides a floating action button to start a new recipe', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /new recipe/i })).toHaveAttribute('href', '/new');
  });

  it('hides entirely on the Baking Mode route so it never covers its controls', () => {
    renderNav('/recipe/abc123/bake');
    expect(screen.queryByText('Cookbook')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new recipe/i })).not.toBeInTheDocument();
  });
});
