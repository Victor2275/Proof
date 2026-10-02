import React from 'react';
import type { Recipe } from '../lib/api';
import { X, Image as ImageIcon, Loader2, Plus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Panel, Button, Field, TextArea, Select } from './ui';
import { parseDurationMinutes } from '../lib/duration';

/*
 * Identity: what the recipe is called, what it looks like, and its four
 * instrument values.
 *
 * The file input used to be the browser's own `Choose Files` control, styled
 * through `file:` utilities into something that nearly matched and never quite
 * did. It is a real button now, with the input behind it, so the one control
 * on this panel that opens a system dialog looks like every other control.
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
  const tags = recipe.tags || [];

  /*
   * Times are stored as strings and the library is not disciplined about them:
   * 199 of the 203 live recipes carry "20 mins" / "30 mins" from an old import
   * script. These fields used to be `type="number"`, which cannot hold
   * "20 mins" — so the browser showed them empty, and saving any of those 199
   * recipes silently wiped both times. They are text now, read through the
   * same parser the rest of the app uses, and written back as bare minutes so
   * an edited recipe leaves in the schema's own convention.
   */
  const timeValue = (raw: string | undefined) => {
    const minutes = parseDurationMinutes(raw);
    return minutes === null ? (raw ?? '') : String(minutes);
  };

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || tags.includes(value)) return;
    setRecipe({ ...recipe, tags: [...tags, value] });
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Identity">
        <div className="flex flex-col gap-4">
          <Field
            label="Title"
            required
            value={recipe.title || ''}
            onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
            placeholder="72-Hour Sourdough"
          />
          <TextArea
            label="Description"
            prose
            rows={3}
            value={recipe.description || ''}
            onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
            placeholder="What this recipe is, and what makes this version of it yours."
          />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Field
              label="Prep time"
              unit="MIN"
              inputMode="numeric"
              value={timeValue(recipe.prepTime)}
              onChange={(e) => setRecipe({ ...recipe, prepTime: e.target.value })}
              placeholder="30"
            />
            <Field
              label="Cook time"
              unit="MIN"
              inputMode="numeric"
              value={timeValue(recipe.cookTime)}
              onChange={(e) => setRecipe({ ...recipe, cookTime: e.target.value })}
              placeholder="60"
            />
            <Field
              label="Servings"
              type="number"
              inputMode="decimal"
              value={recipe.servings || ''}
              onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) })}
              placeholder="4"
            />
            <Select
              label="Difficulty"
              value={recipe.difficulty || 'Medium'}
              onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value })}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Field
              label="Tags"
              hint="Press Enter to add."
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                addTag(e.currentTarget.value);
                e.currentTarget.value = '';
              }}
              placeholder="Bread, experimental"
            />
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="label-silkscreen flex items-center gap-1.5 rounded-control border border-rule px-2 py-1 text-ink"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setRecipe({ ...recipe, tags: tags.filter((t) => t !== tag) })
                      }
                      aria-label={`Remove tag ${tag}`}
                      className="text-ink-muted transition-colors hover:text-ink"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel title="Photographs">
        <div className="flex flex-col gap-4">
          {recipe.imageUrls && recipe.imageUrls.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {recipe.imageUrls.map((url, idx) => (
                <li
                  key={idx}
                  className="group relative h-28 w-28 shrink-0 overflow-hidden border border-rule bg-panel-sunk"
                >
                  <img
                    src={url}
                    alt={`Photograph ${idx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove photograph ${idx + 1}`}
                    onClick={() => {
                      const next = [...recipe.imageUrls!];
                      next.splice(idx, 1);
                      setRecipe({ ...recipe, imageUrls: next });
                    }}
                    className="label-silkscreen absolute inset-0 flex items-center justify-center bg-ground/80 text-ink opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            // A designed absence rather than a hole: the plate is simply unlit.
            <p className="text-sm text-ink-muted">
              No photograph yet. The cookbook draws an unlit plate until there is one.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {Capacitor.isNativePlatform() ? (
              <Button
                onClick={handleNativeImageUpload}
                busy={uploading}
                icon={<ImageIcon className="h-4 w-4" />}
              >
                {uploading ? 'Uploading' : 'Take a photograph'}
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
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  busy={uploading}
                  icon={<Plus className="h-4 w-4" />}
                >
                  {uploading ? 'Uploading' : 'Add photographs'}
                </Button>
              </>
            )}

            {id ? (
              <Button variant="ghost" onClick={handleOpenPastBakes}>
                From past bakes
              </Button>
            ) : null}

            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" />
            ) : null}
          </div>

          <p className="text-xs text-ink-muted">JPEG, PNG or WEBP. Up to 20MB each.</p>
        </div>
      </Panel>
    </div>
  );
}
