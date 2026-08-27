import { useState, useEffect } from 'react';

/*
 * Recipe photos imported from a source URL are hotlinked rather than re-hosted, so
 * some of them fail to load when the origin site blocks cross-origin requests.
 * Without an onError path a blocked image renders as a broken-image glyph; fall
 * back to the same "No Image" treatment used when a recipe has no photo at all.
 */
export default function RecipeImage({
  src,
  alt,
  className,
  placeholderClassName = '',
  loading,
}: {
  src?: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  loading?: 'lazy' | 'eager';
}) {
  const [failed, setFailed] = useState(false);

  // A new src deserves a fresh attempt — otherwise navigating between recipes
  // keeps showing the placeholder once any one of them has failed.
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-black/5 dark:bg-white/5 text-ink-muted/30 ${placeholderClassName || className || ''}`}>
        <span className="font-bold uppercase tracking-widest text-xs">No Image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}
