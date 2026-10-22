import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Panel, PanelRow } from './Panel';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { BackButton } from './BackButton';
import { Segmented } from './Segmented';
import { Field } from './Field';
import { Readout } from './Readout';
import { StepRow } from './StepRow';
import { InstrumentRow } from './InstrumentRow';
import { Meter } from './Meter';
import { PublishState } from './PublishState';
import { derivePhases } from '../../lib/phases';

const PHASES = derivePhases([
  'Feed the levain and leave for 6 hours.',
  'Mix the flour and water, then add the salt.',
  'Bulk ferment for 4 hours with a stretch and fold each hour.',
  'Shape into a boule.',
  'Retard in the banneton overnight.',
  'Bake at 250C for 20 minutes.',
]);

describe('Readout', () => {
  it('announces its caption together with its value', () => {
    render(<Readout value="220" unit="g" label="Flour" />);
    expect(screen.getByRole('img', { name: 'Flour 220 g' })).toBeInTheDocument();
  });

  it('reads as one value to a screen reader, not as separate pieces', () => {
    render(<Readout value="12:40" unit="min" />);
    expect(screen.getByRole('img', { name: '12:40 min' })).toBeInTheDocument();
  });

  it('prints a unit written in capitals the way a cookbook does', () => {
    const { container } = render(<Readout value="45" unit="MIN" />);
    expect(container).toHaveTextContent('45min');
    expect(container).not.toHaveTextContent('MIN');
  });

  it('keeps a unit with a symbol as written', () => {
    const { container } = render(<Readout value="250" unit="°C" />);
    expect(container).toHaveTextContent('°C');
  });

  it('sets the figure in tabular numerals so a changing value never shifts', () => {
    const { container } = render(<Readout value="9:59" />);
    expect(container.querySelector('.tabular-nums')).toHaveTextContent('9:59');
  });
});

