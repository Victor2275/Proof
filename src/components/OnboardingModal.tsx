import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, CheckCircle2, Search, Zap, X } from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Browse & Discover",
      icon: <Search className="w-12 h-12 text-accent" />,
      description: "Search across all recipes instantly. Use folders and tags to organize your cookbook exactly how you like."
    },
    {
      title: "Cook Hands-Free",
      icon: <Zap className="w-12 h-12 text-accent" />,
      description: "Enter The Kitchen Lab. Control the recipe with your voice, wave to advance steps, and sync timers across devices."
    },
    {
      title: "Log Your Bakes",
      icon: <Book className="w-12 h-12 text-accent" />,
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
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-paper rounded-2xl w-full max-w-lg shadow-2xl border border-border-subtle overflow-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-4 text-center">
          <div className="flex justify-center mb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                transition={{ duration: 0.3 }}
              >
                {steps[step].icon}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="h-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-2xl font-bold tracking-tight uppercase mb-3">{steps[step].title}</h2>
                <p className="text-ink-muted leading-relaxed">
                  {steps[step].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="p-8 pt-4 flex flex-col items-center">
          <div className="flex gap-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === step ? 'bg-accent w-6' : 'bg-border-subtle'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-accent text-black font-bold uppercase tracking-wider py-4 rounded-xl flex justify-center items-center gap-2 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all"
          >
            {step === steps.length - 1 ? (
              <>Let's Bake <CheckCircle2 className="w-5 h-5" /></>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
