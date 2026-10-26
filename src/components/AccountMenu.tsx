import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookUp, CircleHelp, FolderInput, LogIn, Settings as SettingsIcon, ShieldCheck, UserRound } from 'lucide-react';
import { useSession } from '../lib/session';
import { requestAccount } from '../lib/accountPrompt';
import { Menu, MenuItem, Sheet, cn } from './ui';
import HelpSheet from './HelpSheet';

/*
 * The avatar: everything that is not one of the four destinations.
 *
 * Settings, the account, the recipes you have published, export and import,
 * and help — the entries that used to fill a sidebar and a More drawer. On a
 * desktop it drops a menu from the top bar; on a phone it raises a sheet from
 * the bottom, where the thumb is.
 */

interface Entry {
  key: string;
  label: string;
  icon: ReactNode;
  to?: string;
  onSelect?: () => void;
}

function useEntries(openHelp: () => void): Entry[] {
  const { session } = useSession();
  const icon = (Icon: typeof UserRound) => <Icon className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />;
  return [
    { key: 'settings', label: 'Settings', icon: icon(SettingsIcon), to: '/settings' },
    session.user
      ? { key: 'account', label: 'Account', icon: icon(UserRound), to: '/settings#account' }
      : { key: 'signin', label: 'Sign in', icon: icon(LogIn), onSelect: () => requestAccount('signin') },
    { key: 'published', label: 'My published recipes', icon: icon(BookUp), to: '/published' },
    { key: 'export', label: 'Export or import', icon: icon(FolderInput), to: '/settings#cookbook' },
    { key: 'help', label: 'Help', icon: icon(CircleHelp), onSelect: openHelp },
    ...(session.canModerate
      ? [{ key: 'moderation', label: 'Moderation', icon: icon(ShieldCheck), to: '/moderation' }]
      : []),
  ];
}

/** The round control itself: initials when signed in, a quiet figure when not. */
function Avatar() {
  const { session } = useSession();
  const name = session.user?.displayName || session.user?.handle || '';
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-paper-tonal font-sans text-sm font-semibold text-ink-2"
    >
      {initials || <UserRound className="h-[18px] w-[18px]" strokeWidth={1.7} />}
    </span>
  );
}

const TRIGGER =
  'pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-paper-sunk active:bg-paper-tonal';

/** The desktop's avatar: a menu dropped from the top bar. */
export function AccountMenu({ className }: { className?: string }) {
  const [help, setHelp] = useState(false);
  const entries = useEntries(() => setHelp(true));
  const { session } = useSession();
  return (
    <>
      <Menu
        label="Your account and settings"
        align="right"
        className={className}
        trigger={(props) => (
          <button type="button" {...props} aria-label="Your account and settings" className={TRIGGER}>
            <Avatar />
          </button>
        )}
      >
        {session.user ? (
          <p className="border-b border-rule px-4 pt-2 pb-2.5 text-sm">
            <span className="block truncate font-medium text-ink">{session.user.displayName || session.user.handle}</span>
            <span className="block truncate text-ink-muted">@{session.user.handle}</span>
          </p>
        ) : null}
        {entries.map((e) => (
          <MenuItem key={e.key} to={e.to} onSelect={e.onSelect}>
            {e.icon}
            {e.label}
          </MenuItem>
        ))}
      </Menu>
      <HelpSheet open={help} onClose={() => setHelp(false)} />
    </>
  );
}

/** The phone's avatar: a sheet raised from the bottom. */
export function AccountSheetButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const entries = useEntries(() => {
    setOpen(false);
    setHelp(true);
  });
  const { session } = useSession();
  const row =
    'pressable flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left text-[0.9375rem] text-ink hover:bg-paper-sunk active:bg-paper-tonal';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Your account and settings"
        className={cn(TRIGGER, className)}
      >
        <Avatar />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={session.user ? session.user.displayName || `@${session.user.handle}` : 'You'}
        placement="bottom"
      >
        <nav aria-label="Account and settings" className="-mx-1 flex flex-col">
          {entries.map((e) =>
            e.to ? (
              <Link key={e.key} to={e.to} onClick={() => setOpen(false)} className={row}>
                {e.icon}
                {e.label}
              </Link>
            ) : (
              <button
                key={e.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  e.onSelect?.();
                }}
                className={row}
              >
                {e.icon}
                {e.label}
              </button>
            ),
          )}
        </nav>
      </Sheet>
      <HelpSheet open={help} onClose={() => setHelp(false)} />
    </>
  );
}
