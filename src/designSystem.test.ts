import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * Foundation guards for the cookbook.
 *
 * Every previous design in this codebase drifted because its rules lived in
 * prose; these live in CI. They hold the things that make the paper-and-ink
 * world what it is: two warm themes with paper as the default, three
 * self-hosted faces, one accent that means the primary action, no glow and no
 * gradient, contrast that holds at arm's length, and the reduced-motion and
 * safe-area habits that make it a good app on a kitchen counter.
 *
 * Component sources come through Vite's raw glob. The stylesheet is read from
 * disk instead: Vitest stubs CSS modules to empty strings by default.
 */

const componentSources = import.meta.glob('./**/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const components = Object.entries(componentSources).filter(
  ([path]) => !path.endsWith('.test.tsx'),
);

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const indexCss = read('src/index.css');
/* Assertions run against rules, not prose. */
const cssRules = indexCss.replace(/\/\*[\s\S]*?\*\//g, '');

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Leaves `https://` alone.
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Lines that match in code, as "path:line", blind to comments. */
function codeOffenders(pattern: RegExp, sources = components): string[] {
  const hits: string[] = [];
  for (const [path, source] of sources) {
    stripComments(source)
      .split('\n')
      .forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${path.slice(2)}:${i + 1}`);
      });
  }
  return hits;
}

/* --- Colour ------------------------------------------------------------ */

const lightBlock = indexCss.slice(indexCss.indexOf(':root {'), indexCss.indexOf('.dark {'));
const darkBlock = indexCss.slice(indexCss.indexOf('.dark {'));

function token(block: string, name: string): string {
  // Built without escapes: a template literal swallows the backslash in \s.
  const match = block.match(new RegExp('--' + name + ':[^#;]*(#[0-9a-fA-F]{6})'));
  if (!match) throw new Error(`--${name} not found`);
  return match[1];
}

function contrast(a: string, b: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

describe('the bans', () => {
  it('scans every component source', () => {
    expect(components.length).toBeGreaterThan(20);
    expect(indexCss.length).toBeGreaterThan(1000);
  });

  it('draws no gradient and no blur anywhere', () => {
    // Paper is flat. Depth comes from a hairline, a soft corner and a small
    // lift under a raised sheet — never from a sheen or a frosted pane.
    expect(codeOffenders(/bg-gradient-to-|bg-linear-to-|bg-radial|backdrop-blur/)).toEqual([]);
    expect(cssRules).not.toMatch(/linear-gradient|radial-gradient|backdrop-filter/);
  });

  it('ships no zero-offset colour halos', () => {
    // A `shadow-[0_0_...]` has no offset: it is a decorative glow, not depth.
    expect(codeOffenders(/shadow-\[0_0_/)).toEqual([]);
  });

  it('reaches for no stock Tailwind palette colour, only the tokens', () => {
    const palette =
      /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
    expect(codeOffenders(palette)).toEqual([]);
  });

  it('sets labels in sentence case, not tracked capitals', () => {
    // The drum-machine silkscreen — uppercase, letter-spaced — was the single
    // biggest source of noise the audit found.
    expect(codeOffenders(/className=.*\buppercase\b.*\btracking-/)).toEqual([]);
    expect(codeOffenders(/\blabel-silkscreen\b|\bfont-faceplate\b|\bfaceplate\b/)).toEqual([]);
  });

  it('never reports through a browser dialog', () => {
    // alert(), confirm() and prompt() are operating-system modals, dismissible
    // only by a precise tap — the worst thing to meet with floured hands.
    expect(codeOffenders(/(?<![.\w])alert\(/)).toEqual([]);
    expect(codeOffenders(/(?<![.\w])confirm\(/)).toEqual([]);
    expect(codeOffenders(/(?<![.\w])prompt\(/)).toEqual([]);
  });
});

describe('the themes', () => {
  it('defines paper and its night version, and no third', () => {
    expect(indexCss).toMatch(/^\s*:root \{/m);
    expect(indexCss).toMatch(/^\s*\.dark \{/m);
    expect(cssRules).not.toMatch(/\.oled\s*\{/);
  });

  it('draws the light theme on warm paper', () => {
    expect(token(lightBlock, 'paper').toLowerCase()).toBe('#fbf7f0');
  });

  it('keeps the dark theme warm, never true black', () => {
    expect(token(darkBlock, 'paper').toLowerCase()).not.toBe('#000000');
  });

  it('opens on paper when nothing has been chosen, before first paint and after', () => {
    const html = read('index.html');
    // The inline script adds .dark only for an explicit "dark" or a "system"
    // choice on a dark device; an absent key is light.
    expect(html).toMatch(/theme === 'dark'/);
    expect(html).not.toMatch(/Dark is the default/);
    const theme = read('src/lib/theme.ts');
    expect(theme).toMatch(/: 'light'/);
  });

  it('paints the installed app and its splash in paper too', () => {
    const config = read('vite.config.ts');
    expect(config).toMatch(/theme_color: '#fbf7f0'/);
    expect(config).toMatch(/background_color: '#fbf7f0'/);
  });

  it('themes the browser surfaces it does not draw', () => {
    expect(indexCss).toMatch(/::selection/);
    expect(indexCss).toMatch(/caret-color/);
    expect(indexCss).toMatch(/::-webkit-scrollbar-thumb/);
    expect(indexCss).toMatch(/\*:focus-visible/);
  });
});

describe('contrast at arm’s length', () => {
  const pairs: [string, string, string][] = [
    ['the legend on a primary button', 'on-accent', 'accent'],
    ['muted text on the page', 'ink-muted', 'paper'],
    ['muted text in a card', 'ink-muted', 'paper-sunk'],
    ['muted text on a tonal control', 'ink-muted', 'paper-tonal'],
    ['the accent as text on the page', 'accent', 'paper'],
    ['a pencilled note in its card', 'pencil', 'paper-sunk'],
    ['a "have it" tick on the page', 'sage', 'paper'],
    ['a fault on the page', 'fault', 'paper'],
    ['a fault in a raised section', 'fault', 'paper-raised'],
    ['a timer chip', 'on-butter', 'butter'],
  ];

  for (const [name, fg, bg] of pairs) {
    it(`holds 4.5:1 for ${name}, in both themes`, () => {
      for (const [theme, block] of [['light', lightBlock], ['dark', darkBlock]] as const) {
        const ratio = contrast(token(block, fg), token(block, bg));
        expect(ratio, `${theme}: --${fg} on --${bg} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

describe('the accent', () => {
  it('fills only the primary button, and marks a destructive one with the spoiled rule', () => {
    const button = read('src/components/ui/Button.tsx');
    const variant = (name: string) => button.match(new RegExp('\\n\\s*' + name + ":\\s*\\n?\\s*'([^']*)'"))?.[1] ?? '';
    expect(variant('primary')).toMatch(/bg-accent/);
    for (const name of ['secondary', 'tonal', 'ghost', 'danger']) {
      expect(variant(name), `${name} must not fill with the accent`).not.toMatch(/bg-accent/);
    }
    expect(variant('danger')).toMatch(/border-spoiled/);
  });

  it('is never the colour of an error', () => {
    expect(codeOffenders(/role="alert".*text-(?:accent|signal)|text-(?:accent|signal).*role="alert"/)).toEqual([]);
  });

  it('is not how links announce themselves', () => {
    // Links and controls are ink; the accent is the one primary action.
    expect(cssRules).not.toMatch(/(^|[\s,}])a\s*\{[^}]*color:\s*var\(--accent\)/);
  });
});

describe('the component layer', () => {
  const primitives = components.filter(([path]) => path.startsWith('./components/ui/'));

  it('speaks only the cookbook’s token names in the primitives', () => {
    // The previous world's names are mapped onto paper so the screens keep
    // working while they are rebuilt. The primitives are already rebuilt, so
    // they must not lean on the transitional names. StepRow's phase states
    // keep their own names because they mean time, not colour.
    const legacy = /\b(?:bg|text|border|ring|fill)-(?:ground|panel|panel-sunk|silkscreen|signal|on-signal)\b/;
    expect(codeOffenders(legacy, primitives)).toEqual([]);
    const phaseTokens = codeOffenders(/\bkey-(?:now|due|queued|done|unlit)\b/, primitives).map((hit) => hit.split(':')[0]);
    expect([...new Set(phaseTokens)]).toEqual(['components/ui/StepRow.tsx']);
  });

  it('answers a press the same way everywhere', () => {
    expect(cssRules).toMatch(/\.pressable:active[^{]*\{[^}]*transform:\s*scale\(0\.97\)/);
    for (const file of ['Button', 'IconButton', 'BackButton', 'Segmented', 'RecipeTile']) {
      expect(read(`src/components/ui/${file}.tsx`), `${file} should use .pressable`).toMatch(/pressable/);
    }
  });

  it('requires a name on every icon-only control', () => {
    expect(read('src/components/ui/IconButton.tsx')).toMatch(/\n\s*label: string;/);
  });
});

describe('type', () => {
  it('self-hosts all three faces rather than reaching for a CDN', () => {
    for (const file of [
      'fraunces-latin-variable.woff2',
      'fraunces-latin-italic-variable.woff2',
      'source-serif-4-latin-variable.woff2',
      'source-serif-4-latin-italic-variable.woff2',
      'inter-tight-latin-variable.woff2',
    ]) {
      expect(indexCss).toContain(`url('/fonts/${file}')`);
      expect(existsSync(resolve(process.cwd(), 'public/fonts', file)), `public/fonts/${file}`).toBe(true);
    }
    expect(cssRules).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it('reaches for no web font CDN in the document either', () => {
    expect(read('index.html')).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
  });

  it('ships the licence beside every face', () => {
    for (const licence of ['Fraunces-OFL.txt', 'SourceSerif4-OFL.txt', 'InterTight-OFL.txt']) {
      expect(existsSync(resolve(process.cwd(), 'public/fonts', licence)), licence).toBe(true);
    }
  });

  it('no longer swaps the global font family', () => {
    expect(codeOffenders(/data-font|fontFamily'\)/)).toEqual([]);
    expect(cssRules).not.toMatch(/html\[data-font=/);
  });
});

describe('motion', () => {
  it('honours prefers-reduced-motion globally', () => {
    expect(indexCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  /*
   * The CSS rule only reaches CSS. framer-motion writes inline styles from its
   * own loop, so MotionConfig has to stay mounted above everything that
   * animates for the JS half to honour the setting.
   */
  it('makes framer-motion honour reduced motion too, which CSS cannot do', () => {
    const app = componentSources['./App.tsx'];
    expect(app).toBeDefined();
    expect(app).toMatch(/<MotionConfig\s+reducedMotion="user">/);
  });

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
});

describe('the device', () => {
  it('ships every icon the manifest and the document promise', () => {
    const html = read('index.html');
    const config = read('vite.config.ts');
    const named = new Set<string>();
    for (const m of config.matchAll(/(?:src|includeAssets[^\]]*)['\s:[]+([\w.-]+\.(?:png|svg|ico))/g)) {
      named.add(m[1]);
    }
    for (const m of html.matchAll(/href="\/([\w.-]+\.(?:png|svg|ico))"/g)) named.add(m[1]);
    expect(named.size).toBeGreaterThan(3);
    for (const file of named) {
      expect(existsSync(resolve(process.cwd(), 'public', file)), `public/${file} is promised but not shipped`).toBe(true);
    }
  });

  /*
   * The bottom nav is 65px of controls plus whatever the device reserves for
   * a gesture bar. Anything floating above it adds the inset rather than
   * assuming it away.
   */
  it('reserves the device inset above the bottom nav rather than guessing', () => {
    expect(indexCss).toMatch(/\.above-nav\s*\{[^}]*env\(safe-area-inset-bottom/);
    expect(codeOffenders(/className="[^"]*\bbottom-24\b/)).toEqual([]);
  });

  it('lets every bottom-anchored surface clear the home indicator', () => {
    for (const [path, src] of Object.entries(componentSources)) {
      const anchored = /className="[^"]*\bfixed\b[^"]*\bbottom-0\b/.test(src) ||
        /'[^']*\bfixed\b[^']*\bbottom-0\b/.test(src);
      if (!anchored) continue;
      expect(src, `${path} is anchored to the bottom edge without pb-safe`).toMatch(/pb-safe/);
    }
  });

  it('adds a floor to the top inset instead of relying on its fallback', () => {
    const rule = indexCss.match(/@utility pt-safe\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule).toMatch(/calc\(env\(safe-area-inset-top[^)]*\)\s*\+\s*[\d.]+rem\)/);
    expect(indexCss).not.toMatch(/^\s*\.pt-safe\s*\{/m);
  });
});
