import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Moderation from './Moderation';
import { api, type AccountDetail, type StaffAccount } from '../lib/api';
import { setAccount, type Account } from '../lib/session';
import { describeEntry } from '../lib/moderationLog';
import { renderScreen } from '../test/utils';

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  api: {
    getModerationQueue: vi.fn(),
    getModerationLog: vi.fn(),
    listAccounts: vi.fn(),
    getAccount: vi.fn(),
    confirmAccount: vi.fn(),
    setAccountRole: vi.fn(),
    suspendAccount: vi.fn(),
    unsuspendAccount: vi.fn(),
    signOutAccount: vi.fn(),
  },
}));

const MOD: Account = {
  id: 'm1', email: 'mod@example.com', handle: 'madboy2275', displayName: '', bio: '', emailVerified: true,
  plan: 'free', pro: false, moderator: true, joinedAt: '2026-10-01', planExpiresAt: null,
};

const staff = (overrides: Partial<StaffAccount> = {}): StaffAccount => ({
  id: 'u1', handle: 'ada', displayName: 'Ada', email: 'ada@example.com', emailVerified: true, moderator: false,
  pro: false, plan: 'free', joinedAt: '2026-10-20T00:00:00.000Z', suspended: false, suspendedAt: null, suspendedReason: '',
  ...overrides,
});

const detail = (account: StaffAccount, overrides: Partial<AccountDetail> = {}): AccountDetail => ({
  account, sessions: 1, published: [], comments: [], reports: [], log: [], ...overrides,
});

const mocked = vi.mocked(api);

beforeEach(() => {
  setAccount('tok', MOD);
  mocked.getModerationQueue.mockResolvedValue({ recipes: [], comments: [], reports: [] });
  mocked.getModerationLog.mockResolvedValue({ items: [], total: 0 });
});

afterEach(() => {
  setAccount(null);
  vi.clearAllMocks();
});

