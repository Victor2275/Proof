/*
 * Rules for repairing recipes that were entered badly.
 *
 * Almost the whole live library came from one seed script reading TheMealDB,
 * and it carried that source's habits straight into the cookbook: "step 1" and
 * bare step numbers stored as steps of their own, section headings ("Cooking",
 * "Serving") stored as steps, the method of some recipes as one paragraph, and
 * a measure column that held whatever the source had — "chopped", "to serve",
 * "juice of 1", "unit" — in the `unit` field, with an invented quantity of 1 for
 * things that have no quantity at all.
 *
 * These rules repair what can be repaired mechanically. Anything that needs a
 * reader's judgment (timings, servings, a method that has to be rewritten) is
 * an editorial decision recorded per recipe in data/library-edits.json.
 */

export interface Ingredient {
  name: string;
  /** null when the ingredient has no amount: "to serve", "to taste". */
  quantity: number | null;
  /** '' for a plain count: "2 eggs". */
  unit: string;
}

/* ── Method ─────────────────────────────────────────────────────────────── */

/** Step labels and bullets stored as steps of their own: "step 1", "3", "2.", "▢". */
const NUMBER_LINE = /^(?:step\s*\d+[.:]?|\d+[.)]?|[▢•·\-–—*]+)$/i;

/** A numbered heading in capitals: "STEP 2 - RINSE THE WHITE RICE". */
const NUMBERED_HEADING = /^step\s*\d+\s*[-–:]/i;

/** A heading drawn with rules: "--- Cheesecake ---". */
const RULED_HEADING = /^[-=~*]{2,}.*[-=~*]{2,}$/;

/** Section headings stored as steps. They carry no instruction. */
const HEADING_LINE = /^(?:preparation|preperation|prep|method|directions|instructions|cooking|cooking instructions|baking|serving|to serve|assembly|assemble|enjoy!?|notes?|tips?|[\w ]+ making|[\w ]+ instructions)$/i;

/** A short label that ends in a colon and introduces what follows: "Pro Tips:". */
const LABEL_LINE = /^[^.!?]{1,40}:$/;

