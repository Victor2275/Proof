/*
 * Serving the app's one HTML page.
 *
 * Every route but /api answers with the built index.html. Two things are
 * added on the way out:
 *
 *   - a Content-Security-Policy. Sessions are bearer tokens kept on the device
 *     (LAUNCH_PLAN.md, Phase 2), so script injected into the page could read
 *     one; the policy allows only the app's own scripts. The single inline
 *     script, the theme bootstrap that has to run before first paint, is
 *     allowed by its hash, computed from the built file so it can't drift.
 *   - for a shared recipe, its own title, description and structured data
 *     (Phase 3), so a link pasted into a chat or found by a search engine says
 *     what it is. That is meta injection into a static file — no server render.
 */
import crypto from 'crypto';
import fs from 'fs';

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

/**
 * 'sha256-…' sources for every inline script in the page. The browser hashes a
 * script as its parser reads it, which turns CRLF line ends into LF, so the
 * file's are normalised the same way; a Windows checkout would otherwise block
 * its own theme script.
 */
export function inlineScriptHashes(html: string): string[] {
  return Array.from(html.matchAll(INLINE_SCRIPT), (m) => {
    const text = m[1].replace(/\r\n?/g, '\n');
    return `'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'`;
  });
}

export function contentSecurityPolicy(html: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes(html).join(' ')}`.trim(),
    // React and the motion library write style attributes; Tailwind ships a stylesheet.
    "style-src 'self' 'unsafe-inline'",
    // Recipe photographs come from many hosts; device photographs are blob: URLs.
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    // A saved recipe's photograph is fetched onto the device; the barcode lookup is an API.
    "connect-src 'self' https: wss:",
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export interface PageHead {
  title?: string;
  /** Extra tags for the head: meta, link, JSON-LD. Must already be escaped. */
  tags?: string;
}

/** The page with a different title and extra head tags. */
export function withHead(html: string, head: PageHead = {}): string {
  let out = html;
  if (head.title) out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${head.title}</title>`);
  if (head.tags) out = out.replace(/<\/head>/i, `${head.tags}\n  </head>`);
  return out;
}

/** Reads the built page once and serves it with its policy. */
export function indexPage(file: string) {
  const html = fs.readFileSync(file, 'utf8');
  const policy = contentSecurityPolicy(html);
  return {
    html,
    send(res: import('express').Response, head?: PageHead) {
      res.setHeader('Content-Security-Policy', policy);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.type('html').send(withHead(html, head));
    },
  };
}
