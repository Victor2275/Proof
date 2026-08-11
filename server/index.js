import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Recipe } from './models/Recipe.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Note } from './models/Note.js';
import { BakeLog } from './models/BakeLog.js';
import { Pantry } from './models/Pantry.js';
import { sampleRecipes, samplePantry, sampleBakeLogs } from './sampleData.js';
import cron from 'node-cron';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Security / Admin Gate ---
const adminIPs = new Set();
const ADMIN_TOKEN = 'admin-secret-token-123';

const requireAdmin = (req, res, next) => {
  // If no PIN is configured, everyone is an admin
  if (!process.env.ADMIN_PIN) return next();

  const clientIp = req.ip || req.connection.remoteAddress;
  const token = req.headers.authorization?.split(' ')[1];

  if (adminIPs.has(clientIp) || token === ADMIN_TOKEN) {
    // If they used a token, auto-whitelist their new IP for convenience
    if (token === ADMIN_TOKEN && !adminIPs.has(clientIp)) {
      adminIPs.add(clientIp);
    }
    next();
  } else {
    res.status(401).json({ error: 'Admin authentication required.' });
  }
};

app.post('/api/auth/pin', (req, res) => {
  const { pin } = req.body;
  if (!process.env.ADMIN_PIN) {
    return res.json({ token: ADMIN_TOKEN });
  }
  if (pin === process.env.ADMIN_PIN) {
    const clientIp = req.ip || req.connection.remoteAddress;
    adminIPs.add(clientIp);
    res.json({ token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});
// ----------------------------

const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cookbook';

// Static file hosting for images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cookbook',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
  },
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit


// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error (running without MongoDB):', err.message));
}

// Routes

app.get(['/api', '/api/health'], (req, res) => {
  res.json({ status: 'ok', message: 'Victor Recipes API Server is running' });
});

app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
  // req.file.path contains the cloudinary URL when using CloudinaryStorage
  res.status(201).json({ imageUrl: req.file.path });
});

// AI Photo Tagging (Mocked)
app.post('/api/analyze-image', requireAdmin, async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });

  try {
    // Fetch the image as a buffer
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Analyze this baking photo. Return a JSON array of 4-5 relevant descriptive hashtags (e.g. ['#sourdough', '#crumb', '#overproofed']). Return ONLY the JSON array, nothing else.";

    const image = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, image]);
    const responseText = result.response.text();

    // Parse the JSON array from the response
    const tags = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());

    res.json({ tags });
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

