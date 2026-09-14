import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <h1 className="text-9xl font-black text-ink/10 tracking-tighter uppercase">404</h1>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold uppercase tracking-tight">Recipe Not Found</h2>
        <p className="text-ink-muted text-lg max-w-md mx-auto">
          The page or recipe you are looking for has been burnt to a crisp or doesn't exist.
        </p>
      </div>
      <Link 
        to="/"
        className="mt-8 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-black font-bold uppercase tracking-wider rounded-xl hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
      >
        <ArrowLeft className="w-5 h-5" /> Back to Kitchen
      </Link>
    </div>
  );
}
