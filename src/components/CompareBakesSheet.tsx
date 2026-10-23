import type { BakeLog, Recipe } from '../lib/types';
import { bakePhotoUrls } from '../lib/bakePhotos';
import { MarginNote, Photo, RecipePlate, Sheet, Stamp, Stars } from './ui';
import PhotoSlider from './PhotoSlider';

/*
 * Two bakes side by side (change 106): bake 3 against bake 4 — the photographs,
 * the stars, what happened and what was changed — so the difference a change
 * made can be read across, not remembered. When both have a photograph, one
 * slider wipes between them as well.
 */
const longDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function CompareBakesSheet({
  bakes,
  recipes,
  onClose,
}: {
  /** Exactly two, in any order: shown oldest first. */
  bakes: BakeLog[] | null;
  recipes: Map<string, Recipe>;
  onClose: () => void;
}) {
  const pair = bakes ? [...bakes].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const photos = pair.map((b) => bakePhotoUrls(b)[0]);

  return (
    <Sheet open={bakes !== null} onClose={onClose} title="Compare two bakes" placement="bottom" size="xl" detents initialDetent={1}>
      {pair.length === 2 ? (
        <div className="flex flex-col gap-6 pb-2">
          {photos[0] && photos[1] ? (
            <PhotoSlider
              className="mx-auto w-full max-w-md"
              beforeUrl={photos[0]}
              afterUrl={photos[1]}
              beforeLabel={longDate(pair[0].date)}
              afterLabel={longDate(pair[1].date)}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            {pair.map((b, i) => {
              const recipe = recipes.get(b.recipeId);
              return (
                <section key={b._id} aria-label={`${recipe?.title ?? 'A deleted recipe'}, ${longDate(b.date)}`} className="flex min-w-0 flex-col gap-2">
                  <div className="relative">
                    {photos[i] ? (
                      <Photo src={photos[i]} alt="" className="aspect-square w-full rounded-key object-cover" />
                    ) : (
                      <RecipePlate src={undefined} alt={recipe?.title ?? '?'} size="hero" className="aspect-square" />
                    )}
                    {b.isPersonalBest ? <Stamp rating={b.rating} className="absolute -right-1 -top-1" /> : null}
                  </div>
                  <p className="font-title text-lg leading-snug text-ink">{recipe?.title ?? 'A deleted recipe'}</p>
                  <p className="text-sm text-ink-muted">{longDate(b.date)}</p>
                  <Stars value={b.rating} />
                  {b.notes ? <p className="font-prose whitespace-pre-wrap text-ink">{b.notes}</p> : null}
                  {b.changes ? (
                    <p className="text-sm text-ink-2">
                      <span className="font-semibold">Changed: </span>
                      {b.changes}
                    </p>
                  ) : null}
                  {b.nextTime ? <MarginNote lead="Next time">{b.nextTime}</MarginNote> : null}
                </section>
              );
            })}
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