// Recipe URL extraction route
app.post('/api/extract', requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const { data: html } = await axios.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    const $ = cheerio.load(html);
    let recipeData = null;

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html());
        const objects = Array.isArray(json) ? json : (json['@graph'] ? json['@graph'] : [json]);
        for (const obj of objects) {
          if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
            recipeData = obj;
            return false;
          }
        }
      } catch (e) { /* ignore */ }
    });

    if (!recipeData) return res.status(404).json({ error: 'No schema.org/Recipe data found.' });

    const parseDuration = (isoStr) => {
      if (!isoStr) return '';
      const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (!match) return isoStr;
      const hours = parseInt(match[1] || '0');
      const mins = parseInt(match[2] || '0');
      const total = (hours * 60) + mins;
      return total ? total.toString() : '';
    };

    const getImageUrl = (image) => {
      if (!image) return '';
      if (typeof image === 'string') return image;
      if (Array.isArray(image)) return image.length > 0 ? getImageUrl(image[0]) : '';
      if (image.url) return image.url;
      return '';
    };

    const parseIngredient = (ing) => {
      let qty = 1;
      let unit = 'x';
      let name = ing;

      const match = ing.match(/^([\d\.\s\/½¼¾]+)\s*([a-zA-Z]+)?\s+(.*)/);
      if (match) {
        let qtyStr = match[1].trim();
        if (qtyStr === '½') qty = 0.5;
        else if (qtyStr === '¼') qty = 0.25;
        else if (qtyStr === '¾') qty = 0.75;
        else if (qtyStr.includes('/')) {
          const parts = qtyStr.split(' ');
          if (parts.length === 2) {
            const frac = parts[1].split('/');
            qty = parseFloat(parts[0]) + (parseFloat(frac[0]) / parseFloat(frac[1]));
          } else {
            const frac = parts[0].split('/');
            qty = parseFloat(frac[0]) / parseFloat(frac[1]);
          }
        } else {
          qty = parseFloat(qtyStr) || 1;
        }

        const validUnits = ['cup', 'cups', 'oz', 'ounce', 'ounces', 'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons', 'g', 'gram', 'grams', 'ml', 'milliliter', 'milliliters', 'lb', 'lbs', 'pound', 'pounds'];

        if (match[2] && validUnits.includes(match[2].toLowerCase())) {
          unit = match[2].toLowerCase();
          name = match[3];
        } else {
          unit = 'x';
          name = match[2] ? match[2] + ' ' + match[3] : match[3];
        }
      }
      return { name: name.trim(), quantity: qty, unit: unit };
    };

    const ingredients = Array.isArray(recipeData.recipeIngredient)
      ? recipeData.recipeIngredient.map(parseIngredient)
      : [];

    const extractSteps = (steps) => {
      let result = [];
      if (Array.isArray(steps)) {
        steps.forEach(step => {
          if (typeof step === 'string') {
            result.push(step);
          } else if (step['@type'] === 'HowToSection' && step.itemListElement) {
            // Add section header optionally, then recursive steps
            result.push(step.name ? `--- ${step.name} ---` : '---');
            result = result.concat(extractSteps(step.itemListElement));
          } else if (step.text) {
            result.push(step.text);
          }
        });
      }
      return result;
    };

    let instructions = extractSteps(recipeData.recipeInstructions);
    if (instructions.length === 0 && typeof recipeData.recipeInstructions === 'string') {
      instructions.push(recipeData.recipeInstructions.replace(/<[^>]*>?/gm, '').trim());
    }

    const keywords = recipeData.keywords;
    const tags = Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : []);

    const extracted = {
      title: recipeData.name || '',
      description: recipeData.description || '',
      imageUrls: getImageUrl(recipeData.image) ? [getImageUrl(recipeData.image)] : [],
      prepTime: parseDuration(recipeData.prepTime),
      cookTime: parseDuration(recipeData.cookTime),
      servings: parseInt(recipeData.recipeYield) || 4,
      difficulty: 'Medium',
      tags,
      ingredients,
      instructions,
      labNotes: `Extracted from: ${targetUrl}`
    };

    res.json(extracted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Restructure Route
app.post('/api/ai-restructure', requireAdmin, async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI features are currently unavailable (missing GEMINI_API_KEY in .env).' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are an expert culinary assistant. I am giving you unstructured recipe text. 
Please restructure and format it perfectly into the following JSON structure. If information is missing, make your best guess or leave it empty/default. Return ONLY the JSON object. If there are properties/notes in the ingredients that may make sense, such as possible substitutions or alternate measurements, leave them. Your job is to make the recipe readable while retaining all necessary information for a recipe that may be helpful.
{
  "title": "String (extract or invent a good title)",
  "description": "String (brief summary)",
  "prepTime": "String (in minutes)",
  "cookTime": "String (in minutes)",
  "servings": Number,
  "ingredients": [
    { "name": "String", "quantity": Number, "unit": "String" }
  ],
  "instructions": [ "String (Step 1)", "String (Step 2)" ],
  "tags": [ "String" ]
}

Raw text:
${rawText}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const structuredData = JSON.parse(text);
    res.json(structuredData);
  } catch (err) {
    console.error('AI Restructure Error:', err);
    res.status(500).json({ error: err.message || 'Failed to restructure recipe using AI.' });
  }
});

