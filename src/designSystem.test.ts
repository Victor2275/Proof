import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * Foundation guards for the Step Row visual world.
 *
 * The world's three bans (no gradients, no backdrop blur, no glow except a lit
 * key or segment) are only worth stating if something enforces them. Every
 * previous attempt at a design system in this codebase drifted because the
 * rules lived in prose; these live in CI.
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

  it('ships no gradients', () => {
    expect(offenders(/bg-gradient-to-|from-\[|via-\[/)).toEqual([]);
  });

  it('ships no backdrop blur', () => {
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

  it('honours prefers-reduced-motion globally', () => {
    expect(indexCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
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

describe('retired preferences', () => {
  it('no longer swaps the global font family', () => {
    expect(offenders(/data-font|fontFamily'\)/)).toEqual([]);
    expect(cssRules).not.toMatch(/html\[data-font=/);
  });

  it('leaves no dangling references to the retired token names', () => {
    expect(offenders(/var\(--accent-gold\)|var\(--paper-bg\)|var\(--sidebar-bg\)/)).toEqual([]);
  });
});
