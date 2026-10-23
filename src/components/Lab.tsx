import { useState } from 'react';
import { Heart, MoreHorizontal, Share } from 'lucide-react';
import {
  Panel,
  PanelRow,
  Button,
  IconButton,
  BackButton,
  Segmented,
  Field,
  TextArea,
  Select,
  Readout,
  StepRow,
  InstrumentRow,
  Meter,
  Sheet,
  Menu,
  MenuItem,
  PublishState,
  RecipePlate,
  RecipeTile,
  Tag,
  Prose,
  Disclosure,
  PageHeader,
  useToast,
} from './ui';
import { derivePhases } from '../lib/phases';
import AIReviewSheet from './AIReviewSheet';

/*
 * Primitives gallery — development only.
 *
 * Registered behind import.meta.env.DEV in App.tsx so it never reaches a
 * production bundle. It exists so the component layer can be judged on its own
 * before a screen composes it, and so later phases have one place to check a
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
  { id: '1', label: 'Flour', lit: true, title: 'Bread flour' },
  { id: '2', label: 'Water', lit: true, title: 'Water' },
  { id: '3', label: 'Salt', lit: true, title: 'Fine sea salt' },
  { id: '4', label: 'Levain', lit: true, title: 'Levain' },
  { id: '5', label: 'Rye', lit: false, title: 'Wholegrain rye' },
  { id: '6', label: 'Semolina', lit: false, title: 'Semolina' },
];

const TILE = {
  _id: 'lab-sourdough',
  title: 'Country sourdough',
  imageUrls: [],
  prepTime: '30',
  cookTime: '45',
  folder: 'Bread',
};

function Section({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-title border-b border-rule pb-2 text-xl text-ink">{name}</h2>
      {children}
    </section>
  );
}

export default function Lab() {
  const phases = derivePhases(SOURDOUGH);
  const [activeStep, setActiveStep] = useState(3);
  const [engaged, setEngaged] = useState(false);
  const [favourite, setFavourite] = useState(false);
  const [view, setView] = useState<'chapters' | 'az'>('chapters');
  const [sheet, setSheet] = useState<'center' | 'bottom' | 'detents' | null>(null);
  const toast = useToast();
  const [review, setReview] = useState(false);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <BackButton to="/" label="Cookbook" />
        <h1 className="font-title text-4xl text-ink">Component lab</h1>
        <p className="text-sm text-ink-muted">Every primitive in the cookbook, with its real states.</p>
      </header>

      <Section name="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Start cooking</Button>
          <Button variant="secondary">Log a bake</Button>
          <Button variant="tonal">Add 9 missing to Shop</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button engaged={engaged} onClick={() => setEngaged((v) => !v)}>
            Baker&apos;s %
          </Button>
          <Button busy>Saving</Button>
          <Button disabled>Unavailable</Button>
          <Button size="sm">Small</Button>
          <Button size="lg" variant="primary">
            Large
          </Button>
        </div>
      </Section>

      <Section name="Icon buttons and back">
        <div className="flex flex-wrap items-center gap-2">
          <BackButton to="/" label="Dessert" />
          <span className="flex-1" />
          <IconButton
            label="Favourite"
            pressed={favourite}
            onClick={() => setFavourite((v) => !v)}
            icon={<Heart className="h-5 w-5" fill={favourite ? 'currentColor' : 'none'} />}
          />
          <IconButton label="Share" icon={<Share className="h-5 w-5" />} />
          <IconButton label="More" icon={<MoreHorizontal className="h-5 w-5" />} />
        </div>
      </Section>

      <Section name="Segmented">
        <Segmented
          label="Contents view"
          value={view}
          onChange={setView}
          options={[
            { value: 'chapters', label: 'Chapters' },
            { value: 'az', label: 'A–Z' },
          ]}
        />
        <Segmented
          label="Theme"
          value="light"
          onChange={() => {}}
          block
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </Section>

      <Section name="Tiles and plates">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <RecipeTile recipe={TILE} to="/lab" />
          <RecipeTile recipe={{ ...TILE, _id: 'lab-2', title: 'Arepa pelua', folder: 'Beef' }} to="/lab" active />
        </div>
        <div className="flex gap-3">
          <RecipePlate alt="Banana pancakes" size="row" />
          <RecipePlate alt="Cheese borek" size="row" />
        </div>
      </Section>

      <Section name="Phases — running, at rest, and mini">
        <StepRow phases={phases} activeStep={activeStep} onSelect={(p) => setActiveStep(p.stepIndices[0])} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setActiveStep((s) => Math.max(0, s - 1))}>
            Back
          </Button>
          <Button size="sm" onClick={() => setActiveStep((s) => Math.min(SOURDOUGH.length - 1, s + 1))}>
            Next
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setActiveStep(-1)}>
            Stop bake
          </Button>
        </div>
        <StepRow phases={phases} />
        <div className="flex flex-col gap-2 pt-2">
          <StepRow phases={phases} size="mini" activeStep={3} />
          <StepRow phases={[]} size="mini" />
        </div>
      </Section>

      <Section name="Figures">
        <div className="flex flex-wrap items-end gap-8">
          <Readout value="38:12" size="xl" label="Bulk remaining" tone="accent" />
          <Readout value="78.5" unit="%" size="lg" label="Hydration" />
          <Readout value="250" unit="°C" size="md" label="Oven" />
          <Readout value="900" unit="g" size="sm" label="Flour" />
        </div>
      </Section>

      <Section name="Panels">
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Totals">
            <PanelRow label="Bakes logged" value="17" />
            <PanelRow label="Recipes baked" value="6" />
            <PanelRow label="Personal bests" value="1" />
          </Panel>
          <Panel title="Bulk ferment" lit active>
            <PanelRow label="Started" value="06:15" />
            <PanelRow label="Remaining" value="1 h 12" />
            <PanelRow label="Folds" value="3 of 4" />
          </Panel>
        </div>
      </Section>

      <Section name="Fields">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Flour" unit="g" defaultValue="900" />
          <Field label="Hydration" unit="%" defaultValue="112" error="Must be 50–100. Try 78." />
          <Field label="Recipe name" hint="Shown across the cookbook." placeholder="Country loaf" />
          <Select label="Difficulty" defaultValue="Medium">
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </Select>
          <TextArea label="Notes" rows={3} placeholder="Half the salt next time." />
          <TextArea label="Step" prose rows={3} defaultValue="Shape into a boule and rest." />
        </div>
      </Section>

      <Section name="Sheets">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setSheet('center')}>Open a dialog</Button>
          <Button onClick={() => setSheet('bottom')}>Open a bottom sheet</Button>
          <Button onClick={() => setSheet('detents')}>Open a sheet with detents</Button>
        </div>
        <Sheet
          open={sheet === 'detents'}
          onClose={() => setSheet(null)}
          placement="bottom"
          title="Timers"
          detents
        >
          <p className="text-sm text-ink">
            Rests at half height. Press the grabber to cycle to nearly full, drag it to move between the two,
            drag it down to close, or press Done.
          </p>
        </Sheet>
        <Sheet
          open={sheet === 'center' || sheet === 'bottom'}
          onClose={() => setSheet(null)}
          placement={sheet === 'bottom' ? 'bottom' : 'center'}
          title={sheet === 'bottom' ? 'New recipe' : 'Delete this recipe?'}
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
            The page beneath dims but stays in place; this layer is the one you are operating.
          </p>
        </Sheet>
      </Section>

      <Section name="Page header">
        <PageHeader
          title="Bakes"
          subtitle="17 bakes · 6 recipes · 1 personal best"
          actions={<Button className="rounded-full">Log bake</Button>}
        />
      </Section>

      <Section name="Disclosure">
        <Disclosure summary="5 more chapters and loose notes" openSummary="Show fewer">
          <ul className="flex flex-col py-1 font-prose text-lg text-ink">
            <li className="py-2">Breakfast</li>
            <li className="py-2">Starter</li>
            <li className="py-2">Loose notes</li>
          </ul>
        </Disclosure>
      </Section>

      <Section name="Toast">
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() =>
              toast.show({ message: 'Recipe deleted', action: { label: 'Undo', onAction: () => undefined } })
            }
          >
            Show a toast with Undo
          </Button>
          <Button
            onClick={() => toast.show({ message: "Couldn't save on this device. Try again.", tone: 'fault' })}
          >
            Show a failure
          </Button>
        </div>
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

      <Section name="Pantry chips">
        <InstrumentRow items={PANTRY} legend="In pantry" />
      </Section>

      <Section name="Meters">
        <div className="grid gap-4 md:grid-cols-2">
          <Meter label="Hydration" value={78} max={100} readout="78%" />
          <Meter label="Oven, with a hot end" value={250} max={280} hotAt={0.85} readout="250°C" />
          <Meter label="Bakes this month" value={4} max={12} readout="4" />
        </div>
      </Section>

      <Section name="Publish state — every position">
        <div className="flex flex-col gap-3">
          <PublishState state="local" />
          <PublishState state="pending" />
          <PublishState state="live" />
          <PublishState state="edits" />
        </div>
      </Section>

      <Section name="Tags and people's words">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Tag>Public</Tag>
            <Tag>Pro</Tag>
          </div>
          <Panel title="@ada">
            <Prose>{`Third bake of this and the crumb finally opened up.
Longer bulk, colder fridge.`}</Prose>
          </Panel>
        </div>
      </Section>
    </div>
  );
}
