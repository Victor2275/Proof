import { useSearchParams } from 'react-router-dom';
import Gallery from './Gallery';
import Analytics from './Analytics';
import { AccountSheetButton } from './AccountMenu';
import { PageHeader, Segmented } from './ui';

/*
 * Bakes: the bake log's own destination, one name for what used to be
 * Gallery, Bake History and Previous makes (changes 22, 25).
 *
 * The history and its totals are two views of the same log, switched in place
 * by a segmented control that writes `?view=` so a link and Back both keep it.
 */
type View = 'history' | 'totals';

export default function BakesPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'totals' ? 'totals' : 'history';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="Bakes" actions={<AccountSheetButton className="md:hidden" />} />
      <Segmented
        label="Bakes view"
        value={view}
        block
        className="sm:w-80"
        options={[
          { value: 'history', label: 'History' },
          { value: 'totals', label: 'Totals' },
        ]}
        onChange={(next) => setParams(next === 'history' ? {} : { view: next }, { replace: true })}
      />
      {view === 'history' ? <Gallery embedded /> : <Analytics embedded />}
    </div>
  );
}
