import { Router, Request, Response } from 'express';
import { Note } from '../models/Note.js';

const router = Router();

// GET /api/notes
router.get('/', async (_req: Request, res: Response) => {
  try {
    const notes = await Note.find().sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notes
router.post('/', async (req: Request, res: Response) => {
  try {
    const note = new Note(req.body);
    await note.save();
    res.status(201).json(note);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/notes/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
