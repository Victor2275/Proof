import crypto from 'crypto';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
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
import { Timer } from './models/Timer.js';
import { sampleRecipes, samplePantry, sampleBakeLogs } from './sampleData.js';
import cron from 'node-cron';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

// --- Security / Admin Gate ---
// Session tokens are generated per-login and stored in memory with a 24h TTL.
// This replaces the previous hardcoded token that was visible in the public repo.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const activeSessions = new Map(); // token -> { createdAt: number }

const generateToken = () => crypto.randomUUID();

const isValidSession = (token) => {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    activeSessions.delete(token);
    return false;
  }
  return true;
};

const requireAdmin = (req, res, next) => {
  // If no PIN is configured, everyone is an admin
  if (!process.env.ADMIN_PIN) return next();

  const token = req.headers.authorization?.split(' ')[1];

  if (isValidSession(token)) {
    next();
  } else {
    res.status(401).json({ error: 'Admin authentication required.' });
  }
};

app.post('/api/auth/pin', (req, res) => {
  const { pin } = req.body;
  if (!process.env.ADMIN_PIN) {
    const token = generateToken();
    activeSessions.set(token, { createdAt: Date.now() });
    return res.json({ token });
  }
  if (pin === process.env.ADMIN_PIN) {
    const token = generateToken();
    activeSessions.set(token, { createdAt: Date.now() });
    res.json({ token });
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

/*
 * Image re-hosting.
 *
 * An imported recipe keeps whatever image URL the source site published. Those
 * URLs rot: sugarspunrun.com already answers hotlinks with
 * ERR_BLOCKED_BY_RESPONSE.NotSameOrigin, and any of them can move when the site
 * is reorganised. Copy the image onto our own Cloudinary account at import time
 * so the URL we store is one we control. Failures are non-fatal — a recipe with
 * an at-risk image URL still beats no recipe.
 */
const cloudinaryConfigured = () => !!(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

const isCloudinaryUrl = (url) => /(?:\/\/|\.)cloudinary\.com\//i.test(url || '');

const rehostImageUrl = async (url) => {
  if (!url || typeof url !== 'string') return url;
  if (!/^https?:\/\//i.test(url)) return url;   // data: URIs, relative paths — leave alone
  if (isCloudinaryUrl(url)) return url;          // already ours
  if (!cloudinaryConfigured()) return url;       // nowhere to upload to
  try {
    const result = await cloudinary.uploader.upload(url, { folder: 'cookbook' });
    return result.secure_url || result.url || url;
  } catch (err) {
    console.error('Image re-host failed, keeping original URL:', url, '—', err.message);
    return url;
  }
};

const rehostImageUrls = async (urls) => (
  Array.isArray(urls) ? Promise.all(urls.map(rehostImageUrl)) : urls
);


// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
    .then(() => console.log('Connected to MongoDB'))
    .catch(async (err) => {
      if (process.env.NODE_ENV === 'production') {
        return console.error('MongoDB connection error (running without MongoDB):', err.message);
      }
      
      console.warn('MongoDB connection error. Attempting to start in-memory database for local testing...', err.message);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        console.log('Connected to local In-Memory MongoDB (Test Database)');
      } catch (memErr) {
        console.error('Failed to start in-memory MongoDB:', memErr.message);
      }
    });
}

/*
 * Database availability.
 *
 * Reads used to fall back to the bundled sample data with a 200 whenever Mongo was
 * unreachable, and GET /api/recipes/:id fell through to `sampleRecipes[0]` — so any
 * recipe URL silently rendered "Classic Country Sourdough" as though it were yours,
 * with nothing in the response to say otherwise. Opening a recipe mid-bake during a
 * connection blip meant reading someone else's formula without knowing.
 *
 * Sample data is now opt-in through DEMO_MODE (for showing the app off without a
 * database). Otherwise a missing database is reported honestly as 503 so the client
 * can say so rather than inventing content.
 */
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const dbReady = () => mongoose.connection.readyState === 1;
const sendDegraded = (res) => res.status(503).json({
  error: 'The recipe database is unavailable. Reconnecting — your data is safe.',
  degraded: true,
});

// Routes

app.get(['/api', '/api/health'], (req, res) => {
  res.json({
    status: dbReady() ? 'ok' : 'degraded',
    database: dbReady() ? 'connected' : (DEMO_MODE ? 'demo-mode' : 'unavailable'),
    message: 'Proof API Server is running',
  });
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

    // Copy the source image onto our own Cloudinary account so we don't ship a
    // hotlink that the origin can block or break later.
    extracted.imageUrls = await rehostImageUrls(extracted.imageUrls);

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
    if (!dbReady()) {
      if (!DEMO_MODE) return sendDegraded(res);
      if (req.query.search) {
        const s = req.query.search.toLowerCase();
        return res.json(sampleRecipes.filter(r => r.title.toLowerCase().includes(s) || r.tags.some(t => t.toLowerCase().includes(s))));
      }
      return res.json(sampleRecipes);
    }
    const query = {};
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
    if (!dbReady()) {
      if (!DEMO_MODE) return sendDegraded(res);
      // Even in demo mode, never substitute a different recipe for the one asked for.
      const match = sampleRecipes.find(r => r._id === req.params.id);
      if (!match) return res.status(404).json({ error: 'Recipe not found', degraded: true });
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
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
    if (!dbReady()) return DEMO_MODE ? res.json([]) : sendDegraded(res);
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
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
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
    if (!dbReady()) return DEMO_MODE ? res.json(sampleBakeLogs) : sendDegraded(res);
    const logs = await BakeLog.find().populate('recipeId', 'title').sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:recipeId/bakelogs', async (req, res) => {
  try {
    if (!dbReady()) return DEMO_MODE ? res.json(sampleBakeLogs.filter(b => b.recipeId._id === req.params.recipeId)) : sendDegraded(res);
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
    const log = await BakeLog.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
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
    if (!dbReady()) return DEMO_MODE ? res.json(samplePantry) : sendDegraded(res);
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

/*
 * Active multi-device timer sync.
 *
 * The in-memory array is still the hot path that Socket.io broadcasts from, but it
 * is now mirrored to Mongo so a restart resumes running timers instead of silently
 * dropping them. Writes are fire-and-forget: a database problem must never stop a
 * timer from reaching the other devices in the kitchen.
 */
let globalTimers = [];

const persistTimers = async (op) => {
  if (!dbReady()) return;
  try {
    await op();
  } catch (err) {
    console.error('Timer persistence failed (timer still live in memory):', err.message);
  }
};

const loadTimersFromDb = async () => {
  if (!dbReady()) return;
  try {
    const stored = await Timer.find({}).lean();
    // Drop anything that finished while the server was down — resuming an alarm for
    // a bake that ended hours ago is worse than forgetting it.
    const stillRelevant = stored.filter(t => t.endTime === null || t.endTime > Date.now() || !t.hasRung);
    globalTimers = stillRelevant.map(({ id, name, endTime, remainingMs, hasRung }) => ({ id, name, endTime, remainingMs, hasRung }));
    const staleIds = stored.filter(t => !stillRelevant.includes(t)).map(t => t.id);
    if (staleIds.length) await Timer.deleteMany({ id: { $in: staleIds } });
    if (globalTimers.length) console.log(`Resumed ${globalTimers.length} timer(s) from the database`);
  } catch (err) {
    console.error('Could not restore timers:', err.message);
  }
};

if (process.env.NODE_ENV !== 'test') {
  mongoose.connection.once('connected', loadTimersFromDb);
}

// Read the live timer state over HTTP — useful for a device that has not opened a
// socket yet, and for checking state without driving the UI.
app.get('/api/timers', (req, res) => {
  res.json(globalTimers);
});

app.delete('/api/timers/:id', requireAdmin, async (req, res) => {
  const before = globalTimers.length;
  globalTimers = globalTimers.filter(t => t.id !== req.params.id);
  if (globalTimers.length === before) return res.status(404).json({ error: 'Timer not found' });
  await persistTimers(() => Timer.deleteOne({ id: req.params.id }));
  io.emit('timers:sync', globalTimers);
  res.json({ success: true, timers: globalTimers });
});

io.on('connection', (socket) => {
  console.log('Client connected to Socket.io');

  // Send current state to newly connected client
  socket.emit('timers:sync', globalTimers);

  socket.on('timer:add', (timer) => {
    globalTimers.push(timer);
    io.emit('timers:sync', globalTimers);
    persistTimers(() => Timer.updateOne({ id: timer.id }, { $set: timer }, { upsert: true }));
  });

  socket.on('timer:update', (timerUpdate) => {
    globalTimers = globalTimers.map(t => t.id === timerUpdate.id ? { ...t, ...timerUpdate } : t);
    io.emit('timers:sync', globalTimers);
    persistTimers(() => Timer.updateOne({ id: timerUpdate.id }, { $set: timerUpdate }, { upsert: true }));
  });

  socket.on('timer:remove', (id) => {
    globalTimers = globalTimers.filter(t => t.id !== id);
    io.emit('timers:sync', globalTimers);
    persistTimers(() => Timer.deleteOne({ id }));
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
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

// One-shot backfill: pull any still-hotlinked recipe / bake-log images onto
// Cloudinary. New imports are re-hosted automatically (see /api/extract); this
// catches the ones saved before that was in place.
app.post('/api/maintenance/rehost-images', requireAdmin, async (req, res) => {
  if (!dbReady()) return sendDegraded(res);
  if (!cloudinaryConfigured()) {
    return res.status(503).json({ error: 'Cloudinary is not configured on the server.' });
  }
  try {
    const rehosted = [];
    const backfill = async (Model) => {
      let updated = 0;
      const docs = await Model.find({ imageUrls: { $exists: true, $ne: [] } });
      for (const doc of docs) {
        const before = doc.imageUrls.slice();
        const after = await rehostImageUrls(before);
        if (after.some((url, i) => url !== before[i])) {
          before.forEach((was, i) => { if (after[i] !== was) rehosted.push({ was, now: after[i] }); });
          doc.imageUrls = after;
          await doc.save();
          updated++;
        }
      }
      return updated;
    };

    const recipesUpdated = await backfill(Recipe);
    const bakeLogsUpdated = await backfill(BakeLog);
    res.json({ recipesUpdated, bakeLogsUpdated, rehostedCount: rehosted.length, rehosted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Automated Daily Backups & Cloudinary Cleanup
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('Running automated daily backup & maintenance...');
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

    // Cloudinary Orphan Cleanup
    if (process.env.CLOUDINARY_API_KEY) {
      console.log('Starting Cloudinary Orphan Cleanup...');
      // Get all referenced images in the database
      const referencedImages = new Set();
      
      recipes.forEach(r => {
        if (r.imageUrls) r.imageUrls.forEach(url => referencedImages.add(url));
      });
      bakeLogs.forEach(log => {
        if (log.imageUrls) log.imageUrls.forEach(url => referencedImages.add(url));
      });

      // Get all images in the Cloudinary cookbook folder
      let nextCursor = null;
      let deletedCount = 0;
      do {
        const result = await cloudinary.api.resources({
          type: 'upload',
          prefix: 'cookbook/',
          max_results: 500,
          next_cursor: nextCursor
        });

        for (const resource of result.resources) {
          if (!referencedImages.has(resource.secure_url) && !referencedImages.has(resource.url)) {
            await cloudinary.api.delete_resources([resource.public_id]);
            deletedCount++;
          }
        }
        nextCursor = result.next_cursor;
      } while (nextCursor);

      console.log(`Cloudinary maintenance complete. Deleted ${deletedCount} orphaned images.`);
    }

  } catch (err) {
    console.error('Failed to run automated backup/maintenance:', err);
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
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app, server, io, loadTimersFromDb, rehostImageUrl, isCloudinaryUrl };
