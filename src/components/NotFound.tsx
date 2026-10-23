import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button, Field, buttonClassName } from './ui';

/*
 * 404 (change 133): a page the book doesn't have.
 *
 * Said the way a cookbook would say it, then two ways on: look for the recipe
 * by name — most broken links are to a recipe that was renamed or deleted —
 * or go back to the cookbook. The search hands over to the cookbook's own
 * (`/?q=`), so there is one search, not a second one here.
 */
export default function NotFound() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-6 px-1 py-10">
      <div className="flex flex-col gap-2">
        <p className="font-title text-6xl italic leading-tight text-ink-muted" aria-hidden="true">
          p. 404
        </p>
        <h1 className="font-title text-3xl leading-tight text-ink">That page isn't in this book.</h1>
        <p className="font-prose text-[1.0625rem] text-ink-2">
          It may have been deleted, or the link may have been mistyped. If it was a recipe, look for it by name.
        </p>
      </div>

      <form
        role="search"
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
        }}
      >
        <Field
          label="Look for a recipe"
          hideLabel
          type="search"
          className="min-w-0 flex-1"
          leading={<Search className="h-4 w-4 text-ink-muted" aria-hidden="true" />}
          placeholder="Look for a recipe"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit">Search</Button>
      </form>

      <Link to="/" className={buttonClassName({ variant: 'ghost', className: 'self-start' })}>
        Back to the cookbook
      </Link>
    </div>
  );
}
