import { useMemo, useState, useEffect } from 'react';
import type { Recipe } from '../lib/api';
import { Sheet, Button, cn } from './ui';

/*
 * Reviewing what the AI proposes.
 *
 * This replaced a git-style line diff of the recipe serialised to JSON, in a
 * purple panel, with green additions and red deletions. Three things were
 * wrong with it. Colour in this world is temporal — red means happening now,
 * and spending it on "a line was deleted" breaks the one rule the palette has.
 * Git-style versioning was removed from this product deliberately. And the
 * whole thing was one decision: accept everything the model said, or nothing,
 * when in practice it is right about the title and wrong about the ingredients.
 *
 * So: one panel per field that actually differs, each kept or rejected on its
 * own, and nothing drawn for a field the model left alone.
 */

type FieldKey =
  | 'title'
  | 'description'
  | 'prepTime'
  | 'cookTime'
  | 'servings'
  | 'difficulty'
  | 'tags'
  | 'ingredients'
  | 'instructions';

const FIELD_LABELS: Record<FieldKey, string> = {
  title: 'Title',
  description: 'Description',
  prepTime: 'Prep time',
  cookTime: 'Cook time',
  servings: 'Servings',
  difficulty: 'Difficulty',
  tags: 'Tags',
  ingredients: 'Ingredients',
  instructions: 'Method',
};

const FIELDS: FieldKey[] = [
  'title',
  'description',
  'prepTime',
  'cookTime',
  'servings',
  'difficulty',
  'tags',
  'ingredients',
  'instructions',
];

/** The lines a value reads as, so current and proposed can be set side by side. */
function toLines(key: FieldKey, value: unknown): string[] {
  if (value === undefined || value === null || value === '') return [];
  if (key === 'ingredients' && Array.isArray(value)) {
    return value.map((i: any) => [i.quantity, i.unit, i.name].filter(Boolean).join(' ').trim());
  }
  if (key === 'instructions' && Array.isArray(value)) {
    return value.map((step: string, i: number) => `${i + 1}. ${step}`);
  }
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function Reading({ caption, lines }: { caption: string; lines: string[] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="label-silkscreen">{caption}</span>
      {lines.length === 0 ? (
        <p className="text-sm text-ink-muted">Empty</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {lines.map((line, i) => (
            <li key={i} className="break-words text-sm text-ink">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface AIReviewSheetProps {
  open: boolean;
  current: Partial<Recipe>;
  proposed: Partial<Recipe> | null;
  onApply: (accepted: Partial<Recipe>) => void;
  onClose: () => void;
}

export default function AIReviewSheet({
  open,
  current,
  proposed,
  onApply,
  onClose,
}: AIReviewSheetProps) {
  const changed = useMemo(() => {
    if (!proposed) return [] as FieldKey[];
    return FIELDS.filter((key) => {
      const next = proposed[key as keyof Recipe];
      // A field the model did not speak to is not a change. Without this, a
      // model that echoes back only the title would read as "everything else
      // deleted."
      if (next === undefined || next === null || next === '') return false;
      return !sameValue(current[key as keyof Recipe], next);
    });
  }, [current, proposed]);

  const [kept, setKept] = useState<Record<string, boolean>>({});

  // Every proposal starts accepted — the common case is that the model tidied
  // a messy paste and all of it is wanted — but each one can be put back.
  useEffect(() => {
    if (!open) return;
    setKept(Object.fromEntries(changed.map((key) => [key, true])));
  }, [open, changed]);

  const keptCount = changed.filter((key) => kept[key]).length;

  const apply = () => {
    const accepted: Partial<Recipe> = {};
    for (const key of changed) {
      if (kept[key]) (accepted as any)[key] = proposed![key as keyof Recipe];
    }
    onApply(accepted);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        changed.length === 0
          ? 'Nothing to change'
          : `Proposed · ${changed.length} ${changed.length === 1 ? 'field' : 'fields'}`
      }
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Discard
          </Button>
          <Button variant="primary" onClick={apply} disabled={keptCount === 0}>
            {keptCount === 0
              ? 'Nothing kept'
              : `Apply ${keptCount} ${keptCount === 1 ? 'change' : 'changes'}`}
          </Button>
        </>
      }
    >
      {changed.length === 0 ? (
        <p className="text-sm text-ink-muted">
          The model read the recipe and proposed nothing different. Nothing has been altered.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {changed.map((key) => {
            const keep = kept[key] ?? true;
            return (
              <section
                key={key}
                className={cn(
                  'rounded-panel border bg-panel-sunk',
                  keep ? 'border-rule' : 'border-rule opacity-50',
                )}
              >
                <header className="flex items-center justify-between gap-3 border-b border-rule px-3 py-2">
                  <h3 className="label-silkscreen text-ink">{FIELD_LABELS[key]}</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      engaged={keep}
                      onClick={() => setKept((k) => ({ ...k, [key]: true }))}
                      aria-label={`Keep the proposed ${FIELD_LABELS[key]}`}
                    >
                      Keep
                    </Button>
                    <Button
                      size="sm"
                      engaged={!keep}
                      onClick={() => setKept((k) => ({ ...k, [key]: false }))}
                      aria-label={`Reject the proposed ${FIELD_LABELS[key]}`}
                    >
                      Reject
                    </Button>
                  </div>
                </header>
                <div className="flex flex-col gap-4 p-3 sm:flex-row sm:gap-6">
                  <Reading caption="Now" lines={toLines(key, current[key as keyof Recipe])} />
                  <div className="hidden w-px shrink-0 bg-rule sm:block" aria-hidden="true" />
                  <Reading caption="Proposed" lines={toLines(key, proposed![key as keyof Recipe])} />
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
