import { useState, useEffect, useId, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import LandingPage from './components/LandingPage';
import NotFound from './components/NotFound';
import TimerManager from './components/TimerManager';
import TabBar from './components/TabBar';
import TopBar from './components/TopBar';
import TimerPill from './components/TimerPill';
import PageTransition from './components/PageTransition';
import { useScrollMemory } from './lib/navigation';
import AccountSheet, { type AccountMode } from './components/AccountSheet';
import { api } from './lib/api';
import { setOperatorToken } from './lib/session';
import { useAccountRefresh } from './lib/useAccount';
import { ACCOUNT_PROMPT_EVENT, type AccountPrompt } from './lib/accountPrompt';
import ErrorBoundary from './components/ErrorBoundary';
import { Delete } from 'lucide-react';
import { Button, Field, Sheet, Skeleton, ToastProvider, cn } from './components/ui';
import { readTheme } from './lib/theme';
import { isChromeFree } from './lib/destinations';

// Route components are split out of the initial bundle: each screen (and the heavy
// libraries it pulls — the markdown editor, html2canvas/jspdf, framer-motion) now
// loads on navigation instead of inflating first paint.
const Dashboard = lazy(() => import('./components/Dashboard'));
const RecipeViewer = lazy(() => import('./components/RecipeViewer'));
const RecipeEditor = lazy(() => import('./components/RecipeEditor'));
const BakesPage = lazy(() => import('./components/BakesPage'));
const ShopPage = lazy(() => import('./components/ShopPage'));
const PublishedPage = lazy(() => import('./components/PublishedPage'));
const GeneralNotes = lazy(() => import('./components/GeneralNotes'));
const BakingMode = lazy(() => import('./components/BakingMode'));
const Settings = lazy(() => import('./components/Settings'));
const Discover = lazy(() => import('./components/Discover'));
const Profile = lazy(() => import('./components/Profile'));
const Moderation = lazy(() => import('./components/Moderation'));
const VerifyEmail = lazy(() => import('./components/EmailLink').then((m) => ({ default: m.VerifyEmail })));
const ResetPassword = lazy(() => import('./components/EmailLink').then((m) => ({ default: m.ResetPassword })));
// Primitives gallery. Guarded so the chunk is never referenced in a production
// build; see components/Lab.tsx.
const Lab = import.meta.env.DEV ? lazy(() => import('./components/Lab')) : null;

/*
 * The operator's PIN. A `Sheet`, so it traps focus, closes on Escape and hands
 * focus back to whatever asked for it.
 *
 * It used to be "Admin access required" and stood in front of every write in
 * the app, so a stranger met it the first time they tried to save anything.
 * Writes go to the device now and need nothing. The PIN opens only the site
 * operator's tools, so this prompt is only ever seen by the operator.
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
      setOperatorToken(token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That PIN was not accepted.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Operator sign-in"
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
        <p className="text-sm text-ink-muted">
          The operator PIN opens the site's own tools: server backups, photo re-hosting and the shared
          cookbook. Your recipes never need it.
        </p>
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
            className="flex h-12 items-center justify-center rounded-control border border-rule bg-paper-sunk font-sans text-2xl tracking-[0.5em] text-ink"
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
                className="h-14 rounded-key border border-rule bg-paper-raised font-sans text-xl text-ink transition-colors active:bg-ink active:text-paper"
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

/*
 * The four destinations are Cookbook (/), Bakes, Shop and Discover. The old
 * addresses of the screens they absorbed redirect, so a bookmark, a
 * notification or an old link still lands in the right place.
 */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <PageTransition>
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bakes" element={<BakesPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/published" element={<PublishedPage />} />
        <Route path="/gallery" element={<Navigate to="/bakes" replace />} />
        <Route path="/analytics" element={<Navigate to="/bakes" replace />} />
        <Route path="/grocery" element={<Navigate to="/shop" replace />} />
        <Route path="/pantry" element={<Navigate to="/shop?view=cupboard" replace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/recipe/:id/bake" element={<BakingMode />} />
        <Route path="/recipe/:id" element={<RecipeViewer />} />
        <Route path="/r/:slug" element={<RecipeViewer />} />
        <Route path="/new" element={<RecipeEditor />} />
        <Route path="/edit/:id" element={<RecipeEditor />} />
        <Route path="/notes" element={<GeneralNotes />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/moderation" element={<Moderation />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/reset" element={<ResetPassword />} />
        {Lab ? <Route path="/lab" element={<Lab />} /> : null}
        {/* /@handle: a baker's page. Any other unknown single segment is a 404. */}
        <Route path="/:at" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
  );
}

/** Addresses a stranger may be sent straight to, without the landing page first. */
/** Addresses a stranger may be sent straight to: shared pages, and links from an email. */
const SHARED_PATH = /^\/(r\/|@|verify|reset)/;

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  useEffect(() => {
    const path = window.location.pathname;
    if (!localStorage.getItem('hasVisited') && path !== '/welcome' && !SHARED_PATH.test(path)) {
      window.location.href = '/welcome';
    }

    // The `dark:` variant is bound to the .dark class (see index.css), so in "system"
    // mode we have to mirror OS theme changes onto the class ourselves.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemTheme = (e: MediaQueryListEvent) => {
      if (readTheme() !== 'system') return; // an explicit choice wins
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handleSystemTheme);

    return () => {
      mq.removeEventListener('change', handleSystemTheme);
    };
  }, []);

  // An operator endpoint answered 401: the operator's session has lapsed.
  useEffect(() => {
    const handleAuthReq = () => {
      setOperatorToken(null);
      setShowAuthModal(true);
    };
    window.addEventListener('auth-required', handleAuthReq);
    return () => window.removeEventListener('auth-required', handleAuthReq);
  }, []);

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
          element={<AppShell showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} />}
        />
      </Routes>
    </Router>
    </MotionConfig>
  );
}

