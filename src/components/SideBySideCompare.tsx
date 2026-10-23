import { Photo, cn } from './ui';

/*
 * Two photographs of one bake, side by side: the dough and the crumb, before
 * and after. Each is captioned under the picture in plain words, and either
 * may be a photograph stored on the device.
 */
export interface SideBySideCompareProps {
  doughUrl: string;
  bakedUrl: string;
  doughLabel?: string;
  bakedLabel?: string;
  className?: string;
}

export default function SideBySideCompare({
  doughUrl,
  bakedUrl,
  doughLabel = 'Before',
  bakedLabel = 'After',
  className,
}: SideBySideCompareProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {[
        [doughUrl, doughLabel],
        [bakedUrl, bakedLabel],
      ].map(([url, label]) => (
        <figure key={label} className="flex flex-col gap-1.5">
          <Photo src={url} alt={label} className="aspect-square w-full rounded-key object-cover" />
          <figcaption className="text-[0.8125rem] text-ink-muted">{label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
