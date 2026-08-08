import { useState, useEffect } from 'react';
import { api, type Note } from '../lib/api';
import { Save, Loader2, Plus, Trash2, FileText } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

export default function GeneralNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Theme tracking
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setColorMode(isDark ? 'dark' : 'light');

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const currentlyDark = document.documentElement.classList.contains('dark');
          setColorMode(currentlyDark ? 'dark' : 'light');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Mobile split pane mode tracking
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
      if (data.length > 0 && !activeNoteId) {
        selectNote(data[0]);
      } else if (data.length === 0) {
        handleNewNote();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const selectNote = (note: Note) => {
    setActiveNoteId(note._id!);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleNewNote = () => {
    setActiveNoteId(null);
    setTitle('Untitled Note');
    setContent('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeNoteId) {
        await api.updateNote(activeNoteId, { title, content });
      } else {
        const newNote = await api.createNote({ title, content });
        setActiveNoteId(newNote._id!);
      }
      await fetchNotes();
    } catch (err) {
      console.error(err);
      alert('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this note?')) {
      try {
        await api.deleteNote(id);
        if (activeNoteId === id) {
          setActiveNoteId(null);
        }
        await fetchNotes();
      } catch (err) {
        console.error(err);
        alert('Failed to delete note');
      }
    }
  };

  if (loading) return <div className="text-center py-20 text-ink-muted">Loading notes...</div>;

  return (
    <div className="max-w-6xl mx-auto flex gap-6 h-[85vh]">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border border-border-subtle rounded-xl p-4 flex flex-col hidden md:flex shrink-0 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold uppercase tracking-wider text-sm">My Notes</h2>
          <button onClick={handleNewNote} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {notes.map(note => (
            <div 
              key={note._id}
              onClick={() => selectNote(note)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activeNoteId === note._id ? 'bg-ink/5 border border-ink/10 font-medium' : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-ink-muted shrink-0" />
                <span className="truncate text-sm">{note.title || 'Untitled Note'}</span>
              </div>
              <button onClick={(e) => handleDelete(note._id!, e)} className="text-ink-muted/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-ink-muted text-center pt-4">No notes found.</p>}
        </div>
      </div>

      {/* Editor Main */}
      <div className="flex-1 flex flex-col min-w-0 bg-paper">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold tracking-tight bg-transparent border-0 border-b border-transparent hover:border-border-subtle focus:border-ink focus:ring-0 px-0 py-1 transition-colors w-full sm:w-1/2"
            placeholder="Note Title"
          />
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="border border-green-600/30 text-green-700 dark:text-green-400 px-6 py-2 rounded-md font-medium hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            Save Note
          </button>
        </div>

        <div className="flex-1 border border-border-subtle rounded-lg overflow-hidden shadow-sm" data-color-mode={colorMode}>
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height="100%"
            preview={isMobile ? 'edit' : 'live'}
            className="h-full"
            textareaProps={{ placeholder: 'Start typing in Markdown...' }}
          />
        </div>
      </div>
    </div>
  );
}
