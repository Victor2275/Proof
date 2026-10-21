import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../lib/api';
import { setAccount } from '../lib/session';
import { STORED_ON_DEVICE } from '../lib/storage';
import { Button, Field, Sheet } from './ui';

/*
 * Signing in, and making an account (decision B20).
 *
 * A sheet, opened from whatever needed an account — Publish, the account row
 * in More and Settings — never a permanent button in the chrome. Making an
 * account moves nothing: the cookbook on this device is already there and
 * stays exactly as it is (B18), which the sheet says before anyone has to
 * wonder.
 */

export type AccountMode = 'signin' | 'signup' | 'forgot';

export interface AccountSheetProps {
  open: boolean;
  mode: AccountMode;
  onModeChange: (mode: AccountMode) => void;
  onClose: () => void;
  /** Why the sheet was opened, when something asked for it: "Sign in to publish". */
  reason?: string;
}

type Errors = Partial<Record<'email' | 'password' | 'handle' | 'form', string>>;

export default function AccountSheet({ open, mode, onModeChange, onClose, reason }: AccountSheetProps) {
  const formId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  // Each opening starts clean; a password never waits in a closed sheet.
  useEffect(() => {
    if (!open) return;
    setPassword('');
    setErrors({});
  }, [open, mode]);

  const signup = mode === 'signup';
  const forgot = mode === 'forgot';
  const [resetSent, setResetSent] = useState(false);
  const [unconfirmedNote, setUnconfirmedNote] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResetSent(false);
    setUnconfirmedNote(false);
  }, [open, mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    if (forgot) {
      try {
        await api.forgotPassword(email);
        setResetSent(true);
      } catch (err) {
        setErrors({ form: err instanceof Error ? err.message : "The link couldn't be sent. Try again." });
      } finally {
        setBusy(false);
      }
      return;
    }
    try {
      const result = signup
        ? await api.signUp({ email, password, handle, displayName: displayName || undefined })
        : await api.signIn({ email, password });
      setAccount(result.token, result.user);
      setPassword('');
      // A new account whose confirmation could not be sent is told, not left waiting.
      if (signup && result.verificationSent === false) {
        setUnconfirmedNote(true);
        return;
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'That did not work. Try again.';
      const field = err instanceof ApiError ? err.field : undefined;
      setErrors(field === 'email' || field === 'password' || field === 'handle' ? { [field]: message } : { form: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={signup ? 'Create an account' : forgot ? 'Reset password' : 'Sign in'}
      size="sm"
      initialFocus={emailRef}
      footer={
        unconfirmedNote || resetSent ? (
          <Button
            onClick={() => {
              setUnconfirmedNote(false);
              onClose();
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => onModeChange(signup || forgot ? 'signin' : 'signup')}>
              {signup || forgot ? 'I have an account' : 'Create an account'}
            </Button>
            <Button variant="primary" type="submit" form={formId} busy={busy}>
              {signup ? 'Create account' : forgot ? 'Send the link' : 'Sign in'}
            </Button>
          </>
        )
      }
    >
      {unconfirmedNote ? (
        <p className="text-sm text-ink" role="status">
          Your account is ready, but this Proof site couldn't send the confirmation email. Everything but publishing,
          comments and the AI works now; the operator can confirm your account.
        </p>
      ) : resetSent ? (
        <p className="text-sm text-ink" role="status">
          If an account uses {email}, a link to set a new password is on its way. It works for an hour.
        </p>
      ) : (
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {reason ? <p className="text-sm text-ink">{reason}</p> : null}
        <p className="text-sm text-ink-muted">
          {signup
            ? 'An account lets you publish to the shared cookbook. Your cookbook stays on this device exactly as it is.'
            : forgot
              ? "We'll email a link to set a new password."
              : STORED_ON_DEVICE}
        </p>

        <Field
          ref={emailRef}
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        {signup ? (
          <>
            <Field
              label="Handle"
              leading={<span className="font-mono text-ink-muted">@</span>}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              error={errors.handle}
              hint="Your public name: 3 to 24 letters, numbers or underscores."
              required
            />
            <Field
              label="Display name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              hint="Optional."
            />
          </>
        ) : null}
        {forgot ? null : (
          <Field
            label="Password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint={signup ? 'At least 10 characters.' : undefined}
            required
          />
        )}
        {mode === 'signin' ? (
          <button
            type="button"
            onClick={() => onModeChange('forgot')}
            className="label-silkscreen flex min-h-11 items-center self-start text-ink-muted underline decoration-1 underline-offset-4 hover:text-ink"
          >
            Forgot password?
          </button>
        ) : null}

        {errors.form ? (
          <p className="text-sm text-fault" role="alert">
            {errors.form}
          </p>
        ) : null}
      </form>
      )}
    </Sheet>
  );
}
