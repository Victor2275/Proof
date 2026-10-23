import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Camera, Mic, MicOff, X } from 'lucide-react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import type { BakeLog, StepNote } from '../lib/types';
import { useCreateBakeLog, useUpdateBakeLog } from '../lib/queries';
import { savePhoto } from '../lib/repo/photos';
import { methodSteps } from '../lib/recipeText';
import { haptic } from '../lib/haptics';
import { toLocalInputValue } from './ReverseBakeScheduler';
import { Button, Field, MarginNote, Sheet, StarRating, TextArea, useToast } from './ui';

/*
 * Log a bake: "How did it go?" (changes 64, 95, 102).
 *
 * Reachable from the recipe page without going through baking mode, and the
 * last step of baking mode. Everything but the date is optional, so a bake can
 * be logged in two presses and filled in later: stars, photographs, what
 * happened, what was done differently, a note to the next attempt, and whether
 * this one is the best so far. Notes written during the bake arrive already
 * filed against their steps.
 *
 * It all goes to the device. A bake finished offline, signed out, is logged.
 */
export interface LogBakeSheetProps {
  open: boolean;
  onClose: () => void;
  recipe: { _id: string; title: string; instructions?: string[] };
  /** Notes written in baking mode, filed against their steps. */
  stepNotes?: StepNote[];
  /** An existing bake to change, rather than a new one. */
  log?: BakeLog;
  onSaved?: (log: BakeLog) => void;
}

interface NewPhoto {
  file: File;
  preview: string;
}

export default function LogBakeSheet({ open, onClose, recipe, stepNotes = [], log, onSaved }: LogBakeSheetProps) {
  const formId = useId();
  const toast = useToast();
  const createBakeLog = useCreateBakeLog();
  const updateBakeLog = useUpdateBakeLog();
  const [date, setDate] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [changes, setChanges] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [best, setBest] = useState(false);
  const [photos, setPhotos] = useState<NewPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dictating, setDictating] = useState(false);
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  // A fresh form each time it opens, or the bake being changed as it stands.
  useEffect(() => {
    if (!open) return;
    setDate(toLocalInputValue(log ? new Date(log.date) : new Date()));
    setRating(log?.rating ?? null);
    setNotes(log?.notes ?? '');
    setChanges(log?.changes ?? '');
    setNextTime(log?.nextTime ?? '');
    setBest(log?.isPersonalBest ?? false);
    setPhotos([]);
    setError('');
  }, [open, log]);

  // Previews are object URLs: let them go when the sheet does.
  const previews = useRef<string[]>([]);
  useEffect(() => {
    if (open) return;
    previews.current.forEach((url) => URL.revokeObjectURL(url));
    previews.current = [];
  }, [open]);

  const stepNumber = useMemo(() => {
    const map = new Map<number, number>();
    for (const step of methodSteps(recipe.instructions)) map.set(step.index, step.number);
    return map;
  }, [recipe.instructions]);

  const toggleDictation = () => {
    if (dictating) {
      SpeechRecognition.stopListening();
      setDictating(false);
      const said = transcript.trim();
      if (said) setNotes((prev) => (prev ? `${prev.trimEnd()} ${said}` : said));
      resetTranscript();
    } else {
      resetTranscript();
      void SpeechRecognition.startListening({ continuous: true });
      setDictating(true);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dictating) toggleDictation();
    setSaving(true);
    setError('');
    const when = new Date(date);
    const iso = Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString();
    try {
      let saved: BakeLog;
      if (log) {
        const added = [];
        for (const p of photos) added.push({ url: await savePhoto(p.file), label: '' });
        const images = [...(log.images ?? log.imageUrls.map((url) => ({ url, label: '' }))), ...added];
        saved = await updateBakeLog.mutateAsync({
          id: log._id,
          patch: { date: iso, rating, notes, changes, nextTime, isPersonalBest: best, images },
        });
      } else {
        saved = await createBakeLog.mutateAsync({
          draft: { recipeId: recipe._id, date: iso, rating, notes, changes, nextTime, isPersonalBest: best, stepNotes },
          photos: photos.map((p) => ({ file: p.file, label: '' })),
        });
      }
      haptic('success');
      toast.show({ message: log ? 'Bake updated' : 'Bake logged' });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : "The bake didn't save to this device."} Everything you wrote is still here; try again.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={log ? 'Change this bake' : 'How did it go?'}
      placement="bottom"
      size="md"
      detents
      initialDetent={1}
      layer={110}
      footer={
        <Button type="submit" form={formId} variant="primary" size="lg" busy={saving} className="w-full">
          {saving ? 'Saving' : log ? 'Save changes' : 'Log this bake'}
        </Button>
      }
    >
      <form id={formId} onSubmit={save} className="flex flex-col gap-5">
        <p className="font-title text-lg text-ink-2">{recipe.title}</p>

        {error ? (
          <p role="alert" className="rounded-control border border-fault p-3 text-sm text-fault">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-1">
          <span className="ui-label" id={`${formId}-stars`}>
            Stars
          </span>
          <StarRating label="Stars" value={rating} onChange={setRating} className="-ml-2" />
        </div>

        <Field label="When" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="flex flex-col gap-2">
          <span className="ui-label">Photographs</span>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={p.preview} className="relative h-20 w-20 overflow-hidden rounded-key">
                <img src={p.preview} alt={`New photograph ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={`Remove photograph ${i + 1}`}
                  onClick={() => setPhotos((prev) => prev.filter((x) => x !== p))}
                  className="pressable absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-1"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              </div>
            ))}
            <label className="pressable flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-key border border-dashed border-rule-strong text-ink-2 hover:bg-paper-sunk">
              <Camera className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                aria-label="Add photographs"
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const added = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
                  previews.current.push(...added.map((p) => p.preview));
                  setPhotos((prev) => [...prev, ...added]);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <TextArea
            label="What happened"
            prose
            rows={3}
            value={dictating && transcript ? `${notes} ${transcript}`.trim() : notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="The crumb, the crust, what surprised you."
          />
          {browserSupportsSpeechRecognition ? (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              engaged={dictating}
              onClick={toggleDictation}
              icon={dictating ? <Mic className="h-4 w-4" aria-hidden="true" /> : <MicOff className="h-4 w-4" aria-hidden="true" />}
            >
              {dictating ? 'Listening — press to stop' : 'Dictate'}
            </Button>
          ) : null}
        </div>

        <TextArea
          label="What I changed"
          prose
          rows={2}
          value={changes}
          onChange={(e) => setChanges(e.target.value)}
          placeholder="Lower rack, 10 minutes longer, less sugar."
        />

        <TextArea
          label="Next time"
          prose
          rows={2}
          value={nextTime}
          onChange={(e) => setNextTime(e.target.value)}
          hint="Shown on the recipe, and when you next start it."
        />

        {stepNotes.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="ui-label">Noted while baking</span>
            {stepNotes.map((n) => (
              <MarginNote key={n.at} lead={stepNumber.has(n.stepIndex) ? `Step ${stepNumber.get(n.stepIndex)}` : undefined}>
                {n.text}
              </MarginNote>
            ))}
          </div>
        ) : null}

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={best}
            onChange={(e) => setBest(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-ink"
          />
          <span className="text-[0.9375rem] text-ink">
            Mark as my best
            <span className="block text-sm text-ink-muted">The recipe keeps one best bake.</span>
          </span>
        </label>
      </form>
    </Sheet>
  );
}
