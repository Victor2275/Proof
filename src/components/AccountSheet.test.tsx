import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AccountSheet, { type AccountMode } from './AccountSheet';
import AccountPanel from './AccountPanel';
import { api, ApiError } from '../lib/api';
import { setAccount, userToken, type Account } from '../lib/session';
import { ACCOUNT_PROMPT_EVENT } from '../lib/accountPrompt';
import { makeBakeLog, makeRecipe, renderScreen, seed } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ ok: true }),
    deleteAccount: vi.fn(),
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    exportAccount: vi.fn(),
  },
}));

const ADA: Account = {
  id: 'u1', email: 'ada@example.com', handle: 'ada', displayName: 'Ada', bio: '', emailVerified: false,
  plan: 'free', pro: false, joinedAt: '2026-10-01', planExpiresAt: null, ai: { used: 0, limit: 5, period: '2026-10' },
};

function Harness({ initial = 'signin' as AccountMode, onClose = () => {} }) {
  const [mode, setMode] = useState<AccountMode>(initial);
  return <AccountSheet open mode={mode} onModeChange={setMode} onClose={onClose} />;
}

afterEach(() => setAccount(null));

describe('the account sheet', () => {
  it('signs in and keeps the account on the device', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    vi.mocked(api.signIn).mockResolvedValue({ token: 'tok', user: ADA });
    renderScreen(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.signIn).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct horse battery' });
    expect(userToken()).toBe('tok');
  });

  it('switches to making an account, which asks for a handle', async () => {
    const user = userEvent.setup();
    renderScreen(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(await screen.findByRole('dialog', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Handle')).toBeInTheDocument();
    // Before anyone has to wonder: nothing moves.
    expect(screen.getByText(/Your cookbook stays on this device exactly as it is/)).toBeInTheDocument();
  });

  it('puts the server\'s objection on the field it names', async () => {
    const user = userEvent.setup();
    vi.mocked(api.signUp).mockRejectedValue(new ApiError('That handle is taken. Pick another.', 409, false, 'handle'));
    renderScreen(<Harness initial="signup" />);

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Handle'), 'ada');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('That handle is taken. Pick another.')).toBeInTheDocument();
    expect(screen.getByLabelText('Handle')).toHaveAttribute('aria-invalid', 'true');
  });

  it('says a wrong password plainly, keeping the email', async () => {
    const user = userEvent.setup();
    vi.mocked(api.signIn).mockRejectedValue(new ApiError("That email and password don't match an account.", 401));
    renderScreen(<Harness />);
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/don't match an account/);
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
  });
});

describe('Settings → Account', () => {
  beforeEach(async () => {
    await seed('recipes', [makeRecipe({ _id: 'r1' }), makeRecipe({ _id: 'r2' })]);
    await seed('bakeLogs', [makeBakeLog({ _id: 'b1' })]);
  });

  it('signed out, offers the way in without suggesting the cookbook needs it', async () => {
    const user = userEvent.setup();
    const asked = vi.fn();
    window.addEventListener(ACCOUNT_PROMPT_EVENT, asked);
    renderScreen(<AccountPanel />);

    expect(screen.getByText(/Your own cookbook never needs one/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(asked).toHaveBeenCalled();
    window.removeEventListener(ACCOUNT_PROMPT_EVENT, asked);
  });

  it("signed in, reads the account and says the cookbook didn't move (B18)", async () => {
    setAccount('tok', ADA);
    renderScreen(<AccountPanel />);
    expect(screen.getByText('@ada')).toBeInTheDocument();
    expect(screen.getByText(/ada@example.com · unconfirmed/)).toBeInTheDocument();
    expect(await screen.findByText(/Your 2 recipes and 1 bake stay on this device/)).toBeInTheDocument();
  });

  it('shows the month\'s AI once the email is confirmed', () => {
    setAccount('tok', { ...ADA, emailVerified: true, ai: { used: 2, limit: 5, period: '2026-10' } });
    renderScreen(<AccountPanel />);
    expect(screen.getByText('3 of 5 left this month')).toBeInTheDocument();
  });

  it('signs this device out', async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    renderScreen(<AccountPanel />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(userToken()).toBeNull());
  });

  it('deletes the account only with the password, and keeps the cookbook', async () => {
    const user = userEvent.setup();
    setAccount('tok', ADA);
    vi.mocked(api.deleteAccount).mockRejectedValueOnce(
      new ApiError("That isn't the account's password. Nothing was deleted.", 401, false, 'password'),
    );
    renderScreen(<AccountPanel />);

    await user.click(screen.getByRole('button', { name: 'Delete account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete account' });
    expect(dialog).toHaveTextContent(/Your cookbook on this device is not touched/);

    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getAllByRole('button', { name: 'Delete account' }).at(-1)!);
    expect(await screen.findByText(/Nothing was deleted/)).toBeInTheDocument();
    expect(userToken()).toBe('tok');

    vi.mocked(api.deleteAccount).mockResolvedValueOnce({ ok: true });
    await user.click(screen.getAllByRole('button', { name: 'Delete account' }).at(-1)!);
    await waitFor(() => expect(userToken()).toBeNull());
  });
});
