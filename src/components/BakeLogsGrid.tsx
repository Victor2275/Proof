import { useState } from 'react';
import { type BakeLog } from '../lib/api';
import { Award, CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BakeLogsGridProps {
  logs: BakeLog[];
  onSelect: (log: BakeLog) => void;
}

export default function BakeLogsGrid({ logs, onSelect }: BakeLogsGridProps) {
  const [flippedLogId, setFlippedLogId] = useState<string | null>(null);

  if (logs.length === 0) {
    return <div className="text-ink-muted text-center py-10 font-medium">You haven't logged any bakes for this recipe yet.</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {logs.map((log, idx) => {
        const isFlipped = flippedLogId === log._id;
        const mainImage = log.imageUrls?.[0];
        
        return (
          <div 
            key={log._id} 
            className="relative aspect-square cursor-pointer group"
            style={{ perspective: '1000px' }}
            onClick={(e) => {
              if (isFlipped) {
                // If it's already flipped, clicking it opens the details modal
                onSelect(log);
              } else {
                // If it's not flipped, click flips it
                setFlippedLogId(log._id!);
              }
            }}
          >
            <motion.div
              className="w-full h-full relative preserve-3d"
              initial={false}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front Side (Photo) */}
              <div className="absolute inset-0 backface-hidden bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden border border-border-subtle shadow-sm flex items-center justify-center group-hover:border-ink transition-colors" style={{ backfaceVisibility: 'hidden' }}>
                {mainImage ? (
                  <img src={mainImage} alt={`Make ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-ink-muted/50 p-4 text-center">
                    <CameraOff className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold uppercase">No Photo</span>
                  </div>
                )}
                
                <div className="absolute top-3 left-3 bg-paper/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 border border-border-subtle">
                  Make #{logs.length - idx}
                  {log.isPersonalBest && <Award className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                </div>
              </div>

              {/* Back Side (Notes) */}
              <div 
                className="absolute inset-0 backface-hidden bg-paper rounded-2xl border-2 border-ink shadow-lg p-5 flex flex-col justify-between" 
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 border-b border-border-subtle pb-2">
                    {new Date(log.date || Date.now()).toLocaleDateString()}
                  </div>
                  <p className="text-sm line-clamp-5 leading-relaxed">
                    {log.notes || <span className="italic text-ink-muted">No notes recorded for this bake.</span>}
                  </p>
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-ink flex items-center justify-center border-t border-border-subtle pt-3 hover:underline">
                  Tap to View Details
                </div>
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
