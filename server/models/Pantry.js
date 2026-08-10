import mongoose from 'mongoose';

const pantrySchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Pantry = mongoose.model('Pantry', pantrySchema);
