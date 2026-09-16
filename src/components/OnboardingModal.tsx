import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, CheckCircle2, Search, Zap, X } from 'lucide-react';
import { Button } from './ui';

interface OnboardingModalProps {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Browse & Discover",
      icon: <Search className="w-10 h-10 text-signal" />,
      description: "Search across all recipes instantly. Use folders and tags to organize your cookbook exactly how you like."
    },
    {
      title: "Cook Hands-Free",
      icon: <Zap className="w-10 h-10 text-signal" />,
      description: "Enter The Kitchen Lab. Control the recipe with your voice, wave to advance steps, and sync timers across devices."
    },
    {
      title: "Log Your Bakes",
      icon: <Book className="w-10 h-10 text-signal" />,
      description: "Record your results. Snap photos, dictate notes, and compare your iterations to perfect your craft."
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg overflow-hidden rounded-panel border border-rule bg-panel"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-ink-muted transition-colors hover:text-ink"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-4 text-center">
          <div className="mb-6 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {steps[step].icon}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="h-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <h2 className="font-faceplate mb-3 text-2xl text-ink">{steps[step].title}</h2>
                <p className="text-ink-muted leading-relaxed">
                  {steps[step].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col items-center border-t border-rule p-8 pt-6">
          <div className="mb-6 flex gap-2" role="tablist" aria-label="Onboarding progress">
            {steps.map((_, i) => (
              <span
                key={i}
                role="tab"
                aria-selected={i === step}
                className={`h-1.5 transition-all ${i === step ? 'w-6 bg-signal' : 'w-1.5 bg-rule'}`}
              />
            ))}
          </div>

          <Button variant="primary" size="lg" className="w-full" onClick={handleNext}>
            {step === steps.length - 1 ? (
              <>Let's Bake <CheckCircle2 className="w-5 h-5" /></>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
