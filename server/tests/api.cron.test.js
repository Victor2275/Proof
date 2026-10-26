import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { Recipe } from '../models/Recipe.js';
import { Pantry } from '../models/Pantry.js';
import { User } from '../models/User.js';
import { signedIn } from './signIn.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoServer;

beforeAll(async () => {
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
  await User.deleteMany({});
});

describe('Backup API & Maintenance Endpoints', () => {
  it('GET /api/backup - generates and downloads database JSON snapshot', async () => {
    await Recipe.create({ title: 'Backup Test Sourdough' });
    await Pantry.create({ name: 'Active Yeast' });

    const { auth } = await signedIn('owner', { role: 'owner' });
    expect((await request(app).get('/api/backup')).statusCode).toBe(401);
    const res = await request(app).get('/api/backup').set(auth);
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
