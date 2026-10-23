import React, { useId } from 'react';
import type { Recipe } from '../lib/types';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button, Disclosure, Field, Photo, Segmented, TextArea } from './ui';
import { formatMinutes, parseDurationMinutes } from '../lib/duration';
import { useFolders } from '../lib/queries';

/*
 * The top of the editor (changes 109, 112, 114, 115, 26): what the recipe is
 * called, a line about it, its photographs — and, folded under "More
 * details", its times, servings, difficulty, chapter and tags. An open paper
 * form: headings and whitespace, one style for every field, no panels.
 *
 * Times are stored as strings and the library is not disciplined about them:
 * 199 of the 203 live recipes carry "20 mins" / "30 mins" from an old import.
 * The fields read through the same parser as the rest of the app, write back
 * bare minutes, and print what was typed the way the recipe page will
 * ("75" → "1 h 15").
 */

interface BasicInfoFormProps {
  recipe: Partial<Recipe>;
  setRecipe: (recipe: any) => void;
  uploading: boolean;
  handleNativeImageUpload: () => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOpenPastBakes: () => void;
  id?: string;
}

export default function BasicInfoForm({
  recipe,
  setRecipe,
  uploading,
  handleNativeImageUpload,
  handleImageUpload,
  handleOpenPastBakes,
  id,
}: BasicInfoFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const chapterListId = useId();
  const { data: folders = [] } = useFolders();
  const tags = recipe.tags || [];

  const timeValue = (raw: string | undefined) => {
    const minutes = parseDurationMinutes(raw);
    return minutes === null ? (raw ?? '') : String(minutes);
  };
  const timeHint = (raw: string | undefined) => {
    const minutes = parseDurationMinutes(raw);
    return minutes && minutes >= 60 ? `Prints as ${formatMinutes(minutes)}` : undefined;
  };

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || tags.includes(value)) return;
    setRecipe({ ...recipe, tags: [...tags, value] });
  };

  const summary = [
    recipe.servings ? `Serves ${recipe.servings}` : null,
    recipe.difficulty,
    recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4" aria-label="The recipe">
        <Field
          label="Title"
          required
          value={recipe.title || ''}
          onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
          placeholder="72-Hour Sourdough"
        />
        <TextArea
          label="A line about it"
          prose
          rows={2}
          value={recipe.description || ''}
          onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
          placeholder="What it is, and what makes this version yours."
        />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="font-title text-xl text-ink">
          Photographs
        </h2>
        {recipe.imageUrls && recipe.imageUrls.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {recipe.imageUrls.map((url, idx) => (
              <li key={idx} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-key bg-paper-sunk">
                <Photo src={url} alt={`Photograph ${idx + 1}`} loading="lazy" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={`Remove photograph ${idx + 1}`}
                  onClick={() => {
                    const next = [...recipe.imageUrls!];
                    next.splice(idx, 1);
                    setRecipe({ ...recipe, imageUrls: next });
                  }}
                  className="pressable absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-1"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No photograph yet; the cookbook shows the recipe's initial until there is one.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {Capacitor.isNativePlatform() ? (
            <Button onClick={handleNativeImageUpload} busy={uploading} icon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}>
              {uploading ? 'Saving' : 'Take a photograph'}
            </Button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading}
                className="sr-only"
                aria-label="Add photographs"
              />
              <Button onClick={() => fileInputRef.current?.click()} busy={uploading} icon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}>
                {uploading ? 'Saving' : 'Add photographs'}
              </Button>
            </>
          )}
          {id ? (
            <Button variant="ghost" onClick={handleOpenPastBakes}>
              From past bakes
            </Button>
          ) : null}
          {uploading ? <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" /> : null}
        </div>
      </section>

      <Disclosure
        defaultOpen={!id}
        summary={
          <span className="flex flex-col">
            <span className="font-title text-xl text-ink">More details</span>
            {summary ? <span className="text-sm font-normal text-ink-muted">{summary}</span> : null}
          </span>
        }
      >
        <div className="flex flex-col gap-4 pt-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field
              label="Prep time"
              unit="min"
              inputMode="numeric"
              value={timeValue(recipe.prepTime)}
              onChange={(e) => setRecipe({ ...recipe, prepTime: e.target.value })}
              hint={timeHint(recipe.prepTime)}
              placeholder="30"
            />
            <Field
              label="Cook time"
              unit="min"
              inputMode="numeric"
              value={timeValue(recipe.cookTime)}
              onChange={(e) => setRecipe({ ...recipe, cookTime: e.target.value })}
              hint={timeHint(recipe.cookTime)}
              placeholder="60"
            />
            <Field
              label="Serves"
              type="number"
              inputMode="numeric"
              min={1}
              value={recipe.servings || ''}
              onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) || 0 })}
              placeholder="4"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="ui-label text-ink-2">Difficulty</span>
            <Segmented
              label="Difficulty"
              value={(recipe.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium'}
              onChange={(difficulty) => setRecipe({ ...recipe, difficulty })}
              options={[
                { value: 'Easy', label: 'Easy' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Hard', label: 'Hard' },
              ]}
            />
          </div>
          <Field
            label="Chapter"
            list={chapterListId}
            value={recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : ''}
            onChange={(e) => setRecipe({ ...recipe, folder: e.target.value.trim() ? e.target.value : 'Uncategorized' })}
            hint="Where it sits in the cookbook's contents."
            placeholder="Breads"
          />
          <datalist id={chapterListId}>
            {folders.map((f) => (
              <option key={f._id} value={f.name} />
            ))}
          </datalist>
          <div className="flex flex-col gap-2">
            <Field
              label="Tags"
              hint="Press Enter to add one."
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                addTag(e.currentTarget.value);
                e.currentTarget.value = '';
              }}
              placeholder="Weekend, crowd-pleaser"
            />
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li key={tag} className="flex items-center gap-1 rounded-full bg-paper-tonal py-0.5 pl-3 text-sm text-ink">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setRecipe({ ...recipe, tags: tags.filter((t) => t !== tag) })}
                      aria-label={`Remove tag ${tag}`}
                      className="pressable flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Disclosure>
    </div>
  );
}
