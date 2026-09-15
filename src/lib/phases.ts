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
  { id: 'bulk', label: 'Bulk', pattern: /\b(bulk|first rise|stretch and fold|stretch & fold|coil fold|lamination)\b/i },
  { id: 'shape', label: 'Shape', pattern: /\b(shape|pre-?shape|divide|scale into|round the|form into)\b/i },
  { id: 'proof', label: 'Proof', pattern: /\b(proof|prove|final rise|second rise|retard|banneton|couche|overnight)\b/i },
  { id: 'bake', label: 'Bake', pattern: /\b(bake|oven|score|dutch oven|steam|preheat)\b/i },
  { id: 'rest', label: 'Rest', pattern: /\b(cool|wire rack|slice|rest before|serve)\b/i },
];

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

function assign(instructions: string[], vocabulary: PhaseDefinition[]): Assignment {
  const byPhase = new Map<string, number[]>();
  const matched = new Set<string>();
  let floor = 0;

  instructions.forEach((instruction, index) => {
    let hit = -1;
    for (let i = floor; i < vocabulary.length; i++) {
      if (vocabulary[i].pattern.test(instruction)) {
        hit = i;
        break;
      }
    }

    // No match at or after the floor: the step continues whatever came before.
    // Leading steps that match nothing fall into the first phase, which is why
    // an inherited assignment is never counted as evidence below.
    const resolved = hit === -1 ? floor : hit;
    floor = resolved;

    const { id } = vocabulary[resolved];
    if (hit !== -1) matched.add(id);
    const existing = byPhase.get(id);
    if (existing) existing.push(index);
    else byPhase.set(id, [index]);
  });

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
 * Derive the phases of a recipe from its instruction text.
 *
 * Returns an empty array for a recipe with no instructions, which the step row
 * renders as an unlit invitation rather than as an error.
 */
export function derivePhases(instructions: string[] | undefined | null): Phase[] {
  if (!instructions || instructions.length === 0) return [];

  const bread = assign(instructions, BREAD_VOCABULARY);
  /*
   * `mix`, `bake` and `rest` appear in almost any recipe, so matching them
   * proves nothing. Bread wins only when the text names something a bread bake
   * actually has — a levain, an autolyse, a bulk, a shaping, a proof — and
   * names at least two phases outright. Without that a chicken soup would be
   * assigned a levain it does not have.
   */
  const signature = ['levain', 'autolyse', 'bulk', 'shape', 'proof'];
  const readsAsBread =
    bread.matched.size >= 2 && signature.some((id) => bread.matched.has(id));
  if (readsAsBread) return toPhases(bread.byPhase, BREAD_VOCABULARY);

  const generic = assign(instructions, GENERIC_VOCABULARY);
  return toPhases(generic.byPhase, GENERIC_VOCABULARY);
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
