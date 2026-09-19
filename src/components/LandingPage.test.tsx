import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';
import NotFound from './NotFound';

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  navigate.mockClear();
});

describe('LandingPage', () => {
  it('leads with the thesis rather than with a feature list', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'Proof', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/A recipe is a pattern/i)).toBeInTheDocument();
  });

  /*
   * The page's whole argument is that the claim is demonstrated rather than
   * asserted, and the demonstration has to be the app's own derivation — not a
   * hand-placed row that would keep claiming a levain after the parser stopped
   * finding one.
   */
  it('derives its demonstration from the real phase vocabulary', () => {
    renderLanding();
    // The row reports, it is not operated, so it is an image naming its phases
    // rather than a group of controls.
    const row = screen.getByRole('img', { name: /A sourdough bake, running/i });
    expect(row).toHaveAccessibleName(/Levain.*Autolyse.*Bulk.*Shape.*Proof.*Bake/i);
    expect(screen.getAllByText('Levain').length).toBeGreaterThan(0);
  });

  it('enters the app and remembers that it has been seen', async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getByRole('button', { name: /Open the cookbook/i }));
    expect(localStorage.getItem('hasVisited')).toBe('true');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('spends signal red on the running phase and not on the button', () => {
    renderLanding();
    const cta = screen.getByRole('button', { name: /Open the cookbook/i });
    // Outlined, not filled: the chase light is the page's one "now".
    expect(cta.className).not.toMatch(/bg-signal/);
  });

  describe('the chase light', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('advances on its own', () => {
      renderLanding();
      const first = screen.getByText('Levain', { selector: '.font-faceplate' });
      expect(first).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(screen.getByText('Autolyse', { selector: '.font-faceplate' })).toBeInTheDocument();
    });

    it('holds still under reduced motion', () => {
      // The global CSS rule collapses animation, not a timer, so the page has
      // to check for itself.
      vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
      renderLanding();

      act(() => {
        vi.advanceTimersByTime(1600 * 4);
      });
      expect(screen.getByText('Levain', { selector: '.font-faceplate' })).toBeInTheDocument();
    });
  });
});

describe('NotFound', () => {
  it('reads as an unlit instrument rather than an apology', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: /Status 404/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to the cookbook/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('keeps the readout neutral, because nothing here is running', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('polygon.fill-signal')).toHaveLength(0);
    expect(container.querySelectorAll('polygon.fill-ink').length).toBeGreaterThan(0);
  });
});
