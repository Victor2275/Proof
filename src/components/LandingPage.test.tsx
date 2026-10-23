import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';
import { renderScreen } from '../test/utils';

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

const render = () =>
  renderScreen(
    <>
      <LandingPage />
      <Where />
    </>,
    { route: '/welcome' },
  );

beforeEach(() => localStorage.clear());

describe('the landing page', () => {
  it('says what the app does in a cook’s words, over a real loaf', () => {
    render();
    expect(screen.getByRole('heading', { level: 1, name: 'Bake it. Write it down. Bake it better.' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'A loaf of Danish rye bread on a board, three slices cut' })).toHaveAttribute('src', '/landing/danish-rye.webp');
    expect(screen.queryByText(/pattern running/)).not.toBeInTheDocument();
  });

  it('has one solid action, said at the top and at the foot, with the promise as a sentence', () => {
    render();
    const opens = screen.getAllByRole('button', { name: /Open my cookbook/ });
    expect(opens).toHaveLength(2);
    for (const b of opens) expect(b).toHaveClass('bg-accent');
    expect(screen.getByText('No account. It stays on your phone.')).toBeInTheDocument();
  });

  it('shows a recipe with a bake note on it, rather than describing one', () => {
    render();
    expect(screen.getByRole('img', { name: /example recipe page.*next time.*Proof an hour longer/i })).toBeInTheDocument();
  });

  it('leads with the bake log; hands-free and timers are secondary lines', () => {
    render();
    const headings = screen.getAllByRole('heading').map((h) => h.textContent);
    expect(headings.indexOf('Every bake, on the recipe it belongs to')).toBeLessThan(headings.indexOf('Timers in every step'));
  });

  it('enters the app and remembers that it has been seen', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getAllByRole('button', { name: /Open my cookbook/ })[0]);
    expect(localStorage.getItem('hasVisited')).toBe('true');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/);
  });
});
