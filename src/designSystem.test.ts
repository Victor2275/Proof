import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * Foundation guards for the Step Row visual world.
 *
 * The world's one ban (no glow except a lit key or segment) is only worth
 * stating if something enforces it. Every previous attempt at a design system
 * in this codebase drifted because the rules lived in prose; these live in CI.
 *
 * Gradient and backdrop blur were banned outright and are now permitted as
 * materials: the faceplate sheen and the modal scrim, both defined once in
 * index.css. What is still guarded is that they stay materials — a component
 * reaching for an ad-hoc `bg-gradient-to-*` or `backdrop-blur-*` utility is
 * how forty different button styles happened last time, so the utilities are
 * kept out of component sources and the tokens are required to exist.
 *
 * Component sources come through Vite's raw glob. The stylesheet is read from
 * disk instead: Vitest stubs CSS modules to empty strings by default (`css:
 * false`), and turning that off project-wide would slow every other suite down
 * for one assertion set.
 */

const componentSources = import.meta.glob('./**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const components = Object.entries(componentSources).filter(
  ([path]) => !path.endsWith('.test.tsx'),
);

// import.meta.url resolves to an http URL under the jsdom environment, so the
// stylesheet is located from the project root that vitest runs in.
const indexCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
/* Assertions run against rules, not prose: the comments explain which patterns
 * were removed and would otherwise match themselves. */
