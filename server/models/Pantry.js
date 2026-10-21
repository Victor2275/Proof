import mongoose from 'mongoose';
import { recordFields } from './record.js';

const pantrySchema = new mongoose.Schema({
  ...recordFields,
  name: { type: String, required: true },
}, { timestamps: true });

export const Pantry = mongoose.model('Pantry', pantrySchema);
