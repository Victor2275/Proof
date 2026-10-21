import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { updateAccount, userToken } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { Button, Field, Panel, buttonClassName } from './ui';

/*
 * Where an emailed link lands: /verify confirms an address, /reset sets a new
 * password. Each is one panel that says what happened and what to do next.
 */

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [message, setMessage] = useState('');
  // The link is spent on first use, so StrictMode's second effect must not send it again.
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    api
      .verifyEmail(token)
      .then(({ user }) => {
        // This device may be signed in as the account just confirmed.
        if (userToken()) updateAccount(user);
        setState('done');
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : 'That link did not work.');
        setState('failed');
      });
  }, [token]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <Panel title="Confirm email">
        {state === 'working' ? (
          <p className="text-ink-muted" role="status">
            Confirming…
          </p>
        ) : state === 'done' ? (
          <div className="flex flex-col gap-3" role="status">
            <p className="text-ink">Your email is confirmed. You can publish recipes, comment, and use the AI.</p>
            <Link to="/" className={buttonClassName({ variant: 'secondary', className: 'self-start' })}>
              Open the cookbook
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ink">{message}</p>
            <Link to="/settings#account" className={buttonClassName({ variant: 'secondary', className: 'self-start' })}>
              Settings → Account
            </Link>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const formId = useId();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "The password couldn't be changed.",
        field: err instanceof ApiError ? err.field : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <Panel title="New password">
        {done ? (
          <div className="flex flex-col gap-3" role="status">
            <p className="text-ink">Password changed. Every device was signed out; sign in with the new one.</p>
            <Button className="self-start" onClick={() => requestAccount('signin')}>
              Sign in
            </Button>
          </div>
        ) : (
          <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error?.field === 'password' ? error.message : undefined}
              hint="At least 10 characters."
            />
            {error && error.field !== 'password' ? (
              <p className="text-sm text-fault" role="alert">
                {error.message}
              </p>
            ) : null}
            <Button variant="primary" type="submit" className="self-start" busy={busy}>
              Set password
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
