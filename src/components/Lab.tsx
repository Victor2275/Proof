import { useState } from 'react';
import {
  Panel,
  PanelRow,
  Button,
  Field,
  TextArea,
  Select,
  SegmentReadout,
  StepRow,
  InstrumentRow,
  Meter,
  Sheet,
  Menu,
  MenuItem,
} from './ui';
import { derivePhases } from '../lib/phases';
import AIReviewSheet from './AIReviewSheet';

/*
 * Primitives gallery — development only.
 *
 * Registered behind import.meta.env.DEV in App.tsx so it never reaches a
 * production bundle. It exists so the component layer can be judged on its own
 * before a surface composes it, and so later phases have one place to check a
 * control's real states instead of hunting for a screen that happens to use it.
 */

const SOURDOUGH = [
  'Feed the starter and leave the levain to ripen for 6 hours.',
  'Mix the flour and water and let it autolyse for 1 hour.',
  'Add the salt and mix until the dough comes together.',
  'Bulk ferment for 4 hours, with a stretch and fold every 45 minutes.',
  'Shape into a boule and rest.',
  'Retard in the banneton overnight in the refrigerator.',
  'Score the loaf and bake for 20 minutes covered.',
  'Cool on a wire rack before slicing.',
];

const PANTRY = [
  { id: '1', label: 'FLR', lit: true, title: 'Bread flour' },
  { id: '2', label: 'WTR', lit: true, title: 'Water' },
  { id: '3', label: 'SLT', lit: true, title: 'Fine sea salt' },
  { id: '4', label: 'LVN', lit: true, title: 'Levain' },
  { id: '5', label: 'RYE', lit: false, title: 'Wholegrain rye' },
  { id: '6', label: 'SEM', lit: false, title: 'Semolina' },
];

function Section({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="label-silkscreen border-b border-rule pb-2">{name}</h2>
      {children}
    </section>
  );
}

export default function Lab() {
  const phases = derivePhases(SOURDOUGH);
  const [activeStep, setActiveStep] = useState(3);
  const [engaged, setEngaged] = useState(false);
  const [sheet, setSheet] = useState<'center' | 'bottom' | null>(null);
  const [review, setReview] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-faceplate text-4xl text-ink">Proof / Component Lab</h1>
        <p className="text-sm text-ink-muted">
          Every primitive in the Step Row world, with its real states.
        </p>
      </header>

      <Section name="Step row — full, running">
        <StepRow phases={phases} activeStep={activeStep} onSelect={(p) => setActiveStep(p.stepIndices[0])} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setActiveStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <Button size="sm" variant="primary" onClick={() => setActiveStep((s) => Math.min(SOURDOUGH.length - 1, s + 1))}>
            Advance
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActiveStep(-1)}>
            Stop bake
          </Button>
        </div>
      </Section>

      <Section name="Step row — at rest, and as a dashboard signature">
        <StepRow phases={phases} />
        <div className="flex flex-col gap-2 pt-2">
          <StepRow phases={phases} size="mini" activeStep={3} />
          <StepRow phases={phases} size="mini" />
          <StepRow phases={[]} size="mini" />
        </div>
      </Section>

      <Section name="Segment readouts">
        <div className="flex flex-wrap items-end gap-8">
          <SegmentReadout value="12:40" unit="MIN" size="xl" label="Bulk remaining" />
          <SegmentReadout value="78.5" unit="%" size="lg" label="Hydration" />
          <SegmentReadout value="250" unit="°C" size="md" label="Oven" />
          <SegmentReadout value="900" unit="G" size="sm" label="Flour" />
          <SegmentReadout value="88:88" size="lg" label="All segments" tone="ink" />
        </div>
      </Section>

      <Section name="Panels">
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Specification">
            <PanelRow label="Total time" value="18h 30m" />
            <PanelRow label="Hydration" value="78%" />
            <PanelRow label="Yield" value="2 loaves" />
          </Panel>
          <Panel title="Bulk ferment" lit active>
            <PanelRow label="Started" value="06:15" />
            <PanelRow label="Remaining" value="1h 12m" />
            <PanelRow label="Folds" value="3 of 4" />
          </Panel>
        </div>
      </Section>

      <Section name="Controls">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Run</Button>
          <Button variant="secondary">Clear</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete</Button>
          <Button engaged={engaged} onClick={() => setEngaged((v) => !v)}>
            Baker&apos;s %
          </Button>
          <Button busy>Saving</Button>
          <Button disabled>Unavailable</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section name="Fields">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Flour" unit="G" defaultValue="900" />
          <Field label="Hydration" unit="%" defaultValue="112" error="Must be 50–100. Try 78." />
          <Field label="Recipe name" hint="Shown across the cookbook." placeholder="Country loaf" />
          <Select label="Difficulty" defaultValue="Medium">
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </Select>
          <TextArea label="Lab notes" rows={3} placeholder="Half the salt next time." />
          <TextArea label="Step text" prose rows={3} defaultValue="Shape into a boule and rest." />
        </div>
      </Section>

      <Section name="Sheets">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setSheet('center')}>Open a dialog</Button>
          <Button onClick={() => setSheet('bottom')}>Open a bottom sheet</Button>
        </div>
        <Sheet
          open={sheet !== null}
          onClose={() => setSheet(null)}
          placement={sheet === 'bottom' ? 'bottom' : 'center'}
          title={sheet === 'bottom' ? 'More sections' : 'Delete recipe'}
          size={sheet === 'bottom' ? 'md' : 'sm'}
          footer={
            <>
              <Button onClick={() => setSheet(null)}>Keep</Button>
              <Button variant="danger" onClick={() => setSheet(null)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink">
            The scrim is the one place backdrop blur belongs: it says the panel beneath is still
            there and is not what you are operating.
          </p>
        </Sheet>
      </Section>

      <Section name="Menu">
        <Menu label="Share" trigger={(props) => <Button {...props}>Share</Button>}>
          <MenuItem onSelect={() => {}}>Copy link</MenuItem>
          <MenuItem onSelect={() => {}}>QR code</MenuItem>
          <MenuItem onSelect={() => {}}>Export PDF</MenuItem>
        </Menu>
      </Section>

      <Section name="AI review">
        <Button onClick={() => setReview(true)}>Open a proposal</Button>
        <AIReviewSheet
          open={review}
          current={{
            title: 'Prawn stir-fry',
            prepTime: '20 mins',
            servings: 4,
            ingredients: [
              { name: 'Prawns', quantity: 400, unit: 'g' },
              { name: 'Ginger', quantity: 3, unit: 'cm piece' },
            ],
            instructions: ['Put the prawns in a bowl.', 'Heat the wok.'],
          }}
          proposed={{
            title: 'Thai Prawn Stir-Fry',
            prepTime: '15',
            ingredients: [
              { name: 'King prawns, raw', quantity: 400, unit: 'g' },
              { name: 'Ginger, grated', quantity: 3, unit: 'cm' },
              { name: 'Groundnut oil', quantity: 2, unit: 'tbsp' },
            ],
          }}
          onApply={() => setReview(false)}
          onClose={() => setReview(false)}
        />
      </Section>

      <Section name="Instrument row">
        <InstrumentRow items={PANTRY} legend="In pantry" />
      </Section>

      <Section name="Meters">
        <div className="grid gap-4 md:grid-cols-2">
          <Meter label="Hydration" value={78} max={100} readout="78%" />
          <Meter label="Oven, with a hot end" value={250} max={280} hotAt={0.85} readout="250°C" />
          <Meter label="Bakes this month" value={4} max={12} readout="4" />
        </div>
      </Section>
    </div>
  );
}