/*
 * There is no offline bar. The cookbook lives on the device, so being offline
 * changes nothing about it, and a permanent amber strip for the normal case
 * would train people to ignore the one that matters (decision B29). Each
 * network feature says so itself when it can't be reached, and Settings
 * reports whether the server is reachable.
 */
function AppShell({
  showAuthModal,
  setShowAuthModal,
}: {
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
}) {
  const [account, setAccountSheet] = useState<{ open: boolean; mode: AccountMode; reason?: string }>({
    open: false,
    mode: 'signin',
  });
  useAccountRefresh();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      const { mode, reason } = (e as CustomEvent<AccountPrompt>).detail;
      setAccountSheet({ open: true, mode, reason });
    };
    // The server ended this device's session (api.ts has already signed it out).
    const onEnded = () =>
      setAccountSheet({ open: true, mode: 'signin', reason: 'You were signed out. Sign in again to carry on.' });
    window.addEventListener(ACCOUNT_PROMPT_EVENT, onPrompt);
    window.addEventListener('account-required', onEnded);
    return () => {
      window.removeEventListener(ACCOUNT_PROMPT_EVENT, onPrompt);
      window.removeEventListener('account-required', onEnded);
    };
  }, []);

  const { pathname } = useLocation();
  const chromeFree = isChromeFree(pathname);
  const mainRef = useRef<HTMLElement>(null);
  useScrollMemory(mainRef);

  /*
   * The shell: a slim top bar on a desktop, four tabs along the bottom of a
   * phone, and the page between them scrolling on its own. A shared page or
   * baking mode gets none of it (see isChromeFree).
   */
  return (
    <ToastProvider>
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <main
          ref={mainRef}
          className={cn(
            'relative w-full flex-1 overflow-y-auto overscroll-y-auto px-4 pt-safe md:px-8 md:pt-0',
            chromeFree ? 'pb-12' : 'pb-tabbar md:pb-12',
          )}
        >
          {/* The running timer, at the top of a phone screen; a desktop shows it in the top bar. */}
          <TimerPill dock />
          <div className="mx-auto w-full max-w-[75rem]">
            <ErrorBoundary>
              <Suspense fallback={<RouteSkeleton />}>
                <AnimatedRoutes />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
        <TabBar />
        <TimerManager />
        <AuthModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
        <AccountSheet
          open={account.open}
          mode={account.mode}
          reason={account.reason}
          onModeChange={(mode) => setAccountSheet((a) => ({ ...a, mode }))}
          onClose={() => setAccountSheet((a) => ({ ...a, open: false, reason: undefined }))}
        />
      </div>
    </div>
    </ToastProvider>
  );
}

export default App;
