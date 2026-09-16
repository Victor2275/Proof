import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { startActiveBake, clearActiveBake } from '../lib/activeBake';

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={['/gallery']}>
      <Sidebar />
    </MemoryRouter>,
  );

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders every app section', () => {
    renderSidebar();
    ['My Cookbook', 'Gallery', 'Analytics', 'Pantry', 'Grocery List', 'General Notes', 'Settings'].forEach(
      (label) => expect(screen.getByText(label)).toBeInTheDocument(),
    );
  });

  it('marks the current route with aria-current, not colour alone', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /gallery/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /my cookbook/i })).not.toHaveAttribute('aria-current');
  });

  it('shows no chase-light strip when nothing is baking', () => {
    renderSidebar();
    expect(screen.queryByText(/resume/i)).not.toBeInTheDocument();
  });

  it('shows the running bake and a way back into it from anywhere in the app', () => {
    startActiveBake('r1', 'Country Loaf', 2);
    renderSidebar();
    expect(screen.getByText('Country Loaf')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resume/i })).toHaveAttribute('href', '/recipe/r1/bake');
    clearActiveBake();
  });
});