describe('Moderation', () => {
  it('shows nothing at this address to an account that is not a moderator', () => {
    setAccount('tok', { ...MOD, moderator: false });
    renderScreen(<Moderation />, { route: '/moderation' });
    expect(screen.getByRole('heading', { name: "That page isn't in this book." })).toBeInTheDocument();
  });

  it('opens the queue for a moderator account, with no operator PIN', async () => {
    renderScreen(<Moderation />, { route: '/moderation' });
    expect(screen.getByRole('heading', { name: 'Moderation' })).toBeInTheDocument();
    expect(await screen.findByText('Held recipes · 0')).toBeInTheDocument();
  });

  it('lists accounts and confirms one from its row', async () => {
    const user = userEvent.setup();
    mocked.listAccounts.mockResolvedValue({ items: [staff({ emailVerified: false })], total: 1, offset: 0, limit: 50 });
    mocked.confirmAccount.mockResolvedValue({ account: staff() });
    renderScreen(<Moderation />, { route: '/moderation?view=accounts' });

    expect(await screen.findByText('ada@example.com', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Unconfirmed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm @ada' }));
    expect(mocked.confirmAccount).toHaveBeenCalledWith('u1');
  });

  it('narrows the list to the accounts waiting to be confirmed', async () => {
    const user = userEvent.setup();
    mocked.listAccounts.mockResolvedValue({ items: [], total: 0, offset: 0, limit: 50 });
    renderScreen(<Moderation />, { route: '/moderation?view=accounts' });
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Show' }), 'unconfirmed');
    await waitFor(() => expect(mocked.listAccounts).toHaveBeenLastCalledWith('unconfirmed', ''));
    expect(await screen.findByText('Every account is confirmed.')).toBeInTheDocument();
  });

  it('opens an account and makes it a moderator', async () => {
    const user = userEvent.setup();
    const ada = staff();
    mocked.listAccounts.mockResolvedValue({ items: [ada], total: 1, offset: 0, limit: 50 });
    mocked.getAccount.mockResolvedValue(
      detail(ada, { published: [{ _id: 'p1', slug: 'rye', title: 'Dark Rye', moderation: { state: 'approved', reason: '' }, unpublishedAt: null, hiddenAt: null, publishedAt: '2026-10-21' }] }),
    );
    mocked.setAccountRole.mockResolvedValue({ account: { ...ada, moderator: true } });
    renderScreen(<Moderation />, { route: '/moderation?view=accounts' });

    await user.click(await screen.findByRole('button', { name: /Ada/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Ada' });
    expect(await within(sheet).findByText('Dark Rye')).toBeInTheDocument();
    expect(within(sheet).getByText('1 device')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Make moderator' }));
    expect(mocked.setAccountRole).toHaveBeenCalledWith('u1', 'moderator');
  });

  it('will not suspend without a reason, and sends the reason when given', async () => {
    const user = userEvent.setup();
    const ada = staff();
    mocked.listAccounts.mockResolvedValue({ items: [ada], total: 1, offset: 0, limit: 50 });
    mocked.getAccount.mockResolvedValue(detail(ada));
    mocked.suspendAccount.mockResolvedValue({ account: { ...ada, suspended: true } });
    renderScreen(<Moderation />, { route: '/moderation?view=accounts' });

    await user.click(await screen.findByRole('button', { name: /Ada/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Ada' });
    await user.click(await within(sheet).findByRole('button', { name: 'Suspend' }));
    expect(within(sheet).getByText('Give a reason first. They will see it.')).toBeInTheDocument();
    expect(mocked.suspendAccount).not.toHaveBeenCalled();

    await user.type(within(sheet).getByLabelText('Reason for suspending'), 'Posting spam');
    await user.click(within(sheet).getByRole('button', { name: 'Suspend' }));
    expect(mocked.suspendAccount).toHaveBeenCalledWith('u1', 'Posting spam');
  });

  it('offers no actions on your own account', async () => {
    const user = userEvent.setup();
    const me = staff({ id: 'm1', handle: 'madboy2275', displayName: '', moderator: true });
    mocked.listAccounts.mockResolvedValue({ items: [me], total: 1, offset: 0, limit: 50 });
    mocked.getAccount.mockResolvedValue(detail(me));
    renderScreen(<Moderation />, { route: '/moderation?view=accounts' });

    await user.click(await screen.findByRole('button', { name: /@madboy2275/ }));
    const sheet = await screen.findByRole('dialog', { name: '@madboy2275' });
    expect(await within(sheet).findByText(/This is your account/)).toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Remove moderator' })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
  });

  it('reads the log as sentences, newest first', async () => {
    mocked.getModerationLog.mockResolvedValue({
      total: 2,
      items: [
        { _id: 'l2', actorKind: 'moderator', actorHandle: 'madboy2275', action: 'account.promote', targetType: 'account', targetId: 'u1', label: '@ada', reason: '', createdAt: '2026-10-26T10:00:00.000Z' },
        { _id: 'l1', actorKind: 'operator', actorHandle: '', action: 'recipe.takedown', targetType: 'recipe', targetId: 'p1', label: 'Dark Rye', reason: 'Spam.', createdAt: '2026-10-25T10:00:00.000Z' },
      ],
    });
    renderScreen(<Moderation />, { route: '/moderation?view=log' });
    expect(await screen.findByText('@madboy2275 made @ada a moderator')).toBeInTheDocument();
    expect(screen.getByText('The operator took down Dark Rye')).toBeInTheDocument();
    expect(screen.getByText(/Spam\./)).toBeInTheDocument();
  });
});

describe('describeEntry', () => {
  it('prints a label literally, even one that looks like a replacement pattern', () => {
    const entry = { _id: 'x', actorKind: 'operator' as const, actorHandle: '', action: 'recipe.approve', targetType: 'recipe' as const, targetId: 'p', label: "$& Ma's $1 loaf", reason: '', createdAt: '' };
    expect(describeEntry(entry)).toBe("The operator approved $& Ma's $1 loaf");
  });
});
