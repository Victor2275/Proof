import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../index.js';
import { Recipe } from '../models/Recipe.js';

let mongoServer;

beforeAll(async () => {
  // Bypass admin authentication for testing
  delete process.env.ADMIN_PIN;

  // Create an in-memory MongoDB instance so tests don't touch the real database
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Cleanup connections after tests are done
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Recipe API Endpoints', () => {
  it('should return an empty list of recipes initially', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should create a new recipe', async () => {
    const newRecipe = {
      title: 'Test Sourdough',
      instructions: ['Mix dough', 'Proof', 'Bake at 450F']
    };
    
    const res = await request(app)
      .post('/api/recipes')
      .send(newRecipe);
      
    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Test Sourdough');
    expect(res.body.instructions.length).toBe(3);

    // Verify it was actually saved in the mocked database
    const recipes = await Recipe.find({});
    expect(recipes.length).toBe(1);
    expect(recipes[0].title).toBe('Test Sourdough');
  });
});
