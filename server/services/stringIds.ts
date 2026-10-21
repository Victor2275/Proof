/*
 * Rewrites pre-Phase-1 records from Mongo ObjectIds to string ids.
 *
 * The device minted its own copy of each record's id from the ObjectId's hex
 * string when the library was copied over (src/lib/repo/legacy.ts), so the
 * hex string is the id the server keeps too: a record and its device copy, and
 * a bake log and the recipe it points at, keep matching.
 *
 * An _id cannot be changed in place, so each record is written again under its
 * new id and the old document removed. The write is an upsert keyed on the new
 * id, so a run interrupted between the two steps is finished by running it
 * again, never doubled.
 */
import mongoose from 'mongoose';
import { Recipe } from '../models/Recipe.js';
import { BakeLog } from '../models/BakeLog.js';
import { Note } from '../models/Note.js';
import { Pantry } from '../models/Pantry.js';

type Doc = Record<string, unknown> & { _id: unknown };

export const MIGRATED_MODELS = [Recipe, BakeLog, Note, Pantry];

const asId = (value: unknown): unknown =>
  value instanceof mongoose.Types.ObjectId ? value.toHexString() : value;

/** The record as it should be stored: string ids throughout, and the sync fields present. */
export function withStringIds(doc: Doc, ownerId: string | null): Doc {
  const next: Doc = { ...doc, _id: asId(doc._id) };
  if ('recipeId' in doc) next.recipeId = asId(doc.recipeId);
  if (Array.isArray(doc.instructionLinks)) {
    next.instructionLinks = (doc.instructionLinks as Record<string, unknown>[]).map((link) => ({
      ...link,
      recipeId: asId(link.recipeId),
    }));
  }
  next.deletedAt = doc.deletedAt ?? null;
  next.ownerId = doc.ownerId ?? ownerId;
  if (!doc.updatedAt && doc.createdAt) next.updatedAt = doc.createdAt;
  return next;
}

export interface MigrationReport {
  collection: string;
  total: number;
  rewritten: number;
  updated: number;
}

/** Plans (dryRun) or applies the migration to every cookbook collection. */
export async function migrateToStringIds({ dryRun = true, ownerId = null as string | null } = {}) {
  const reports: MigrationReport[] = [];
  for (const Model of MIGRATED_MODELS) {
    const collection = mongoose.connection.collection(Model.collection.name);
    const docs = (await collection.find({}).toArray()) as unknown as Doc[];
    const report: MigrationReport = { collection: Model.collection.name, total: docs.length, rewritten: 0, updated: 0 };

    for (const doc of docs) {
      const next = withStringIds(doc, ownerId);
      const idChanged = doc._id instanceof mongoose.Types.ObjectId;
      const changed = idChanged || JSON.stringify(next) !== JSON.stringify(doc);
      if (!changed) continue;
      if (idChanged) report.rewritten++;
      else report.updated++;
      if (dryRun) continue;

      await collection.replaceOne({ _id: next._id as never }, next as never, { upsert: true });
      if (idChanged) await collection.deleteOne({ _id: doc._id as never });
    }
    reports.push(report);
  }
  return reports;
}
