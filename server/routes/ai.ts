import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { requireAdmin } from '../middleware/auth.js';
import { rehostImageUrls } from '../services/cloudinary.js';
import { getFlashJsonModel, getFlashModel, isGeminiConfigured } from '../services/gemini.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// POST /api/analyze-image
router.post('/analyze-image', requireAdmin, async (req: Request, res: Response) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = "Analyze this baking photo. Return a JSON array of 4-5 relevant descriptive hashtags (e.g. ['#sourdough', '#crumb', '#overproofed']). Return ONLY the JSON array, nothing else.";
    const image = { inlineData: { data: buffer.toString('base64'), mimeType: 'image/jpeg' } };

    const result = await model.generateContent([prompt, image]);
    const tags = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());
    res.json({ tags });
  } catch (err: any) {
    console.error('Gemini Error:', err);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

// POST /api/extract
router.post('/extract', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const { data: html } = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

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

    const parseIngredient = (ing: string) => {
      let qty = 1; let unit = 'x'; let name = ing;
      const match = ing.match(/^([\d\.\s\/½¼¾]+)\s*([a-zA-Z]+)?\s+(.*)/);
      if (match) {
        let qtyStr = match[1].trim();
        if (qtyStr === '½') qty = 0.5;
        else if (qtyStr === '¼') qty = 0.25;
        else if (qtyStr === '¾') qty = 0.75;
        else if (qtyStr.includes('/')) {
          const parts = qtyStr.split(' ');
          if (parts.length === 2) { const frac = parts[1].split('/'); qty = parseFloat(parts[0]) + (parseFloat(frac[0]) / parseFloat(frac[1])); }
          else { const frac = parts[0].split('/'); qty = parseFloat(frac[0]) / parseFloat(frac[1]); }
        } else qty = parseFloat(qtyStr) || 1;
        const validUnits = ['cup','cups','oz','ounce','ounces','tsp','teaspoon','teaspoons','tbsp','tablespoon','tablespoons','g','gram','grams','ml','milliliter','milliliters','lb','lbs','pound','pounds'];
        if (match[2] && validUnits.includes(match[2].toLowerCase())) { unit = match[2].toLowerCase(); name = match[3]; }
        else { unit = 'x'; name = match[2] ? match[2] + ' ' + match[3] : match[3]; }
      }
      return { name: name.trim(), quantity: qty, unit };
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
    };

    extracted.imageUrls = await rehostImageUrls(extracted.imageUrls);
    res.json(extracted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-restructure
router.post('/ai-restructure', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rawText } = req.body;
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
router.post('/ai-substitutions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { ingredientName, recipeTitle } = req.body;
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
