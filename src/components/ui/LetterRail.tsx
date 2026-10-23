import { useRef, type PointerEvent } from 'react';
import { cn } from '../../lib/cn';
import { haptic } from '../../lib/haptics';

/*
 * The thumb index down the edge of a book's index (APP_FEEL_DEBATE L7).
 *
 * A column of letters; pressing one, or sliding a thumb down the column, jumps
 * the index to that letter with a selection tick at each new one. Letters with
 * no recipes are printed pale and do nothing. It is navigation, so it is a
 * `<nav>` of real links to the letter headings — a keyboard reaches each
 * letter, and the slide is only an accelerator for the same thing. Each zone
 * is 44px wide, the full height of the column shared between the letters.
 */
export interface LetterRailProps {
  /** The letters that have entries. */
  letters: string[];
  /** The heading id for a letter: `index-A`. */
  idFor: (letter: string) => string;
  onJump: (letter: string) => void;
  className?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export function LetterRail({ letters, idFor, onJump, className }: LetterRailProps) {
  const present = new Set(letters);
  const last = useRef<string | null>(null);

  const jump = (letter: string) => {
    if (!present.has(letter) || letter === last.current) return;
    last.current = letter;
    haptic('selection');
    onJump(letter);
  };

  // While a finger slides, find the letter under it.
  const slide = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' || e.buttons === 0) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-letter]');
    if (el?.dataset.letter) jump(el.dataset.letter);
  };

  return (
    <nav
      aria-label="Jump to a letter"
      onPointerMove={slide}
      onPointerUp={() => (last.current = null)}
      className={cn('flex w-11 touch-none select-none flex-col items-stretch font-sans text-xs font-semibold', className)}
    >
      {ALPHABET.filter((l) => l !== '#' || present.has('#')).map((letter) =>
        present.has(letter) ? (
          <a
            key={letter}
            href={`#${idFor(letter)}`}
            data-letter={letter}
            onClick={(e) => {
              e.preventDefault();
              last.current = null;
              jump(letter);
            }}
            className="flex min-h-[1.3rem] flex-1 items-center justify-center rounded-full text-ink-2 hover:bg-paper-sunk"
          >
            {letter}
          </a>
        ) : (
          <span key={letter} aria-hidden="true" className="flex min-h-[1.3rem] flex-1 items-center justify-center text-rule-strong">
            {letter}
          </span>
        ),
      )}
    </nav>
  );
}
