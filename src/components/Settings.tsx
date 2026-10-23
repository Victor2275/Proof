import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Download, ImageDown, LifeBuoy, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { exportCookbook, importCookbook, backupFileName, type ImportResult } from '../lib/repo/backup';
import { importServerLibrary } from '../lib/repo/legacy';
import { STORED_ON_DEVICE, formatBytes, requestPersistentStorage, storageReport } from '../lib/storage';
import { useSession } from '../lib/session';
import AccountPanel from './AccountPanel';
import { SETTINGS_KEYS, applyHandwriting, handwritingEnabled, hapticsEnabled, ttsEnabled as readTtsEnabled } from '../lib/settings';
import HelpSheet from './HelpSheet';
import { Panel, PanelRow, Button, Meter, PageHeader, Segmented, Switch, buttonClassName } from './ui';
import { applyTheme, readTheme, type ThemeChoice } from '../lib/theme';

/*
 * Settings (change 131).
 *
 * Laid out by what a person comes here for: how the book looks, how it
 * behaves while baking, the cookbook kept on this device, the account, and
 * help. One plain line under each setting says what it does, and every on/off
 * is the platform's own switch (`Switch`) rather than a latching key.
 *
 * The site operator's tools come last and do nothing without the operator PIN
 * (decision B23).
 */

/** Saves a Blob as a download. */
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const describeImport = (r: ImportResult) => {
  const changed = r.added + r.updated;
  if (changed === 0 && r.photos === 0) return 'Nothing new: everything in it was already here.';
  const parts = [`${r.added} added`, `${r.updated} updated`];
  if (r.unchanged) parts.push(`${r.unchanged} already up to date`);
  if (r.photos) parts.push(`${r.photos} ${r.photos === 1 ? 'photograph' : 'photographs'}`);
  return `${parts.join(' · ')}.`;
};

