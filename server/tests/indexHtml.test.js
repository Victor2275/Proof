import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { contentSecurityPolicy, inlineScriptHashes, withHead } from '../services/indexHtml.js';

const PAGE = `<!doctype html><html><head><title>Proof</title>
<script>document.documentElement.classList.add('dark');</script>
<script type="module" src="/assets/index.js"></script>
</head><body></body></html>`;

describe('the served page', () => {
  it('allows exactly its own inline script, by hash', () => {
    const expected = crypto.createHash('sha256').update("document.documentElement.classList.add('dark');").digest('base64');
    expect(inlineScriptHashes(PAGE)).toEqual([`'sha256-${expected}'`]);
    const policy = contentSecurityPolicy(PAGE);
    expect(policy).toContain(`script-src 'self' 'sha256-${expected}'`);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('takes a title and head tags for a page that needs its own', () => {
    const out = withHead(PAGE, { title: 'Focaccia · Proof', tags: '<meta property="og:title" content="Focaccia">' });
    expect(out).toContain('<title>Focaccia · Proof</title>');
    expect(out).toMatch(/<meta property="og:title" content="Focaccia">\s*<\/head>/);
    expect(withHead(PAGE)).toBe(PAGE);
  });
});

describe('line endings', () => {
  it('hashes a CRLF file the way the browser parses it', () => {
    const lf = '<script>\n  run();\n</script>';
    const crlf = lf.replace(/\n/g, '\r\n');
    expect(inlineScriptHashes(crlf)).toEqual(inlineScriptHashes(lf));
  });
});
