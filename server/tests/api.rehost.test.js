import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, rehostImageUrl, isCloudinaryUrl } from '../index.js';

let mongoServer;

beforeAll(async () => {
  delete process.env.ADMIN_PIN;
  // No Cloudinary credentials in the test env — re-hosting must degrade gracefully.
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  mongoServer = await MongoMemoryServer.create({ binary: { checkMD5: false } });
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('image re-hosting', () => {
  it('recognises Cloudinary URLs', () => {
    expect(isCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/cookbook/x.jpg')).toBe(true);
    expect(isCloudinaryUrl('https://sugarspunrun.com/wp-content/uploads/cheesecake.jpg')).toBe(false);
    expect(isCloudinaryUrl('')).toBe(false);
    expect(isCloudinaryUrl(undefined)).toBe(false);
  });

  it('leaves a URL untouched when Cloudinary is not configured', async () => {
    const url = 'https://sugarspunrun.com/wp-content/uploads/cheesecake.jpg';
    expect(await rehostImageUrl(url)).toBe(url);
  });

  it('never rewrites a URL that is already on Cloudinary', async () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/cookbook/x.jpg';
    expect(await rehostImageUrl(url)).toBe(url);
  });

  it('POST /api/maintenance/rehost-images reports 503 when Cloudinary is unconfigured', async () => {
    const res = await request(app).post('/api/maintenance/rehost-images');
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/cloudinary/i);
  });
});
