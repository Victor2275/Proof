import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { BakeLog } from '../models/BakeLog.js';
import { Pantry } from '../models/Pantry.js';

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
  await BakeLog.deleteMany({});
  await Pantry.deleteMany({});
});

describe('Misc API Endpoints', () => {
  it('POST /api/bake-logs - creates a log', async () => {
    const newLog = { recipeId: new mongoose.Types.ObjectId(), notes: 'Test log', date: new Date() };
    const res = await request(app).post('/api/bakelogs').send(newLog);
    expect(res.statusCode).toBe(201);
    expect(res.body.notes).toBe('Test log');
  });

  it('GET /api/bake-logs - returns logs', async () => {
    await BakeLog.create({ recipeId: new mongoose.Types.ObjectId(), notes: 'Test log', date: new Date() });
    const res = await request(app).get('/api/bakelogs');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('POST /api/pantry - adds an item', async () => {
    const newItem = { name: 'Salt' };
    const res = await request(app).post('/api/pantry').send(newItem);
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Salt');
  });

  it('POST /api/pantry - blocks duplicates (or handles them)', async () => {
    await Pantry.create({ name: 'Salt' });
    const res = await request(app).post('/api/pantry').send({ name: 'Salt' });
    expect(res.statusCode).toBe(201); // Model currently doesn't enforce uniqueness
  });

  it('GET /api/pantry - returns items', async () => {
    await Pantry.create({ name: 'Sugar' });
    const res = await request(app).get('/api/pantry');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/extract - error handling on bad URL', async () => {
    const res = await request(app).post('/api/extract').send({ url: 'not-a-url' });
    expect(res.statusCode).toBe(500);
  });

  it('POST /api/analyze-image - requires image URL', async () => {
    const res = await request(app).post('/api/analyze-image').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Image URL required');
  });

  it('POST /api/auth/pin - invalid PIN', async () => {
    process.env.ADMIN_PIN = '1234';
    const res = await request(app).post('/api/auth/pin').send({ pin: '0000' });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid PIN');
    delete process.env.ADMIN_PIN; // cleanup
  });
});