// AI Ingredient Substitutions Route (Admin Only)
app.post('/api/ai-substitutions', requireAdmin, async (req, res) => {
  try {
    const { ingredientName, recipeTitle } = req.body;
    if (!ingredientName) return res.status(400).json({ error: 'Ingredient name required' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI features unavailable (missing GEMINI_API_KEY).' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a professional chef. Provide 3 smart ingredient substitutions for "${ingredientName}" in the context of baking/cooking "${recipeTitle || 'this recipe'}".
Return a JSON array of objects with the following keys:
[
  { "substitute": "String", "ratio": "String (e.g. 1:1 or 3/4 cup per 1 cup)", "notes": "String (impact on flavor, texture, or bake time)" }
]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const substitutions = JSON.parse(text);
    res.json({ substitutions });
  } catch (err) {
    console.error('AI Substitution Error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI substitutions.' });
  }
});

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (req.query.search) {
        const s = req.query.search.toLowerCase();
        return res.json(sampleRecipes.filter(r => r.title.toLowerCase().includes(s) || r.tags.some(t => t.toLowerCase().includes(s))));
      }
      return res.json(sampleRecipes);
    }
    const query = { isLatestVersion: { $ne: false } };
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { tags: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const recipes = await Recipe.find(query).sort({ updatedAt: -1 });
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single recipe
app.get('/api/recipes/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const match = sampleRecipes.find(r => r._id === req.params.id) || sampleRecipes[0];
      return res.json(match);
    }
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new recipe
app.post('/api/recipes', requireAdmin, async (req, res) => {
  try {
    const recipe = new Recipe(req.body);
    await recipe.save();
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a recipe (Quick Save)
app.put('/api/recipes/:id', requireAdmin, async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Save as New Iteration
app.post('/api/recipes/:id/version', requireAdmin, async (req, res) => {
  try {
    // 1. Mark the current parent (or latest) as not latest
    const oldRecipe = await Recipe.findById(req.params.id);
    if (!oldRecipe) return res.status(404).json({ error: 'Recipe not found' });

    oldRecipe.isLatestVersion = false;
    await oldRecipe.save();

    // 2. Determine parentId (if we are branching off a child, the root parent is parentRecipeId, or this is the root)
    const parentId = oldRecipe.parentRecipeId || oldRecipe._id;

    // 3. Find the highest version number for this lineage
    const versions = await Recipe.find({ $or: [{ _id: parentId }, { parentRecipeId: parentId }] });
    const nextVersion = Math.max(...versions.map(v => v.versionNumber)) + 1;

    // 4. Create new version
    const newRecipeData = {
      ...req.body,
      _id: undefined,
      parentRecipeId: parentId,
      versionNumber: nextVersion,
      isLatestVersion: true
    };

    const newRecipe = new Recipe(newRecipeData);
    await newRecipe.save();

    res.status(201).json(newRecipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Version History
app.get('/api/recipes/:id/versions', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    const parentId = recipe.parentRecipeId || recipe._id;
    const history = await Recipe.find({ $or: [{ _id: parentId }, { parentRecipeId: parentId }] }).sort({ versionNumber: -1 });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a recipe
app.delete('/api/recipes/:id', requireAdmin, async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// General Notes endpoints
app.get('/api/notes', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const notes = await Note.find().sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const note = new Note(req.body);
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BakeLog endpoints
app.get('/api/bakelogs', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json(sampleBakeLogs);
    const logs = await BakeLog.find().populate('recipeId', 'title').sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:recipeId/bakelogs', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json(sampleBakeLogs.filter(b => b.recipeId._id === req.params.recipeId));
    const logs = await BakeLog.find({ recipeId: req.params.recipeId }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bakelogs', async (req, res) => {
  try {
    const log = new BakeLog(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/bakelogs/:id', async (req, res) => {
  try {
    const log = await BakeLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json(log);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/bakelogs/:id', async (req, res) => {
  try {
    const log = await BakeLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log not found' });
    res.json({ message: 'BakeLog deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pantry endpoints
app.get('/api/pantry', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json(samplePantry);
    const items = await Pantry.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pantry', requireAdmin, async (req, res) => {
  try {
    const item = new Pantry(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/pantry/:id', requireAdmin, async (req, res) => {
  try {
    const item = await Pantry.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Active Multi-Device Timer Sync Store
let activeTimerState = null;

app.post('/api/timers/sync', (req, res) => {
  const { timer } = req.body;
  activeTimerState = timer ? { ...timer, serverTimestamp: Date.now() } : null;
  res.json({ success: true, timer: activeTimerState });
});

app.get('/api/timers/active', (req, res) => {
  res.json({ timer: activeTimerState });
});

// JSON Backup endpoint
app.get('/api/backup', requireAdmin, async (req, res) => {
  try {
    const recipes = await Recipe.find({});
    const notes = await Note.find({});
    const bakeLogs = await BakeLog.find({});
    const pantry = await Pantry.find({});
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        recipes,
        notes,
        bakeLogs,
        pantry
      }
    };
    res.setHeader('Content-disposition', 'attachment; filename=culinary-lab-backup.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Automated Daily Backups
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running automated daily backup...');
    const recipes = await Recipe.find({});
    const notes = await Note.find({});
    const bakeLogs = await BakeLog.find({});
    const pantry = await Pantry.find({});

    const backup = {
      timestamp: new Date().toISOString(),
      data: { recipes, notes, bakeLogs, pantry }
    };

    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir);
    }

    const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(backup, null, 2));
    console.log(`Automated backup saved to ${filename}`);
  } catch (err) {
    console.error('Failed to run automated backup:', err);
  }
});

// Serve production static assets from dist folder if present
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