/** A data action: what it does, what happened, and its key. */
function ActionRow({
  title,
  description,
  status,
  error,
  children,
}: {
  title: string;
  description: string;
  status?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-rule pt-5 first:border-t-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="ui-label text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        {status ? (
          <p className="mt-1 text-sm text-ink" role="status">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="mt-1 text-sm text-fault" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [theme, setTheme] = useState<ThemeChoice>(readTheme);
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
  const [handwriting, setHandwriting] = useState(handwritingEnabled);
  const [helpOpen, setHelpOpen] = useState(false);

  const { session, signOutOperator } = useSession();
  const { hash } = useLocation();

  // The avatar's Account and Export entries land on their own section.
  useEffect(() => {
    if (hash === '#account' || hash === '#cookbook') {
      document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: 'start' });
    }
  }, [hash]);
  const client = useQueryClient();
  const importInput = useRef<HTMLInputElement>(null);

  // Each action reports in its own row: [busy, message, error].
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [importError, setImportError] = useState('');
  const [rehostBusy, setRehostBusy] = useState(false);
  const [rehostMsg, setRehostMsg] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryMsg, setLibraryMsg] = useState('');
  const [libraryError, setLibraryError] = useState('');

  const storage = useQuery({ queryKey: ['storage'], queryFn: storageReport, staleTime: 0 });
  const server = useQuery({ queryKey: ['server-health'], queryFn: api.health, retry: false, staleTime: 30_000 });

  /** After an import, everything that reads the cookbook reads it again. */
  const refreshCookbook = () => {
    void client.invalidateQueries();
  };

  useEffect(() => {
    applyTheme(theme);
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

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEYS.handwriting, handwriting.toString());
    applyHandwriting(handwriting);
  }, [handwriting]);

  const handleExport = async () => {
    setExporting(true);
    setExportMsg('');
    try {
      download(await exportCookbook(), backupFileName());
      setExportMsg('Saved. Keep it somewhere that is not this device.');
    } catch {
      setExportMsg("The export couldn't be built. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    setImportError('');
    try {
      setImportMsg(describeImport(await importCookbook(file)));
      refreshCookbook();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "That file couldn't be imported.");
    } finally {
      setImporting(false);
      if (importInput.current) importInput.current.value = '';
    }
  };

  const handleServerBackup = async () => {
    setBackupBusy(true);
    setBackupError('');
    try {
      download(await api.downloadServerBackup(), 'proof-server-backup.json');
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "The server backup couldn't be downloaded.");
    } finally {
      setBackupBusy(false);
    }
  };

  const handleServerLibrary = async () => {
    setLibraryBusy(true);
    setLibraryMsg('');
    setLibraryError('');
    try {
      setLibraryMsg(describeImport(await importServerLibrary()));
      refreshCookbook();
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : "The server library couldn't be copied.");
    } finally {
      setLibraryBusy(false);
    }
  };

  const persisted = storage.data?.persisted;
  const usage = storage.data?.usage ?? null;
  const quota = storage.data?.quota ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-20">
      <PageHeader title="Settings" subtitle="How Proof looks and behaves on this device, and the cookbook it keeps here." />

      <Panel title="Appearance">
        <div className="flex flex-col gap-3">
          <Segmented
            label="Theme"
            value={theme}
            onChange={setTheme}
            block
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ]}
          />
          <p className="text-sm text-ink-muted">Dark is the same book at night. System follows the device.</p>
          <div className="border-t border-rule">
            <Switch
              label="Handwritten notes"
              description="Set your bake notes in a handwriting face instead of the book's italic."
              checked={handwriting}
              onChange={setHandwriting}
            />
          </div>
        </div>
      </Panel>

      <Panel title="While you bake" flush>
        <div className="divide-y divide-rule px-4">
          <Switch
            label="Baker's math"
            description="Show baker's percentages on every recipe without asking."
            checked={defaultBakersMath}
            onChange={setDefaultBakersMath}
          />
          <Switch
            label="Haptics"
            description="A small buzz when a step advances or a timer ends. Phones only."
            checked={haptics}
            onChange={setHaptics}
          />
          <Switch
            label="Spoken timers"
            description="Say a timer's name aloud when it ends, for hands that are busy."
            checked={ttsEnabled}
            onChange={setTtsEnabled}
          />
          <Switch
            label="Wave to advance"
            description="Move a hand over the camera to reach the next step."
            checked={waveToAdvance}
            onChange={setWaveToAdvance}
          />
          <Switch
            label="Voice commands"
            description="Say next, back, read, ingredients or start timer instead of tapping."
            checked={voiceCommands}
            onChange={setVoiceCommands}
          />
        </div>
      </Panel>

      <Panel title="Your cookbook">
        <div id="cookbook" className="flex scroll-mt-24 flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">{STORED_ON_DEVICE}</p>
            {usage !== null && quota ? (
              <Meter
                label="Storage used"
                value={usage}
                max={quota}

                readout={`${formatBytes(usage)} of ${formatBytes(quota)}`}
              />
            ) : null}
            <div>
              <PanelRow
                label="Kept when space runs low"
                value={persisted === null || persisted === undefined ? 'Unknown' : persisted ? 'Yes' : 'Not promised'}
              />
              <PanelRow
                label="Server"
                value={server.isPending ? '—' : server.isSuccess ? 'Reachable' : 'Unreachable'}
              />
            </div>
            {/* Being offline is the normal case, so it is one line here rather
              * than a bar across every screen (B29). */}
            {server.isError ? (
              <p className="text-sm text-ink-muted">
                The shared cookbook and the AI need the server; your own cookbook does not.
              </p>
            ) : null}
            {persisted === false ? (
              <Button
                className="self-start"
                onClick={async () => {
                  await requestPersistentStorage();
                  void storage.refetch();
                }}
              >
                Ask to keep it
              </Button>
            ) : null}
          </div>

          <ActionRow
            title="Export"
            description="The whole cookbook as one .zip: recipes, bakes, notes, pantry and photographs. The free backup."
            status={exportMsg}
          >
            <Button onClick={handleExport} busy={exporting} icon={<Download className="h-4 w-4" />}>
              {exporting ? 'Working' : 'Export'}
            </Button>
          </ActionRow>

          <ActionRow
            title="Import"
            description="Bring back an export. Anything newer on this device is kept, so importing twice changes nothing."
            status={importMsg}
            error={importError}
          >
            <input
              ref={importInput}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              aria-label="Choose an export to import"
              onChange={(e) => handleImport(e.target.files?.[0])}
            />
            <Button
              onClick={() => importInput.current?.click()}
              busy={importing}
              icon={<Upload className="h-4 w-4" />}
            >
              {importing ? 'Working' : 'Import'}
            </Button>
          </ActionRow>
        </div>
      </Panel>

      <AccountPanel />

      <Panel title="Help">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm text-ink-muted">What Proof is for, and the four things you do in it.</p>
          <Button onClick={() => setHelpOpen(true)} icon={<LifeBuoy className="h-4 w-4" aria-hidden="true" />}>
            How Proof works
          </Button>
        </div>
      </Panel>
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />

      <Panel title="Operator">
        {session.isOperator ? (
          <div className="flex flex-col gap-5">
            <ActionRow
              title="Moderation"
              description="Recipes and comments the screen held back, and what people reported."
            >
              <Link to="/moderation" className={buttonClassName({})}>
                Open the queue
              </Link>
            </ActionRow>

            <ActionRow
              title="Copy the server library here"
              description="Brings the recipes, bakes, notes and pantry stored on the server onto this device. Run it once per device; running it again changes nothing."
              status={libraryMsg}
              error={libraryError}
            >
              <Button onClick={handleServerLibrary} busy={libraryBusy} icon={<Download className="h-4 w-4" />}>
                {libraryBusy ? 'Working' : 'Copy'}
              </Button>
            </ActionRow>

            <ActionRow
              title="Server backup"
              description="The server's whole database as one JSON file."
              error={backupError}
            >
              <Button onClick={handleServerBackup} busy={backupBusy} icon={<Download className="h-4 w-4" />}>
                {backupBusy ? 'Working' : 'Download'}
              </Button>
            </ActionRow>

            <ActionRow
              title="Re-host photographs"
              description="Copy any server-side photograph still pointing at another site onto Cloudinary, so the library does not depend on it staying up."
              status={rehostMsg}
            >
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
                        ? 'Nothing to do: every photograph is already re-hosted.'
                        : `Re-hosted ${r.rehostedCount} photograph(s) across ${r.recipesUpdated} recipe(s) and ${r.bakeLogsUpdated} bake log(s).`,
                    );
                  } catch (err) {
                    setRehostMsg(err instanceof Error ? err.message : "The photographs couldn't be re-hosted.");
                  } finally {
                    setRehostBusy(false);
                  }
                }}
              >
                {rehostBusy ? 'Working' : 'Re-host'}
              </Button>
            </ActionRow>

            <Button variant="ghost" className="self-start" onClick={signOutOperator}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm text-ink-muted">
              Tools for whoever runs this Proof site: server backups, photo re-hosting, and the server
              library. They need the operator PIN. Your own cookbook never does.
            </p>
            <Button onClick={() => window.dispatchEvent(new Event('auth-required'))}>Operator sign-in</Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
