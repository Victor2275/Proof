import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { derivePhases } from '../lib/phases';
import { Button, StepRow, SegmentReadout, Panel } from './ui';

/*
 * The landing page — the one Persuade surface in an Operate product.
 *
 * It is the only screen in Proof that someone who has never seen the app will
 * look at, and it gets one reading before they decide. The previous version
 * spent that reading on three feature cards claiming hands-free control, synced
 * timers and visual bake logs — three assertions, none of them shown, under a
 * blurred stock photograph that could have fronted any cookbook app.
 *
 * What Proof has that they do not is the thesis: a recipe is a pattern, and a
 * bake is that pattern running. So the hero is the machine running. The step
 * row chases through a real bake's phases, the readout counts the phase down,
 * and the claim is demonstrated rather than stated. Everything below it is
 * something the app can prove.
 */

/*
 * A real sourdough, written the way the library writes one, so the row below is
 * derived by exactly the code that derives every other row in the app rather
 * than hand-placed for the demo. If `derivePhases` ever stops recognising a
 * levain, this page stops claiming one.
 */
const DEMONSTRATION_STEPS = [
  'Feed the levain and leave it until it domes, about six hours.',
  'Autolyse the flour and water for one hour.',
  'Mix in the salt and the ripe levain.',
  'Bulk ferment for four hours, with a stretch and fold each hour.',
  'Shape into a boule and bench rest for twenty minutes.',
  'Proof in the banneton overnight in the fridge.',
  'Bake at 250C with steam for twenty minutes, then 230C for twenty more.',
  'Rest on a rack for at least two hours before cutting.',
];

/** How long each phase holds before the chase advances. */
const CHASE_MS = 1600;

export default function LandingPage() {
  const navigate = useNavigate();
  const phases = useMemo(() => derivePhases(DEMONSTRATION_STEPS), []);
  const [phaseIndex, setPhaseIndex] = useState(0);

  /*
   * The chase is the page's only motion, and it is the same clock the rest of
   * the world runs on. Under reduced motion it does not run at all: the row
   * holds on one lit phase, which still says "this is where now is" without
   * anything moving. The global CSS rule cannot do this for us — it collapses
   * CSS animation, and this is a timer.
   */
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reduced?.matches) return;

    const id = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % phases.length);
    }, CHASE_MS);
    return () => clearInterval(id);
  }, [phases.length]);

  const runningPhase = phases[phaseIndex];
  const activeStep = runningPhase?.stepIndices[0];

  const handleExplore = () => {
    localStorage.setItem('hasVisited', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ground px-6 py-16 text-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        <header className="flex flex-col items-center gap-5 text-center">
          <h1 className="font-faceplate text-5xl leading-none text-ink sm:text-7xl">Proof</h1>
          <p className="max-w-prose text-lg text-ink-muted sm:text-xl">
            A recipe is a pattern. A bake is that pattern running. This is the machine that runs
            it, with a light that always says where <span className="text-ink">now</span> is.
          </p>
        </header>

        {/* The claim, demonstrated. */}
        <Panel title="A bake, running" lit>
          <div className="flex flex-col gap-5">
            <StepRow
              phases={phases}
              activeStep={activeStep}
              label="A sourdough bake, running"
            />
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-rule pt-4">
              <div className="flex flex-col gap-1">
                <span className="label-silkscreen">Now</span>
                <span className="font-faceplate text-xl text-signal">
                  {runningPhase?.label ?? '—'}
                </span>
              </div>
              <SegmentReadout
                value={String(phaseIndex + 1).padStart(2, '0')}
                unit={`OF ${String(phases.length).padStart(2, '0')}`}
                label="Phase"
                size="md"
              />
            </div>
          </div>
        </Panel>

        <div className="flex flex-col items-center gap-3">
          {/*
            * Outlined, though it is the page's only call to action. Signal red
            * means one thing in this world, and on this page that thing is the
            * chase light above — which is the entire argument being made. A red
            * button beside it would put two "nows" on screen and spend the
            * demonstration to decorate a control. The button carries its weight
            * through size and position instead.
            */}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleExplore}
            icon={<ArrowRight className="h-5 w-5" />}
          >
            Open the cookbook
          </Button>
          <p className="label-silkscreen">No account. Nothing to set up.</p>
        </div>

        {/*
          * Three things the app does, each named as a behaviour rather than as a
          * feature, and each one true of the build behind this page.
          */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel title="Hands free">
            <p className="text-sm text-ink-muted">
              Floured hands never touch the phone. Say “next”, or wave over the camera, and the
              row advances.
            </p>
          </Panel>
          <Panel title="Timers that follow">
            <p className="text-sm text-ink-muted">
              A timer started on the phone counts down on the laptop too, docked in the head as a
              readout and turning red once it runs past its end.
            </p>
          </Panel>
          <Panel title="Every bake, kept">
            <p className="text-sm text-ink-muted">
              Photograph and note each attempt. A recipe's bakes read as one row, oldest to
              newest, so the row is the progress.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
