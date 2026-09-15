import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import NotFound from './components/NotFound';
import Sidebar from './components/Sidebar';
import TimerManager from './components/TimerManager';
import BottomNav from './components/BottomNav';
import { api } from './lib/api';
import ErrorBoundary from './components/ErrorBoundary';

// Route components are split out of the initial bundle: each screen (and the heavy
// libraries it pulls — the markdown editor, html2canvas/jspdf, framer-motion) now
// loads on navigation instead of inflating first paint.
const Dashboard = lazy(() => import('./components/Dashboard'));
const RecipeViewer = lazy(() => import('./components/RecipeViewer'));
const RecipeEditor = lazy(() => import('./components/RecipeEditor'));
const Gallery = lazy(() => import('./components/Gallery'));
const Analytics = lazy(() => import('./components/Analytics'));
const GroceryList = lazy(() => import('./components/GroceryList'));
const GeneralNotes = lazy(() => import('./components/GeneralNotes'));
const BakingMode = lazy(() => import('./components/BakingMode'));
const Settings = lazy(() => import('./components/Settings'));
const Pantry = lazy(() => import('./components/Pantry'));
// Primitives gallery. Guarded so the chunk is never referenced in a production
// build; see components/Lab.tsx.
const Lab = import.meta.env.DEV ? lazy(() => import('./components/Lab')) : null;

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
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-paper rounded-2xl w-full max-w-sm shadow-2xl border border-border-subtle p-8">
        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
        <p className="text-sm text-ink-muted mb-4">Please enter the PIN to perform this action.</p>
        <div className="mb-6">
          <input 
            type="password" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-xl p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-accent text-center font-mono text-xl tracking-widest hidden md:block"
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
          <button type="submit" disabled={loading} className="flex-1 bg-accent text-black py-3 font-bold rounded-xl hover: transition-all">{loading ? 'Verifying...' : 'Submit'}</button>
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

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/welcome" element={<LandingPage />} />
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
        {Lab ? <Route path="/lab" element={<Lab />} /> : null}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  // Set when a screen falls back to its local cache, so we can say the data is a
  // saved copy rather than letting stale content pass for live.
  const [staleReason, setStaleReason] = useState<string | null>(null);
  useEffect(() => {
    if (!localStorage.getItem('hasVisited') && window.location.pathname !== '/welcome') {
      window.location.href = '/welcome';
    }

    // The `dark:` variant is bound to the .dark class (see index.css), so in "system"
    // mode we have to mirror OS theme changes onto the class ourselves.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemTheme = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme')) return; // an explicit choice wins
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handleSystemTheme);

    return () => {
      mq.removeEventListener('change', handleSystemTheme);
    };
  }, []);

  useEffect(() => {
    const handleAuthReq = () => setShowAuthModal(true);
    window.addEventListener('auth-required', handleAuthReq);
    
    const handleOnline = () => { setIsOffline(false); setStaleReason(null); };
    const handleOffline = () => setIsOffline(true);
    const handleStale = (e: Event) => setStaleReason((e as CustomEvent).detail?.reason ?? "Can't reach the server.");
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('api-stale', handleStale);

    return () => {
      window.removeEventListener('auth-required', handleAuthReq);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('api-stale', handleStale);
    };
  }, []);

  // While the browser reports itself offline, the offline bar already explains things.
  const showStaleBar = !!staleReason && !isOffline;

  return (
    <Router>
      {/*
        The status bars sit in the flow rather than fixed with a guessed pt-6: their
        text wraps to two or three lines on a phone, which a fixed offset can't
        account for, and the overflow landed on top of the page heading.
      */}
      <div className="flex flex-col h-screen bg-paper text-ink overflow-hidden selection:bg-ink selection:text-paper">
      {isOffline && (
        <div className="shrink-0 z-[200] bg-yellow-500 text-yellow-900 font-bold text-center py-1 px-4 text-sm shadow-md">
          Offline Mode: You are viewing cached recipes. Changes will not be saved until you reconnect.
        </div>
      )}
      {showStaleBar && (
        <div className="shrink-0 z-[200] bg-amber-600 text-white font-bold text-center py-1 px-4 text-sm shadow-md">
          {staleReason} Showing your last saved copy — changes won't save until it's back.
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar onAdminRequired={() => setShowAuthModal(true)} className="hidden md:flex" />
        <main className="flex-1 overflow-y-auto overscroll-y-auto w-full relative pb-24 md:pb-12 pt-safe md:pt-12 px-4 md:px-12 transition-all duration-300 md:ml-64">
          <ErrorBoundary>
            <Suspense fallback={<div className="pt-12 text-center text-ink-muted text-sm">Loading…</div>}>
              <AnimatedRoutes />
            </Suspense>
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
      </div>
    </Router>
  );
}

export default App;
