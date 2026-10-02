import { useState } from 'react';
import { api } from '../lib/api';
import { Sparkles, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui';

export interface AISubstitutionsModalProps {
  ingredientName: string;
  recipeTitle?: string;
  onClose: () => void;
}

export default function AISubstitutionsModal({
  ingredientName,
  recipeTitle,
  onClose
}: AISubstitutionsModalProps) {
  const [substitutions, setSubstitutions] = useState<{ substitute: string; ratio: string; notes: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetchSubstitutions = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.dispatchEvent(new Event('auth-required'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await api.getAISubstitutions(ingredientName, recipeTitle);
      setSubstitutions(data.substitutions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch AI substitutions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrim fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-paper rounded-xl w-full max-w-md shadow-2xl border border-border-subtle p-6 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border-subtle pb-4 mb-4">
          <div className="label-silkscreen flex items-center gap-2 text-ink">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>AI Substitutions</span>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-ink-muted mb-6">
          Find smart culinary alternatives for <strong className="text-ink">{ingredientName}</strong>.
        </p>

        {!substitutions && !loading && (
          <div className="text-center py-6">
            <Button
              variant="primary"
              onClick={handleFetchSubstitutions}
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
              className="mx-auto"
            >
              Generate substitutions
            </Button>
            <p className="text-xs text-ink-muted mt-3">Admin PIN required</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10 text-ink-muted">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> Consulting AI Chef...
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-control border border-fault bg-panel p-3 text-sm text-fault" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {substitutions && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {substitutions.map((sub, idx) => (
              <div key={idx} className="bg-black/5 dark:bg-white/5 border border-border-subtle p-3.5 rounded-lg space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base text-ink">{sub.substitute}</span>
                  <span className="label-silkscreen shrink-0 rounded-key border border-rule px-2 py-0.5 text-ink-muted">
                    Ratio: {sub.ratio}
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{sub.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
