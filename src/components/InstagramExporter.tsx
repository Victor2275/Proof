import { useState, useRef, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import html2canvas from 'html2canvas';
import { Download, LayoutGrid, Image as ImageIcon, X, Sun, Moon } from 'lucide-react';
import { type Recipe, type BakeLog } from '../lib/api';
import { derivePhasesWithReading } from '../lib/phases';
import { totalRecipeMinutes, formatMinutesForSegments, isPlaceholderTiming } from '../lib/duration';
import { SEGMENT_GLYPHS, SEGMENT_SHAPES } from '../lib/sevenSegment';
import { Button } from './ui';

/*
 * The shared bake card.
 *
 * This is the only surface in Proof that someone who has never opened the app
 * will see, and they see it out of context: a 1080px square on a feed, with no
 * navigation, no hover, and nothing else to explain it. That makes it a
 * Persuade surface inside an Operate product — and it is the reason this file
 * is a redesign rather than a retheme. The old export was a polaroid: a photo,
 * a rotation, a caption. Every food account on earth posts that.
 *
 * What Proof has that they do not is the pattern. So the card is the bake as
 * the machine finished it: the photograph mounted as a plate on a faceplate,
 * the name silkscreened beneath it, the instrument values that are real, and
 * the step row across the foot with every key complete. Someone scrolling past
 * cannot read the recipe, but they can see that this thing was *run*.
 *
 * Three rules follow from being rasterised rather than rendered:
 *
 * 1. Every colour is a literal. html2canvas rebuilds the node outside the
 *    document's cascade, so a token-driven fill arrives with no rule behind it.
 *    The palettes below are the app's own values, pinned.
 * 2. Nothing is loaded that could fail. The old card pulled /logo.png with a
 *    crossOrigin attribute and an unsplash fallback photo; a card that renders
 *    a broken image on someone else's feed is worse than one with no mark at
 *    all, so the identity here is set in type.
 * 3. Nothing is claimed that the recipe cannot prove. The same provenance rules
 *    the cookbook uses apply: the seed script's "20 mins" is not a time, and a
 *    generic prep/cook/finish reading is not a bake's phases.
 */

interface InstagramExporterProps {
  recipe: Recipe;
  bakeLog?: BakeLog;
  onClose: () => void;
}

const CARD = 1080;

interface Palette {
  ground: string;
  panel: string;
  sunk: string;
  rule: string;
  ink: string;
  silkscreen: string;
  muted: string;
  signal: string;
  /*
   * A complete key. In the app this is deliberately dim — lit keys have to
   * dominate a running row. On a card nothing is running, so complete is the
   * brightest state there is and it is drawn at full ink.
   */
  done: string;
  unlit: string;
}

const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: {
    ground: '#000000',
    panel: '#161616',
    sunk: '#0b0b0b',
    rule: '#2e2e2e',
    ink: '#f2f2f2',
    silkscreen: '#bdbdbd',
    muted: '#8a8a8a',
    signal: '#ff3b30',
    done: '#f2f2f2',
    unlit: '#2a2a2a',
  },
  light: {
    ground: '#e8e4dc',
    panel: '#f2efe9',
    sunk: '#dcd7cc',
    rule: '#c9c4b8',
    ink: '#171614',
    silkscreen: '#4a4640',
    muted: '#63605a',
    signal: '#c81e14',
    done: '#171614',
    unlit: '#c9c4b8',
  },
};

const DISPLAY = "'Archivo Variable', ui-sans-serif, system-ui, sans-serif";
const MONO = "'JetBrains Mono Variable', ui-monospace, Menlo, monospace";

const silkscreen = (p: Palette, size = 22): CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: p.silkscreen,
});

/** A seven-segment value, filled with literals so the raster keeps its colour. */
function Segments({
  value,
  height,
  lit,
  unlit,
}: {
  value: string;
  height: number;
  lit: string;
  unlit: string;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: height * 0.09 }}>
      {value.split('').map((char, i) => {
        if (char === ':' || char === '.') {
          return (
            <svg key={i} viewBox="0 0 20 100" height={height} width={(height * 20) / 100}>
              {char === ':' ? (
                <>
                  <rect x="4" y="30" width="12" height="12" fill={lit} />
                  <rect x="4" y="60" width="12" height="12" fill={lit} />
                </>
              ) : (
                <rect x="4" y="82" width="12" height="12" fill={lit} />
              )}
            </svg>
          );
        }
        const on = SEGMENT_GLYPHS[char] ?? '';
        return (
          <svg key={i} viewBox="0 0 60 100" height={height} width={(height * 60) / 100}>
            {Object.entries(SEGMENT_SHAPES).map(([name, points]) => (
              <polygon key={name} points={points} fill={on.includes(name) ? lit : unlit} />
            ))}
          </svg>
        );
      })}
    </span>
  );
}

