/*
 * Layout regression audit.
 *
 * Walks every route at a desktop and a mobile viewport and reports elements that
 * spill past the viewport, interactive targets under 32px, and text clipped by a
 * fixed-height container — the classes of bug that are invisible in unit tests
 * because they only exist once CSS has laid the page out. Screenshots land in OUT.
 *
 * Needs the dev server AND the API server running:
 *   npm run dev        # :5173
 *   npm start          # :3001
 *   node scripts/ui-audit.mjs [outDir]
 *
 * Env: AUDIT_BASE (default http://127.0.0.1:5173), AUDIT_RECIPE_ID (any recipe with
 * enough ingredients/steps to exercise the layout; falls back to the first one).
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2] || 'ui-audit-shots';
const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:5173';
const API = process.env.AUDIT_API || 'http://127.0.0.1:3001/api';

let RECIPE = process.env.AUDIT_RECIPE_ID;
if (!RECIPE) {
  const list = await fetch(`${API}/recipes`).then(r => r.json()).catch(() => []);
  // Prefer the recipe with the most steps — the densest layout is the best canary.
  RECIPE = list.sort((a, b) => (b.instructions?.length || 0) - (a.instructions?.length || 0))[0]?._id;
  if (!RECIPE) throw new Error(`No recipes from ${API}/recipes — is the API server running?`);
}

fs.mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['dashboard', '/'],
  ['recipe', `/recipe/${RECIPE}`],
  ['bake', `/recipe/${RECIPE}/bake`],
  ['gallery', '/gallery'],
  ['pantry', '/pantry'],
  ['grocery', '/grocery'],
  ['notes', '/notes'],
  ['analytics', '/analytics'],
  ['settings', '/settings'],
  ['new', '/new'],
  ['edit', `/edit/${RECIPE}`],
];

const VIEWPORTS = [
  { name: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'mobile', opts: { ...devices['iPhone 13'], isMobile: true, hasTouch: true } },
];

// Runs in page: find layout defects
const AUDIT = () => {
  const out = { overflowX: null, offenders: [], tinyTargets: [], clipped: [], contrast: [], zeroSize: [] };
  const de = document.documentElement;
  out.overflowX = { scrollW: de.scrollWidth, clientW: de.clientWidth, overflows: de.scrollWidth > de.clientWidth + 1 };

  const vw = window.innerWidth;
  const all = [...document.querySelectorAll('body *')];

  for (const el of all) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    if (r.width === 0 && r.height === 0) continue;

    const desc = (el.tagName.toLowerCase() +
      (el.id ? '#' + el.id : '') +
      (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.') : '')).slice(0, 160);
    const txt = (el.textContent || '').trim().slice(0, 50);

    // horizontal overflow past viewport
    if (r.right > vw + 1 && r.width > 4 && r.width < 100000) {
      out.offenders.push({ desc, txt, right: Math.round(r.right), width: Math.round(r.width), vw });
    }

    // touch targets on interactive elements
    const interactive = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) ||
      el.getAttribute('role') === 'button' || cs.cursor === 'pointer';
    if (interactive && r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32)) {
      out.tinyTargets.push({ desc, txt, w: Math.round(r.width), h: Math.round(r.height) });
    }

    // text clipped by fixed-height overflow-hidden ancestor
    if (el.children.length === 0 && txt) {
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis' && cs.whiteSpace !== 'nowrap') {
        out.clipped.push({ desc, txt, scrollW: el.scrollWidth, clientW: el.clientWidth });
      }
      if (el.scrollHeight > el.clientHeight + 2 && (cs.overflowY === 'hidden')) {
        out.clipped.push({ desc, txt, scrollH: el.scrollHeight, clientH: el.clientHeight, dir: 'y' });
      }
    }
  }
  // dedupe
  const seen = new Set();
  out.offenders = out.offenders.filter(o => { const k = o.desc + o.txt; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 25);
  const seen2 = new Set();
  out.tinyTargets = out.tinyTargets.filter(o => { const k = o.desc + o.txt; if (seen2.has(k)) return false; seen2.add(k); return true; }).slice(0, 25);
  const seen3 = new Set();
  out.clipped = out.clipped.filter(o => { const k = o.desc + o.txt; if (seen3.has(k)) return false; seen3.add(k); return true; }).slice(0, 25);
  return out;
};

const report = {};

for (const vp of VIEWPORTS) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    ...vp.opts,
    permissions: [],
    colorScheme: 'light',
  });
  // never let a service worker cache confuse us
  await ctx.addInitScript(() => {
    if (navigator.serviceWorker) navigator.serviceWorker.register = () => Promise.reject(new Error('sw disabled for audit'));
  });

  for (const [name, route] of ROUTES) {
    const key = `${vp.name}/${name}`;
    const page = await ctx.newPage();
    const errors = [];
    const warnings = [];
    const netFails = [];
    page.on('console', m => {
      const t = m.text();
      if (m.type() === 'error') errors.push(t.slice(0, 300));
      else if (m.type() === 'warning') warnings.push(t.slice(0, 220));
    });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0, 300)));
    page.on('requestfailed', r => netFails.push(r.url().slice(0, 120) + ' :: ' + (r.failure()?.errorText || '')));

    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (e) {
      try { await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch {}
    }
    await page.waitForTimeout(2200);

    let audit = {};
    try { audit = await page.evaluate(AUDIT); } catch (e) { audit = { error: String(e) }; }

    const dir = path.join(OUT, vp.name);
    fs.mkdirSync(dir, { recursive: true });
    try { await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: false }); } catch {}

    report[key] = { route, errors, warnings: warnings.slice(0, 6), netFails: netFails.slice(0, 8), audit };
    console.log(`[${key}] errs=${errors.length} netfail=${netFails.length} overflowX=${audit.overflowX?.overflows} offenders=${audit.offenders?.length} tiny=${audit.tinyTargets?.length} clipped=${audit.clipped?.length}`);
    await page.close();
  }
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('\nDONE ->', path.resolve(OUT, 'report.json'));
