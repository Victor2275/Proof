import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';

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

describe('Live Timer Sync API', () => {
  it('GET /api/timers/active - returns null initial state', async () => {
    const res = await request(app).get('/api/timers/active');
    expect(res.statusCode).toBe(200);
    expect(res.body.timer).toBeNull();
  });

  it('POST /api/timers/sync - syncs running timer state', async () => {
    const timerPayload = {
      recipeId: 'recipe123',
      label: 'Bulk Fermentation',
      durationSeconds: 3600,
      remainingSeconds: 1800,
      isRunning: true
    };

    const syncRes = await request(app)
      .post('/api/timers/sync')
      .send({ timer: timerPayload });

    expect(syncRes.statusCode).toBe(200);
    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.timer.recipeId).toBe('recipe123');

    // Retrieve synced state
    const activeRes = await request(app).get('/api/timers/active');
    expect(activeRes.statusCode).toBe(200);
    expect(activeRes.body.timer.label).toBe('Bulk Fermentation');
    expect(activeRes.body.timer.remainingSeconds).toBe(1800);
  });
});
