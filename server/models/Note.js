import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' }
}, { timestamps: true });

export const Note = mongoose.model('Note', NoteSchema);
