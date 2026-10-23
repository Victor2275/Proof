import { useSearchParams } from 'react-router-dom';
import ToBuy from './ToBuy';
import Cupboard from './Cupboard';
import { AccountSheetButton } from './AccountMenu';
import { PageHeader, Segmented } from './ui';

/*
 * Shop: what to buy, and what is already in the cupboard (change 23). The
 * grocery list and the pantry were two destinations for one errand; they are
 * two views of one place now, switched in place and kept in `?view=`. The
 * list is saved on the device and grouped by aisle (changes 121–124).
 */
type View = 'buy' | 'cupboard';

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'cupboard' ? 'cupboard' : 'buy';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Shop" actions={<AccountSheetButton className="md:hidden" />} />
      <Segmented
        label="Shop view"
        value={view}
        block
        className="sm:w-80"
        options={[
          { value: 'buy', label: 'To buy' },
          { value: 'cupboard', label: 'In the cupboard' },
        ]}
        onChange={(next) => setParams(next === 'buy' ? {} : { view: next }, { replace: true })}
      />
      {view === 'buy' ? <ToBuy /> : <Cupboard />}
    </div>
  );
}
