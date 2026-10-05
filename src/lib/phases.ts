/*
 * Phases: the unit of the step row.
 *
 * A rhythm machine's row is sixteen fixed steps. A recipe's row is its phases —
 * levain, mix, bulk, shape, proof, bake — because a phase is what a baker
 * actually tracks, and because six to ten keys stay legible on a phone propped
 * across a counter while thirty instruction steps do not.
 *
 * Recipes store `instructions` as plain strings with no phase field, so phases
 * are derived from the text. Derivation is deliberately conservative: when a
 * recipe does not read as a bread bake it falls back to a generic three-phase
 * vocabulary rather than forcing sourdough language onto a soup.
 */

export type PhaseState = 'idle' | 'queued' | 'due' | 'now' | 'done';

export interface Phase {
  /** Stable key for React and for tests. */
  id: string;
  /** Short silkscreen label. Kept to one word where possible. */
  label: string;
  /** Indices into the recipe's `instructions` array that belong to this phase. */
  stepIndices: number[];
}

interface PhaseDefinition {
  id: string;
  label: string;
  pattern: RegExp;
}

/**
 * Ordered canonical sequence of a bread bake. Order matters: assignment is
 * monotonic, so a recipe can move forward through these but never back.
 */
const BREAD_VOCABULARY: PhaseDefinition[] = [
  { id: 'levain', label: 'Levain', pattern: /\b(levain|starter|pre-?ferment|poolish|biga|sponge)\b/i },
  { id: 'autolyse', label: 'Autolyse', pattern: /\b(autolyse|autolysis)\b/i },
  { id: 'mix', label: 'Mix', pattern: /\b(mix|combine|knead|incorporat\w*|dough hook|add the salt)\b/i },
  // Home recipes name a rise rather than a bulk ferment: "let the dough rise",
  // "leave to rise until doubled". Bulk and Proof share that wording on
  // purpose — assignment only moves forward, so a rise before shaping lands in
  // Bulk and the same words after it land in Proof.
  { id: 'bulk', label: 'Bulk', pattern: /\b(bulk|first rise|stretch and fold|stretch & fold|coil fold|lamination|let (?:\w+ ){0,2}rise|leave (?:\w+ ){0,2}to rise|rise (?:in|until|for)|until doubled|doubled in (?:size|volume))\b/i },
  { id: 'shape', label: 'Shape', pattern: /\b(shape|pre-?shape|divide|scale into|round the|form into)\b/i },
  // Not "overnight": that names a duration, not a phase. A steak marinated
  // overnight was reading as proofed, which turned dinners into breads.
  { id: 'proof', label: 'Proof', pattern: /\b(proof|prove|final rise|second rise|retard|banneton|couche|let (?:\w+ ){0,2}rise|leave (?:\w+ ){0,2}to rise|rise (?:in|until|for|again)|until (?:puffy|doubled))\b/i },
  { id: 'bake', label: 'Bake', pattern: /\b(bake|oven|score|dutch oven|steam|preheat)\b/i },
  { id: 'rest', label: 'Rest', pattern: /\b(cool|wire rack|slice|rest before|serve)\b/i },
];

/** What makes a dough rise. Without one of these a recipe is not a bread bake. */
// "Starter" alone is also a course of a meal, so it counts only when it is
// plainly the culture: fed, ripe, active, bubbly, yours.
const LEAVEN = /\b(yeast|levain|sourdough|poolish|biga|(?:active|ripe|fed|bubbly|your) starter)\b/i;

/** Fallback for anything that is not a bread bake. */
const GENERIC_VOCABULARY: PhaseDefinition[] = [
  { id: 'prep', label: 'Prep', pattern: /\b(prep\w*|chop|dice|slice|measure|combine|mix|whisk|marinat\w*|season)\b/i },
  { id: 'cook', label: 'Cook', pattern: /\b(cook|bake|oven|fry|sear|simmer|boil|roast|grill|steam|heat|preheat|saut\w*)\b/i },
  { id: 'finish', label: 'Finish', pattern: /\b(cool|rest|serve|garnish|plate|slice|store|drizzle|top with)\b/i },
];

/**
 * Assign every instruction to a phase, moving forward only.
 *
 * A single step often names more than one phase ("shape the dough and place it
 * in a banneton"). Taking the earliest match at or after the current phase
 * keeps the assignment on the step's actual subject instead of jumping ahead to
 * whatever it mentions in passing.
 */
interface Assignment {
  byPhase: Map<string, number[]>;
  /**
   * Phases a step actually matched by wording, as opposed to inheriting from
   * the step before it. Only these are evidence that the vocabulary fits.
   */
  matched: Set<string>;
}

