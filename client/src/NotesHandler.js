import React, { useState, useEffect, useCallback } from "react";
import TextField from "./TextField";
import "./NotesHandler.css";
import Button from "./Button";

// Stable NoteItem component defined outside the parent to avoid remounts on each render.
// Defining a memoized component inside a parent recreates its type every render,
// causing React to unmount/remount children (losing focus in editors).
const NoteItem = React.memo(function NoteItem({
  note,
  updateNoteContent,
  updateNoteTitle,
  updateNoteFont,
  updateNoteTheme,
  updateNoteFontSize,
  handleRemove,
}) {
  const onChange = useCallback(
    (val) => updateNoteContent(note.id, val),
    [note.id, updateNoteContent],
  );
  const onTitleChange = useCallback(
    (t) => updateNoteTitle(note.id, t),
    [note.id, updateNoteTitle],
  );
  const onFontChange = useCallback(
    (f) => updateNoteFont(note.id, f),
    [note.id, updateNoteFont],
  );
  const onFontSizeChange = useCallback(
    (sz) => updateNoteFontSize(note.id, sz),
    [note.id, updateNoteFontSize],
  );
  const onThemeChange = useCallback(
    (th) => updateNoteTheme(note.id, th),
    [note.id, updateNoteTheme],
  );
  const onRemove = useCallback(
    () => handleRemove(note.id),
    [note.id, handleRemove],
  );

  return (
    <div className="note-item">
      <TextField
        value={note.content}
        title={note.title}
        font={note.font}
        fontSize={note.fontSize}
        theme={note.theme}
        createdAt={note.createdAt}
        lastModified={note.lastModified}
        onChange={onChange}
        onTitleChange={onTitleChange}
        onFontChange={onFontChange}
        onFontSizeChange={onFontSizeChange}
        onThemeChange={onThemeChange}
        onRemove={onRemove}
      />
    </div>
  );
});

const NotesHandler = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("notes");
      if (raw) {
        const parsed = JSON.parse(raw);
        setNotes(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNewNote = useCallback(() => {
    const newNote = {
      id: Date.now(),
      content: "",
      title: "",
      font: "inter",
      fontSize: 16,
      theme: "default",
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
  }, []);

  const handleRemove = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNoteContent = useCallback((id, content) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, content, lastModified: Date.now() } : n,
      ),
    );
  }, []);

  const updateNoteTitle = useCallback((id, title) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, title, lastModified: Date.now() } : n,
      ),
    );
  }, []);

  const updateNoteFont = useCallback((id, font) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, font, lastModified: Date.now() } : n,
      ),
    );
  }, []);

  const updateNoteTheme = useCallback((id, theme) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, theme, lastModified: Date.now() } : n,
      ),
    );
  }, []);

  const updateNoteFontSize = useCallback((id, fontSize) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, fontSize: Number(fontSize), lastModified: Date.now() }
          : n,
      ),
    );
  }, []);

  // Persist to localStorage as backup
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem("notes", JSON.stringify(notes));
      } catch (e) {
        // ignore quota errors
      }
    }
  }, [notes, loading]);

  return (
    <>
      {notes.length === 0 ? (
        <div className="empty-state">
          <p>No notes yet</p>
          <p className="empty-state-subtitle">
            Click "New Note" below to begin
            <br />
            All notes are saved locally in your browser.
            <br /> For live sync and backups, visit{" "}
            <a href="https://think-loop-client.onrender.com">ThinkLoop Live</a>.
          </p>
        </div>
      ) : (
        notes.map((n) => (
          <NoteItem
            key={n.id}
            note={n}
            updateNoteContent={updateNoteContent}
            updateNoteTitle={updateNoteTitle}
            updateNoteFont={updateNoteFont}
            updateNoteTheme={updateNoteTheme}
            updateNoteFontSize={updateNoteFontSize}
            handleRemove={handleRemove}
          />
        ))
      )}

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <Button className="primary" onClick={handleNewNote}>
          {" "}
          <svg
            width="15"
            height="15"
            viewBox="0 0 50 50"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="25"
              y1="5"
              x2="25"
              y2="45"
              stroke="var(--fg, white)"
              stroke-width="10"
            />
            <line
              x1="5"
              y1="25"
              x2="45"
              y2="25"
              stroke="var(--fg, white)"
              stroke-width="10"
            />
          </svg>
        </Button>
      </div>
    </>
  );
};

export default NotesHandler;
