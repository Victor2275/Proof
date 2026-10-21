import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import * as cheerio from 'cheerio';
import { requireAi } from '../services/aiQuota.js';
import { getFlashJsonModel, isGeminiConfigured } from '../services/gemini.js';
import { parseIngredient } from '../services/ingredientParser.js';
import { fetchPublicPage, UnsafeUrlError } from '../services/safeFetch.js';

/*
 * The AI, and the import that sits beside it. Every route here costs money or
 * fetches on a user's behalf, so each is behind requireAi (the operator, or a
 * confirmed account's monthly allowance) and each bounds its input.
 */
const router = Router();

/** A burst limit per caller, on top of the monthly allowance. On the routes, so nothing else is counted. */
const aiLimiter = rateLimit({ windowMs: 60_000, limit: 10, message: { error: 'AI rate limit reached. Try again in a minute.' } });

/** The longest raw text the restructure will send to the model. */
export const MAX_RESTRUCTURE_CHARS = 20_000;

// POST /api/extract
router.post('/extract', aiLimiter, requireAi, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL is required' });

    const { url: targetUrl, html } = await fetchPublicPage(url);

    const $ = cheerio.load(html);
    let recipeData: any = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html()!);
        const objects = Array.isArray(json) ? json : (json['@graph'] ? json['@graph'] : [json]);
        for (const obj of objects) {
          if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
            recipeData = obj;
            return false;
          }
        }
      } catch { /* ignore parse errors */ }
    });

    if (!recipeData) return res.status(404).json({ error: 'No schema.org/Recipe data found.' });

    const parseDuration = (isoStr: string) => {
      if (!isoStr) return '';
      const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return isoStr;
      const hours = parseInt(match[1] || '0');
      const mins = parseInt(match[2] || '0');
      const total = (hours * 60) + mins;
      return total ? total.toString() : '';
    };

    const getImageUrl = (image: any): string => {
      if (!image) return '';
      if (typeof image === 'string') return image;
      if (Array.isArray(image)) return image.length > 0 ? getImageUrl(image[0]) : '';
      if (image.url) return image.url;
      return '';
    };

    const extractSteps = (steps: any[]): string[] => {
      let result: string[] = [];
      if (Array.isArray(steps)) {
        steps.forEach(step => {
          if (typeof step === 'string') result.push(step);
          else if (step['@type'] === 'HowToSection' && step.itemListElement) {
            result.push(step.name ? `--- ${step.name} ---` : '---');
            result = result.concat(extractSteps(step.itemListElement));
          } else if (step.text) result.push(step.text);
        });
      }
      return result;
    };

    let instructions = extractSteps(recipeData.recipeInstructions);
    if (instructions.length === 0 && typeof recipeData.recipeInstructions === 'string') {
      instructions.push(recipeData.recipeInstructions.replace(/<[^>]*>?/gm, '').trim());
    }

    const keywords = recipeData.keywords;
    const tags = Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map((k: string) => k.trim()) : []);

    const extracted = {
      title: recipeData.name || '',
      description: recipeData.description || '',
      imageUrls: getImageUrl(recipeData.image) ? [getImageUrl(recipeData.image)] : [],
      prepTime: parseDuration(recipeData.prepTime),
      cookTime: parseDuration(recipeData.cookTime),
      servings: parseInt(recipeData.recipeYield) || 4,
      difficulty: 'Medium',
      tags,
      ingredients: Array.isArray(recipeData.recipeIngredient) ? recipeData.recipeIngredient.map(parseIngredient) : [],
      instructions,
      labNotes: `Extracted from: ${targetUrl}`,
      sourceUrl: targetUrl,
    };

    // The photograph stays where it is: the device keeps its own copy, and a
    // recipe's images go to Cloudinary only if it is published.
    res.json(extracted);
  } catch (err: any) {
    if (err instanceof UnsafeUrlError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-restructure
router.post('/ai-restructure', aiLimiter, requireAi, async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body;
    if (typeof rawText !== 'string' || !rawText.trim()) return res.status(400).json({ error: 'There is no text to restructure.' });
    if (rawText.length > MAX_RESTRUCTURE_CHARS) {
      return res.status(413).json({ error: 'That text is too long to restructure in one go. Trim it to the recipe itself.' });
    }
    if (!isGeminiConfigured()) return res.status(503).json({ error: 'AI features are currently unavailable (missing GEMINI_API_KEY in .env).' });

    const model = getFlashJsonModel()!;
    const prompt = `You are an expert culinary assistant. Restructure the following recipe text into this exact JSON structure. Return ONLY the JSON object.
{
  "title": "String",
  "description": "String",
  "prepTime": "String (minutes)",
  "cookTime": "String (minutes)",
  "servings": Number,
  "ingredients": [{ "name": "String", "quantity": Number, "unit": "String" }],
  "instructions": ["String"],
  "tags": ["String"]
}

Raw text:
${rawText}`;

    const result = await model.generateContent(prompt);
    res.json(JSON.parse(result.response.text()));
  } catch (err: any) {
    console.error('AI Restructure Error:', err);
    res.status(500).json({ error: err.message || 'Failed to restructure recipe using AI.' });
  }
});

// POST /api/ai-substitutions
router.post('/ai-substitutions', aiLimiter, requireAi, async (req: Request, res: Response) => {
  try {
    const ingredientName = typeof req.body.ingredientName === 'string' ? req.body.ingredientName.slice(0, 100) : '';
    const recipeTitle = typeof req.body.recipeTitle === 'string' ? req.body.recipeTitle.slice(0, 120) : '';
    if (!ingredientName) return res.status(400).json({ error: 'Ingredient name required' });
    if (!isGeminiConfigured()) return res.status(503).json({ error: 'AI features unavailable (missing GEMINI_API_KEY).' });

    const model = getFlashJsonModel()!;
    const prompt = `You are a professional chef. Provide 3 smart ingredient substitutions for "${ingredientName}" in the context of baking/cooking "${recipeTitle || 'this recipe'}".
Return a JSON array: [{ "substitute": "String", "ratio": "String", "notes": "String" }]`;

    const result = await model.generateContent(prompt);
    res.json({ substitutions: JSON.parse(result.response.text()) });
  } catch (err: any) {
    console.error('AI Substitution Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI substitutions.' });
  }
});

export default router;
