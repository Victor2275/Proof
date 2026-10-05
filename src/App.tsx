import { useState, useEffect, useId, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import LandingPage from './components/LandingPage';
import NotFound from './components/NotFound';
import Sidebar from './components/Sidebar';
import TimerManager from './components/TimerManager';
import BottomNav from './components/BottomNav';
import { api } from './lib/api';
import ErrorBoundary from './components/ErrorBoundary';
import { Delete } from 'lucide-react';
import { Button, Field, Sheet, Skeleton } from './components/ui';

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

/*
 * The PIN prompt. A `Sheet`, so it traps focus, closes on Escape and hands focus
 * back to whatever asked for it; it used to be a hand-rolled scrim with none of
 * that, and its error floated in a toast outside the dialog it belonged to.
 */
function AuthModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  // A fresh prompt each time: a PIN left in the field from the last attempt,
  // or the last attempt's error, is not this attempt's state.
  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
    }
  }, [open]);

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
    <Sheet
      open={open}
      onClose={onClose}
      title="Admin access required"
      size="sm"
      initialFocus={fieldRef}
      footer={
        <>
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId} variant="primary" size="lg" className="min-w-32" busy={loading}>
            {loading ? 'Verifying…' : 'Submit'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">Please enter the PIN to perform this action.</p>
        <Field
          ref={fieldRef}
          label="PIN"
          hideLabel
          type="password"
          autoComplete="current-password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          error={error || undefined}
          className="hidden md:flex"
        />
        {/* The mobile keypad, with its own readout of how many digits are in. */}
        <div className="flex flex-col gap-3 md:hidden">
          <output
            aria-label={`${pin.length} ${pin.length === 1 ? 'digit' : 'digits'} entered`}
            className="flex h-12 items-center justify-center rounded-control border border-rule bg-panel-sunk font-mono text-2xl tracking-[0.5em] text-ink"
          >
            {pin.replace(/./g, '•')}
          </output>
          <div className="grid grid-cols-3 gap-px">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'].map((key) => (
              <button
                key={key}
                type="button"
                aria-label={key === 'C' ? 'Clear' : key === '<' ? 'Delete last digit' : undefined}
                onClick={() => {
                  if (key === 'C') setPin('');
                  else if (key === '<') setPin(pin.slice(0, -1));
                  else setPin(pin + key);
                }}
                className="h-14 rounded-key border border-rule bg-panel font-mono text-xl text-ink transition-colors active:bg-ink active:text-ground"
              >
                {key === '<' ? <Delete className="mx-auto h-5 w-5" aria-hidden="true" /> : key}
              </button>
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-fault">{error}</p>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}

/* While a screen's code arrives: the shape of a page, never the word "Loading". */
function RouteSkeleton() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 pt-6" role="status" aria-label="Opening">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-4 h-48 w-full" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
    /*
     * Reduced motion, for the half of the app's motion that CSS cannot reach.
     *
     * The global rule in index.css collapses CSS animation and transition, which
     * covers the chase light, the sheets and every skeleton. framer-motion does
     * not go through CSS — it writes inline styles from a rAF loop — so the
     * recipe drawer still sprang up the screen and the onboarding modal still
     * slid, for someone who had asked the operating system for neither.
     * `reducedMotion="user"` makes every framer-motion animation in the app,
     * including ones not written yet, honour that setting.
     */
    <MotionConfig reducedMotion="user">
    <Router>
      {/*
        * The landing page is routed beside the shell rather than inside it. It
        * is the one surface someone sees before they have entered the app, and
        * a sidebar of sections they have not reached yet — plus a bottom nav
        * and a timer manager — is chrome for a product they have not agreed to
        * use. Everything else renders in the shell.
        */}
      <Routes>
        <Route path="/welcome" element={<LandingPage />} />
        <Route
          path="*"
          element={
            <AppShell
              isOffline={isOffline}
              showStaleBar={showStaleBar}
              staleReason={staleReason}
              showAuthModal={showAuthModal}
              setShowAuthModal={setShowAuthModal}
            />
          }
        />
      </Routes>
    </Router>
    </MotionConfig>
  );
}

function AppShell({
  isOffline,
  showStaleBar,
  staleReason,
  showAuthModal,
  setShowAuthModal,
}: {
  isOffline: boolean;
  showStaleBar: boolean;
  staleReason: string | null;
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
}) {
  return (
    <>
      {/*
        The status bars sit in the flow rather than fixed with a guessed pt-6: their
        text wraps to two or three lines on a phone, which a fixed offset can't
        account for, and the overflow landed on top of the page heading.
      */}
      <div className="flex flex-col h-screen bg-ground text-ink overflow-hidden">
      {/* The caution lamp bar: connectivity issues are the one non-bake state
        * that earns the "due" amber, since they genuinely need attention. */}
      {isOffline && (
        <div className="label-silkscreen shrink-0 z-[200] border-b border-fault bg-panel text-fault text-center py-2 px-4">
          Offline — viewing cached recipes. Changes won't save until you reconnect.
        </div>
      )}
      {showStaleBar && (
        <div className="label-silkscreen shrink-0 z-[200] border-b border-fault bg-panel text-fault text-center py-2 px-4">
          {staleReason} Showing your last saved copy — changes won't save until it's back.
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <Sidebar onAdminRequired={() => setShowAuthModal(true)} className="hidden md:flex" />
        <main className="flex-1 overflow-y-auto overscroll-y-auto w-full relative pb-24 md:pb-12 pt-safe md:pt-0 px-4 md:px-8 lg:px-12 transition-all duration-300 md:ml-16 lg:ml-64">
          <ErrorBoundary>
            <Suspense fallback={<RouteSkeleton />}>
              <AnimatedRoutes />
            </Suspense>
          </ErrorBoundary>
        </main>
        <BottomNav />
        <TimerManager />
        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            window.dispatchEvent(new Event('auth-success'));
          }}
        />
      </div>
      </div>
    </>
  );
}

export default App;
