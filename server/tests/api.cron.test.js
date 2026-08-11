import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { Recipe } from '../models/Recipe.js';
import { Pantry } from '../models/Pantry.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoServer;

beforeAll(async () => {
  delete process.env.ADMIN_PIN;
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Recipe.deleteMany({});
  await Pantry.deleteMany({});
});

describe('Backup API & Maintenance Endpoints', () => {
  it('GET /api/backup - generates and downloads database JSON snapshot', async () => {
    await Recipe.create({ title: 'Backup Test Sourdough' });
    await Pantry.create({ name: 'Active Yeast' });

    const res = await request(app).get('/api/backup');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');

    const backupData = JSON.parse(res.text);
    expect(backupData.timestamp).toBeDefined();
    expect(backupData.data.recipes).toHaveLength(1);
    expect(backupData.data.recipes[0].title).toBe('Backup Test Sourdough');
    expect(backupData.data.pantry).toHaveLength(1);
    expect(backupData.data.pantry[0].name).toBe('Active Yeast');
  });
});
