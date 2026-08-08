import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RecipeViewer from './components/RecipeViewer';
import RecipeEditor from './components/RecipeEditor';
import Gallery from './components/Gallery';
import GeneralNotes from './components/GeneralNotes';
import BakingMode from './components/BakingMode';
import TimerManager from './components/TimerManager';
import { api } from './lib/api';

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
        <input 
          type="password" 
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          className="w-full bg-black/5 dark:bg-white/5 border border-border-subtle rounded-md p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-ink text-center font-mono text-xl tracking-widest"
          autoFocus
        />
        {error && <p className="text-red-500 text-sm mb-4 text-center font-medium">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2 font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded-md">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 bg-ink text-paper py-2 font-medium rounded-md hover:opacity-90">{loading ? 'Verifying...' : 'Submit'}</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
      <div className={`flex min-h-screen ${isOffline ? 'pt-6' : ''}`}>
        <Sidebar />
        
        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)} 
            onSuccess={() => {
              setShowAuthModal(false);
              window.location.reload();
            }} 
          />
        )}

        <main className="flex-1 ml-64 p-8 md:p-12 max-w-6xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recipe/new" element={<RecipeEditor />} />
            <Route path="/recipe/:id" element={<RecipeViewer />} />
            <Route path="/recipe/:id/edit" element={<RecipeEditor />} />
            <Route path="/bake/:id" element={<BakingMode />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/notes" element={<GeneralNotes />} />
          </Routes>
        </main>
      </div>
      <TimerManager />
    </Router>
  );
}

export default App;
