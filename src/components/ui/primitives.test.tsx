import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Panel, PanelRow } from './Panel';
import { Button } from './Button';
import { Field } from './Field';
import { SegmentReadout } from './SegmentReadout';
import { StepRow } from './StepRow';
import { InstrumentRow } from './InstrumentRow';
import { Meter } from './Meter';
import { derivePhases } from '../../lib/phases';

const PHASES = derivePhases([
  'Feed the levain and leave for 6 hours.',
  'Mix the flour and water, then add the salt.',
  'Bulk ferment for 4 hours with a stretch and fold each hour.',
  'Shape into a boule.',
  'Retard in the banneton overnight.',
  'Bake at 250C for 20 minutes.',
]);

describe('SegmentReadout', () => {
  it('announces its silkscreened caption together with its value', () => {
    render(<SegmentReadout value="220" unit="G" label="Flour" />);
    expect(screen.getByRole('img', { name: 'Flour 220 G' })).toBeInTheDocument();
  });

  it('reads as one value to a screen reader, not a row of glyphs', () => {
    render(<SegmentReadout value="12:40" unit="MIN" />);
    expect(screen.getByRole('img', { name: '12:40 MIN' })).toBeInTheDocument();
  });

  it('draws the unlit segments as well as the lit ones', () => {
    const { container } = render(<SegmentReadout value="1" />);
    // A "1" lights two segments but still occupies the full seven-cell mask:
    // absence is designed, so all seven polygons are present.
    const polygons = container.querySelectorAll('polygon');
    expect(polygons).toHaveLength(7);
    expect(container.querySelectorAll('polygon.fill-signal')).toHaveLength(2);
    expect(container.querySelectorAll('polygon.fill-key-unlit')).toHaveLength(5);
  });

  it('keeps digit width stable regardless of value', () => {
    const { container: one } = render(<SegmentReadout value="111" />);
    const { container: eight } = render(<SegmentReadout value="888" />);
    expect(one.querySelectorAll('svg')).toHaveLength(3);
    expect(eight.querySelectorAll('svg')).toHaveLength(3);
  });
});

describe('StepRow', () => {
  it('renders one key per phase', () => {
    render(<StepRow phases={PHASES} />);
    const row = screen.getByRole('img');
    expect(row.children).toHaveLength(PHASES.length);
  });

  it('lights exactly one key as now', () => {
    const { container } = render(<StepRow phases={PHASES} activeStep={2} />);
    expect(container.querySelectorAll('.bg-key-now')).toHaveLength(1);
  });

  it('renders entirely unlit when no bake is running', () => {
    const { container } = render(<StepRow phases={PHASES} />);
    expect(container.querySelectorAll('.bg-key-unlit')).toHaveLength(PHASES.length);
    expect(container.querySelectorAll('.bg-key-now')).toHaveLength(0);
  });

  it('shows dark keys rather than nothing for a recipe with no phases', () => {
    render(<StepRow phases={[]} />);
    expect(screen.getByLabelText('No phases yet')).toBeInTheDocument();
  });

  it('exposes phases as buttons when selectable', async () => {
    const onSelect = vi.fn();
    render(<StepRow phases={PHASES} activeStep={2} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(PHASES.length);
    await userEvent.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith(PHASES[0]);
  });

  it('marks the running phase for assistive technology', () => {
    render(<StepRow phases={PHASES} activeStep={2} onSelect={vi.fn()} />);
    expect(screen.getByText(/running now/)).toBeInTheDocument();
  });

  it('drops labels on the mini row but keeps the keys', () => {
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
});

describe('Field', () => {
  it('labels the input and wires the unit', () => {
    render(<Field label="Flour" unit="G" defaultValue="500" />);
    expect(screen.getByLabelText('Flour')).toHaveValue('500');
    expect(screen.getByText('G')).toBeInTheDocument();
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
  it('renders a silkscreen title and its head lamp', () => {
    render(
      <Panel title="Specification" lit>
        <PanelRow label="Hydration" value="78%" />
      </Panel>,
    );
    expect(screen.getByRole('heading', { name: 'Specification' })).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('carries the signal border only when active', () => {
    const { container, rerender } = render(<Panel title="Bake">body</Panel>);
    expect(container.querySelector('section')).toHaveClass('border-rule');
    rerender(
      <Panel title="Bake" active>
        body
      </Panel>,
    );
    expect(container.querySelector('section')).toHaveClass('border-signal');
  });
});

describe('InstrumentRow', () => {
  const items = [
    { id: '1', label: 'FLR', lit: true, title: 'Bread flour' },
    { id: '2', label: 'SLT', lit: false, title: 'Fine sea salt' },
  ];

  it('states lit and unlit in words, not colour alone', () => {
    render(<InstrumentRow items={items} legend="In pantry" />);
    expect(screen.getByText(/Bread flour — In pantry/)).toBeInTheDocument();
    expect(screen.getByText(/Fine sea salt — not in pantry/)).toBeInTheDocument();
  });

  it('names the row for assistive technology', () => {
    render(<InstrumentRow items={items} legend="In pantry" />);
    expect(screen.getByRole('list', { name: 'In pantry' })).toBeInTheDocument();
  });
});

describe('Meter', () => {
  it('exposes a real meter role with its bounds', () => {
    render(<Meter value={78} max={100} label="Hydration" />);
    const meter = screen.getByRole('meter', { name: 'Hydration' });
    expect(meter).toHaveAttribute('aria-valuenow', '78');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps out-of-range values instead of overflowing the row', () => {
    const { container } = render(<Meter value={500} max={100} cells={10} />);
    expect(container.querySelectorAll('.bg-key-unlit')).toHaveLength(0);
    expect(container.querySelector('[role="meter"]')?.children).toHaveLength(10);
  });

  it('survives a zero maximum without dividing by zero', () => {
    const { container } = render(<Meter value={0} max={0} cells={8} />);
    expect(container.querySelectorAll('.bg-key-unlit')).toHaveLength(8);
  });
});