function assign(
  instructions: string[],
  vocabulary: PhaseDefinition[],
  { leadIntoFirstMatch }: { leadIntoFirstMatch: boolean },
): Assignment {
  const byPhase = new Map<string, number[]>();
  const matched = new Set<string>();
  const add = (id: string, index: number) => {
    const existing = byPhase.get(id);
    if (existing) existing.push(index);
    else byPhase.set(id, [index]);
  };

  let floor = 0;
  /*
   * Steps before the first one that names anything. In the bread vocabulary
   * they used to fall into its first phase, Levain — a specific claim — so
   * "Dissolve the yeast in the milk" opened a challah on LEVAIN — NOW. There
   * they belong to the phase the recipe actually starts in: the first one its
   * own words name. The generic vocabulary's first phase is Prep, which is an
   * honest home for an unnamed opening step, so it keeps them.
   */
  let leading: number[] = [];

  instructions.forEach((instruction, index) => {
    let hit = -1;
    for (let i = floor; i < vocabulary.length; i++) {
      if (vocabulary[i].pattern.test(instruction)) {
        hit = i;
        break;
      }
    }

    if (leadIntoFirstMatch && hit === -1 && matched.size === 0) {
      leading.push(index);
      return;
    }

    // No match at or after the floor: the step continues whatever came before.
    // An inherited assignment is never counted as evidence below.
    const resolved = hit === -1 ? floor : hit;
    floor = resolved;
    const { id } = vocabulary[resolved];
    if (hit !== -1) matched.add(id);
    leading.forEach((i) => add(id, i));
    leading = [];
    add(id, index);
  });

  // Nothing named a phase at all: the whole recipe is its first phase.
  leading.forEach((i) => add(vocabulary[0].id, i));

  return { byPhase, matched };
}

function toPhases(byPhase: Map<string, number[]>, vocabulary: PhaseDefinition[]): Phase[] {
  return vocabulary
    .filter((definition) => byPhase.has(definition.id))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      stepIndices: byPhase.get(definition.id) as number[],
    }));
}

/**
 * How a recipe's phases were read.
 *
 * `bread` means the text named things a bread bake actually has and the phases
 * are the recipe's own. `generic` means nothing proved itself and the phases
 * are a three-word shape (prep, cook, finish) that fits almost any recipe —
 * true, but not informative, and not worth drawing a step row for. `none` is a
 * recipe with no instructions at all.
 *
 * Surfaces use this to decide whether a step row says anything: a library where
 * every row shows the same three generic keys is a library of decoration.
 */
export type PhaseReading = 'bread' | 'generic' | 'none';

export interface DerivedPhases {
  phases: Phase[];
  reading: PhaseReading;
}

/**
 * Derive the phases of a recipe, and say how much the derivation actually knew.
 */
export function derivePhasesWithReading(
  instructions: string[] | undefined | null,
): DerivedPhases {
  if (!instructions || instructions.length === 0) return { phases: [], reading: 'none' };

  const bread = assign(instructions, BREAD_VOCABULARY, { leadIntoFirstMatch: true });
  /*
   * A bread is a leavened dough that rises. That is the whole test: a
   * leavening agent named somewhere in the method, and a step that is a
   * fermentation — a levain, an autolyse, a bulk, a proof.
   *
   * Phase words on their own prove nothing. `mix`, `bake` and `rest` appear in
   * almost any recipe; arepas, dumplings and kebabs are all divided and shaped;
   * a steak can sit overnight. The looser rule this replaced filed eighteen of
   * the live library's recipes as bread and most of them were dinners, while
   * the Danish rye read generic because it said "let the dough rise" rather
   * than "bulk". Below the test the recipe reads generic, which is true of it.
   *
   * The rise is looked for in any step, not only in the steps assignment
   * credited: "Mix the dough, shape it and let it rise" is filed under Mix,
   * because a step takes its earliest phase, but it still proves a rise.
   *
   * And a bread whose steps all land in one phase is no reading at all. When
   * the first step happens to mention cooling the milk or preheating the oven,
   * assignment cannot move backwards, so every step after it becomes "Rest" or
   * "Bake" — a one-key row that says nothing true about the bake.
   */
  const fermentation = BREAD_VOCABULARY.filter((d) => ['levain', 'autolyse', 'bulk', 'proof'].includes(d.id));
  const leavened = instructions.some((step) => LEAVEN.test(step));
  const rises = instructions.some((step) => fermentation.some((d) => d.pattern.test(step)));
  const breadPhases = toPhases(bread.byPhase, BREAD_VOCABULARY);
  if (leavened && rises && breadPhases.length >= 2) {
    return { phases: breadPhases, reading: 'bread' };
  }

  const generic = assign(instructions, GENERIC_VOCABULARY, { leadIntoFirstMatch: false });
  return { phases: toPhases(generic.byPhase, GENERIC_VOCABULARY), reading: 'generic' };
}

/**
 * Derive the phases of a recipe from its instruction text.
 *
 * Returns an empty array for a recipe with no instructions, which the step row
 * renders as an unlit invitation rather than as an error.
 */
export function derivePhases(instructions: string[] | undefined | null): Phase[] {
  return derivePhasesWithReading(instructions).phases;
}

/**
 * The temporal state of each phase given the step currently running.
 *
 * `activeStep` omitted means no bake is running: every key is idle, which is
 * the row's resting state and reads as an invitation, not as missing data.
 */
export function phaseState(phase: Phase, activeStep?: number): PhaseState {
  if (activeStep === undefined || activeStep < 0) return 'idle';
  if (phase.stepIndices.includes(activeStep)) return 'now';

  const last = phase.stepIndices[phase.stepIndices.length - 1];
  if (last < activeStep) return 'done';

  // The phase immediately ahead of the running one is "due"; everything beyond
  // it is merely queued. Only one phase is ever due at a time.
  const first = phase.stepIndices[0];
  return first === activeStep + 1 ? 'due' : 'queued';
}
