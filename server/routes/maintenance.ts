import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { requireAdmin } from '../middleware/auth.js';
import { cloudinary, cloudinaryConfigured, rehostImageUrls } from '../services/cloudinary.js';
import { Recipe } from '../models/Recipe.js';
import { Note } from '../models/Note.js';
import { BakeLog } from '../models/BakeLog.js';
import { Pantry } from '../models/Pantry.js';
import mongoose from 'mongoose';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbReady = () => mongoose.connection.readyState === 1;
const sendDegraded = (res: Response) =>
  res.status(503).json({ error: 'The recipe database is unavailable.', degraded: true });

// GET /api/backup
router.get('/backup', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [recipes, notes, bakeLogs, pantry] = await Promise.all([
      Recipe.find({}), Note.find({}), BakeLog.find({}), Pantry.find({}),
    ]);
    const backup = { timestamp: new Date().toISOString(), data: { recipes, notes, bakeLogs, pantry } };
    res.setHeader('Content-disposition', 'attachment; filename=proof-backup.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance/rehost-images
router.post('/maintenance/rehost-images', requireAdmin, async (_req: Request, res: Response) => {
  if (!dbReady()) return sendDegraded(res);
  if (!cloudinaryConfigured()) return res.status(503).json({ error: 'Cloudinary is not configured on the server.' });
  try {
    const rehosted: Array<{ was: string; now: string }> = [];
    const backfill = async (Model: any) => {
      let updated = 0;
      const docs = await Model.find({ imageUrls: { $exists: true, $ne: [] } });
      for (const doc of docs) {
        const before = doc.imageUrls.slice();
        const after = await rehostImageUrls(before);
        if (after.some((url: string, i: number) => url !== before[i])) {
          before.forEach((was: string, i: number) => { if (after[i] !== was) rehosted.push({ was, now: after[i] }); });
          doc.imageUrls = after;
          await doc.save();
          updated++;
        }
      }
      return updated;
    };
    const recipesUpdated = await backfill(Recipe);
    const bakeLogsUpdated = await backfill(BakeLog);
    res.json({ recipesUpdated, bakeLogsUpdated, rehostedCount: rehosted.length, rehosted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Automated daily backup & Cloudinary cleanup cron (2 AM)
export const startMaintenanceCron = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running automated daily backup & maintenance...');
      const [recipes, notes, bakeLogs, pantry] = await Promise.all([
        Recipe.find({}), Note.find({}), BakeLog.find({}), Pantry.find({}),
      ]);
      const backup = { timestamp: new Date().toISOString(), data: { recipes, notes, bakeLogs, pantry } };
      const backupsDir = path.join(__dirname, '../../backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
      const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(path.join(backupsDir, filename), JSON.stringify(backup, null, 2));
      console.log(`Automated backup saved to ${filename}`);

      if (process.env.CLOUDINARY_API_KEY) {
        console.log('Starting Cloudinary Orphan Cleanup...');
        const referencedImages = new Set<string>();
        recipes.forEach((r: any) => r.imageUrls?.forEach((url: string) => referencedImages.add(url)));
        bakeLogs.forEach((log: any) => log.imageUrls?.forEach((url: string) => referencedImages.add(url)));

        let nextCursor: string | null = null;
        let deletedCount = 0;
        do {
          const result: any = await cloudinary.api.resources({ type: 'upload', prefix: 'cookbook/', max_results: 500, next_cursor: nextCursor });
          for (const resource of result.resources) {
            if (!referencedImages.has(resource.secure_url) && !referencedImages.has(resource.url)) {
              await cloudinary.api.delete_resources([resource.public_id]);
              deletedCount++;
            }
          }
          nextCursor = result.next_cursor;
        } while (nextCursor);
        console.log(`Cloudinary maintenance complete. Deleted ${deletedCount} orphaned images.`);
      }
    } catch (err) {
      console.error('Failed to run automated backup/maintenance:', err);
    }
  });
};

export default router;
