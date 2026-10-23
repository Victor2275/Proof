import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import type { BakeLog, Recipe } from '../lib/types';
import { bakePhotoUrls } from '../lib/bakePhotos';
import { meaningfulDescription } from '../lib/description';
import { factsLine } from '../lib/facts';
import { friendlyAmountText, ingredientParts } from '../lib/quantities';
import { cleanText, headnote, methodSteps } from '../lib/recipeText';
import { usePhotoSrc } from '../lib/usePhotoSrc';
import { Button, Segmented, Sheet } from './ui';

/*
 * Sharing as a picture (UI overhaul Phase 5, changes 107, 127–130).
 *
 * A card is the one piece of Proof a stranger sees out of context — a picture
 * on a feed, no navigation, nothing to explain it — so it is drawn as what the
 * app is: a page of a cookbook. Paper, the serif title, one line of facts, the
 * ingredients in kitchen fractions, the method in the reading face; for a
 * bake, the bake's own photograph, its stars, what happened and the pencilled
 * note to next time. The page proportions (4:5) are a recipe card's, and fit a
 * feed without cropping.
 *
 * Rasterised, so three rules hold:
 * 1. Every colour is a literal: html2canvas rebuilds the node outside the
 *    cascade, so a token arrives with nothing behind it. These are the
 *    themes' own values, pinned.
 * 2. Nothing loads that could fail: no logo file, no stock fallback photo. A
 *    recipe without a photograph gets its initial as a drop cap, as in the app.
 * 3. Nothing is claimed that the recipe cannot prove: placeholder times are
 *    left out, and the seed's template description is not printed.
 */

interface InstagramExporterProps {
  recipe: Recipe;
  /** A bake to share: its own card leads, with its photograph and notes. */
  bakeLog?: BakeLog;
  onClose: () => void;
}

const W = 1080;
const H = 1350;

const PALETTES = {
  light: { paper: '#fbf7f0', sunk: '#f4ecdd', rule: '#e4dccf', ink: '#1f1a17', ink2: '#4a423c', muted: '#6b6159', accent: '#b5391f', pencil: '#6b5a2e' },
  dark: { paper: '#16120f', sunk: '#221c17', rule: '#2e2620', ink: '#f1e9dc', ink2: '#d8cdbe', muted: '#a99e91', accent: '#e26a4a', pencil: '#d9c78e' },
};
type Palette = (typeof PALETTES)['light'];

const TITLE = "'Fraunces Variable', Georgia, serif";
const PROSE = "'Source Serif 4 Variable', Georgia, serif";
const SANS = "'Inter Tight Variable', ui-sans-serif, system-ui, sans-serif";

const stars = (n: number | null | undefined) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

