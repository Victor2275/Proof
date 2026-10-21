import { useId, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { aiAllowanceLine, setAccount, updateAccount, useSession, type Account } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { useBakeLogs, useRecipes } from '../lib/queries';
import { Button, Field, Panel, PanelRow, Sheet, TextArea } from './ui';

/*
 * Settings → Account (decisions B18, B23).
 *
 * Signed out, it is one line and the way in: an account is for publishing, and
 * the cookbook never needs one. Signed in, it is the account's readings — who,
 * which address, which plan, what is left of the month's AI — and the tools to
 * change, export or delete it. The line under the readings is the claim moment
 * made permanent: the cookbook is still on this device, unmoved.
 */

/** Saves a Blob as a download. */
function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function AccountPanel() {
  const { session } = useSession();
  const user = session.user;
  const { data: recipes = [] } = useRecipes();
  const { data: bakes = [] } = useBakeLogs();
  const [sheet, setSheet] = useState<'profile' | 'password' | 'delete' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  if (!user) {
    return (
      <Panel title="Account">
        <div id="account" className="flex flex-col gap-3">
          <p className="text-sm text-ink-muted">
            An account lets you publish recipes to the shared cookbook. Your own cookbook never needs one.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => requestAccount('signin')}>Sign in</Button>
            <Button variant="ghost" onClick={() => requestAccount('signup')}>
              Create an account
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  const signOut = async () => {
    // Ending the session on the server is a courtesy; signing this device out is the point.
    await api.signOut().catch(() => undefined);
    setAccount(null);
  };

  const exportAccount = async () => {
    setExporting(true);
    setError('');
    try {
      saveFile(await api.exportAccount(), 'proof-account.json');
      setMessage('Saved. It holds everything the server keeps for this account.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "The export couldn't be downloaded.");
    } finally {
      setExporting(false);
    }
  };

  const allowance = aiAllowanceLine(user);

  return (
    <Panel title="Account">
      <div id="account" className="flex flex-col gap-4">
        <div>
          <PanelRow label="Handle" value={`@${user.handle}`} />
          <PanelRow label="Email" value={user.emailVerified ? user.email : `${user.email} · unconfirmed`} />
          <PanelRow label="Plan" value={user.plan === 'pro' ? 'Pro' : 'Free'} />
          {allowance ? <PanelRow label="AI" value={allowance} /> : null}
        </div>
        <p className="text-sm text-ink">
          Your {plural(recipes.length, 'recipe', 'recipes')} and {plural(bakes.length, 'bake', 'bakes')} stay on this
          device. An account doesn't move them.
        </p>
        {message ? <p className="text-sm text-ink" role="status">{message}</p> : null}
        {error ? <p className="text-sm text-fault" role="alert">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSheet('profile')}>Profile</Button>
          <Button onClick={() => setSheet('password')}>Change password</Button>
          <Button onClick={exportAccount} busy={exporting}>
            Export account data
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
        <div className="border-t border-rule pt-4">
          <Button variant="danger" onClick={() => setSheet('delete')}>
            Delete account
          </Button>
        </div>
      </div>

      <ProfileSheet open={sheet === 'profile'} account={user} onClose={() => setSheet(null)} />
      <PasswordSheet
        open={sheet === 'password'}
        onClose={() => setSheet(null)}
        onDone={() => setMessage('Password changed. Every other device has been signed out.')}
      />
      <DeleteSheet open={sheet === 'delete'} onClose={() => setSheet(null)} />
    </Panel>
  );
}

function useFormState() {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fail = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'That did not work. Try again.';
    const field = err instanceof ApiError && err.field ? err.field : 'form';
    setErrors({ [field]: message });
  };
  return { busy, setBusy, errors, setErrors, fail };
}

function FormError({ message }: { message?: string }) {
  return message ? (
    <p className="text-sm text-fault" role="alert">
      {message}
    </p>
  ) : null;
}

function ProfileSheet({ open, account, onClose }: { open: boolean; account: Account; onClose: () => void }) {
  const formId = useId();
  const [displayName, setDisplayName] = useState(account.displayName);
  const [handle, setHandle] = useState(account.handle);
  const [bio, setBio] = useState(account.bio);
  const { busy, setBusy, errors, setErrors, fail } = useFormState();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      updateAccount(await api.updateMe({ displayName, handle, bio }));
      onClose();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Profile"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} busy={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-ink-muted">This is what people see on your published recipes and your profile.</p>
        <Field label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
        <Field
          label="Handle"
          leading={<span className="font-mono text-ink-muted">@</span>}
          autoCapitalize="none"
          spellCheck={false}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          error={errors.handle}
          hint="Changing it changes your profile's address."
        />
        <TextArea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} />
        <FormError message={errors.form} />
      </form>
    </Sheet>
  );
}

function PasswordSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const formId = useId();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const { busy, setBusy, errors, setErrors, fail } = useFormState();
  const { session } = useSession();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const { token } = await api.changePassword({ current, next });
      // The old session ended with the change; this device carries on with the new one.
      setAccount(token, session.user);
      setCurrent('');
      setNext('');
      onDone();
      onClose();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Change password"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} busy={busy}>
            Change password
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current}
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={errors.password}
          hint="At least 10 characters. Every other device will be signed out."
        />
        <FormError message={errors.form} />
      </form>
    </Sheet>
  );
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formId = useId();
  const [password, setPassword] = useState('');
  const { busy, setBusy, errors, setErrors, fail } = useFormState();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.deleteAccount(password);
      setAccount(null);
      onClose();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Delete account"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button variant="danger" type="submit" form={formId} busy={busy}>
            Delete account
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-ink">
          This deletes the account and takes down every recipe it published. It can't be undone.
        </p>
        <p className="text-sm text-ink-muted">
          Your cookbook on this device is not touched. Copies other people saved stay with them.
        </p>
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <FormError message={errors.form} />
      </form>
    </Sheet>
  );
}
