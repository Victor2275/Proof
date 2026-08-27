import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, loadTimersFromDb } from '../index.js';
import { Timer } from '../models/Timer.js';

/*
 * These tests previously targeted GET /api/timers/active and POST /api/timers/sync,
 * which were never implemented — they described a single-active-timer model
 * ({ recipeId, label, durationSeconds }) that conflicts with the multi-timer
 * Socket.io feature the app actually ships ({ id, name, endTime, remainingMs }).
 * They had been failing on main for some time. Rewritten against the real surface,
 * with the behaviour that actually matters: timers now survive a server restart.
 */

let mongoServer;

beforeAll(async () => {
  delete process.env.ADMIN_PIN;
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Timer.deleteMany({});
  await loadTimersFromDb();
});

describe('Live Timer Sync API', () => {
  it('GET /api/timers - returns an empty list when nothing is running', async () => {
    const res = await request(app).get('/api/timers');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('resumes still-running timers after a restart', async () => {
    const endTime = Date.now() + 3600 * 1000; // an hour out
    await Timer.create({ id: 'bulk-1', name: 'Bulk Fermentation', endTime, remainingMs: 0, hasRung: false });

    await loadTimersFromDb(); // stands in for the server coming back up

    const res = await request(app).get('/api/timers');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Bulk Fermentation');
    expect(res.body[0].endTime).toBe(endTime);
  });

  it('resumes paused timers, which have no deadline but a remaining duration', async () => {
    await Timer.create({ id: 'paused-1', name: 'Proof', endTime: null, remainingMs: 900000, hasRung: false });

    await loadTimersFromDb();

    const res = await request(app).get('/api/timers');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].endTime).toBeNull();
    expect(res.body[0].remainingMs).toBe(900000);
  });

  it('discards timers that already finished and rang while the server was down', async () => {
    await Timer.create({ id: 'done-1', name: 'Bake', endTime: Date.now() - 60_000, remainingMs: 0, hasRung: true });

    await loadTimersFromDb();

    const res = await request(app).get('/api/timers');
    expect(res.body).toEqual([]);
    // and it is cleaned out of the database rather than left to accumulate
    expect(await Timer.countDocuments({})).toBe(0);
  });

  it('DELETE /api/timers/:id - removes a running timer', async () => {
    await Timer.create({ id: 'bulk-2', name: 'Autolyse', endTime: Date.now() + 60_000, remainingMs: 0, hasRung: false });
    await loadTimersFromDb();

    const del = await request(app).delete('/api/timers/bulk-2');
    expect(del.statusCode).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.timers).toEqual([]);

    expect(await Timer.countDocuments({ id: 'bulk-2' })).toBe(0);
    const after = await request(app).get('/api/timers');
    expect(after.body).toEqual([]);
  });

  it('DELETE /api/timers/:id - 404s for a timer that is not running', async () => {
    const res = await request(app).delete('/api/timers/does-not-exist');
    expect(res.statusCode).toBe(404);
  });
});
