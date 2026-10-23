import type { ReactNode } from 'react';
import { CAN_MAKE_MISSING, NO_FILTER, type CookbookFilter } from '../lib/cookbook';
import { Button, Segmented, Select, Sheet } from './ui';

/*
 * Narrowing the cookbook (change 52): by chapter, by difficulty, by whether it
 * has been baked yet, to the favourites, to what is published, and to what the
 * cupboard can nearly make now. Each change applies at once, so the count on
 * the page behind moves as the sheet is used; Done closes it.
 */
export interface CookbookFilterSheetProps {
  open: boolean;
  onClose: () => void;
  value: CookbookFilter;
  onChange: (next: CookbookFilter) => void;
  /** Chapters to offer; empty inside a chapter, which is already one. */
  chapters: string[];
  hasPantry: boolean;
  signedIn: boolean;
}

function Switch({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 border-b border-rule py-2">
      <span className="flex flex-col">
        <span className="text-[0.9375rem] text-ink">{label}</span>
        {hint ? <span className="text-sm text-ink-muted">{hint}</span> : null}
      </span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-ink" />
    </label>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-rule pb-4">
      <span className="ui-label">{label}</span>
      {children}
    </div>
  );
}

export default function CookbookFilterSheet({ open, onClose, value, onChange, chapters, hasPantry, signedIn }: CookbookFilterSheetProps) {
  const set = (patch: Partial<CookbookFilter>) => onChange({ ...value, ...patch });
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter"
      placement="bottom"
      size="md"
      detents
      initialDetent={1}
      actions={
        <Button size="sm" variant="ghost" onClick={() => onChange(NO_FILTER)}>
          Clear
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {chapters.length ? (
          <Row label="Chapter">
            <Select label="Chapter" hideLabel value={value.chapter ?? ''} onChange={(e) => set({ chapter: e.target.value || null })}>
              <option value="">Every chapter</option>
              {chapters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Row>
        ) : null}
        <Row label="Difficulty">
          <Segmented
            label="Difficulty"
            block
            value={value.difficulty ?? 'any'}
            onChange={(v) => set({ difficulty: v === 'any' ? null : v })}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'Easy', label: 'Easy' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Hard', label: 'Hard' },
            ]}
          />
        </Row>
        <Row label="Baked">
          <Segmented
            label="Baked"
            block
            value={value.baked}
            onChange={(v) => set({ baked: v })}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'baked', label: 'Baked' },
              { value: 'not-yet', label: 'Not yet' },
            ]}
          />
        </Row>
        <div className="flex flex-col">
          <Switch label="Favourites" on={value.favourites} onChange={(favourites) => set({ favourites })} />
          {signedIn ? <Switch label="Published" hint="In the shared cookbook" on={value.published} onChange={(published) => set({ published })} /> : null}
          {hasPantry ? (
            <Switch
              label="Can make now"
              hint={`Everything in the cupboard, or ${CAN_MAKE_MISSING} things short at most`}
              on={value.canMake}
              onChange={(canMake) => set({ canMake })}
            />
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
