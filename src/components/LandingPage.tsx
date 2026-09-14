import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Book, Clock, Mic, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleExplore = () => {
    localStorage.setItem('hasVisited', 'true');
    navigate('/');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Background Image / Texture overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 dark:opacity-30"
        style={{
          backgroundImage: 'url(/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(50%) blur(4px)'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-paper/80 via-paper/95 to-paper" />

      <motion.div 
        className="z-10 max-w-4xl w-full text-center space-y-12 py-20"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold uppercase tracking-widest text-sm mb-4">
            <Sparkles className="w-4 h-4" /> The Digital Cookbook
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight uppercase text-ink">
            Master the art <br className="hidden md:block"/> of <span className="text-accent">Baking</span>
          </h1>
          <p className="text-xl md:text-2xl text-ink-muted max-w-2xl mx-auto font-medium">
            Your personal, intelligent kitchen lab. Built for precision, designed for beauty, engineered for hands-free cooking.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-6 pb-12">
          <button 
            onClick={handleExplore}
            className="px-8 py-4 bg-accent text-black font-bold text-lg uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] transition-all hover:scale-105 flex items-center justify-center gap-3"
          >
            Explore the Cookbook <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left border-t border-border-subtle pt-12">
          <div className="space-y-3 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle backdrop-blur-sm">
            <Mic className="w-8 h-8 text-accent" />
            <h3 className="font-bold text-lg uppercase tracking-wider">Hands-Free Mode</h3>
            <p className="text-ink-muted text-sm leading-relaxed">
              Covered in flour? Navigate recipes using voice commands or wave gestures over your camera.
            </p>
          </div>
          <div className="space-y-3 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle backdrop-blur-sm">
            <Clock className="w-8 h-8 text-accent" />
            <h3 className="font-bold text-lg uppercase tracking-wider">Synced Timers</h3>
            <p className="text-ink-muted text-sm leading-relaxed">
              Start a 45-minute bake on your phone and hear the alarm on your laptop. Real-time websocket sync.
            </p>
          </div>
          <div className="space-y-3 p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-border-subtle backdrop-blur-sm">
            <Book className="w-8 h-8 text-accent" />
            <h3 className="font-bold text-lg uppercase tracking-wider">Visual Bake Logs</h3>
            <p className="text-ink-muted text-sm leading-relaxed">
              Track your iterations. Compare raw dough to baked crumb. Learn from every single bake.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