const cssRules = indexCss.replace(/\/\*[\s\S]*?\*\//g, '');

/*
 * Some bans are about what the code *does*, not what it mentions. The comments
 * in this codebase explain which patterns were removed and would otherwise
 * match themselves — the same reason `cssRules` exists above.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Leaves `https://` alone.
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Like `offenders`, but blind to prose. */
function codeOffenders(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const [path, source] of components) {
    stripComments(source)
      .split('\n')
      .forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${path.slice(2)}:${i + 1}`);
      });
  }
  return hits;
}

/** Report offenders as "path:line" so a failure points at the edit to make. */
function offenders(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const [path, source] of components) {
    source.split('\n').forEach((line, i) => {
      if (pattern.test(line)) hits.push(`${path.slice(2)}:${i + 1}`);
    });
  }
  return hits;
}

describe('visual world bans', () => {
  it('scans every component source', () => {
    expect(components.length).toBeGreaterThan(20);
    expect(indexCss.length).toBeGreaterThan(1000);
  });

  it('defines the faceplate sheen once, as a token', () => {
    // A panel is a moulded object, not a flat rectangle: the sheen is a ramp
    // of a few percent across it, defined per theme.
    expect(cssRules).toMatch(/--faceplate:\s*linear-gradient/);
    expect(cssRules).toMatch(/\.faceplate\s*\{[^}]*background-image:\s*var\(--faceplate\)/);
  });

  it('defines the scrim once, as a token', () => {
    // Blur belongs only to a layer sitting over the interface.
    expect(cssRules).toMatch(/\.scrim\s*\{[\s\S]*?backdrop-filter:\s*blur/);
  });

  it('builds gradients and blur from those tokens, not ad-hoc utilities', () => {
    expect(offenders(/bg-gradient-to-|bg-linear-to-/)).toEqual([]);
    expect(offenders(/backdrop-blur/)).toEqual([]);
  });

  it('ships no zero-offset colour halos', () => {
    // A `shadow-[0_0_...]` has no offset: it is a decorative glow, not depth.
    // Lit keys and segments get their glow from dedicated tokens instead.
    expect(offenders(/shadow-\[0_0_/)).toEqual([]);
  });

  it('uses no system display face as the display voice', () => {
    // Scoped to font declarations: `ImpactStyle` from @capacitor/haptics is
    // not a typeface.
    expect(offenders(/font-?[Ff]amily.*(Impact|Arial Black)/)).toEqual([]);
  });
});

describe('token layer', () => {
  it('defines both themes and no third', () => {
    expect(indexCss).toMatch(/^\s*:root \{/m);
    expect(indexCss).toMatch(/^\s*\.dark \{/m);
    // The OLED theme was consolidated into dark; a third block is drift.
    expect(cssRules).not.toMatch(/\.oled\s*\{/);
  });

  it('makes the dark theme true black', () => {
    const dark = indexCss.slice(indexCss.indexOf('.dark {'));
    expect(dark).toMatch(/--ground:\s*#000000/);
  });

  it('self-hosts both faces rather than reaching for a CDN', () => {
    expect(indexCss).toMatch(/url\('\/fonts\/archivo-latin-variable\.woff2'\)/);
    expect(indexCss).toMatch(/url\('\/fonts\/jetbrains-mono-latin-variable\.woff2'\)/);
    expect(cssRules).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  /*
   * The stylesheet was the only thing being checked, so index.html went on
   * preconnecting to Google Fonts and pulling Inter — a face this design does
   * not use — on every single load, for the whole of the rework. Self-hosting
   * exists because the scene is a kitchen with no signal; a blocking request to
   * a third party undoes it whether or not the CSS is clean.
   */
  it('reaches for no web font CDN in the document either', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  /*
   * The manifest named pwa-192x192.png, pwa-512x512.png, favicon.ico,
   * apple-touch-icon.png and masked-icon.svg. None of the five existed, so an
   * installed Proof had no icon at all.
   */
  it('ships every icon the manifest and the document promise', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const config = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    const named = new Set<string>();
    for (const m of config.matchAll(/(?:src|includeAssets[^\]]*)['\s:[]+([\w.-]+\.(?:png|svg|ico))/g)) {
      named.add(m[1]);
    }
    for (const m of html.matchAll(/href="\/([\w.-]+\.(?:png|svg|ico))"/g)) named.add(m[1]);
    expect(named.size).toBeGreaterThan(3);
    for (const file of named) {
      expect(
        existsSync(resolve(process.cwd(), 'public', file)),
        `public/${file} is promised but not shipped`,
      ).toBe(true);
    }
  });

  it('honours prefers-reduced-motion globally', () => {
    expect(indexCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  /*
   * The CSS rule above only reaches CSS. framer-motion writes inline styles
   * from its own loop, so the recipe drawer sprang up the screen and the
   * onboarding modal slid for someone who had asked for neither. MotionConfig
   * is what makes the JS half honour the setting, and it has to stay mounted
   * above everything that animates.
   */
  it('makes framer-motion honour reduced motion too, which CSS cannot do', () => {
    const app = componentSources['./App.tsx'];
    expect(app).toBeDefined();
    expect(app).toMatch(/<MotionConfig\s+reducedMotion="user">/);
  });

  /*
   * A JS timer is outside both. Anything driving motion from setInterval has to
   * ask for itself — the landing page's chase light is the one that does.
   */
  it('guards every decorative interval with its own reduced-motion check', () => {
    const drivers = Object.entries(componentSources).filter(
      ([path, src]) => src.includes('setInterval') && !path.includes('Timer'),
    );
    for (const [path, src] of drivers) {
      expect(src, `${path} animates on a timer without checking reduced motion`).toMatch(
        /prefers-reduced-motion/,
      );
    }
  });

  /*
   * Capacitor safe areas.
   *
   * The bottom nav is 65px of controls plus whatever the device reserves for a
   * gesture bar. Anything floating above it has to add the inset rather than
   * assume it away — `bottom-24` is exactly the nav's height with no inset, and
   * therefore sits behind the nav on any phone that has one. Four surfaces had
   * guessed it.
   */
  it('reserves the device inset above the bottom nav rather than guessing', () => {
    expect(indexCss).toMatch(/\.above-nav\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(offenders(/className="[^"]*\bbottom-24\b/)).toEqual([]);
  });

  it('lets every bottom-anchored surface clear the home indicator', () => {
    // A sheet, a drawer or a dock that ends at bottom: 0 puts its last row of
    // content under the gesture bar unless it reserves for it.
    for (const [path, src] of Object.entries(componentSources)) {
      const anchored = /className="[^"]*\bfixed\b[^"]*\bbottom-0\b/.test(src) ||
        /'[^']*\bfixed\b[^']*\bbottom-0\b/.test(src);
      if (!anchored) continue;
      expect(src, `${path} is anchored to the bottom edge without pb-safe`).toMatch(/pb-safe/);
    }
  });

  /*
   * The browser's own dialogs.
   *
   * alert(), confirm() and prompt() are operating-system modals drawn in the
   * platform's typeface, over the top of everything, dismissible only by a
   * precise tap. There were eleven of them, three inside Baking Mode — which is
   * operated at arm's length with floured hands, and is the worst place in the
   * product for one. Every surface reports in its own panel now.
   */
  it('never reports through a browser dialog', () => {
    expect(codeOffenders(/(?<![.\w])alert\(/)).toEqual([]);
    expect(codeOffenders(/(?<![.\w])confirm\(/)).toEqual([]);
    expect(codeOffenders(/(?<![.\w])prompt\(/)).toEqual([]);
  });

  /*
   * The one contrast the direction contract singles out.
   *
   * "Contrast held on body text and Baking Mode regardless of the looks-right
   * preference, because arm's-length legibility is the product working." The
   * solid signal control is where that was being lost: white on the dark
   * theme's #FF3B30 is 3.55:1, under the 4.5 that text this size needs. The
   * legend flips with the theme because the red does not.
   */
  it('keeps the legend on a lit key readable in both themes', () => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const luminance = (hex: string) => {
      const n = hex.replace('#', '');
      const full = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
      const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [x, y] = [luminance(a), luminance(b)];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const valueIn = (block: string, name: string) => {
      // Built without escapes: a template literal swallows the backslash in \s.
      const match = block.match(new RegExp('--' + name + ':[^#]*(#[0-9a-fA-F]{3,8})'));
      if (!match) throw new Error(`${name} not found`);
      return match[1];
    };

    const light = indexCss.slice(indexCss.indexOf(':root {'), indexCss.indexOf('.dark {'));
    const dark = indexCss.slice(indexCss.indexOf('.dark {'));

    for (const [name, block] of [['light', light], ['dark', dark]] as const) {
      const ratio = contrast(valueIn(block, 'signal'), valueIn(block, 'on-signal'));
      expect(ratio, `${name} theme: legend on the signal control is ${ratio.toFixed(2)}:1`)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it('defines a fault lamp readable as text on a panel in both themes', () => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: string, b: string) => {
      const [x, y] = [luminance(a), luminance(b)];
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const valueIn = (block: string, name: string) => {
      const match = block.match(new RegExp('--' + name + ':[^#]*(#[0-9a-fA-F]{6})'));
      if (!match) throw new Error(`${name} not found`);
      return match[1];
    };
    const light = indexCss.slice(indexCss.indexOf(':root {'), indexCss.indexOf('.dark {'));
    const dark = indexCss.slice(indexCss.indexOf('.dark {'));

    expect(cssRules).toMatch(/--color-fault:\s*var\(--fault\)/);
    for (const [name, block] of [['light', light], ['dark', dark]] as const) {
      for (const surface of ['panel', 'panel-sunk']) {
        const ratio = contrast(valueIn(block, 'fault'), valueIn(block, surface));
        expect(ratio, `${name} theme: fault on --${surface} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('themes the browser surfaces it does not draw', () => {
    expect(indexCss).toMatch(/::selection/);
    expect(indexCss).toMatch(/caret-color/);
    expect(indexCss).toMatch(/::-webkit-scrollbar-thumb/);
    expect(indexCss).toMatch(/\*:focus-visible/);
  });

  it('no longer forces a global border radius with !important', () => {
    expect(cssRules).not.toMatch(/border-radius:\s*12px\s*!important/);
  });
});

