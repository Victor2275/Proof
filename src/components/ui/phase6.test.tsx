import { useState } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MarginNote, Switch } from '.';
import NotFound from '../NotFound';
import { renderScreen } from '../../test/utils';
import { Routes, Route, useLocation } from 'react-router-dom';

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}

describe('Switch', () => {
  it('is a switch named by its label, described by its line, that flips on press', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch label="Spoken timers" description="Say it aloud." checked={on} onChange={setOn} />;
    }
    renderScreen(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Spoken timers' });
    expect(sw).toHaveAccessibleDescription('Say it aloud.');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });
});

describe('MarginNote', () => {
  it("wraps the note in .hand, so Settings can set it in the baker's hand", () => {
    renderScreen(<MarginNote lead="Next time">Less salt.</MarginNote>);
    expect(screen.getByText('Less salt.')).toHaveClass('hand');
  });
});

describe('404', () => {
  it("says the page isn't in this book and hands a search to the cookbook", async () => {
    const user = userEvent.setup();
    renderScreen(
      <>
        <Routes>
          <Route path="/nope" element={<NotFound />} />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </>,
      { route: '/nope' },
    );
    expect(screen.getByRole('heading', { level: 1, name: "That page isn't in this book." })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the cookbook' })).toHaveAttribute('href', '/');
    await user.type(screen.getByRole('searchbox', { name: 'Look for a recipe' }), 'rye loaf{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/?q=rye%20loaf');
  });
});
