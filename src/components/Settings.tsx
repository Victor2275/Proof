import { useState, useEffect, type ReactNode } from 'react';
import { Download, ImageDown } from 'lucide-react';
import { API_URL, api } from '../lib/api';
import { hapticsEnabled, ttsEnabled as readTtsEnabled } from '../lib/settings';
import { Panel, Button, cn } from './ui';

/*
 * Settings.
 *
 * Every preference here used to be an iOS-style sliding pill — a control from
 * a different machine, and the one widget in the app that carried state by a
 * moving dot rather than by light. They are latching keys now: the same key the
 * step row draws, held down. Lit means on, which is the one thing light is
 * allowed to mean in this world, and it is the same idiom the personal-best
 * mark and the grocery bank already use.
 *
 * The key reports its state in words as well as in light, so it survives a
 * colour-vision difference, and it carries `aria-pressed` so a screen reader
 * announces a switch rather than a button.
 */

/** A preference: what it does, and the key that holds it. */
function SettingRow({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="label-silkscreen text-ink">{label}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
      <Button
        engaged={on}
        onClick={() => onChange(!on)}
        aria-label={label}
        className="w-16 shrink-0"
      >
        {on ? 'On' : 'Off'}
      </Button>
    </div>
  );
}

/** A bank of keys where exactly one is down. */
function KeyBank<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={legend}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            engaged={value === option.value}
            icon={option.icon}
            onClick={() => onChange(option.value)}
            className={cn('flex-1', 'min-w-24')}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    () => (localStorage.getItem('theme') as any) || 'system',
  );
  const [haptics, setHaptics] = useState(hapticsEnabled);
  const [defaultBakersMath, setDefaultBakersMath] = useState(
    () => localStorage.getItem('defaultBakersMath') === 'true',
  );

  // Announcements have always been on in practice, so default this on rather
  // than silencing timers for anyone who never opened Settings.
  const [ttsEnabled, setTtsEnabled] = useState(readTtsEnabled);
  const [waveToAdvance, setWaveToAdvance] = useState(
    () => localStorage.getItem('waveToAdvance') === 'true',
  );
  const [voiceCommands, setVoiceCommands] = useState(
    () => localStorage.getItem('voiceCommands') === 'true',
  );

  const [rehostBusy, setRehostBusy] = useState(false);
  const [rehostMsg, setRehostMsg] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [backupError, setBackupError] = useState('');

  useEffect(() => {
    if (theme === 'system') {
      localStorage.removeItem('theme');
      document.documentElement.classList.toggle(
        'dark',
        window.matchMedia('(prefers-color-scheme: dark)').matches,
      );
    } else {
      localStorage.setItem('theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('hapticsEnabled', haptics.toString());
  }, [haptics]);

  useEffect(() => {
    localStorage.setItem('defaultBakersMath', defaultBakersMath.toString());
    window.dispatchEvent(new Event('settings-changed'));
  }, [defaultBakersMath]);

  useEffect(() => {
    localStorage.setItem('ttsEnabled', ttsEnabled.toString());
  }, [ttsEnabled]);

  useEffect(() => {
    localStorage.setItem('waveToAdvance', waveToAdvance.toString());
  }, [waveToAdvance]);

  useEffect(() => {
    localStorage.setItem('voiceCommands', voiceCommands.toString());
  }, [voiceCommands]);

  const handleBackup = async () => {
    setBackupBusy(true);
    setBackupMsg('');
    setBackupError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setBackupError('Enter the admin PIN first — a backup reads the whole database.');
        return;
      }
      const res = await fetch(`${API_URL.replace('/api', '')}/api/backup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'proof-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setBackupMsg('Downloaded.');
    } catch {
      setBackupError('The backup could not be downloaded. Check the connection and try again.');
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-faceplate text-3xl leading-none text-ink sm:text-4xl">Settings</h1>
          <p className="max-w-prose text-ink-muted">
            How the machine behaves. Everything here is stored on this device, not on the server.
          </p>
        </div>
      </header>

      <Panel title="Appearance">
        <div className="flex flex-col gap-3">
          <KeyBank
            legend="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
          <p className="text-sm text-ink-muted">
            Dark is the default: the scene this was built for is a kitchen before dawn, where the
            only lit object is a propped phone. System follows the device.
          </p>
        </div>
      </Panel>

      <Panel title="Preferences" flush>
        <div className="px-4">
          <SettingRow
            label="Baker's math"
            description="Show baker's percentages on every recipe without asking."
            on={defaultBakersMath}
            onChange={setDefaultBakersMath}
          />
          <SettingRow
            label="Haptics"
            description="A tick through the case when a step advances or a timer ends."
            on={haptics}
            onChange={setHaptics}
          />
          <SettingRow
            label="Spoken timers"
            description="Say a timer's name aloud when it finishes, for hands that are busy."
            on={ttsEnabled}
            onChange={setTtsEnabled}
          />
          <SettingRow
            label="Wave to advance"
            description="Move a hand over the camera to reach the next step without touching anything."
            on={waveToAdvance}
            onChange={setWaveToAdvance}
          />
          <SettingRow
            label="Voice commands"
            description="Next, back, read, ingredients, start timer — spoken rather than tapped."
            on={voiceCommands}
            onChange={setVoiceCommands}
          />
        </div>
      </Panel>

      <Panel title="Data">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="label-silkscreen text-ink">Backup</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Every recipe, bake log and note as one JSON file. Needs the admin PIN.
              </p>
              {backupMsg ? (
                <p className="mt-1 text-sm text-ink" role="status">
                  {backupMsg}
                </p>
              ) : null}
              {backupError ? (
                <p className="mt-1 text-sm text-fault" role="alert">
                  {backupError}
                </p>
              ) : null}
            </div>
            <Button
              onClick={handleBackup}
              busy={backupBusy}
              icon={<Download className="h-4 w-4" />}
            >
              {backupBusy ? 'Working' : 'Download'}
            </Button>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-rule pt-5">
            <div className="min-w-0 flex-1">
              <p className="label-silkscreen text-ink">Re-host photographs</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Copy any recipe or bake-log photograph still pointing at another site onto
                Cloudinary, so the library does not depend on it staying up.
              </p>
              {rehostMsg ? (
                <p className="mt-1 text-sm text-ink" role="status">
                  {rehostMsg}
                </p>
              ) : null}
            </div>
            <Button
              busy={rehostBusy}
              icon={<ImageDown className="h-4 w-4" />}
              onClick={async () => {
                setRehostBusy(true);
                setRehostMsg('');
                try {
                  const r = await api.rehostImages();
                  setRehostMsg(
                    r.rehostedCount === 0
                      ? 'Nothing to do — every photograph is already re-hosted.'
                      : `Re-hosted ${r.rehostedCount} photograph(s) across ${r.recipesUpdated} recipe(s) and ${r.bakeLogsUpdated} bake log(s).`,
                  );
                } catch (err: any) {
                  setRehostMsg(err?.message || 'The photographs could not be re-hosted.');
                } finally {
                  setRehostBusy(false);
                }
              }}
            >
              {rehostBusy ? 'Working' : 'Re-host'}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
