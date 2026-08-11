import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { Recipe } from '../models/Recipe.js';

let mongoServer;

beforeAll(async () => {
  delete process.env.ADMIN_PIN; // bypass auth
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

describe('Recipe API Endpoints (CRUD)', () => {
  it('GET /api/recipes - returns empty list initially', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/recipes - creates a recipe successfully', async () => {
    const newRecipe = { title: 'Bread', instructions: ['Mix'] };
    const res = await request(app).post('/api/recipes').send(newRecipe);
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Bread');
  });

  it('POST /api/recipes - blocks creation without title', async () => {
    const res = await request(app).post('/api/recipes').send({ instructions: ['Mix'] });
    expect(res.statusCode).toBe(400); // Mongoose validation error handled explicitly as 400
  });

  it('GET /api/recipes - returns populated list', async () => {
    await Recipe.create({ title: 'Bread' });
    const res = await request(app).get('/api/recipes');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('GET /api/recipes/:id - returns 500/404 for invalid ObjectId', async () => {
    const res = await request(app).get('/api/recipes/invalid_id');
    expect(res.statusCode).toBe(500); // Mongoose cast error
  });

  it('GET /api/recipes/:id - returns the recipe', async () => {
    const recipe = await Recipe.create({ title: 'Bread' });
    const res = await request(app).get(`/api/recipes/${recipe._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Bread');
  });

  it('PUT /api/recipes/:id - updates fields correctly', async () => {
    const recipe = await Recipe.create({ title: 'Bread' });
    const res = await request(app)
      .put(`/api/recipes/${recipe._id}`)
      .send({ title: 'Sourdough Bread' });
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Sourdough Bread');
  });

  it('DELETE /api/recipes/:id - removes recipe from DB', async () => {
    const recipe = await Recipe.create({ title: 'Bread' });
    const res = await request(app).delete(`/api/recipes/${recipe._id}`);
    expect(res.statusCode).toBe(200);
    
    const count = await Recipe.countDocuments();
    expect(count).toBe(0);
  });
});
