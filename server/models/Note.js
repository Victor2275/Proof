import mongoose from 'mongoose';
import { recordFields } from './record.js';

const NoteSchema = new mongoose.Schema({
  ...recordFields,
  title: { type: String, required: true },
  content: { type: String, default: '' }
}, { timestamps: true });

export const Note = mongoose.model('Note', NoteSchema);
