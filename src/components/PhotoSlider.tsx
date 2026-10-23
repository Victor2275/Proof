import { useState } from 'react';
import { Photo, cn } from './ui';

/*
 * Before and after, one over the other: drag the divider to wipe between two
 * photographs of the same recipe — the first bake and the latest, the dough
 * and the loaf. The divider is a real range input laid over the pictures, so
 * it works by keyboard and is announced as a slider, not only by finger.
 */
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
  beforeLabel = 'Before',
  afterLabel = 'After',
  className,
}: PhotoSliderProps) {
  const [position, setPosition] = useState(50);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="relative aspect-square w-full select-none overflow-hidden rounded-key bg-paper-sunk">
        <Photo src={afterUrl} alt={afterLabel} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <Photo src={beforeUrl} alt={beforeLabel} className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-paper"
          style={{ left: `${position}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          aria-label={`Compare ${beforeLabel} and ${afterLabel}`}
          aria-valuetext={`${position}% ${beforeLabel}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <div className="flex justify-between text-[0.8125rem] text-ink-muted">
        <span>{beforeLabel}</span>
        <span>{afterLabel}</span>
      </div>
    </div>
  );
}
