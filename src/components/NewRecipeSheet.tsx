import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardPaste, FilePen, PenLine, Plus, ScanText } from 'lucide-react';
import { draftKeyFor, readRecipeDraft } from '../lib/recipeDraft';
import type { LucideIcon } from 'lucide-react';
import { Button, Sheet, cn } from './ui';

/*
 * New: the ways a recipe gets into the cookbook.
 *
 * A labelled button in the header (never a floating +) opens a sheet with the
 * doors, each a whole-card target that says what happens behind it. Writing
 * from a blank page is one way in; pasting a link or a block of text is
 * another; photographing a page of a cookbook or a recipe card is the third.
 * The editor opens on whichever was chosen. A recipe left half-written leads
 * the list as "Continue your draft".
 */
interface Door {
  to: string;
  title: string;
  sub: string;
  icon: LucideIcon;
}

const NEW_RECIPE_DOORS: Door[] = [
  { to: '/new?start=blank', title: 'Write it', sub: 'Start from a blank page', icon: PenLine },
  { to: '/new?start=paste', title: 'Paste a link or text', sub: 'Tidied into ingredients and steps', icon: ClipboardPaste },
  { to: '/new?start=photo', title: 'Photograph a page', sub: 'From a cookbook or a recipe card', icon: ScanText },
];

/** The ways in, led by the unsaved draft when there is one. Read as the doors are drawn. */
function doorsNow(): { doors: Door[]; hasDraft: boolean } {
  const draft = readRecipeDraft(draftKeyFor());
  if (!draft) return { doors: NEW_RECIPE_DOORS, hasDraft: false };
  const resume: Door = { to: '/new', title: 'Continue your draft', sub: draft.recipe.title.trim() || 'Untitled recipe', icon: FilePen };
  return { doors: [resume, ...NEW_RECIPE_DOORS], hasDraft: true };
}

function DoorLink({ door, onChoose, className }: { door: Door; onChoose?: () => void; className?: string }) {
  const { to, title, sub, icon: Icon } = door;
  return (
    <Link
      to={to}
      onClick={onChoose}
      className={cn('pressable flex min-h-[5.25rem] items-center gap-4 rounded-panel bg-paper-sunk px-4 py-3.5 hover:bg-paper-tonal', className)}
    >
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-paper-raised text-ink-2">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-title text-[1.1875rem] text-ink">{title}</span>
        <span className="truncate text-sm text-ink-muted">{sub}</span>
      </span>
    </Link>
  );
}

const REPLACES = 'Starting another replaces the draft once you type.';

/** The ways in, as whole-card links: in the New sheet, and on an empty cookbook. */
export function NewRecipeDoors({ onChoose }: { onChoose?: () => void }) {
  const { doors, hasDraft } = doorsNow();
  return (
    <div className="flex flex-col gap-2">
      <nav aria-label="Ways to add a recipe" className="grid gap-2.5 sm:grid-cols-3">
        {doors.map((door, i) => (
          <DoorLink key={door.to} door={door} onChoose={onChoose} className={hasDraft && i === 0 ? 'sm:col-span-3' : undefined} />
        ))}
      </nav>
      {hasDraft ? <p className="text-[0.8125rem] text-ink-muted">{REPLACES}</p> : null}
    </div>
  );
}

export function NewRecipeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { doors, hasDraft } = doorsNow();
  return (
    <Sheet open={open} onClose={onClose} title="New recipe" placement="bottom" detents>
      <nav aria-label="Ways to add a recipe" className="flex flex-col gap-2.5">
        {doors.map((door) => (
          <DoorLink key={door.to} door={door} onChoose={onClose} />
        ))}
      </nav>
      {hasDraft ? <p className="mt-6 text-[0.8125rem] text-ink-muted">{REPLACES}</p> : null}
    </Sheet>
  );
}

/** The header control that opens the sheet: "+ New", labelled, never a bare icon. */
export function NewRecipeButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        className={cn('rounded-full pl-3', className)}
        icon={<Plus className="h-[18px] w-[18px]" aria-hidden="true" />}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        New
      </Button>
      <NewRecipeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
