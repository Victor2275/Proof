import { useState, useEffect } from 'react';
import { Moon, Sun, Smartphone, Database, Download } from 'lucide-react';
import { API_URL } from '../lib/api';

export default function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'oled' | 'system'>(() => localStorage.getItem('theme') as any || 'system');
  const [haptics, setHaptics] = useState(() => localStorage.getItem('hapticsEnabled') !== 'false');
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('fontFamily') || 'sans');
  const [defaultBakersMath, setDefaultBakersMath] = useState(() => localStorage.getItem('defaultBakersMath') === 'true');
  const [autoHideSidebar, setAutoHideSidebar] = useState(() => localStorage.getItem('autoHideSidebar') === 'true');
  
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('ttsEnabled') === 'true');
  const [waveToAdvance, setWaveToAdvance] = useState(() => localStorage.getItem('waveToAdvance') === 'true');
  const [voiceCommands, setVoiceCommands] = useState(() => localStorage.getItem('voiceCommands') === 'true');

  useEffect(() => {
    if (theme === 'system') {
      localStorage.removeItem('theme');
      document.documentElement.classList.remove('oled');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.remove('oled');
        document.documentElement.classList.add('dark');
      } else if (theme === 'oled') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('oled');
      } else {
        document.documentElement.classList.remove('dark', 'oled');
      }
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('hapticsEnabled', haptics.toString());
  }, [haptics]);

  useEffect(() => {
    localStorage.setItem('fontFamily', fontFamily);
    document.documentElement.setAttribute('data-font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('defaultBakersMath', defaultBakersMath.toString());
    window.dispatchEvent(new Event('settings-changed'));
  }, [defaultBakersMath]);

  useEffect(() => {
    localStorage.setItem('autoHideSidebar', autoHideSidebar.toString());
    window.dispatchEvent(new Event('settings-changed'));
  }, [autoHideSidebar]);

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
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${theme === 'light' ? 'bg-ink text-paper border-ink shadow-md' : 'bg-paper text-ink border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Sun className="w-4 h-4"/> Light
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${theme === 'dark' ? 'bg-ink text-paper border-ink shadow-md' : 'bg-paper text-ink border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Moon className="w-4 h-4"/> Dark
            </button>
            <button 
              onClick={() => setTheme('oled')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${theme === 'oled' ? 'bg-black text-white border-white shadow-md' : 'bg-paper text-ink border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
            >
              <Moon className="w-4 h-4 text-purple-400"/> OLED Black
            </button>
            <button 
              onClick={() => setTheme('system')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${theme === 'system' ? 'bg-ink text-paper border-ink shadow-md' : 'bg-paper text-ink border-border-subtle hover:bg-black/5 dark:hover:bg-white/5'}`}
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
                <div className="font-bold">Typography</div>
                <div className="text-sm text-ink-muted">Choose your preferred font style.</div>
              </div>
              <select 
                value={fontFamily} 
                onChange={e => setFontFamily(e.target.value)}
                className="bg-black/5 dark:bg-white/5 border border-border-subtle rounded px-3 py-1.5 focus:outline-none"
              >
                <option value="sans">Modern (Sans)</option>
                <option value="serif">Classic (Serif)</option>
                <option value="mono">Technical (Mono)</option>
              </select>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Baker's Math by Default</div>
                <div className="text-sm text-ink-muted">Automatically show baker's percentages on recipes.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: defaultBakersMath ? 'var(--ink)' : 'var(--border-subtle)' }}>
                <input type="checkbox" className="sr-only" checked={defaultBakersMath} onChange={e => setDefaultBakersMath(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${defaultBakersMath ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Auto-Hide Sidebar (PC)</div>
                <div className="text-sm text-ink-muted">Collapse the navigation sidebar for a cleaner look.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: autoHideSidebar ? 'var(--ink)' : 'var(--border-subtle)' }}>
                <input type="checkbox" className="sr-only" checked={autoHideSidebar} onChange={e => setAutoHideSidebar(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${autoHideSidebar ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Haptic Feedback</div>
                <div className="text-sm text-ink-muted">Small vibrations when navigating steps or timers.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: haptics ? 'var(--ink)' : 'var(--border-subtle)' }}>
                <input type="checkbox" className="sr-only" checked={haptics} onChange={e => setHaptics(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${haptics ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Text-to-Speech (Baking Mode)</div>
                <div className="text-sm text-ink-muted">Read steps aloud automatically.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: ttsEnabled ? 'var(--ink)' : 'var(--border-subtle)' }}>
                <input type="checkbox" className="sr-only" checked={ttsEnabled} onChange={e => setTtsEnabled(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${ttsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Wave to Advance</div>
                <div className="text-sm text-ink-muted">Wave hand over camera to go to next step.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: waveToAdvance ? 'var(--ink)' : 'var(--border-subtle)' }}>
                <input type="checkbox" className="sr-only" checked={waveToAdvance} onChange={e => setWaveToAdvance(e.target.checked)} />
                <span className={`inline-block w-6 h-6 transform bg-paper rounded-full shadow transition duration-200 ease-in-out ${waveToAdvance ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-paper border border-border-subtle rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div>
                <div className="font-bold">Voice Commands</div>
                <div className="text-sm text-ink-muted">Say "Next step" or "Start timer" to control hands-free.</div>
              </div>
              <div className="relative inline-block w-12 h-6 rounded-full transition-colors ease-in-out duration-200 focus:outline-none" style={{ backgroundColor: voiceCommands ? 'var(--ink)' : 'var(--border-subtle)' }}>
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
                className="flex items-center gap-2 px-4 py-2 bg-ink text-paper font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" /> Backup
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
