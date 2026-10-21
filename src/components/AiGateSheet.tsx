import { aiAllowanceLine, useSession } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { Button, Sheet } from './ui';

/*
 * What an AI control says when it can't run yet (decision B10).
 *
 * The control stays visible and works up to this point; reaching for it says
 * what the feature does, why it is not open to this person yet, and what would
 * open it — rather than raising a PIN prompt at someone who has no PIN. Every
 * AI call costs money, so it runs for accounts with a confirmed email, as a
 * monthly allowance (server/services/aiQuota.ts).
 */

/** The explanation itself, for a surface that is already a sheet. */
export function AiGateNotice({ feature }: { feature: string }) {
  const { session } = useSession();
  const user = session.user;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {!user ? (
        <>
          <p className="text-ink">
            {feature} runs on Proof's server, where every request costs money to answer. An account with a
            confirmed email gets a free allowance each month.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => requestAccount('signin', `Sign in to use ${feature.toLowerCase()}.`)}>Sign in</Button>
            <Button variant="ghost" onClick={() => requestAccount('signup')}>
              Create an account
            </Button>
          </div>
        </>
      ) : (
        <p className="text-ink">
          {feature} opens once your email is confirmed. The link is in the message sent to {user.email}.
        </p>
      )}
      <p className="text-ink-muted">
        Everything else works now, free and offline: your recipes, bakes, photographs and notes stay on this device.
      </p>
    </div>
  );
}

/** "3 of 5 left this month", in the foot of an AI sheet (B11). Nothing for the operator or a stranger. */
export function AiAllowance() {
  const { session } = useSession();
  const line = aiAllowanceLine(session.user);
  if (!line || session.isOperator) return null;
  return <p className="label-silkscreen font-mono tabular-nums text-ink-muted">AI · {line}</p>;
}

export interface AiGateSheetProps {
  open: boolean;
  onClose: () => void;
  /** What the person was reaching for: "Import from a URL", "Restructure". */
  feature: string;
}

export default function AiGateSheet({ open, onClose, feature }: AiGateSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={feature} size="sm" footer={<Button onClick={onClose}>Close</Button>}>
      <AiGateNotice feature={feature} />
    </Sheet>
  );
}
