import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RecipeViewer from './components/RecipeViewer';
import RecipeEditor from './components/RecipeEditor';
import Gallery from './components/Gallery';
import Analytics from './components/Analytics';

import GroceryList from './components/GroceryList';
import GeneralNotes from './components/GeneralNotes';
import BakingMode from './components/BakingMode';
import Settings from './components/Settings';
import Pantry from './components/Pantry';
import TimerManager from './components/TimerManager';
import BottomNav from './components/BottomNav';
import { api } from './lib/api';
import ErrorBoundary from './components/ErrorBoundary';

function AuthModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await api.submitPin(pin);
      localStorage.setItem('adminToken', token);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-paper rounded-xl w-full max-w-sm shadow-2xl border border-border-subtle p-6">
        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
        <p className="text-sm text-ink-muted mb-4">Please enter the PIN to perform this action.</p>
        <div className="mb-6">
          <input 
            type="password" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-ink text-center font-mono text-xl tracking-widest hidden md:block"
            autoFocus
          />
          <div className="md:hidden grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '<'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === 'C') setPin('');
                  else if (key === '<') setPin(pin.slice(0, -1));
                  else setPin(pin + key);
                }}
                className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xl font-medium rounded-md py-4 transition-colors"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="md:hidden text-center mt-4 tracking-[0.5em] text-2xl font-mono h-8">
            {pin.replace(/./g, '•')}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 bg-ink text-paper py-3 font-bold rounded-xl hover:opacity-90 transition-opacity">{loading ? 'Verifying...' : 'Submit'}</button>
        </div>
      </form>
      {error && (
        <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold animate-in slide-in-from-bottom-5 z-[200]">
          {error}
        </div>
      )}
    </div>
  );
}

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [autoHideSidebar, setAutoHideSidebar] = useState(() => localStorage.getItem('autoHideSidebar') === 'true');

  useEffect(() => {
    const handleSettingsChange = () => {
      setAutoHideSidebar(localStorage.getItem('autoHideSidebar') === 'true');
      document.documentElement.setAttribute('data-font', localStorage.getItem('fontFamily') || 'sans');
    };
    
    // Initial font setup
    document.documentElement.setAttribute('data-font', localStorage.getItem('fontFamily') || 'sans');
    
    window.addEventListener('settings-changed', handleSettingsChange);
    return () => window.removeEventListener('settings-changed', handleSettingsChange);
  }, []);

  useEffect(() => {
    const handleAuthReq = () => setShowAuthModal(true);
    window.addEventListener('auth-required', handleAuthReq);
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('auth-required', handleAuthReq);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Router>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-yellow-500 text-yellow-900 font-bold text-center py-1 text-sm shadow-md">
          Offline Mode: You are viewing cached recipes. Changes will not be saved until you reconnect.
        </div>
      )}
      <div className={`flex h-screen bg-paper text-ink overflow-hidden selection:bg-ink selection:text-paper ${isOffline ? 'pt-6' : ''}`}>
        <Sidebar onAdminRequired={() => setShowAuthModal(true)} className={`hidden md:flex ${autoHideSidebar ? 'group -translate-x-[95%] hover:-translate-x-0 transition-transform duration-300 shadow-2xl z-50' : ''}`} />
        <main className={`flex-1 overflow-y-auto overscroll-y-auto w-full relative pb-20 md:pb-8 pt-safe md:pt-8 px-4 md:px-8 transition-all duration-300 ${autoHideSidebar ? 'md:ml-[3%]' : 'md:ml-64'}`}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/pantry" element={<Pantry />} />
              <Route path="/grocery" element={<GroceryList />} />
              <Route path="/recipe/:id/bake" element={<BakingMode />} />
              <Route path="/recipe/:id" element={<RecipeViewer />} />
              <Route path="/new" element={<RecipeEditor />} />
              <Route path="/edit/:id" element={<RecipeEditor />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/notes" element={<GeneralNotes />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <BottomNav />
        <TimerManager />
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onSuccess={() => {
              setShowAuthModal(false);
              window.dispatchEvent(new Event('auth-success'));
            }} 
          />
        )}
      </div>
    </Router>
  );
}

export default App;