describe('StepRow', () => {
  it('draws one segment per phase', () => {
    render(<StepRow phases={PHASES} />);
    expect(screen.getByRole('img').children).toHaveLength(PHASES.length);
  });

  it('marks exactly one segment as running now', () => {
    const { container } = render(<StepRow phases={PHASES} activeStep={2} />);
    expect(container.querySelectorAll('.bg-key-now')).toHaveLength(1);
  });

  it('draws the whole line at rest when no bake is running', () => {
    const { container } = render(<StepRow phases={PHASES} />);
    expect(container.querySelectorAll('.bg-key-unlit')).toHaveLength(PHASES.length);
    expect(container.querySelectorAll('.bg-key-now')).toHaveLength(0);
  });

  it('draws a line rather than nothing for a recipe with no phases', () => {
    render(<StepRow phases={[]} />);
    expect(screen.getByLabelText('No phases yet')).toBeInTheDocument();
  });

  it('exposes phases as 44px buttons when selectable', async () => {
    const onSelect = vi.fn();
    render(<StepRow phases={PHASES} activeStep={2} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(PHASES.length);
    expect(buttons[0]).toHaveClass('h-11');
    await userEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith(PHASES[0]);
  });

  it('marks the running phase for assistive technology', () => {
    render(<StepRow phases={PHASES} activeStep={2} onSelect={vi.fn()} />);
    expect(screen.getByText(/running now/)).toBeInTheDocument();
  });

  it('drops labels on the mini line but keeps the segments', () => {
    const { container } = render(<StepRow phases={PHASES} size="mini" />);
    expect(screen.queryByText('Levain')).not.toBeInTheDocument();
    expect(container.querySelector('[role="img"]')?.children).toHaveLength(PHASES.length);
  });
});

describe('Button', () => {
  it('meets the 44px touch target at default size', () => {
    render(<Button>Run</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11');
  });

  it('answers the press like every other control', () => {
    render(<Button>Run</Button>);
    expect(screen.getByRole('button')).toHaveClass('pressable');
  });

  it('reports engaged and busy state to assistive technology', () => {
    const { rerender } = render(<Button engaged>Baker's %</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    rerender(<Button busy>Saving</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('defaults to type=button so it cannot submit a form by accident', () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('fills only the primary with the accent', () => {
    const { rerender } = render(<Button variant="primary">Start cooking</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-accent');
    for (const variant of ['secondary', 'tonal', 'ghost', 'danger'] as const) {
      rerender(<Button variant={variant}>Other</Button>);
      expect(screen.getByRole('button')).not.toHaveClass('bg-accent');
    }
  });
});

describe('IconButton', () => {
  it('is named in words and offers the same words as a tooltip', () => {
    render(<IconButton label="Share" icon={<svg />} />);
    const button = screen.getByRole('button', { name: 'Share' });
    expect(button).toHaveAttribute('title', 'Share');
  });

  it('is a 44px target whatever the glyph', () => {
    render(<IconButton label="More" icon={<svg />} />);
    expect(screen.getByRole('button', { name: 'More' })).toHaveClass('h-11', 'w-11');
  });

  it('announces a toggle only when it is one', () => {
    const { rerender } = render(<IconButton label="Share" icon={<svg />} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
    rerender(<IconButton label="Favourite" icon={<svg />} pressed />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('BackButton', () => {
  function Recipe() {
    return <BackButton to="/cookbook/dessert" label="Dessert" />;
  }

  it('is a link to the parent, named for where it goes', () => {
    render(
      <MemoryRouter initialEntries={['/recipe/1']}>
        <Recipe />
      </MemoryRouter>,
    );
    const back = screen.getByRole('link', { name: 'Back to Dessert' });
    expect(back).toHaveAttribute('href', '/cookbook/dessert');
    expect(back).toHaveTextContent('Dessert');
  });

  it('follows the link to the parent when the app has no history, as on a shared link', async () => {
    render(
      <MemoryRouter initialEntries={['/recipe/1']}>
        <Routes>
          <Route path="/recipe/:id" element={<Recipe />} />
          <Route path="/cookbook/dessert" element={<p>Dessert chapter</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('link', { name: 'Back to Dessert' }));
    expect(screen.getByText('Dessert chapter')).toBeInTheDocument();
  });

  it('goes back through history when there is some, so the last screen keeps its place', async () => {
    function Search() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate('/recipe/1')}>
          Open
        </button>
      );
    }
    render(
      <MemoryRouter initialEntries={['/search']}>
        <Routes>
          <Route path="/search" element={<Search />} />
          <Route path="/recipe/:id" element={<Recipe />} />
          <Route path="/cookbook/dessert" element={<p>Dessert chapter</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('link', { name: 'Back to Dessert' }));
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
    expect(screen.queryByText('Dessert chapter')).not.toBeInTheDocument();
  });
});

describe('Segmented', () => {
  function Contents({ onChange = vi.fn() }: { onChange?: (v: string) => void }) {
    const [view, setView] = useState<'chapters' | 'az'>('chapters');
    return (
      <Segmented
        label="Contents view"
        value={view}
        options={[
          { value: 'chapters', label: 'Chapters' },
          { value: 'az', label: 'A–Z' },
        ]}
        onChange={(next) => {
          setView(next);
          onChange(next);
        }}
      />
    );
  }

  it('is a radio group with exactly one option checked', () => {
    render(<Contents />);
    expect(screen.getByRole('radiogroup', { name: 'Contents view' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Chapters' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'A–Z' })).toHaveAttribute('aria-checked', 'false');
  });

  it('changes the choice on a tap', async () => {
    const onChange = vi.fn();
    render(<Contents onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'A–Z' }));
    expect(onChange).toHaveBeenCalledWith('az');
    expect(screen.getByRole('radio', { name: 'A–Z' })).toHaveAttribute('aria-checked', 'true');
  });

  it('is reached by Tab once and moved with the arrow keys', async () => {
    render(<Contents />);
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Chapters' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    const az = screen.getByRole('radio', { name: 'A–Z' });
    expect(az).toHaveFocus();
    expect(az).toHaveAttribute('aria-checked', 'true');
  });

  it('does not report a change when the chosen option is tapped again', async () => {
    const onChange = vi.fn();
    render(<Contents onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Chapters' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('labels the input and wires the unit', () => {
    render(<Field label="Flour" unit="g" defaultValue="500" />);
    expect(screen.getByLabelText('Flour')).toHaveValue('500');
    expect(screen.getByText('g')).toBeInTheDocument();
  });

  it('associates an error with the input rather than leaving it floating', () => {
    render(<Field label="Hydration" error="Must be between 50 and 100. Try 78." />);
    const input = screen.getByLabelText('Hydration');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      'Must be between 50 and 100. Try 78.',
    );
  });

  it('keeps the label available when hidden visually', () => {
    render(<Field label="Search" hideLabel />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });
});

describe('Panel', () => {
  it('sets its title as a heading, not on a header bar', () => {
    render(
      <Panel title="Totals" lit>
        <PanelRow label="Bakes logged" value="17" />
      </Panel>,
    );
    expect(screen.getByRole('heading', { name: 'Totals' })).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('edges itself in the accent only when active', () => {
    const { container, rerender } = render(<Panel title="Bake">body</Panel>);
    expect(container.querySelector('section')).toHaveClass('border-rule');
    rerender(
      <Panel title="Bake" active>
        body
      </Panel>,
    );
    expect(container.querySelector('section')).toHaveClass('border-accent');
  });
});

describe('InstrumentRow', () => {
  const items = [
    { id: '1', label: 'Flour', lit: true, title: 'Bread flour' },
    { id: '2', label: 'Salt', lit: false, title: 'Fine sea salt' },
  ];

  it('states present and absent in words, not colour alone', () => {
    render(<InstrumentRow items={items} legend="In pantry" />);
    expect(screen.getByText(/Bread flour — In pantry/)).toBeInTheDocument();
    expect(screen.getByText(/Fine sea salt — not in pantry/)).toBeInTheDocument();
  });

  it('names the row for assistive technology', () => {
    render(<InstrumentRow items={items} legend="In pantry" />);
    expect(screen.getByRole('list', { name: 'In pantry' })).toBeInTheDocument();
  });
});

describe('PublishState', () => {
  it('says where a recipe stands in words', () => {
    const { rerender } = render(<PublishState state="local" />);
    expect(screen.getByText('Private · only on this device')).toBeInTheDocument();
    rerender(<PublishState state="edits" />);
    expect(screen.getByText('Public · edits not yet shared')).toBeInTheDocument();
  });
});

describe('Meter', () => {
  const fill = (container: HTMLElement) => {
    const bar = container.querySelector('[role="meter"]')?.firstElementChild;
    if (!(bar instanceof HTMLElement)) throw new Error('meter has no fill');
    return bar.style.width;
  };

  it('exposes a real meter role with its bounds', () => {
    render(<Meter value={78} max={100} label="Hydration" />);
    const meter = screen.getByRole('meter', { name: 'Hydration' });
    expect(meter).toHaveAttribute('aria-valuenow', '78');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps out-of-range values instead of overflowing the track', () => {
    const { container } = render(<Meter value={500} max={100} />);
    expect(fill(container)).toBe('100%');
  });

  it('stays ink with no hot end when it was not given one', () => {
    const { container } = render(<Meter value={20} max={20} />);
    expect(container.querySelector('.bg-accent')).toBeNull();
    expect(container.querySelector('.bg-ink-2')).not.toBeNull();
  });

  it('turns paprika past a hot end it was given', () => {
    const { container } = render(<Meter value={280} max={280} hotAt={0.85} />);
    expect(container.querySelector('.bg-accent')).not.toBeNull();
  });

  it('shows a real but tiny value rather than reading empty', () => {
    // 3 of 203 is about 1.5%. "Some" and "none" are the difference this
    // reading exists to show.
    const { container } = render(<Meter value={3} max={203} />);
    expect(parseFloat(fill(container))).toBeGreaterThan(0);
  });

  it('stays empty at zero', () => {
    const { container } = render(<Meter value={0} max={203} />);
    expect(fill(container)).toBe('0%');
  });

  it('survives a zero maximum without dividing by zero', () => {
    const { container } = render(<Meter value={0} max={0} />);
    expect(fill(container)).toBe('0%');
  });
});
