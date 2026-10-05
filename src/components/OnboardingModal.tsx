import { useState } from 'react';
import { Button, Sheet, StepRow } from './ui';
import type { Phase } from '../lib/phases';

/*
 * The three-screen tour a new visitor sees on their first dashboard.
 *
 * Its progress is a step row rather than a pager of dots: the tour is a
 * pattern running, so it is drawn the way every bake is — the screen you are
 * on is lit, the next one is due, the ones behind you are done. The first
 * thing a stranger learns is how to read the machine.
 *
 * It used to be a hand-rolled scrim with a fixed-height text box, which at
 * 375px let the pager and the Next button print over a description cut off
 * mid-sentence, and which had no focus trap and no way out by keyboard.
 */

const STEPS = [
  {
    id: 'browse',
    label: 'Browse',
    title: 'Browse & Discover',
    description:
      'Search across all recipes instantly. Use folders and tags to organize your cookbook exactly how you like.',
  },
  {
    id: 'cook',
    label: 'Cook',
    title: 'Cook Hands-Free',
    description:
      'Enter The Kitchen Lab. Control the recipe with your voice, wave to advance steps, and sync timers across devices.',
  },
  {
    id: 'log',
    label: 'Log',
    title: 'Log Your Bakes',
    description:
      'Record your results. Snap photos, dictate notes, and compare your iterations to perfect your craft.',
  },
];

const PHASES: Phase[] = STEPS.map((s, i) => ({ id: s.id, label: s.label, stepIndices: [i] }));

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Getting started · ${step + 1} of ${STEPS.length}`}
      size="md"
      layer={200}
      footer={
        <>
          {step === 0 ? (
            <Button variant="ghost" size="lg" onClick={onClose}>
              Skip
            </Button>
          ) : (
            <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="min-w-32"
            onClick={() => (last ? onClose() : setStep(step + 1))}
          >
            {last ? "Let's Bake" : 'Next'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <StepRow phases={PHASES} activeStep={step} label="Tour" />
        <div className="flex flex-col gap-2" aria-live="polite">
          <h3 className="font-faceplate text-2xl leading-tight text-ink">{current.title}</h3>
          <p className="max-w-prose leading-relaxed text-ink-muted">{current.description}</p>
        </div>
      </div>
    </Sheet>
  );
}
