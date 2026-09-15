import { cn } from '../../lib/cn';

/*
 * The instrument row.
 *
 * On the panel this is the bank of voices — BD, SD, LT — each a short
 * silkscreened label with a lamp beneath it. In Proof it carries presence and
 * absence: the ingredients a recipe needs, lit when the pantry has them and
 * dark when it does not, readable in one sweep without reading a list.
 *
 * Lit state is never colour alone. The lamp changes shape as well as fill, and
 * every item carries a text alternative, so the row survives both a colour
 * vision difference and a screen reader.
 */

export interface InstrumentItem {
  id: string;
  /** Short silkscreen label — abbreviated to fit the lamp's column. */
  label: string;
  lit: boolean;
  /** Full name, for the tooltip and the accessible description. */
  title?: string;
}

export interface InstrumentRowProps {
  items: InstrumentItem[];
  /** What the lamps mean, e.g. "In pantry". Used to name the list. */
  legend: string;
  onSelect?: (item: InstrumentItem) => void;
  className?: string;
}

export function InstrumentRow({ items, legend, onSelect, className }: InstrumentRowProps) {
  if (items.length === 0) return null;

  return (
    <ul
      className={cn('flex flex-wrap items-start gap-x-4 gap-y-3', className)}
      aria-label={legend}
    >
      {items.map((item) => {
        const name = item.title ?? item.label;
        const content = (
          <>
            <span className="label-silkscreen block text-center">{item.label}</span>
            <span
              className={cn(
                'mx-auto mt-1 block h-2 w-2',
                // Lit lamps are square and filled; dark lamps are a hollow
                // outline, so state reads without relying on colour.
                //
                // Filled is bone, not signal: the signal colour is reserved for
                // what is happening *now*, and an ingredient sitting in the
                // pantry is not an event.
                item.lit ? 'bg-ink' : 'border border-key-unlit bg-transparent',
              )}
              aria-hidden="true"
            />
            <span className="sr-only">
              {name} — {item.lit ? legend : `not ${legend.toLowerCase()}`}
            </span>
          </>
        );

        return (
          <li key={item.id} className="min-w-10">
            {onSelect ? (
              <button
                type="button"
                title={name}
                onClick={() => onSelect(item)}
                className="block w-full rounded-control px-1 py-1 hover:bg-panel-sunk"
              >
                {content}
              </button>
            ) : (
              <span title={name} className="block px-1 py-1">
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
