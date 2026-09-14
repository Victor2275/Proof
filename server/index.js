/**
 * Proof API Server — Bootstrap
 *
 * This file is intentionally thin: it wires together middleware, routes,
 * Socket.io, and the database. All business logic lives in the modules under
 * routes/, middleware/, and services/.
 */
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Route & middleware modules
import { requireAdmin, createSession } from './middleware/auth.js';
import { configureCloudinary, buildStorage } from './services/cloudinary.js';
import recipesRouter from './routes/recipes.js';
import aiRouter from './routes/ai.js';
import notesRouter from './routes/notes.js';
import bakeLogsRouter from './routes/bakeLogs.js';
import pantryRouter from './routes/pantry.js';
import timersRouter, { registerTimerSockets, loadTimersFromDb, globalTimers } from './routes/timers.js';
import maintenanceRouter, { startMaintenanceCron } from './routes/maintenance.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

configureCloudinary();
const upload = buildStorage();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate Limiting ──────────────────────────────────────────────────────────
const authLimiter = rateLimit({ windowMs: 60_000, max: 5, message: { error: 'Too many auth attempts. Try again in a minute.' } });
const aiLimiter = rateLimit({ windowMs: 60_000, max: 10, message: { error: 'AI rate limit reached. Try again in a minute.' } });

// ── Auth ───────────────────────────────────────────────────────────────────
app.post('/api/auth/pin', authLimiter, (req, res) => {
  const { pin } = req.body;
  if (!process.env.ADMIN_PIN) {
    return res.json({ token: createSession() });
  }
  if (pin === process.env.ADMIN_PIN) {
    res.json({ token: createSession() });
  } else {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});

// ── Upload ─────────────────────────────────────────────────────────────────
app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
  res.status(201).json({ imageUrl: req.file.path });
});

// ── Health ─────────────────────────────────────────────────────────────────
const dbReady = () => mongoose.connection.readyState === 1;
app.get(['/api', '/api/health'], (_req, res) => {
  res.json({
    status: dbReady() ? 'ok' : 'degraded',
    database: dbReady() ? 'connected' : (process.env.DEMO_MODE === 'true' ? 'demo-mode' : 'unavailable'),
    message: 'Proof API Server is running',
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/recipes', recipesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/bakelogs', bakeLogsRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/timers', timersRouter);
app.use('/api', aiLimiter, aiRouter);       // rate-limit all AI endpoints
app.use('/api', maintenanceRouter);         // /api/backup + /api/maintenance/*

// Recipe-scoped bake logs: /api/recipes/:recipeId/bakelogs
app.get('/api/recipes/:recipeId/bakelogs', async (req, res) => {
  const DEMO_MODE = process.env.DEMO_MODE === 'true';
  if (!dbReady()) {
    const { sampleBakeLogs } = await import('./fixtures/sampleData.js');
    return DEMO_MODE
      ? res.json(sampleBakeLogs.filter(b => b.recipeId._id === req.params.recipeId))
      : res.status(503).json({ error: 'Database unavailable', degraded: true });
  }
  try {
    const { BakeLog } = await import('./models/BakeLog.js');
    const logs = await BakeLog.find({ recipeId: req.params.recipeId }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Socket.io ──────────────────────────────────────────────────────────────
registerTimerSockets(io);

// Emit to all clients on REST timer deletion
app.delete('/api/timers/:id', (req, res, next) => {
  res.on('finish', () => { if (res.statusCode === 200) io.emit('timers:sync', globalTimers); });
  next();
});

// ── Database ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cookbook';

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
    .then(() => {
      console.log('Connected to MongoDB');
      loadTimersFromDb();
    })
    .catch(async (err) => {
      if (process.env.NODE_ENV === 'production') {
        return console.error('MongoDB connection error (running without MongoDB):', err.message);
      }
      console.warn('MongoDB connection error. Attempting to start in-memory database for local testing...', err.message);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri());
        console.log('Connected to local In-Memory MongoDB (Test Database)');
      } catch (memErr) {
        console.error('Failed to start in-memory MongoDB:', memErr.message);
      }
    });

  startMaintenanceCron();
}

// ── Static Assets ──────────────────────────────────────────────────────────
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ── Listen ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app, server, io, loadTimersFromDb };

// Re-export cloudinary helpers so existing tests that import from index.js keep working
export { rehostImageUrl, isCloudinaryUrl } from './services/cloudinary.js';
