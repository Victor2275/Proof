import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
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

  it('offers Analytics, Grocery List, Notes and Settings only behind More', async () => {
    renderNav();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /more/i }));

    expect(await screen.findByRole('dialog', { name: 'More' })).toBeInTheDocument();
    ['Analytics', 'Grocery List', 'General Notes', 'Settings'].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
  });

  it('closes the More sheet from its own close button, and on Escape', async () => {
    renderNav();
    const more = screen.getByRole('button', { name: /more/i });
    fireEvent.click(more);
    fireEvent.click(await screen.findByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(more);
    await screen.findByRole('dialog', { name: 'More' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('provides a floating action button to start a new recipe', () => {
    renderNav();
    expect(screen.getByRole('link', { name: /new recipe/i })).toHaveAttribute('href', '/new');
  });

  /*
   * Red is spent once per screen. The New Recipe key is the cookbook's main
   * action, so it is lit there — and only there, and only while nothing is
   * baking, because a running bake owns red outright.
   */
  describe('the New Recipe key', () => {
    afterEach(() => localStorage.removeItem('activeBake'));
    const key = () => screen.getByRole('link', { name: /new recipe/i });

    it('is lit on the cookbook while nothing is baking', () => {
      renderNav('/');
      expect(key()).toHaveClass('bg-signal');
    });

    it('stays unlit on every other screen, which has its own primary control', () => {
      renderNav('/gallery');
      expect(key()).not.toHaveClass('bg-signal');
      expect(key()).toHaveClass('bg-panel');
    });

    it('stays unlit on the cookbook while a bake is running', () => {
      localStorage.setItem(
        'activeBake',
        JSON.stringify({ recipeId: 'r1', recipeTitle: 'Rye', stepIndex: 2, startedAt: '2026-10-01T06:00:00.000Z' }),
      );
      renderNav('/');
      expect(key()).not.toHaveClass('bg-signal');
    });
  });

  it('hides entirely on the Baking Mode route so it never covers its controls', () => {
    renderNav('/recipe/abc123/bake');
    expect(screen.queryByText('Cookbook')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /new recipe/i })).not.toBeInTheDocument();
  });
});
