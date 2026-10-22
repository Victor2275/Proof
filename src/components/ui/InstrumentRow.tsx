import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

/*
 * A row of small chips that say present or absent at a glance: the
 * ingredients a recipe needs, ticked when the pantry has them.
 *
 * Present is never colour alone. A present chip carries a tick and a sage
 * edge; an absent one is a plain outline. Every chip also carries its state in
 * words for a screen reader.
 */

export interface InstrumentItem {
  id: string;
  /** Short label — abbreviated to fit a chip. */
  label: string;
  lit: boolean;
  /** Full name, for the tooltip and the accessible description. */
  title?: string;
}

export interface InstrumentRowProps {
  items: InstrumentItem[];
  /** What a tick means, e.g. "In pantry". Used to name the list. */
  legend: string;
  onSelect?: (item: InstrumentItem) => void;
  className?: string;
}

export function InstrumentRow({ items, legend, onSelect, className }: InstrumentRowProps) {
  if (items.length === 0) return null;

  return (
    <ul className={cn('flex flex-wrap items-start gap-2', className)} aria-label={legend}>
      {items.map((item) => {
        const name = item.title ?? item.label;
        const chip = cn(
          'inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-sm',
          item.lit ? 'border-sage text-ink' : 'border-rule-strong text-ink-muted',
        );
        const content = (
          <>
            {item.lit ? <Check className="h-3.5 w-3.5 text-sage" strokeWidth={2.5} aria-hidden="true" /> : null}
            <span aria-hidden="true">{item.label}</span>
            <span className="sr-only">
              {name} — {item.lit ? legend : `not ${legend.toLowerCase()}`}
            </span>
          </>
        );

        return (
          <li key={item.id}>
            {onSelect ? (
              <button
                type="button"
                title={name}
                onClick={() => onSelect(item)}
                className={cn(chip, 'pressable hover:bg-paper-sunk')}
              >
                {content}
              </button>
            ) : (
              <span title={name} className={chip}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
