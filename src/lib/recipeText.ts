/*
 * Recipe text as a cookbook prints it.
 *
 * Imported recipes carry the marks of the page they were scraped from:
 * "Don&#39;t" for "Don't", "((170g))" where a converter wrapped a weight
 * twice, "cream cheese²" pointing at a footnote that did not come along, and
 * "--- Cheesecake ---" written as a step when it is the heading of the steps
 * after it. A headnote may end on the blog's "Be sure to check out my video
 * below the recipe!", which is not about the recipe at all.
 *
 * Everything here is display-side and pure: the stored text is untouched, so
 * nothing is lost if a rule turns out to be wrong, and the import path runs
 * the same functions so new recipes arrive clean (change 79).
 */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  deg: '°',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  times: '×',
  eacute: 'é',
  egrave: 'è',
};

/** "Don&#39;t" → "Don't". Numeric and the common named entities; anything else is left as written. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

/** Footnote marks with nothing to point at: superscript figures, daggers, a trailing asterisk. */
const FOOTNOTE = /[¹²³⁴⁵⁶⁷⁸⁹⁰†‡]+|(?<=\w)\*+(?=\s|,|\.|$)/g;

/** The display form of any line of recipe text. */
export function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return decodeEntities(text)
    .replace(/\(\(\s*([^()]*?)\s*\)\)/g, '($1)')
    .replace(FOOTNOTE, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/*
 * Import boilerplate in a headnote (change 82): the sentences a food blog
 * writes to its own readers. Matched by sentence, so whatever the recipe's
 * author said about the dish itself is kept.
 */
const BOILERPLATE = [
  /\b(check out|watch) (my|the|our) (step[- ]by[- ]step )?(video|tutorial)\b/i,
  /\bvideo below\b/i,
  /\bjump to (the )?recipe\b/i,
  /\b(pin|save) (this|it) (for later|to pinterest)\b/i,
  /\bclick (here|the link)\b/i,
  /\b(subscribe|sign up) (to|for) (my|our)\b/i,
  /\bthis post (may )?contains? affiliate\b/i,
  /\bfollow (me|us) on\b/i,
];

export function stripBoilerplate(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  return sentences
    .filter((s) => !BOILERPLATE.some((pattern) => pattern.test(s)))
    .join('')
    .trim();
}

/** A headnote as printed: cleaned, with the blog's asides taken out. */
export function headnote(description: string | null | undefined): string {
  // A run-on join ("required!Be sure") hides a sentence break; restore it first.
  return stripBoilerplate(cleanText(description).replace(/([.!?])(?=[A-Z])/g, '$1 '));
}

/*
 * Method sections.
 *
 * "--- Cheesecake ---" (any run of two or more dashes, = or * either side) is
 * the heading of the steps after it, and so is a short line ending in a colon
 * with no sentence in it: "For the crust:". Neither is a step, so neither is
 * numbered, and baking mode never stops on one.
 */
const DASHED = /^\s*[-=*~]{2,}\s*(.+?)\s*[-=*~]{2,}\s*$/;
const COLON = /^\s*((?:for )?(?:the )?[^.!?:]{1,40}):\s*$/i;

/** The heading a line stands for, or null when the line is a step. */
export function sectionHeading(line: string): string | null {
  const text = cleanText(line);
  const dashed = text.match(DASHED);
  if (dashed) return sentenceCase(dashed[1]);
  const colon = text.match(COLON);
  // Five words at most: "Preheat the oven and grease two tins:" is a step.
  if (colon && colon[1].trim().split(/\s+/).length <= 5) return sentenceCase(colon[1].replace(/^for the\s+/i, '').replace(/^for\s+/i, ''));
  return null;
}

function sentenceCase(text: string): string {
  const t = text.trim();
  if (t === t.toUpperCase() && /[A-Z]/.test(t)) return t.charAt(0) + t.slice(1).toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** A real step of the method: its index in `instructions`, its number, its text. */
export interface MethodStep {
  /** Index into the stored `instructions`, which baking mode and step notes use. */
  index: number;
  /** 1-based, counting real steps only. */
  number: number;
  text: string;
}

export interface MethodSection {
  /** null for steps before any heading. */
  heading: string | null;
  steps: MethodStep[];
}

/** The method grouped under its own headings, empty lines and headings removed from the count. */
export function methodSections(instructions: string[] | null | undefined): MethodSection[] {
  const sections: MethodSection[] = [];
  let current: MethodSection = { heading: null, steps: [] };
  let number = 0;
  (instructions ?? []).forEach((raw, index) => {
    const heading = sectionHeading(raw ?? '');
    if (heading) {
      if (current.heading !== null || current.steps.length > 0) sections.push(current);
      current = { heading, steps: [] };
      return;
    }
    const text = cleanText(raw);
    if (!text) return;
    current.steps.push({ index, number: ++number, text });
  });
  if (current.heading !== null || current.steps.length > 0) sections.push(current);
  return sections.filter((s) => s.steps.length > 0);
}

/** Every real step, in order, with its section heading. */
export function methodSteps(instructions: string[] | null | undefined): (MethodStep & { heading: string | null })[] {
  return methodSections(instructions).flatMap((s) => s.steps.map((step) => ({ ...step, heading: s.heading })));
}

/** Whether the recipe's own text names its sections. */
export function hasWrittenSections(instructions: string[] | null | undefined): boolean {
  return (instructions ?? []).some((line) => sectionHeading(line ?? '') !== null);
}

/** The first line of a note, for a card that has room for little. */
export function firstLine(text: string | undefined): string {
  return (text ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? '';
}
