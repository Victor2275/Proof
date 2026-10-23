import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../lib/types';
import { useUpdateRecipe } from '../lib/queries';
import { amountForField, parseIngredientLine } from '../lib/parseIngredient';
import { haptic } from '../lib/haptics';
import { Button, Field, TextArea, buttonClassName, useToast } from './ui';

/*
 * Edit here (change 119): the recipe page, writable where it stands.
 *
 * The step you are reading is the step you meant to fix — "Can't edit the
 * step you're reading" was the regular's complaint — so the title, the line
 * about it, the ingredients and the method turn into fields in the same
 * spread, in the same order, and Save puts them back. Ingredients are one per
 * line, read the way a pasted list is ("1½ cups flour"); a step is a field of
 * its own. Everything else — photographs, times, chapter — stays in the full
 * editor, one press away.
 */

const lineOf = (ing: Recipe['ingredients'][number]) => [amountForField(ing.quantity), ing.unit, ing.name].filter(Boolean).join(' ');

export default function EditInPlace({ recipe, onDone }: { recipe: Recipe; onDone: () => void }) {
  const update = useUpdateRecipe();
  const toast = useToast();
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description);
  const [ingredients, setIngredients] = useState(() => recipe.ingredients.map(lineOf).join('\n'));
  const [steps, setSteps] = useState(() => [...recipe.instructions]);
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) {
      setError('A recipe needs a title.');
      return;
    }
    try {
      const lines = ingredients.split('\n').map((l) => l.trim()).filter(Boolean);
      // An unchanged line keeps its stored ingredient exactly, rather than a re-read of it.
      const kept = new Map(recipe.ingredients.map((ing) => [lineOf(ing), ing]));
      await update.mutateAsync({
        id: recipe._id,
        data: {
          title: title.trim(),
          description,
          ingredients: lines.map((l) => kept.get(l) ?? parseIngredientLine(l)),
          instructions: steps.map((s) => s.trim()).filter(Boolean),
        },
      });
      haptic('success');
      toast.show({ message: 'Saved' });
      onDone();
    } catch (err) {
      setError(`${err instanceof Error ? err.message : "Couldn't save on this device."} Nothing was lost; try again.`);
    }
  };

  return (
    <section aria-label="Editing the recipe here" className="flex flex-col gap-6">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-paper px-4 py-2 md:mx-0 md:px-0">
        <p className="text-sm text-ink-2">Editing here. Photographs, times and chapter are in the full editor.</p>
        <div className="flex items-center gap-1.5">
          <Link to={`/edit/${recipe._id}`} className={buttonClassName({ variant: 'ghost' })}>
            Full editor
          </Link>
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button variant="primary" busy={update.isPending} onClick={save}>
            Save
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="rounded-control border border-fault p-3 text-sm text-fault">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-x-16 gap-y-8 @4xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <TextArea label="A line about it" prose rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <TextArea
            label="Ingredients"
            prose
            rows={Math.max(6, recipe.ingredients.length)}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            hint="One per line: “1½ cups flour”, “3 eggs, beaten”."
          />
        </div>
        <div className="flex flex-col gap-3">
          <p className="font-title border-b border-rule pb-2 text-2xl text-ink">Method</p>
          {steps.map((step, i) => (
            <TextArea
              key={i}
              label={`Line ${i + 1} of the method`}
              prose
              rows={2}
              value={step}
              onChange={(e) => setSteps((prev) => prev.map((s, j) => (j === i ? e.target.value : s)))}
            />
          ))}
          <Button variant="ghost" className="self-start" onClick={() => setSteps((prev) => [...prev, ''])}>
            Add a step
          </Button>
        </div>
      </div>
    </section>
  );
}
