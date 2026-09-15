import { useState, useEffect } from 'react';
import { Moon, Sun, Smartphone, Database, Download, ImageDown } from 'lucide-react';
import { API_URL, api } from '../lib/api';
import { hapticsEnabled, ttsEnabled as readTtsEnabled } from '../lib/settings';

export default function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => localStorage.getItem('theme') as any || 'system');
  const [haptics, setHaptics] = useState(hapticsEnabled);
  const [defaultBakersMath, setDefaultBakersMath] = useState(() => localStorage.getItem('defaultBakersMath') === 'true');

  
  // Announcements have always been on in practice, so default this on rather than
  // silencing timers for anyone who never opened Settings.
  const [ttsEnabled, setTtsEnabled] = useState(readTtsEnabled);
  const [waveToAdvance, setWaveToAdvance] = useState(() => localStorage.getItem('waveToAdvance') === 'true');
  const [rehostBusy, setRehostBusy] = useState(false);
  const [rehostMsg, setRehostMsg] = useState('');
  const [voiceCommands, setVoiceCommands] = useState(() => localStorage.getItem('voiceCommands') === 'true');

  useEffect(() => {
    if (theme === 'system') {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between pb-6 border-b border-border-subtle">
        <h1 className="text-3xl font-bold tracking-tight uppercase">Settings</h1>
      </div>

      <div className="bg-sidebar p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sun className="w-5 h-5"/> Appearance</h2>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3">
            <button 
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${theme === 'light' ? 'bg-accent/10 text-accent border-accent ' : 'bg-paper text-ink border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Sun className="w-4 h-4"/> Light
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${theme === 'dark' ? 'bg-accent/10 text-accent border-accent ' : 'bg-paper text-ink border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Moon className="w-4 h-4"/> Dark
            </button>

            <button 
              onClick={() => setTheme('system')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${theme === 'system' ? 'bg-accent/10 text-accent border-accent ' : 'bg-paper text-ink border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              System
            </button>
          </div>
          <p className="text-ink-muted text-sm mt-3">Override your device's system theme.</p>
        </div>
      </div>

      <div className="bg-sidebar p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5"/> Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Baker's Math by Default</div>
                <div className="text-sm text-ink-muted">Automatically show baker's percentages on recipes.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: defaultBakersMath ? 'var(--signal)' : 'var(--rule)' }}>
                <input type="checkbox" className="sr-only" checked={defaultBakersMath} onChange={e => setDefaultBakersMath(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${defaultBakersMath ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>



            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Haptic Feedback</div>
                <div className="text-sm text-ink-muted">Small vibrations when navigating steps or timers.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: haptics ? 'var(--signal)' : 'var(--rule)' }}>
                <input type="checkbox" className="sr-only" checked={haptics} onChange={e => setHaptics(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${haptics ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Text-to-Speech</div>
                <div className="text-sm text-ink-muted">Announce timers aloud when they finish.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: ttsEnabled ? 'var(--signal)' : 'var(--rule)' }}>
                <input type="checkbox" className="sr-only" checked={ttsEnabled} onChange={e => setTtsEnabled(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${ttsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Wave to Advance</div>
                <div className="text-sm text-ink-muted">Wave hand over camera to go to next step.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: waveToAdvance ? 'var(--signal)' : 'var(--rule)' }}>
                <input type="checkbox" className="sr-only" checked={waveToAdvance} onChange={e => setWaveToAdvance(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${waveToAdvance ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Voice Commands</div>
                <div className="text-sm text-ink-muted">Say "Next step" or "Start timer" to control hands-free.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: voiceCommands ? 'var(--signal)' : 'var(--rule)' }}>
                <input type="checkbox" className="sr-only" checked={voiceCommands} onChange={e => setVoiceCommands(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${voiceCommands ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-sidebar p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Database className="w-5 h-5"/> Data Management</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl">
              <div>
                <div className="font-bold">Backup Database</div>
                <div className="text-sm text-ink-muted">Download all recipes, logs, and notes as a JSON file.</div>
              </div>
              <button 
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('adminToken');
                    if (!token) {
                      alert('Admin access required for backup.');
                      return;
                    }
                    const res = await fetch(`${API_URL.replace('/api', '')}/api/backup`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error('Backup failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'culinary-lab-backup.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error(err);
                    alert('Failed to download backup.');
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-black font-bold rounded-xl hover: transition-all"
              >
                <Download className="w-4 h-4" /> Backup
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl gap-4">
              <div>
                <div className="font-bold">Re-host External Images</div>
                <div className="text-sm text-ink-muted">
                  Copy any recipe or bake-log photos that still point at another site onto Cloudinary.
                  {rehostMsg && <span className="block mt-1 text-accent font-medium">{rehostMsg}</span>}
                </div>
              </div>
              <button
                disabled={rehostBusy}
                onClick={async () => {
                  setRehostBusy(true);
                  setRehostMsg('');
                  try {
                    const r = await api.rehostImages();
                    setRehostMsg(
                      r.rehostedCount === 0
                        ? 'Nothing to do — every image is already re-hosted.'
                        : `Re-hosted ${r.rehostedCount} image(s) across ${r.recipesUpdated} recipe(s) and ${r.bakeLogsUpdated} bake log(s).`
                    );
                  } catch (err: any) {
                    setRehostMsg(err?.message || 'Failed to re-host images.');
                  } finally {
                    setRehostBusy(false);
                  }
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-black font-bold rounded-xl hover: transition-all disabled:opacity-50 shrink-0"
              >
                <ImageDown className="w-4 h-4" /> {rehostBusy ? 'Working…' : 'Re-host'}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
