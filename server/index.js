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

// Route & middleware modules
import { configureCloudinary } from './services/cloudinary.js';
import authRouter from './routes/auth.js';
import { indexPage } from './services/indexHtml.js';
import aiRouter from './routes/ai.js';
import libraryRouter from './routes/library.js';
import timersRouter, { registerTimerSockets, loadTimersFromDb } from './routes/timers.js';
import maintenanceRouter, { startMaintenanceCron } from './routes/maintenance.js';
import publishedRouter from './routes/published.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

configureCloudinary();

const app = express();
// Render puts one proxy in front of the app. Without this every request
// appears to come from the proxy, and the rate limits would throttle everyone
// as one caller.
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Accounts & sessions ────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── Health ─────────────────────────────────────────────────────────────────
const dbReady = () => mongoose.connection.readyState === 1;
app.get(['/api', '/api/health'], (_req, res) => {
  res.json({
    status: dbReady() ? 'ok' : 'degraded',
    database: dbReady() ? 'connected' : 'unavailable',
    message: 'Proof API Server is running',
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────
// The cookbook lives on each device. The server keeps the shared cookbook,
// the operator's pre-Phase-1 library (read once per device), and the AI.
app.use('/api/library', libraryRouter);
app.use('/api/timers', timersRouter);
app.use('/api/published', publishedRouter);
app.use('/api', aiRouter);                  // rate-limited per route
app.use('/api', maintenanceRouter);         // /api/backup + /api/maintenance/*

// ── Socket.io ──────────────────────────────────────────────────────────────
registerTimerSockets(io);

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
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  const page = indexPage(path.join(distPath, 'index.html'));
  app.use(express.static(distPath, {
    // The page itself always goes through `page.send`, which adds its policy.
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    },
  }));
  app.get(/^(?!\/api).*/, (_req, res) => page.send(res));
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
