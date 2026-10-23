import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageTransition from '../components/PageTransition';
import RecipeHeader from '../components/RecipeHeader';
import { RecipePlate, RecipeTile } from '../components/ui';
import { photoName } from './sharedPhoto';
import { makeRecipe, renderScreen } from '../test/utils';

const RECIPE = makeRecipe({ _id: 'r1', title: 'Danish rye', imageUrls: ['https://example.com/rye.jpg'] });

// The recipe page reads from IndexedDB, so its hero arrives a moment later.
function RecipePage() {
  const { id } = useParams();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 20);
    return () => clearTimeout(t);
  }, []);
  return ready ? <RecipePlate src="https://example.com/rye.jpg" alt="Danish rye" size="hero" transitionName={photoName(id!)} /> : <p>Reading</p>;
}

const routes = (
  <Routes>
    <Route path="/" element={<RecipeTile recipe={RECIPE} />} />
    <Route path="/shared" element={<RecipeTile recipe={RECIPE} to="/r/danish-rye" />} />
    <Route path="/recipe/:id" element={<RecipePage />} />
    <Route path="/r/:slug" element={<p>Shared page</p>} />
  </Routes>
);

// PageTransition only where it is the subject: framer's exit never finishes in jsdom.
const renderCookbook = (entry = '/', { transition = false } = {}) =>
  render(
    <MemoryRouter initialEntries={[entry]}>{transition ? <PageTransition>{routes}</PageTransition> : routes}</MemoryRouter>,
  );

describe('the shared photograph, tile to recipe', () => {
  let namedBeforeUpdate: string | null;
  let heroAfterUpdate: Element | null;
  const startViewTransition = vi.fn((update: () => Promise<void>) => {
    namedBeforeUpdate = document.querySelector<HTMLElement>('[data-plate]')?.style.viewTransitionName ?? null;
    const finished = update().then(() => {
      heroAfterUpdate = document.querySelector('[data-photo="photo-r1"]');
    });
    return { finished };
  });

  beforeEach(() => {
    namedBeforeUpdate = null;
    heroAfterUpdate = null;
    startViewTransition.mockClear();
    Object.assign(document, { startViewTransition });
  });

  afterEach(() => {
    delete (document as { startViewTransition?: unknown }).startViewTransition;
    vi.restoreAllMocks();
  });

  it('names a recipe as a CSS identifier', () => {
    expect(photoName('01JABCDEF')).toBe('photo-01JABCDEF');
    expect(photoName('a.b/c d')).toBe('photo-a-b-c-d');
  });

  it("grows the tile's photograph into the recipe's, waiting for the page to draw it", async () => {
    renderCookbook();
    fireEvent.click(screen.getByRole('link'));
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    // The browser snapshots the tile under the recipe's name…
    expect(namedBeforeUpdate).toBe('photo-r1');
    // …and the update waits for the hero carrying the same name.
    await waitFor(() => expect(heroAfterUpdate).not.toBeNull());
  });

  it('swaps the page in place, leaving the movement to the browser', async () => {
    const { container } = renderCookbook('/', { transition: true });
    const page = container.firstElementChild;
    fireEvent.click(screen.getByRole('link'));
    await screen.findByRole('img', { name: 'Danish rye' });
    expect(container.firstElementChild).toBe(page);
  });

  it('navigates as it always did without the API', async () => {
    delete (document as { startViewTransition?: unknown }).startViewTransition;
    renderCookbook();
    fireEvent.click(screen.getByRole('link'));
    expect(await screen.findByText('Reading')).toBeInTheDocument();
  });

  it('never starts under reduced motion', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    renderCookbook();
    fireEvent.click(screen.getByRole('link'));
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(await screen.findByText('Reading')).toBeInTheDocument();
  });

  it('leaves a press with a modifier key to the plain link', () => {
    renderCookbook();
    // The browser would open a new tab; jsdom cannot, so stop it after the app has seen the press.
    document.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(screen.getByRole('link'), { ctrlKey: true });
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it('fades to a shared recipe, which has no hero of yours to grow into', async () => {
    renderCookbook('/shared');
    fireEvent.click(screen.getByRole('link'));
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(await screen.findByText('Shared page')).toBeInTheDocument();
  });

  it('only names the hero of a recipe in your own cookbook', () => {
    const { unmount } = renderScreen(<RecipeHeader recipe={RECIPE} ownRecipe={RECIPE} />);
    expect(document.querySelector('[data-photo="photo-r1"]')).not.toBeNull();
    unmount();
    renderScreen(<RecipeHeader recipe={RECIPE} />);
    expect(document.querySelector('[data-photo]')).toBeNull();
  });
});