/** One card: paper, a margin, a running head and a running foot, like a printed page. */
function Page({ p, head, foot, children, innerRef }: { p: Palette; head: string; foot: string; children: ReactNode; innerRef: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      ref={innerRef}
      style={{ width: W, height: H, background: p.paper, color: p.ink, padding: '64px 72px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 24, color: p.muted, paddingBottom: 20, borderBottom: `2px solid ${p.rule}` }}>
        <span style={{ fontFamily: TITLE, fontSize: 30, color: p.ink }}>Proof</span>
        <span>{head}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <div style={{ fontFamily: SANS, fontSize: 22, color: p.muted, paddingTop: 18, borderTop: `2px solid ${p.rule}` }}>{foot}</div>
    </div>
  );
}

/** The photograph, or the recipe's initial as a drop cap — never an empty box. */
function Plate({ p, src, title, height }: { p: Palette; src: string | undefined; title: string; height: number }) {
  const url = usePhotoSrc(src);
  return url ? (
    <div style={{ height, borderRadius: 10, backgroundColor: p.sunk, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
  ) : (
    <div style={{ height, borderRadius: 10, background: p.sunk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TITLE, fontStyle: 'italic', fontSize: height * 0.55, color: p.pencil }}>
      {title.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export default function InstagramExporter({ recipe, bakeLog, onClose }: InstagramExporterProps) {
  const [mode, setMode] = useState<'single' | 'carousel'>('single');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});
  const scalers = useRef<(HTMLDivElement | null)[]>([]);
  const p = PALETTES[theme];

  const steps = useMemo(() => methodSteps(recipe.instructions), [recipe.instructions]);
  const facts = factsLine(recipe);
  const about = headnote(meaningfulDescription(recipe.description));
  const bakePhoto = bakeLog ? bakePhotoUrls(bakeLog)[0] : undefined;
  const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const host = window.location.host;

  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const update = () => setScale(Math.min((window.innerWidth - (window.innerWidth >= 768 ? 64 : 32)) / W, 0.5));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const pages: { key: string; label: string; node: ReactNode }[] = [];
  const ref = (key: string) => (el: HTMLDivElement | null) => {
    nodes.current[key] = el;
  };

  // The bake, when there is one: the photograph that came out of this oven.
  if (bakeLog) {
    pages.push({
      key: 'bake',
      label: 'bake',
      node: (
        <Page p={p} head={date(bakeLog.date)} foot={host} innerRef={ref('bake')}>
          <div style={{ marginTop: 44 }}>
            <Plate p={p} src={bakePhoto ?? recipe.imageUrls?.[0]} title={recipe.title} height={560} />
          </div>
          <h1 style={{ fontFamily: TITLE, fontWeight: 560, fontSize: recipe.title.length > 28 ? 64 : 80, lineHeight: 1.04, margin: '40px 0 0' }}>{recipe.title}</h1>
          {bakeLog.rating ? <div style={{ fontFamily: SANS, fontSize: 44, color: p.accent, marginTop: 18, letterSpacing: 4 }}>{stars(bakeLog.rating)}</div> : null}
          {bakeLog.notes ? (
            <p style={{ fontFamily: PROSE, fontSize: 38, lineHeight: 1.4, color: p.ink, margin: '24px 0 0', overflow: 'hidden', maxHeight: 220 }}>“{cleanText(bakeLog.notes).slice(0, 220)}”</p>
          ) : null}
          {bakeLog.nextTime ? (
            <p style={{ fontFamily: PROSE, fontStyle: 'italic', fontSize: 32, color: p.pencil, margin: '20px 0 0' }}>✎ Next time: {cleanText(bakeLog.nextTime).slice(0, 120)}</p>
          ) : null}
        </Page>
      ),
    });
  }

  // The recipe's own page: its photograph, its title, one line of facts.
  pages.push({
    key: 'recipe',
    label: 'recipe',
    node: (
      <Page p={p} head={recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : 'A recipe'} foot={host} innerRef={ref('recipe')}>
        <div style={{ marginTop: 44 }}>
          <Plate p={p} src={recipe.imageUrls?.[0]} title={recipe.title} height={640} />
        </div>
        <h1 style={{ fontFamily: TITLE, fontWeight: 560, fontSize: recipe.title.length > 28 ? 68 : 88, lineHeight: 1.03, margin: '44px 0 0' }}>{recipe.title}</h1>
        {about ? <p style={{ fontFamily: PROSE, fontStyle: 'italic', fontSize: 36, lineHeight: 1.35, color: p.ink2, margin: '20px 0 0', maxHeight: 100, overflow: 'hidden' }}>{about}</p> : null}
        {facts ? <p style={{ fontFamily: SANS, fontSize: 28, color: p.muted, margin: '20px 0 0' }}>{facts}</p> : null}
      </Page>
    ),
  });

  pages.push({
    key: 'ingredients',
    label: 'ingredients',
    node: (
      <Page p={p} head={recipe.title} foot={`${recipe.ingredients.length} ingredients · ${host}`} innerRef={ref('ingredients')}>
        <h2 style={{ fontFamily: TITLE, fontWeight: 560, fontSize: 60, margin: '44px 0 16px' }}>Ingredients</h2>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {recipe.ingredients.slice(0, 16).map((ing, i) => {
            const parts = ingredientParts(cleanText(ing.name));
            return (
              <div key={i} style={{ display: 'flex', gap: 28, alignItems: 'baseline', padding: '14px 0', borderBottom: `2px solid ${p.rule}` }}>
                <span style={{ width: 190, flexShrink: 0, fontFamily: SANS, fontWeight: 600, fontSize: 30 }}>{friendlyAmountText(ing.quantity, ing.unit)}</span>
                <span style={{ fontFamily: PROSE, fontSize: 32 }}>
                  {parts.name}
                  {parts.note ? <span style={{ fontStyle: 'italic', color: p.muted }}>, {parts.note}</span> : null}
                </span>
              </div>
            );
          })}
          {recipe.ingredients.length > 16 ? <p style={{ fontFamily: SANS, fontSize: 26, color: p.muted }}>and {recipe.ingredients.length - 16} more</p> : null}
        </div>
      </Page>
    ),
  });

  pages.push({
    key: 'method',
    label: 'method',
    node: (
      <Page p={p} head={recipe.title} foot={steps.length > 6 ? `${steps.length - 6} more steps in the recipe · ${host}` : host} innerRef={ref('method')}>
        <h2 style={{ fontFamily: TITLE, fontWeight: 560, fontSize: 60, margin: '44px 0 16px' }}>Method</h2>
        <div style={{ overflow: 'hidden' }}>
          {steps.slice(0, 6).map((s) => (
            <div key={s.index} style={{ display: 'flex', gap: 26, marginBottom: 26 }}>
              <span style={{ fontFamily: TITLE, fontSize: 40, color: p.muted, width: 40, flexShrink: 0, lineHeight: 1.2 }}>{s.number}</span>
              <span style={{ fontFamily: PROSE, fontSize: 32, lineHeight: 1.45 }}>{s.text.length > 240 ? `${s.text.slice(0, 240).trimEnd()}…` : s.text}</span>
            </div>
          ))}
        </div>
      </Page>
    ),
  });

  const shown = mode === 'single' ? pages.slice(0, 1) : pages;

  const download = async () => {
    setExporting(true);
    setExportError('');
    const elements = scalers.current.filter(Boolean) as HTMLDivElement[];
    // The preview is scaled down; the capture must be the full-size page.
    elements.forEach((el) => (el.style.transform = 'none'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      for (let i = 0; i < shown.length; i++) {
        const node = nodes.current[shown[i].key];
        if (!node) continue;
        const canvas = await html2canvas(node, { scale: 1, useCORS: true, backgroundColor: p.paper, width: W, height: H });
        const link = document.createElement('a');
        link.download = `${recipe.title}-${shown.length > 1 ? `${i + 1}-` : ''}${shown[i].label}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
      }
    } catch {
      setExportError("The card couldn't be drawn. Try again — an extension that blocks images is the usual cause.");
    } finally {
      elements.forEach((el) => (el.style.transform = `scale(${scale})`));
      setExporting(false);
    }
  };

  const wrapper: CSSProperties = { width: W * scale, height: H * scale };
  return (
    <Sheet
      open
      onClose={onClose}
      title={bakeLog ? 'Share this bake' : 'Share as a card'}
      size="full"
      flush
      footer={
        <Button variant="primary" size="lg" className="mx-auto" busy={exporting} onClick={download} icon={<Download className="h-5 w-5" aria-hidden="true" />}>
          {exporting ? 'Drawing' : shown.length > 1 ? `Download ${shown.length} cards` : 'Download the card'}
        </Button>
      }
    >
      {exportError ? (
        <p role="alert" className="shrink-0 border-b border-fault px-4 py-2 text-sm text-fault">
          {exportError}
        </p>
      ) : null}

      <div className="flex flex-1 flex-col items-center gap-6 overflow-y-auto p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Segmented
            label="How many cards"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'single', label: 'One card' },
              { value: 'carousel', label: `All ${pages.length}` },
            ]}
          />
          <Segmented
            label="Card paper"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Paper' },
              { value: 'dark', label: 'Night' },
            ]}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          {shown.map((page, i) => (
            <div key={page.key} className="relative overflow-hidden rounded-key border border-rule" style={wrapper}>
              <div
                ref={(el) => {
                  scalers.current[i] = el;
                }}
                className="absolute left-0 top-0"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
              >
                {page.node}
              </div>
            </div>
          ))}
        </div>
      </div>

    </Sheet>
  );
}
