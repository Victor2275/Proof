import { Sheet } from './ui';

/*
 * Help, in a cook's words: what the app is for and the four things you do in
 * it. It stands in for the onboarding tour, which taught features before
 * anyone had a reason to want them; this is here for whoever goes looking.
 */
const TOPICS: { title: string; body: string }[] = [
  {
    title: 'Your cookbook',
    body: 'Every recipe you write, paste in or save from someone else. Press New in the Cookbook to add one.',
  },
  {
    title: 'Cooking',
    body: 'Open a recipe and press Start cooking: one step at a time, with its timers ready.',
  },
  {
    title: 'Bakes',
    body: 'Log each bake: a photo, how it went, what to change. The note shows up next time.',
  },
  {
    title: 'Shop',
    body: "What to buy, and what's in the cupboard.",
  },
  {
    title: 'It stays on this device',
    body: 'No account needed. Export a copy from Settings. An account is for publishing and sync.',
  },
];

export default function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Help" placement="bottom" detents>
      <div className="flex flex-col gap-5 pb-4">
        {TOPICS.map((t) => (
          <section key={t.title} className="flex flex-col gap-1">
            <h3 className="font-title text-lg text-ink">{t.title}</h3>
            <p className="font-prose text-[1.0625rem] text-ink-2">{t.body}</p>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