/** "1. Crack the egg", and "01.Put the potatoes" with no space after the number. */
const LEADING_NUMBER = /^\d+[.)]\s*(?=[A-Za-z(])/;

/** References to photographs the recipe no longer has: "(See picture 1)", "(pic 3)". */
const PICTURE_REFERENCE = /\s*\((?:see\s+)?(?:pic|picture|photo)\s*\d+\)/gi;

/** A question mark left where an encoding dropped a character: "for ?10 minutes", "loose-?bottomed". */
const STRAY_QUESTION_MARK = /(^|[\s-])\?(?=[\w(])/g;

/** A smiley at the end of a step. */
const EMOTICON = /\s*[;:]-?[)D]\s*$/;

/** Zero-width and non-breaking space characters, which made some steps look empty but not be. */
const INVISIBLE = /[​-‍﻿]/g;

/** The longest a single step should run before it is split at sentence boundaries. */
const LONG_STEP = 420;
/** A sentence group is closed once it passes this length. */
const STEP_TARGET = 260;

/**
 * Splits text into sentences. A full stop only ends a sentence when what
 * follows starts with a capital letter, a digit or an opening quote, so "approx.
 * 15 mins" and "e.g. flour" stay intact more often than not.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Groups sentences into steps of a readable length. */
export function splitLongStep(step: string): string[] {
  if (step.length <= LONG_STEP) return [step];
  const groups: string[] = [];
  let current = '';
  for (const sentence of splitSentences(step)) {
    if (current && current.length + sentence.length + 1 > STEP_TARGET) {
      groups.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) groups.push(current);
  return groups;
}

/**
 * Repairs a recipe's method: drops step numbers, bullets and headings stored as
 * steps, strips a leading "1. " from steps that kept their number, and splits a
 * method written as one long paragraph into steps.
 */
export function cleanInstructions(steps: string[], title = ''): string[] {
  const titleKey = title.trim().toLowerCase();
  const kept: string[] = [];
  for (const raw of steps) {
    const step = raw
      .replace(INVISIBLE, '')
      .replace(/\s+/g, ' ')
      .replace(PICTURE_REFERENCE, '')
      .replace(STRAY_QUESTION_MARK, '$1')
      .replace(EMOTICON, '')
      .trim()
      .replace(LEADING_NUMBER, '');
    if (!step) continue;
    if (NUMBER_LINE.test(step) || RULED_HEADING.test(step)) continue;
    if (NUMBERED_HEADING.test(step) && step === step.toUpperCase()) continue;
    if (HEADING_LINE.test(step)) continue;
    if (LABEL_LINE.test(step)) continue;
    if (titleKey && step.toLowerCase() === titleKey) continue;
    kept.push(step);
  }
  return kept.flatMap(splitLongStep);
}

/* ── Ingredients ────────────────────────────────────────────────────────── */

/** Real measures. Anything in the unit column after one of these is a note. */
const MEASURES = [
  'fl oz', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'g', 'kg', 'ml', 'l', 'lb', 'lbs', 'quart', 'quarts',
  'pint', 'pints', 'pinch', 'dash', 'handful', 'splash', 'knob', 'clove', 'cloves', 'sprig', 'sprigs',
  'bunch', 'slice', 'slices', 'stick', 'sticks', 'can', 'tin', 'tins', 'jar', 'packet', 'bag', 'tub', 'tubs',
  'pot', 'bulb', 'head', 'heads', 'leaves', 'piece', 'pieces', 'strip', 'strips', 'florets', 'rashers',
  'drizzle', 'sprinkling', 'scoop', 'grating', 'pod', 'stalk', 'stalks', 'cm piece', 'oz jar', 'g can',
];

/** Size words that read naturally in the unit column: "2 large eggs". */
const SIZES = ['large', 'medium', 'small', 'whole', 'thick', 'thin'];

/** Units that say what the ingredient is for, not how much of it there is. */
const PURPOSES: Record<string, string> = {
  'to serve': 'to serve',
  'to taste': 'to taste',
  'for frying': 'for frying',
  fry: 'for frying',
  'for brushing': 'for brushing',
  'for greasing': 'for greasing',
  'to glaze': 'to glaze',
  garnish: 'to garnish',
  topping: 'for topping',
  top: 'to garnish',
  dusting: 'for dusting',
};

const IMPERIAL_ALTERNATIVE = /^(g|ml|kg)\s*\/.*$/i;
const PARENTHESISED_WEIGHT = /^\(([^)]+)\)$/;
const RANGE_TAIL = /^-\s*(\d+(?:\.\d+)?)\s*(.*)$/;
const CITRUS = /^(grated )?(zest and juice|zest|juice)(?: of (\d+(?:\/\d+)?|half|a|one|two))?$/i;

const normaliseMeasure = (unit: string) => (unit.toLowerCase() === 'l' ? 'L' : unit.toLowerCase());

/** Typos in the source's measure column. */
const TYPOS: Record<string, string> = { skinnless: 'skinless' };

/** Appends a note to a name, unless the name already says it ("Ancho Chillies" + "ancho"). */
const withNote = (name: string, note: string) => {
  const clean = (TYPOS[note] ?? note).trim();
  if (!clean || name.toLowerCase().includes(clean.toLowerCase())) return name;
  return `${name}, ${clean}`;
};

const parseCount = (word: string): number => {
  if (word === 'half') return 0.5;
  if (word === 'a' || word === 'one') return 1;
  if (word === 'two') return 2;
  if (word.includes('/')) {
    const [num, den] = word.split('/').map(Number);
    return num / den;
  }
  return Number(word);
};

/** Finds the measure a unit string starts with, longest first so "fl oz" beats "oz". */
const leadingMeasure = (unit: string): string | null => {
  const lower = unit.toLowerCase();
  const sorted = [...MEASURES, ...SIZES].sort((a, b) => b.length - a.length);
  for (const m of sorted) {
    if (lower === m || lower.startsWith(`${m} `) || lower.startsWith(`${m}(`)) return m;
  }
  return null;
};

/**
 * Repairs one ingredient row. The rules, in order:
 *
 * - "unit" means a plain count, so it becomes no unit at all.
 * - A purpose ("to serve", "for frying") has no quantity: the invented 1 goes,
 *   and the purpose joins the name.
 * - Citrus parts ("juice of half") become a count and a note on the fruit.
 * - "g/6oz" keeps the metric measure.
 * - "(460g)" is a weight the source gave beside a count, so it joins the name.
 * - "-5 lb" is the tail of a range that lost its first number; the quantity
 *   keeps the low end and the unit keeps the measure.
 * - A measure followed by words ("tbsp chopped", "clove crushed") keeps the
 *   measure and moves the words to the name.
 * - Anything else in the unit column is a preparation note, and moves to the
 *   name with no unit left behind.
 */
export function cleanIngredient(ing: { name: string; quantity: number | null; unit: string }): Ingredient {
  // "crumbs ((170g))": the source doubled its own brackets.
  const name = ing.name.trim().replace(/\(\(([^()]*)\)\)/g, '($1)');
  const unit = (ing.unit ?? '').trim();
  const quantity = ing.quantity;

  if (!unit) return { name, quantity, unit: '' };
  if (unit.toLowerCase() === 'unit') return { name, quantity, unit: '' };

  const unitStartsWithUnitWord = unit.match(/^unit\s+(.+)$/i);
  if (unitStartsWithUnitWord) {
    return { name: `${name} (${unitStartsWithUnitWord[1].replace(/(\d+)g\b/, '$1 g')})`, quantity, unit: '' };
  }

  const purposeKey = unit.toLowerCase();
  if (PURPOSES[purposeKey]) return { name: withNote(name, PURPOSES[purposeKey]), quantity: null, unit: '' };
  const purposeInParens = unit.match(/^(\w+) \((for [^)]+)\)$/);
  if (purposeInParens) return { name: withNote(name, purposeInParens[2]), quantity: null, unit: '' };

  const citrus = unit.match(CITRUS);
  if (citrus) {
    const part = `${citrus[1] ?? ''}${citrus[2].toLowerCase()}`;
    const count = citrus[3] ? parseCount(citrus[3].toLowerCase()) : quantity;
    return { name: `${name} (${part})`, quantity: count, unit: '' };
  }

  // "parts" carries no measure the source recorded; it reads as a plain count.
  if (unit.toLowerCase() === 'parts') return { name, quantity, unit: '' };

  if (IMPERIAL_ALTERNATIVE.test(unit)) {
    return { name, quantity, unit: unit.split('/')[0].trim().toLowerCase() };
  }

  const weight = unit.match(PARENTHESISED_WEIGHT);
  if (weight) return { name: `${name} (${weight[1].replace(/\.$/, '')})`, quantity, unit: '' };

  const range = unit.match(RANGE_TAIL);
  if (range) {
    const measure = leadingMeasure(range[2]);
    return { name, quantity, unit: measure ? normaliseMeasure(measure) : range[2] };
  }

  const measure = leadingMeasure(unit);
  if (measure) {
    const rest = unit.slice(measure.length).trim();
    // "oz (230 grams)", "rashers (100g) chopped": a bracketed conversion stays
    // with the measure, and any words after it move to the name.
    const conversion = rest.match(/^(\([^)]*\d[^)]*\))\s*(.*)$/);
    if (conversion) {
      return { name: withNote(name, conversion[2]), quantity, unit: `${normaliseMeasure(measure)} ${conversion[1]}` };
    }
    // "g (soaked overnight)": brackets with no figure in them are a note.
    const bracketNote = rest.match(/^\(([^)]*)\)$/);
    if (bracketNote) return { name: withNote(name, bracketNote[1]), quantity, unit: normaliseMeasure(measure) };
    const note = rest.replace(/^of( fresh)?$/i, '').replace(/^cut (?!into)/i, 'cut into ').trim();
    // A size followed by a measure ("medium clove sliced") keeps both.
    const second = SIZES.includes(measure) ? leadingMeasure(rest) : null;
    if (second && second !== measure) {
      const afterSecond = rest.slice(second.length).trim();
      return { name: withNote(name, afterSecond), quantity, unit: `${measure} ${normaliseMeasure(second)}` };
    }
    return { name: withNote(name, note), quantity, unit: normaliseMeasure(measure) };
  }

  // "chopped clove": the measure came last.
  const trailing = unit.match(/^(.+?)\s+(\S+)$/);
  if (trailing && MEASURES.includes(trailing[2].toLowerCase())) {
    return { name: withNote(name, trailing[1].toLowerCase()), quantity, unit: normaliseMeasure(trailing[2]) };
  }

  return { name: withNote(name, unit.toLowerCase()), quantity, unit: '' };
}

export function cleanIngredients(list: { name: string; quantity: number | null; unit: string }[]): Ingredient[] {
  return list.map(cleanIngredient);
}

/* ── Timing ─────────────────────────────────────────────────────────────── */

/** The seed script's timing, written onto every recipe it created. */
export const isPlaceholderTiming = (r: { prepTime?: string; cookTime?: string }) =>
  r.prepTime === '20 mins' && r.cookTime === '30 mins';

/** The seed script's description, the same sentence on every recipe. */
export const isPlaceholderDescription = (description = '') => /^A delicious\s.*\sdish\.$/.test(description.trim());
