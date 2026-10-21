/*
 * The pre-screen (LAUNCH_PLAN.md, Phase 3 item 2).
 *
 * Every recipe published and every comment posted is read by Gemini before
 * strangers see it. A clean one goes live at once; anything else is held for
 * the operator, never rejected by the model alone — a person makes that call.
 * When the model can't be asked (no key, an outage, an answer that isn't the
 * JSON asked for), the submission is held too: failing open would publish
 * whatever arrived during an outage.
 */
import { getFlashJsonModel, isGeminiConfigured } from './gemini.js';

export interface Screen {
  verdict: 'approve' | 'hold';
  reason: string;
}

const HELD_UNSCREENED: Screen = { verdict: 'hold', reason: 'Waiting for a person to look at it: the automatic check was unavailable.' };

async function ask(prompt: string): Promise<Screen> {
  if (!isGeminiConfigured()) return HELD_UNSCREENED;
  try {
    const result = await getFlashJsonModel()!.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    if (parsed?.verdict === 'approve') return { verdict: 'approve', reason: '' };
    if (parsed?.verdict === 'hold') return { verdict: 'hold', reason: String(parsed.reason ?? '').slice(0, 300) };
    return HELD_UNSCREENED;
  } catch {
    return HELD_UNSCREENED;
  }
}

export interface RecipeForScreen {
  title: string;
  description: string;
  ingredients: { name: string }[];
  instructions: string[];
  sourceUrl: string;
  sourceAttribution: string;
  ownWords: boolean;
}

export function screenRecipe(r: RecipeForScreen): Promise<Screen> {
  const body = [
    `Title: ${r.title}`,
    `Description: ${r.description}`,
    `Ingredients: ${r.ingredients.map((i) => i.name).join('; ')}`,
    `Method:\n${r.instructions.join('\n')}`,
    r.sourceUrl ? `Imported from: ${r.sourceUrl}` : '',
    r.sourceAttribution ? `Credit shown: ${r.sourceAttribution}` : '',
    r.ownWords ? 'The author says the method and description are in their own words.' : '',
  ].filter(Boolean).join('\n').slice(0, 8000);

  return ask(`You screen recipes submitted to a public home-baking cookbook before anyone else sees them.
Answer with JSON only: {"verdict": "approve" | "hold", "reason": "one short sentence, empty when approving"}.
Hold it when any of these is true:
- it is not a recipe (no real ingredients or method);
- it is spam, advertising, or mostly links;
- it contains abuse, hate, sexual content, or someone's personal details;
- the description or method reads as copied word for word from a commercial cookbook, magazine or food blog, and there is no credit shown and no claim of own words.
Ordinary home recipes, short or rough, are approved. Ingredient lists alone are never a copyright problem.

${body}`);
}

export function screenComment(body: string, recipeTitle: string): Promise<Screen> {
  return ask(`You screen comments left on recipes in a public home-baking cookbook.
Answer with JSON only: {"verdict": "approve" | "hold", "reason": "one short sentence, empty when approving"}.
Hold spam, advertising, links to sell things, abuse, harassment, hate, sexual content, or personal details. Approve ordinary comments, questions and criticism, however blunt.

Recipe: ${recipeTitle}
Comment: ${body.slice(0, 1000)}`);
}
