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
  doughLabel = 'Dough / Prep',
  bakedLabel = 'Finished Bake',
  className = ''
}: SideBySideCompareProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {/* Dough / Prep Container */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-border-subtle shadow-sm group">
        <img
          src={doughUrl}
          alt={doughLabel}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
            🧪 {doughLabel}
          </span>
        </div>
      </div>

      {/* Finished Bake Container */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-border-subtle shadow-sm group">
        <img
          src={bakedUrl}
          alt={bakedLabel}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-white bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-xs">
            🍞 {bakedLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
