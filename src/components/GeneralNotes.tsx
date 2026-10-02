import { useState, useEffect, useCallback } from 'react';
import { api, type Note } from '../lib/api';
import { Plus, Trash2, List } from 'lucide-react';
import { Panel, Button, Field, TextArea, Sheet, Skeleton, cn } from './ui';

/*
 * General notes.
 *
 * The markdown editor that used to live here is gone. It shipped its own
 * toolbar, its own split pane and its own colour system — a second design
 * system inside the faceplate — and it tracked the app's theme by watching the
 * document element with a MutationObserver to keep the two in step. A note in
 * this product is a thing you wrote at the bench, not a document you publish,
 * so it is a panel and a textarea.
 *
 * The notes list was `hidden md:flex`, which meant a phone could see whichever
 * note happened to load first and reach no other. On a phone the same list is
 * a bottom sheet now.
 */

export default function GeneralNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  // What is on screen versus what is stored. The head LED reports it, so the
  // question "did that save?" is answered by the panel rather than by a
  // disappearing toast.
  const [saved, setSaved] = useState({ title: '', content: '' });
  const dirty = title !== saved.title || content !== saved.content;

  const selectNote = useCallback((note: Note) => {
    setActiveNoteId(note._id!);
    setTitle(note.title);
    setContent(note.content);
    setSaved({ title: note.title, content: note.content });
    setListOpen(false);
  }, []);

  const startNewNote = useCallback(() => {
    setActiveNoteId(null);
    setTitle('');
    setContent('');
    setSaved({ title: '', content: '' });
    setListOpen(false);
  }, []);

  const fetchNotes = useCallback(
    async (select?: 'first') => {
      try {
        const data = await api.getNotes();
        setNotes(data);
        if (select === 'first') {
          if (data.length > 0) selectNote(data[0]);
          else startNewNote();
        }
      } catch {
        setError('Could not reach the notebook. Your unsaved text is still here.');
      } finally {
        setLoading(false);
      }
    },
    [selectNote, startNewNote],
  );

  useEffect(() => {
    fetchNotes('first');
  }, [fetchNotes]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) return;
    setSaving(true);
    setError('');
    const next = { title: title.trim() || 'Untitled note', content };
    try {
      if (activeNoteId) {
        await api.updateNote(activeNoteId, next);
      } else {
        const created = await api.createNote(next);
        setActiveNoteId(created._id!);
      }
      setTitle(next.title);
      setSaved(next);
      await fetchNotes();
    } catch {
      setError('Could not save. Check the connection and try again — nothing has been lost.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const note = pendingDelete;
    if (!note?._id) return;
    setPendingDelete(null);
    try {
      await api.deleteNote(note._id);
      if (activeNoteId === note._id) startNewNote();
      await fetchNotes();
    } catch {
      setError('Could not delete that note.');
    }
  };

  const noteList = (
    <div className="divide-y divide-rule">
      {notes.map((note) => {
        const active = activeNoteId === note._id;
        return (
          <div key={note._id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => selectNote(note)}
              aria-current={active ? 'true' : undefined}
              className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left"
            >
              {/* The same lamp the pantry uses for "you have this". */}
              <span
                className={cn('h-2 w-2 shrink-0', active ? 'bg-ink' : 'bg-key-unlit')}
                aria-hidden="true"
              />
              <span className={cn('truncate text-sm', active ? 'text-ink' : 'text-ink-muted')}>
                {note.title || 'Untitled note'}
              </span>
            </button>
            <Button
              variant="ghost"
              onClick={() => setPendingDelete(note)}
              aria-label={`Delete ${note.title || 'Untitled note'}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      {notes.length === 0 ? (
        <p className="py-3 text-sm text-ink-muted">No notes yet. The one open is your first.</p>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl gap-6">
        <Skeleton className="hidden h-96 w-64 shrink-0 md:block" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-faceplate text-3xl leading-none text-ink sm:text-4xl">
            General Notes
          </h1>
          <p className="max-w-prose text-ink-muted">
            The bench notebook. Anything that is not a recipe — a starter's timing, an oven's
            true temperature, what to try next.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            className="md:hidden"
            icon={<List className="h-4 w-4" />}
            onClick={() => setListOpen(true)}
          >
            All notes
          </Button>
          <Button
            variant="secondary"
            icon={<Plus className="h-4 w-4" />}
            onClick={startNewNote}
          >
            New
          </Button>
        </div>
      </header>

      {error ? (
        <p className="mb-4 border border-fault bg-panel p-3 text-sm text-fault" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-6">
        <div className="hidden w-64 shrink-0 md:block">
          <Panel title={`Notes · ${notes.length}`} flush>
            <div className="px-4">{noteList}</div>
          </Panel>
        </div>

        <Panel
          className="min-w-0 flex-1"
          title={activeNoteId ? 'Note' : 'New note'}
          lit={dirty}
          actions={
            // A control appears when there is something to do with it. With
            // nothing unsaved the panel reports rather than offering a button
            // that does nothing — a disabled control is still a control.
            dirty || saving ? (
              <Button variant="secondary" size="sm" onClick={handleSave} busy={saving}>
                {saving ? 'Saving' : 'Save'}
              </Button>
            ) : (
              <span className="label-silkscreen pr-1">Saved</span>
            )
          }
        >
          <div className="flex flex-col gap-4">
            <Field
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Starter timing"
            />
            <TextArea
              label="Note"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              placeholder="Fed at 0700. Doubled by 1130, so about four and a half hours at 22C."
            />
          </div>
        </Panel>
      </div>

      <Sheet
        open={listOpen}
        onClose={() => setListOpen(false)}
        title={`Notes · ${notes.length}`}
        placement="bottom"
      >
        {noteList}
      </Sheet>

      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete note"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Delete “{pendingDelete?.title || 'Untitled note'}”? This cannot be undone.
        </p>
      </Sheet>
    </div>
  );
}