/*
 * Red is temporal (DESIGN.md, and Launch Plan decision B3).
 *
 * Red means a thing is happening now, plus at most one solid primary control on
 * a screen. Every previous drift spent it on attention instead — idle timer
 * chips, checkboxes, delete legends, error text, a scaled serving count — until
 * a single recipe page carried sixteen red regions and the lit key was no
 * longer the brightest thing on it. These keep it spent where it means "now".
 */
describe('red is temporal', () => {
  const RED = /\b(?:bg|text|border|fill|ring|outline|decoration)-(?:signal|key-now)\b/;

  /*
   * The files allowed to draw red, each for a reason that is about time:
   * the lit step key and its label (StepRow, Meter, BakingMode, LandingPage),
   * the running bake wherever it shows (Dashboard's Now Baking panel, the
   * Sidebar lamp, an active RecipeTile, an active Panel), a timer counting past
   * zero (TimerManager), the focused field — the "now" of a form (Field) — and
   * the one primary control (Button, the lit New Recipe key in BottomNav, the
   * phone's Start key in RecipeViewer). SegmentReadout owns the segment fill.
   * Lab is the gallery of every lit state.
   */
  const ALLOWED = new Set([
    'components/ui/StepRow.tsx',
    'components/ui/Meter.tsx',
    'components/ui/Panel.tsx',
    'components/ui/RecipeTile.tsx',
    'components/ui/Field.tsx',
    'components/ui/Button.tsx',
    'components/ui/SegmentReadout.tsx',
    'components/BakingMode.tsx',
    'components/LandingPage.tsx',
    'components/Dashboard.tsx',
    'components/Sidebar.tsx',
    'components/TimerManager.tsx',
    'components/BottomNav.tsx',
    'components/RecipeViewer.tsx',
    'components/Lab.tsx',
  ]);

  it('is drawn only by the surfaces that report something happening now', () => {
    const files = new Set(codeOffenders(RED).map((hit) => hit.split(':')[0]));
    expect([...files].filter((file) => !ALLOWED.has(file))).toEqual([]);
  });

  it('never carries an error: faults use the caution lamp', () => {
    expect(codeOffenders(/role="alert".*(?:text|border)-signal|(?:text|border)-signal.*role="alert"/)).toEqual([]);
  });

  it('marks a destructive control with the spoiled rule, not with red text', () => {
    const danger = readFileSync(resolve(process.cwd(), 'src/components/ui/Button.tsx'), 'utf8')
      .match(/danger:\s*'([^']*)'/);
    expect(danger?.[1]).toMatch(/border-spoiled/);
    expect(danger?.[1]).not.toMatch(/text-signal/);
  });

  it('reaches for no stock Tailwind palette colour, only the tokens', () => {
    const palette =
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
    expect(codeOffenders(palette)).toEqual([]);
  });

  it('no longer reaches for the legacy accent alias', () => {
    expect(codeOffenders(/\b(?:bg|text|border)-accent\b|\baccent\//)).toEqual([]);
  });
});

describe('retired preferences', () => {
  it('no longer swaps the global font family', () => {
    expect(offenders(/data-font|fontFamily'\)/)).toEqual([]);
    expect(cssRules).not.toMatch(/html\[data-font=/);
  });

  it('leaves no dangling references to the retired token names', () => {
    expect(offenders(/var\(--accent-gold\)|var\(--paper-bg\)|var\(--sidebar-bg\)/)).toEqual([]);
  });
});
