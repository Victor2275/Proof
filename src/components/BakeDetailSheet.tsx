import { useMemo, useState } from 'react';
import { Award, ImageUp, PencilLine, Share2, Trash2 } from 'lucide-react';
import type { BakeLog, Recipe } from '../lib/types';
import { bakePhotoUrls } from '../lib/bakePhotos';
import { methodSteps } from '../lib/recipeText';
import { useDeleteBakeLog, useRestoreRecord, useUpdateBakeLog, useUpdateRecipe } from '../lib/queries';
import { useUndoableAction } from '../lib/useUndoableAction';
import { Button, Field, MarginNote, Photo, Sheet, Stamp, Stars, useToast } from './ui';
import SideBySideCompare from './SideBySideCompare';

/*
 * One bake, opened from the strip on its recipe or from Bakes.
 *
 * Everything the baker wrote, in the order they would want it back: the
 * photographs, what happened, what they changed, the note to next time, and
 * the notes made at each step. Below it, the few things to do with a bake —
 * change it, make it the recipe's cover, share it as a card, delete it — and
 * delete happens at once with Undo rather than asking first.
 */
export interface BakeDetailSheetProps {
  log: BakeLog | null;
  /** Its place in the recipe's bakes, oldest first: "Bake 3". */
  number?: number;
  recipe: Pick<Recipe, '_id' | 'title' | 'imageUrls' | 'instructions'> | null;
  onClose: () => void;
  onEdit: (log: BakeLog) => void;
  onShareCard?: (log: BakeLog) => void;
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function BakeDetailSheet({ log, number, recipe, onClose, onEdit, onShareCard }: BakeDetailSheetProps) {
  const updateBakeLog = useUpdateBakeLog();
  const updateRecipe = useUpdateRecipe();
  const deleteBakeLog = useDeleteBakeLog();
  const restore = useRestoreRecord();
  const undoable = useUndoableAction();
  const toast = useToast();
  const [labelling, setLabelling] = useState<{ url: string; label: string }[] | null>(null);

  const stepNumber = useMemo(() => {
    const map = new Map<number, number>();
    for (const step of methodSteps(recipe?.instructions)) map.set(step.index, step.number);
    return map;
  }, [recipe?.instructions]);

  const photos = log ? bakePhotoUrls(log) : [];
  const labelled = log?.images?.length ? log.images : photos.map((url) => ({ url, label: '' }));

  const remove = () => {
    if (!log) return;
    const id = log._id;
    onClose();
    void undoable({
      message: 'Bake deleted',
      run: () => deleteBakeLog.mutateAsync(id),
      undo: () => restore.mutateAsync({ store: 'bakeLogs', id }),
      failure: "Couldn't delete that bake on this device. Try again.",
    });
  };

  const toggleBest = async () => {
    if (!log) return;
    try {
      await updateBakeLog.mutateAsync({ id: log._id, patch: { isPersonalBest: !log.isPersonalBest } });
    } catch {
      toast.show({ message: "Couldn't change the personal best. Try again.", tone: 'fault' });
    }
  };

  const setCover = async () => {
    if (!log || !recipe || !photos[0]) return;
    try {
      await updateRecipe.mutateAsync({
        id: recipe._id,
        data: { imageUrls: [photos[0], ...(recipe.imageUrls ?? []).filter((u) => u !== photos[0])] },
      });
      toast.show({ message: 'This bake is now the cover photograph' });
    } catch {
      toast.show({ message: "Couldn't set the cover photograph. Try again.", tone: 'fault' });
    }
  };

  const saveLabels = async () => {
    if (!log || !labelling) return;
    try {
      await updateBakeLog.mutateAsync({ id: log._id, patch: { images: labelling } });
      setLabelling(null);
    } catch {
      toast.show({ message: "Couldn't save those labels. Try again.", tone: 'fault' });
    }
  };

  return (
    <Sheet
      open={log !== null}
      onClose={() => {
        setLabelling(null);
        onClose();
      }}
      title={number ? `Bake ${number}` : 'Bake'}
      placement="bottom"
      size="lg"
      detents
      initialDetent={1}
      footer={
        log ? (
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button icon={<PencilLine className="h-4 w-4" aria-hidden="true" />} onClick={() => onEdit(log)}>
              Edit
            </Button>
            {photos[0] && recipe ? (
              <Button variant="ghost" icon={<ImageUp className="h-4 w-4" aria-hidden="true" />} onClick={setCover}>
                Set as cover
              </Button>
            ) : null}
            {onShareCard ? (
              <Button variant="ghost" icon={<Share2 className="h-4 w-4" aria-hidden="true" />} onClick={() => onShareCard(log)}>
                Share card
              </Button>
            ) : null}
            <Button variant="danger" className="ml-auto" icon={<Trash2 className="h-4 w-4" aria-hidden="true" />} onClick={remove}>
              Delete
            </Button>
          </div>
        ) : null
      }
    >
      {log ? (
        <div className="flex flex-col gap-5 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              {recipe ? <p className="font-title text-lg text-ink-2">{recipe.title}</p> : null}
              <p className="text-sm text-ink-muted">{longDate(log.date)}</p>
              <Stars value={log.rating} size="md" />
            </div>
            {log.isPersonalBest ? <Stamp rating={log.rating} /> : null}
          </div>

          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            engaged={!!log.isPersonalBest}
            icon={<Award className="h-4 w-4" aria-hidden="true" />}
            onClick={toggleBest}
          >
            {log.isPersonalBest ? 'Personal best' : 'Mark as my best'}
          </Button>

          {photos.length ? (
            labelling ? (
              <div className="flex flex-col gap-3">
                {labelling.map((img, i) => (
                  <div key={img.url} className="flex items-center gap-3">
                    <Photo src={img.url} alt={`Photograph ${i + 1}`} className="h-16 w-16 shrink-0 rounded-key object-cover" />
                    <Field
                      label={`Label for photograph ${i + 1}`}
                      hideLabel
                      className="flex-1"
                      value={img.label}
                      placeholder="Dough, crumb, after the bake…"
                      onChange={(e) => setLabelling(labelling.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveLabels}>
                    Save labels
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setLabelling(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {labelled.length >= 2 ? (
                  <SideBySideCompare
                    doughUrl={labelled[0].url}
                    bakedUrl={labelled[1].url}
                    doughLabel={labelled[0].label || 'First photograph'}
                    bakedLabel={labelled[1].label || 'Second photograph'}
                  />
                ) : (
                  <figure className="flex flex-col gap-1.5">
                    <Photo src={labelled[0].url} alt={labelled[0].label || 'This bake'} className="w-full rounded-key object-cover" />
                    {labelled[0].label ? <figcaption className="text-[0.8125rem] text-ink-muted">{labelled[0].label}</figcaption> : null}
                  </figure>
                )}
                {labelled.slice(2).map((img, i) => (
                  <Photo key={img.url} src={img.url} alt={img.label || `Photograph ${i + 3}`} className="w-full rounded-key object-cover" />
                ))}
                <Button size="sm" variant="ghost" className="self-start" onClick={() => setLabelling(labelled.map((x) => ({ ...x })))}>
                  Label the photographs
                </Button>
              </div>
            )
          ) : null}

          {log.notes ? (
            <section className="flex flex-col gap-1">
              <h3 className="ui-label">What happened</h3>
              <p className="font-prose hand whitespace-pre-wrap text-[1.0625rem] text-ink">{log.notes}</p>
            </section>
          ) : null}
          {log.changes ? (
            <section className="flex flex-col gap-1">
              <h3 className="ui-label">What I changed</h3>
              <p className="font-prose whitespace-pre-wrap text-[1.0625rem] text-ink">{log.changes}</p>
            </section>
          ) : null}
          {log.nextTime ? <MarginNote lead="Next time">{log.nextTime}</MarginNote> : null}
          {log.stepNotes?.length ? (
            <section className="flex flex-col gap-1.5">
              <h3 className="ui-label">Noted while baking</h3>
              {log.stepNotes.map((n) => (
                <MarginNote key={n.at} lead={stepNumber.has(n.stepIndex) ? `Step ${stepNumber.get(n.stepIndex)}` : undefined}>
                  {n.text}
                </MarginNote>
              ))}
            </section>
          ) : null}
          {!log.notes && !log.changes && !log.nextTime && !photos.length && !log.stepNotes?.length ? (
            <p className="text-ink-muted">Nothing written about this bake yet. Edit it to add how it went.</p>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
