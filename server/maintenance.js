import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { Recipe } from './models/Recipe.js';
import { BakeLog } from './models/BakeLog.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cookbook';

async function cleanOrphanedPhotos() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    
    console.log('Fetching database image URLs...');
    const recipes = await Recipe.find({}, 'imageUrls');
    const bakeLogs = await BakeLog.find({}, 'imageUrls');
    
    const dbUrls = new Set();
    recipes.forEach(r => r.imageUrls?.forEach(url => dbUrls.add(url)));
    bakeLogs.forEach(l => l.imageUrls?.forEach(url => dbUrls.add(url)));
    
    console.log(`Found ${dbUrls.size} unique image URLs in DB.`);
    
    console.log('Fetching images from Cloudinary (folder: cookbook)...');
    let hasMore = true;
    let nextCursor = null;
    let cloudinaryAssets = [];
    
    while (hasMore) {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'cookbook/',
        max_results: 500,
        next_cursor: nextCursor
      });
      cloudinaryAssets = cloudinaryAssets.concat(result.resources);
      if (result.next_cursor) {
        nextCursor = result.next_cursor;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`Found ${cloudinaryAssets.length} assets in Cloudinary.`);
    
    const orphans = [];
    cloudinaryAssets.forEach(asset => {
      if (!dbUrls.has(asset.secure_url) && !dbUrls.has(asset.url)) {
        orphans.push(asset.public_id);
      }
    });
    
    if (orphans.length === 0) {
      console.log('No orphaned photos found. Server is clean!');
    } else {
      console.log(`Found ${orphans.length} orphaned photos. Deleting...`);
      // Delete in chunks of 100
      for (let i = 0; i < orphans.length; i += 100) {
        const chunk = orphans.slice(i, i + 100);
        await cloudinary.api.delete_resources(chunk);
      }
      console.log('Deleted orphaned photos successfully.');
    }
    
  } catch (err) {
    console.error('Error during maintenance:', err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

cleanOrphanedPhotos();
