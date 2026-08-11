import React, { useState, useRef } from 'react';

export interface PhotoSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function PhotoSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Dough / Prep',
  afterLabel = 'Baked Bread',
  className = ''
}: PhotoSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className={`relative select-none overflow-hidden rounded-xl aspect-square bg-black/5 dark:bg-white/5 border border-border-subtle shadow-sm cursor-ew-resize ${className}`}
    >
      {/* After Image (Background - Baked) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      
      {/* After Label (Bottom Right) */}
      <span className="absolute bottom-3 right-3 text-xs font-bold uppercase tracking-wider bg-black/70 text-white px-2.5 py-1 rounded-full pointer-events-none z-10 backdrop-blur-xs">
        {afterLabel}
      </span>

      {/* Before Image (Clipped Foreground - Dough) */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Before Label (Bottom Left) */}
        <span className="absolute bottom-3 left-3 text-xs font-bold uppercase tracking-wider bg-black/70 text-white px-2.5 py-1 rounded-full pointer-events-none z-10 backdrop-blur-xs">
          {beforeLabel}
        </span>
      </div>

      {/* Divider Bar */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Handle Icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black shadow-lg flex items-center justify-center font-bold text-xs">
          ↔
        </div>
      </div>
    </div>
  );
}