/** The card's outer plate: ground, padding, and the head rule every slide shares. */
function Slide({
  palette,
  eyebrow,
  corner,
  children,
  innerRef,
}: {
  palette: Palette;
  eyebrow: string;
  corner?: string;
  children: ReactNode;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={innerRef}
      style={{
        width: CARD,
        height: CARD,
        background: palette.ground,
        color: palette.ink,
        fontFamily: MONO,
        padding: 56,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${palette.rule}`,
          paddingBottom: 18,
        }}
      >
        <span style={silkscreen(palette)}>{eyebrow}</span>
        {corner ? <span style={{ ...silkscreen(palette), color: palette.muted }}>{corner}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** A count, set in mono — counts are not instrument values and never get segments. */
function Stat({ palette, label, value }: { palette: Palette; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={silkscreen(palette, 20)}>{label}</span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 44,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          color: palette.ink,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function InstagramExporter({ recipe, bakeLog, onClose }: InstagramExporterProps) {
  const [exportMode, setExportMode] = useState<'carousel' | 'single'>('carousel');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [exporting, setExporting] = useState(false);
  const nodes = useRef<Record<string, HTMLDivElement | null>>({});

  const palette = PALETTES[theme];

  // The bake's own photograph if this is a logged bake, otherwise the recipe's.
  // No stock fallback: a card that shows a stranger's stock photo of bread is a
  // card that lies about what came out of the oven.
  const heroImage = bakeLog?.imageUrls?.[0] || recipe.imageUrls?.[0] || '';

  const { phases, reading } = useMemo(
    () => derivePhasesWithReading(recipe.instructions),
    [recipe.instructions],
  );
  const steps = recipe.instructions || [];
  const ingredients = recipe.ingredients || [];

  /*
   * What the key row counts, and the rule is that it is never approximate.
   *
   * A recipe whose text named a levain and a bulk has real phases, and they get
   * labelled keys. A shorter recipe that proved nothing gets one key per step —
   * still exact, and better than printing three generic words on a card a
   * stranger reads. Past sixteen steps a key per step stops being a row and
   * starts being a bar, so those fall back to the phase keys, which are also
   * exact. No branch draws a count it cannot stand behind.
   */
  const stepKeys = reading !== 'bread' && steps.length > 0 && steps.length <= 16;
  const keyCount = stepKeys ? steps.length : phases.length;
  const keyLabels = stepKeys ? null : phases.map((p) => p.label);

  const placeholder = isPlaceholderTiming(recipe);
  const totalMinutes = placeholder ? null : totalRecipeMinutes(recipe);
  const totalSegments = totalMinutes === null ? null : formatMinutesForSegments(totalMinutes);

  const dateLabel = new Date(bakeLog?.date || Date.now())
    .toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  const noteText = (bakeLog?.notes?.trim()) || (recipe.description?.trim()) || '';
  const noteHeading = bakeLog?.notes?.trim() ? "Baker's log" : 'About this bake';

  const shareUrl = `${window.location.origin}/recipe/${recipe._id}`;
  const shareHost = window.location.host;

  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const updateScale = () => {
      const padding = window.innerWidth >= 768 ? 64 : 32;
      const availableWidth = window.innerWidth - padding;
      const maxScale = 0.8;
      setScale(Math.min(availableWidth / CARD, maxScale));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const wrapperStyle = { width: `${CARD * scale}px`, height: `${CARD * scale}px` };
  const innerStyle: CSSProperties = { transform: `scale(${scale})`, transformOrigin: 'top left' };

  /*
   * The preview is a scaled-down copy of a 1080px card, and html2canvas measures
   * what it is given: captured through that transform, a card exported from a
   * phone came out 864px square — below what any feed wants, and dependent on
   * how wide the window happened to be. So the scale comes off for the duration
   * of the capture and goes straight back on. It is the render that must be
   * 1080; the preview is only ever a preview.
   */
  const scalers = useRef<(HTMLDivElement | null)[]>([]);

  const withFullSizeCards = async <T,>(render: () => Promise<T>): Promise<T> => {
    const elements = scalers.current.filter(Boolean) as HTMLDivElement[];
    elements.forEach((el) => { el.style.transform = 'none'; });
    // Two frames: one for the layout to settle, one for it to have painted.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      return await render();
    } finally {
      elements.forEach((el) => { el.style.transform = `scale(${scale})`; });
    }
  };

  const downloadCanvas = async (element: HTMLElement | null, filename: string) => {
    if (!element) return;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: palette.ground,
      width: CARD,
      height: CARD,
    });
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  /*
   * The keys, all complete — this bake has already run.
   *
   * Drawn with real gaps and a ceiling on width: a dozen touching bone
   * rectangles read as one white bar, and a bar is not a row of keys. The gap
   * is what makes them countable.
   */
  const KeyRow = ({ height = 48 }: { height?: number }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: Math.max(keyCount, 1) }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              maxWidth: 80,
              height,
              borderRadius: 2,
              background: keyCount === 0 ? palette.unlit : palette.done,
            }}
          />
        ))}
      </div>
      {keyLabels ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {keyLabels.map((label) => (
            <span
              key={label}
              style={{
                ...silkscreen(palette, 18),
                flex: 1,
                maxWidth: 80,
                textAlign: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      ) : (
        <span style={silkscreen(palette, 18)}>
          {steps.length} {steps.length === 1 ? 'step' : 'steps'}
        </span>
      )}
    </div>
  );

  const slides: { key: string; label: string; node: ReactNode }[] = [];

  /* Slide 1 — the pattern card. On its own it is the whole "single" export. */
  slides.push({
    key: 'pattern',
    label: 'pattern',
    node: (
      <Slide
        palette={palette}
        eyebrow={bakeLog ? 'Proof · bake log' : 'Proof · recipe'}
        corner={dateLabel}
        innerRef={(el) => { nodes.current.pattern = el; }}
      >
        {/* The plate. Sunk into the faceplate with a hairline, never floating
          * on a shadow — the photograph is a specimen mounted on the panel. */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: 28,
            border: `1px solid ${palette.rule}`,
            background: palette.sunk,
            backgroundImage: heroImage ? `url(${heroImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontStretch: '118%',
            fontSize: recipe.title.length > 26 ? 64 : 80,
            lineHeight: 1.02,
            letterSpacing: '-0.01em',
            margin: '30px 0 0',
            color: palette.ink,
            maxHeight: 176,
            overflow: 'hidden',
          }}
        >
          {recipe.title}
        </h1>

        <div style={{ ...silkscreen(palette, 20), marginTop: 12 }}>
          {[recipe.folder && recipe.folder !== 'Uncategorized' ? recipe.folder : null, recipe.difficulty]
            .filter(Boolean)
            .join(' · ')}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 56, marginTop: 30 }}>
          {totalSegments ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={silkscreen(palette, 20)}>Total</span>
              <span style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <Segments value={totalSegments.value} height={52} lit={palette.signal} unlit={palette.unlit} />
                <span style={{ ...silkscreen(palette, 20), paddingBottom: 4 }}>{totalSegments.unit}</span>
              </span>
            </div>
          ) : null}
          <Stat palette={palette} label="Serves" value={String(recipe.servings || 4)} />
          <Stat palette={palette} label="Ingredients" value={String(ingredients.length)} />
        </div>

        {/*
          The foot: the pattern on the left, and where to find it on the right.
          Keys keep their ceiling — a 300px-wide key stops reading as a key —
          so the line is closed by the address instead of by stretching them.
        */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 40,
            marginTop: 30,
          }}
        >
          <KeyRow />
          <span style={{ ...silkscreen(palette, 20), paddingBottom: 4, textAlign: 'right' }}>
            {shareHost}
          </span>
        </div>
      </Slide>
    ),
  });

  /* Slide 2 — ingredients, as the instrument panel. */
  slides.push({
    key: 'ingredients',
    label: 'ingredients',
    node: (
      <Slide
        palette={palette}
        eyebrow="Ingredients"
        corner={`${ingredients.length} total`}
        innerRef={(el) => { nodes.current.ingredients = el; }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: ingredients.length > 9 ? '1fr 1fr' : '1fr',
            columnGap: 56,
            alignContent: 'start',
            overflow: 'hidden',
          }}
        >
          {ingredients.slice(0, 18).map((ing, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 24,
                borderBottom: `1px solid ${palette.rule}`,
                padding: '16px 0',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 28, color: palette.ink }}>{ing.name}</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  color: palette.muted,
                }}
              >
                {ing.quantity} {ing.unit}
              </span>
            </div>
          ))}
        </div>
        {ingredients.length > 18 ? (
          <span style={{ ...silkscreen(palette, 20), marginTop: 16 }}>
            + {ingredients.length - 18} more
          </span>
        ) : null}
        <div style={{ marginTop: 24 }}>
          <KeyRow height={26} />
        </div>
      </Slide>
    ),
  });

  /* Slide 3 — the method, under the same phase headings the row draws. */
  slides.push({
    key: 'method',
    label: 'method',
    node: (
      <Slide
        palette={palette}
        eyebrow="Method"
        corner={`${steps.length} steps`}
        innerRef={(el) => { nodes.current.method = el; }}
      >
        <div style={{ flex: 1, minHeight: 0, marginTop: 32, overflow: 'hidden' }}>
          {steps.slice(0, 6).map((step, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 28, marginBottom: 28 }}>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: palette.signal,
                  paddingTop: 4,
                }}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 28, lineHeight: 1.5, color: palette.ink }}>
                {step}
              </span>
            </div>
          ))}
        </div>
        {steps.length > 6 ? (
          <span style={{ ...silkscreen(palette, 20), marginBottom: 20 }}>
            + {steps.length - 6} more steps at the link
          </span>
        ) : null}
        <KeyRow height={26} />
      </Slide>
    ),
  });

  /* Slide 4 — the log, only when there is something to say. */
  if (noteText) {
    slides.push({
      key: 'notes',
      label: 'notes',
      node: (
        <Slide
          palette={palette}
          eyebrow={noteHeading}
          corner={dateLabel}
          innerRef={(el) => { nodes.current.notes = el; }}
        >
          <p
            style={{
              flex: 1,
              minHeight: 0,
              marginTop: 40,
              fontFamily: DISPLAY,
              fontWeight: 400,
              fontSize: 40,
              lineHeight: 1.45,
              color: palette.ink,
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
            }}
          >
            {noteText.length > 520 ? `${noteText.slice(0, 520).trimEnd()}…` : noteText}
          </p>
          <KeyRow height={26} />
        </Slide>
      ),
    });
  }

  /* Slide 5 — where the rest of it lives. */
  slides.push({
    key: 'link',
    label: 'link',
    node: (
      <Slide
        palette={palette}
        eyebrow="Proof"
        corner="The full recipe"
        innerRef={(el) => { nodes.current.link = el; }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 36,
          }}
        >
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontStretch: '118%',
              fontSize: 72,
              lineHeight: 1.05,
              margin: 0,
              color: palette.ink,
            }}
          >
            {recipe.title}
          </h2>
          <div
            style={{
              border: `1px solid ${palette.rule}`,
              background: palette.panel,
              padding: '28px 32px',
            }}
          >
            <span style={{ ...silkscreen(palette, 20), display: 'block', marginBottom: 12 }}>
              Ingredients, method, timings
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 700,
                color: palette.ink,
                wordBreak: 'break-all',
              }}
            >
              {shareUrl}
            </span>
          </div>
        </div>

        {/* An empty pattern is still a pattern: the invitation, unlit. */}
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ flex: 1, maxWidth: 96, height: 28, borderRadius: 2, background: palette.unlit }} />
          ))}
        </div>
      </Slide>
    ),
  });

  const shownSlides = exportMode === 'single' ? slides.slice(0, 1) : slides;

  const handleExport = async () => {
    setExporting(true);
    try {
      await withFullSizeCards(async () => {
        for (let i = 0; i < shownSlides.length; i++) {
          const slide = shownSlides[i];
          const name =
            exportMode === 'single'
              ? `${recipe.title}-proof-card.jpg`
              : `${recipe.title}-proof-${i + 1}-${slide.label}.jpg`;
          await downloadCanvas(nodes.current[slide.key], name);
        }
      });
    } catch (err) {
      console.error(err);
      alert('Could not render the cards. Try again, or switch off the browser extension blocking images.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ground">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule bg-panel faceplate px-4 py-3">
        <h2 className="label-silkscreen">Share this bake</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Close the exporter"
          icon={<X className="h-4 w-4" />}
        />
      </header>

      <div className="flex flex-1 flex-col items-center gap-8 overflow-y-auto p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            engaged={exportMode === 'carousel'}
            onClick={() => setExportMode('carousel')}
            icon={<LayoutGrid className="h-4 w-4" />}
          >
            Carousel · {slides.length}
          </Button>
          <Button
            engaged={exportMode === 'single'}
            onClick={() => setExportMode('single')}
            icon={<ImageIcon className="h-4 w-4" />}
          >
            Single card
          </Button>
          <Button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            icon={theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          >
            {theme === 'light' ? 'Dark card' : 'Light card'}
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {shownSlides.map((slide, i) => (
            <div key={slide.key} className="relative overflow-hidden border border-rule" style={wrapperStyle}>
              <div
                ref={(el) => { scalers.current[i] = el; }}
                style={innerStyle}
                className="absolute left-0 top-0"
              >
                {slide.node}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 justify-center border-t border-rule bg-panel faceplate p-4 pb-safe">
        <Button
          variant="primary"
          size="lg"
          onClick={handleExport}
          busy={exporting}
          icon={<Download className="h-5 w-5" />}
        >
          {exporting ? 'Rendering…' : `Download ${shownSlides.length > 1 ? `${shownSlides.length} cards` : 'card'}`}
        </Button>
      </div>
    </div>
  );
}
