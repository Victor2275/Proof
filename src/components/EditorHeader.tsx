import { ArrowLeft, Sparkles, Trash2, Save } from 'lucide-react';
import { Button } from './ui';

/*
 * The editor's instrument bar.
 *
 * It rides the top of the form and reports what the recipe currently amounts
 * to — its name, how many ingredients, how many steps — beside the controls
 * that act on it. Authoring is the one place in Proof where the thing being
 * operated is not yet finished, so the bar answers "what have I got so far?"
 * without a scroll to the bottom.
 *
 * Counts are set in tabular mono rather than seven-segment: the readout is
 * reserved for instrument values, and spending it on every number would spend
 * the effect.
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
  onBack: () => void;
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-sm text-ink">{value}</span>
      <span className="label-silkscreen">{label}</span>
    </span>
  );
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
  onBack,
}: EditorHeaderProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 mb-8 border-b border-rule bg-ground px-4 py-3 md:mx-0 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            onClick={onBack}
            icon={<ArrowLeft className="h-4 w-4" />}
            aria-label="Go back without saving"
          >
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <p className="truncate font-faceplate text-base leading-tight text-ink">
              {title.trim() || (id ? 'Untitled recipe' : 'New recipe')}
            </p>
            <div className="flex items-center gap-3">
              <Count label={ingredientCount === 1 ? 'ingredient' : 'ingredients'} value={ingredientCount} />
              <Count label={stepCount === 1 ? 'step' : 'steps'} value={stepCount} />
            </div>
          </div>
        </div>

        {/*
          * Full-height controls: 44px is the floor for anything a thumb has to
          * hit, and these are the page's only controls on a phone. Their labels
          * drop below `sm` so the row stays one row rather than wrapping into
          * three and eating a sixth of the screen — the icon keeps the meaning,
          * and the accessible name is carried either way.
          */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleAIRestructure}
            busy={isRestructuring}
            icon={<Sparkles className="h-4 w-4" />}
            aria-label={isRestructuring ? 'Reading the recipe' : 'Restructure with AI'}
          >
            <span className="hidden sm:inline">
              {isRestructuring ? 'Reading' : 'Restructure'}
            </span>
          </Button>
          {id ? (
            <Button
              variant="danger"
              onClick={handleDelete}
              icon={<Trash2 className="h-4 w-4" />}
              aria-label="Delete recipe"
            >
              <span className="hidden sm:inline">Delete</span>
            </Button>
          ) : null}
          {/*
            * Outlined, not filled. Signal red means a thing is running now, and
            * nothing on this page is: the editor writes a pattern, it does not
            * play one. The Pantry's own Add control makes the same choice.
            */}
          <Button
            type="submit"
            variant="secondary"
            busy={saving}
            icon={<Save className="h-4 w-4" />}
          >
            {id ? 'Save recipe' : 'Create recipe'}
          </Button>
        </div>
      </div>
    </div>
  );
}
