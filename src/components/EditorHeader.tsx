import { MoreHorizontal, Sparkles } from 'lucide-react';
import { BackButton, Button, Menu, MenuItem } from './ui';

/*
 * The editor's bar (changes 109–111).
 *
 * Back on the left, named for where it goes; on the right the one primary
 * action, Save, in paprika, and beside it "Tidy up with AI" in words rather
 * than as an unlabelled sparkle. Delete is not here: it lives in ⋯, away from
 * Save, and happens at once with Undo rather than asking first. The recipe's
 * name and what it amounts to so far ride along in the middle, so "what have
 * I got?" never needs a scroll to the bottom.
 */

interface EditorHeaderProps {
  id?: string;
  title: string;
  ingredientCount: number;
  stepCount: number;
  isRestructuring: boolean;
  saving: boolean;
  handleAIRestructure: () => void;
  handleDelete: () => void;
  backTo: string;
  backLabel: string;
}

export default function EditorHeader({
  id,
  title,
  ingredientCount,
  stepCount,
  isRestructuring,
  saving,
  handleAIRestructure,
  handleDelete,
  backTo,
  backLabel,
}: EditorHeaderProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-rule bg-paper px-4 py-2 md:mx-0 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 sm:gap-x-4">
        <div className="flex min-w-0 items-center gap-2">
          <BackButton to={backTo} label={backLabel} />
          <div className="hidden min-w-0 sm:block">
            <p className="font-title truncate text-base leading-tight text-ink">{title.trim() || (id ? 'Untitled recipe' : 'New recipe')}</p>
            <p className="text-xs text-ink-muted">
              {ingredientCount} {ingredientCount === 1 ? 'ingredient' : 'ingredients'} · {stepCount} {stepCount === 1 ? 'step' : 'steps'}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* "Tidy up", without its sparkle, on a phone, so the bar stays one line at 375px; the name stays whole. */}
          <Button
            variant="ghost"
            onClick={handleAIRestructure}
            busy={isRestructuring}
            aria-label={isRestructuring ? 'Tidying' : 'Tidy up with AI'}
            icon={<Sparkles className="hidden h-4 w-4 sm:block" aria-hidden="true" />}
          >
            {isRestructuring ? 'Tidying' : (
              <span>
                Tidy up<span className="hidden sm:inline"> with AI</span>
              </span>
            )}
          </Button>
          {id ? (
            <Menu
              label="More"
              align="right"
              trigger={(props) => (
                <button
                  type="button"
                  {...props}
                  aria-label="More: delete"
                  className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper-sunk"
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            >
              <MenuItem onSelect={handleDelete}>Delete this recipe</MenuItem>
            </Menu>
          ) : null}
          <Button type="submit" variant="primary" busy={saving}>
            {saving ? 'Saving' : id ? 'Save' : 'Create recipe'}
          </Button>
        </div>
      </div>
    </div>
  );
}
