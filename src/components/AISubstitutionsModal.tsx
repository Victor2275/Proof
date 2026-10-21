import { useState } from 'react';
import { api } from '../lib/api';
import { usePlan } from '../lib/session';
import { Sparkles } from 'lucide-react';
import { AiGateNotice } from './AiGateSheet';
import { Button, Sheet, Skeleton } from './ui';

export interface AISubstitutionsModalProps {
  ingredientName: string;
  recipeTitle?: string;
  onClose: () => void;
}

/*
 * Substitutes for one ingredient, asked of the AI on request.
 *
 * Results are a ruled list, the way the ingredient list it came from is drawn,
 * rather than a stack of tinted cards inside the dialog.
 */
export default function AISubstitutionsModal({
  ingredientName,
  recipeTitle,
  onClose
}: AISubstitutionsModalProps) {
  const [substitutions, setSubstitutions] = useState<{ substitute: string; ratio: string; notes: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { can } = usePlan();
  const allowed = can('ai');

  const handleFetchSubstitutions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAISubstitutions(ingredientName, recipeTitle);
      setSubstitutions(data.substitutions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The substitutions couldn't be fetched.");
    } finally {
      setLoading(false);
    }
  };

  const idle = !substitutions && !loading;

  return (
    <Sheet open onClose={onClose} title="AI substitutions" size="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Find smart culinary alternatives for <strong className="font-medium text-ink">{ingredientName}</strong>.
        </p>

        {error ? (
          <p className="text-sm text-fault" role="alert">
            {error} Try again, or substitute by hand.
          </p>
        ) : null}

        {idle && !allowed ? <AiGateNotice feature="Substitutions" /> : null}

        {idle && allowed ? (
          <Button
            variant="primary"
            className="self-start"
            onClick={handleFetchSubstitutions}
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          >
            {error ? 'Try again' : 'Generate substitutions'}
          </Button>
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Finding substitutions">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 border-b border-rule pb-3 last:border-b-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : null}

        {substitutions && substitutions.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No substitutions came back for {ingredientName}.
          </p>
        ) : null}

        {substitutions && substitutions.length > 0 ? (
          <ul className="flex flex-col border-t border-rule">
            {substitutions.map((sub, idx) => (
              <li key={idx} className="flex flex-col gap-1 border-b border-rule py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-medium text-ink">{sub.substitute}</span>
                  <span className="label-silkscreen text-ink-muted">Ratio · {sub.ratio}</span>
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">{sub.notes}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Sheet>
  );
}
