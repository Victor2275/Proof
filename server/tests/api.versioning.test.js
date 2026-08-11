import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { Recipe } from '../models/Recipe.js';

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
});

describe('Recipe Versioning API', () => {
  it('POST /api/recipes/:id/version - creates a new version', async () => {
    const parent = await Recipe.create({ title: 'Bread v1', versionNumber: 1, isLatestVersion: true });
    
    const res = await request(app).post(`/api/recipes/${parent._id}/version`).send({ title: 'Bread v1 (v2)' });
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Bread v1 (v2)');
    expect(res.body.versionNumber).toBe(2);
    expect(res.body.parentRecipeId).toBe(parent._id.toString());
  });

  it('POST /api/recipes/:id/version - marks parent as not latest', async () => {
    const parent = await Recipe.create({ title: 'Bread v1', versionNumber: 1, isLatestVersion: true });
    
    await request(app).post(`/api/recipes/${parent._id}/version`).send({ title: 'Bread v1 (v2)' });
    
    const updatedParent = await Recipe.findById(parent._id);
    expect(updatedParent.isLatestVersion).toBe(false);
  });

  it('POST /api/recipes/:id/version - returns 404 for invalid parent', async () => {
    const invalidId = new mongoose.Types.ObjectId();
    const res = await request(app).post(`/api/recipes/${invalidId}/version`).send({ title: 'Bread v1 (v2)' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/recipes - fetches multiple versions', async () => {
    const parent = await Recipe.create({ title: 'Bread v1', versionNumber: 1, isLatestVersion: false });
    await Recipe.create({ title: 'Bread v2', versionNumber: 2, isLatestVersion: true, parentRecipeId: parent._id });
    
    const res = await request(app).get('/api/recipes');
    expect(res.body).toHaveLength(1); // Should only fetch the latest version
  });

  it('GET /api/recipes/:id - specific version is fetchable', async () => {
    const parent = await Recipe.create({ title: 'Bread v1', versionNumber: 1, isLatestVersion: true });
    const childRes = await request(app).post(`/api/recipes/${parent._id}/version`).send({ title: 'Bread v1 (v2)' });
    
    const childId = childRes.body._id;
    const fetchRes = await request(app).get(`/api/recipes/${childId}`);
    
    expect(fetchRes.statusCode).toBe(200);
    expect(fetchRes.body.versionNumber).toBe(2);
  });
});
