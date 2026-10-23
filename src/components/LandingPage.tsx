import { useNavigate } from 'react-router-dom';
import { BookOpen, Link2, Timer, WifiOff } from 'lucide-react';
import { Button, MarginNote, Stamp, Stars } from './ui';

/*
 * The landing page: the one Persuade surface in an Operate product
 * (UI overhaul Phase 5, changes 32–38).
 *
 * A stranger gets one reading before deciding, and the previous page spent it
 * on the design's own metaphor — "a recipe is a pattern, a bake is that
 * pattern running" — over a demonstration of a drum machine. Their guess at
 * what it was: "a music thing". This one says what the app does, in a cook's
 * words, over a loaf: you keep your recipes, and what happened every time you
 * made them, and the next one is better for it.
 *
 * Under that, the thing itself: a page of the cookbook with a bake note on it,
 * drawn with the app's own pieces so it cannot promise what the app does not
 * do. One solid button, said twice — at the top and at the foot. The promise
 * that matters most to a stranger, no account and nothing leaves the phone,
 * is a sentence, not small print.
 *
 * The photograph is the library's own Danish rye, self-hosted and precached
 * so the page works offline.
 */

const LINES = [
  { icon: WifiOff, title: 'Works offline', body: 'Your cookbook lives on this device. No signal in the kitchen, no problem.' },
  { icon: Timer, title: 'Timers in every step', body: 'Tap “20 minutes” in a step and it counts down, even if you leave the page.' },
  { icon: Link2, title: 'Share a recipe', body: 'Send a link to a recipe you are proud of, or save one someone sent you.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const open = () => {
    localStorage.setItem('hasVisited', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex max-w-5xl flex-col px-4 pb-16 pt-safe md:px-8 md:pt-10">
        <header className="flex min-h-11 items-center">
          <span className="font-title text-[1.75rem] text-ink" style={{ fontVariationSettings: "'SOFT' 80" }}>
            Proof
          </span>
        </header>

        <section className="grid items-center gap-8 pt-4 md:grid-cols-2 md:gap-12 md:pt-10">
          <img
            src="/landing/danish-rye.webp"
            alt="A loaf of Danish rye bread on a board, three slices cut"
            width={700}
            height={525}
            className="-mx-4 aspect-[4/3] w-[calc(100%+2rem)] max-w-none object-cover sm:mx-0 sm:w-full sm:rounded-panel md:order-2"
          />
          <div className="flex flex-col gap-5">
            <h1 className="font-title text-[2.75rem] leading-[1.02] text-ink sm:text-6xl">
              Bake it. Write it down. Bake it better.
            </h1>
            <p className="font-prose max-w-prose text-xl leading-snug text-ink-2">
              Your recipes, and what happened every time you made them — so the note you left last time is waiting when you
              start the next.
            </p>
            <div className="flex flex-col items-start gap-3">
              <Button variant="primary" size="lg" onClick={open} icon={<BookOpen className="h-5 w-5" aria-hidden="true" />}>
                Open my cookbook
              </Button>
              <p className="text-[0.9375rem] text-ink-2">No account. It stays on your phone.</p>
            </div>
          </div>
        </section>

        {/* The thing itself: a page of the cookbook, with a bake note on it. */}
        <section id="example" aria-labelledby="example-heading" className="mt-16 flex scroll-mt-6 flex-col gap-4">
          <h2 id="example-heading" className="font-title text-2xl text-ink">
            Every bake, on the recipe it belongs to
          </h2>
          <div
            role="img"
            aria-label="An example recipe page: Danish rye bread, serves 10, with last time's bake — four stars, “Dense in the middle, crust perfect” — and a pencilled note for next time: “Proof an hour longer.”"
            className="grid gap-6 rounded-sheet border border-rule bg-paper-raised p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:p-7"
          >
            <div className="flex flex-col gap-3" aria-hidden="true">
              <p className="font-title text-3xl leading-tight text-ink">Danish rye bread</p>
              <p className="text-sm text-ink-muted">Serves 10 · Prep 40 min · Bake 1 h 15 · Medium</p>
              <div className="relative flex flex-col gap-2 rounded-panel bg-paper-sunk px-4 pb-3 pt-4">
                <span className="flex items-baseline justify-between text-[0.8125rem]">
                  <span className="font-semibold text-ink">Last time · Oct 12</span>
                  <Stars value={4} />
                </span>
                <span className="font-prose text-[1.0625rem] leading-snug text-ink">“Dense in the middle, crust perfect.”</span>
                <MarginNote lead="Next time">Proof an hour longer.</MarginNote>
              </div>
            </div>
            <div className="flex flex-col gap-3" aria-hidden="true">
              <p className="font-title text-xl text-ink">Your bakes</p>
              <div className="flex gap-2.5">
                {[
                  { n: 1, note: 'Too wet. Less water.', stars: 2 },
                  { n: 2, note: 'Better. Still dense.', stars: 3 },
                  { n: 3, note: 'Crust perfect.', stars: 4, best: true },
                ].map((b) => (
                  <div key={b.n} className="relative flex w-1/3 flex-col gap-1.5">
                    <div className="flex aspect-square flex-col justify-between rounded-key bg-paper-sunk p-2.5">
                      <span className="font-title text-2xl leading-none text-pencil">{b.n}</span>
                      <span className="font-prose text-[0.8125rem] italic leading-snug text-ink-2">“{b.note}”</span>
                    </div>
                    <Stars value={b.stars} />
                    {b.best ? <Stamp rating={b.stars} className="absolute -right-1 -top-1 scale-75" /> : null}
                  </div>
                ))}
              </div>
              <p className="font-prose text-ink-2">
                Oldest to newest, so the row itself is the progress — and the note you left for next time shows up when you
                start cooking it again.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="What else it does" className="mt-14 grid gap-6 sm:grid-cols-3">
          {LINES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-1.5">
              <Icon className="h-5 w-5 text-ink-2" strokeWidth={1.7} aria-hidden="true" />
              <h3 className="font-title text-lg text-ink">{title}</h3>
              <p className="text-[0.9375rem] text-ink-2">{body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-16 flex flex-col items-start gap-3 border-t border-rule pt-8">
          <p className="font-title text-2xl text-ink">Start with the next thing you bake.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="lg" onClick={open}>
              Open my cookbook
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => document.getElementById('example')?.scrollIntoView({ block: 'start' })}
            >
              See an example recipe
            </Button>
          </div>
          <p className="text-sm text-ink-muted">Free, with no account. An account is only for publishing recipes for others.</p>
        </footer>
      </div>
    </div>
  );
}
