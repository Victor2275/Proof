import { Link } from 'react-router-dom';
import { Button, Sheet, buttonClassName } from './ui';

/*
 * What an AI control says when it can't run yet (decision B10).
 *
 * The control stays visible and works up to this point; reaching for it says
 * what the feature does, why it is not open, and that everything kept on the
 * device is unaffected — rather than raising a PIN prompt at someone who has
 * no PIN. Until accounts carry a monthly allowance (Phases 2 and 4), the AI
 * runs only for the site operator, because every call costs money.
 */

/** The explanation itself, for a surface that is already a sheet. */
export function AiGateNotice({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-ink">
        {feature} runs on Proof's server, where every request costs money to answer. It opens to everyone
        with accounts, as a small free allowance each month.
      </p>
      <p className="text-ink-muted">
        Everything else works now, free and offline: your recipes, bakes, photographs and notes stay on this
        device.
      </p>
    </div>
  );
}

export interface AiGateSheetProps {
  open: boolean;
  onClose: () => void;
  /** What the person was reaching for: "Import from a URL", "Restructure". */
  feature: string;
}

export default function AiGateSheet({ open, onClose, feature }: AiGateSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={feature}
      size="sm"
      footer={
        <>
          <Link to="/settings" className={buttonClassName({ variant: 'ghost' })} onClick={onClose}>
            Operator sign-in
          </Link>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <AiGateNotice feature={feature} />
    </Sheet>
  );
}
