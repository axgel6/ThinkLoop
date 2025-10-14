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
    [note.id, updateNoteContent]
  );
  const onTitleChange = useCallback(
    (t) => updateNoteTitle(note.id, t),
    [note.id, updateNoteTitle]
  );
  const onFontChange = useCallback(
    (f) => updateNoteFont(note.id, f),
    [note.id, updateNoteFont]
  );
  const onFontSizeChange = useCallback(
    (sz) => updateNoteFontSize(note.id, sz),
    [note.id, updateNoteFontSize]
  );
  const onThemeChange = useCallback(
    (th) => updateNoteTheme(note.id, th),
    [note.id, updateNoteTheme]
  );
  const onRemove = useCallback(
    () => handleRemove(note.id),
    [note.id, handleRemove]
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
  // Load notes from localStorage (each note: { id, content }).
  // If nothing is stored, start with empty array to show empty state.
  const [notes, setNotes] = useState(() => {
    try {
      const raw = localStorage.getItem("notes");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [];
      }
      // normalize entries to ensure id, content, timestamps and fontSize exist
      return parsed.map((n) => ({
        id: n.id ?? Date.now(),
        content: n.content ?? "",
        title: n.title ?? "",
        // default per-note font & theme if missing
        font: n.font ?? "inter",
        // default font size in pixels
        fontSize: n.fontSize ?? 16,
        theme: n.theme ?? "default",
        // timestamps: createdAt and lastModified (backwards-compatible with older saved notes)
        createdAt:
          n.createdAt ?? n.createdAt === 0 ? n.createdAt : n.id ?? Date.now(),
        lastModified:
          n.lastModified ?? n.updatedAt ?? n.createdAt ?? Date.now(),
      }));
    } catch (e) {
      return [];
    }
  });

  const handleNewNote = useCallback(() => {
    setNotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: "",
        title: "",
        font: "inter",
        fontSize: 16,
        theme: "default",
        createdAt: Date.now(),
        lastModified: Date.now(),
      },
    ]);
  }, []);

  const handleRemove = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNoteContent = useCallback((id, content) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, content, lastModified: Date.now() } : n
      )
    );
  }, []);

  const updateNoteTitle = useCallback((id, title) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, title, lastModified: Date.now() } : n
      )
    );
  }, []);

  const updateNoteFont = useCallback((id, font) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, font, lastModified: Date.now() } : n
      )
    );
  }, []);

  const updateNoteTheme = useCallback((id, theme) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, theme, lastModified: Date.now() } : n
      )
    );
  }, []);

  const updateNoteFontSize = useCallback((id, fontSize) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, fontSize: Number(fontSize), lastModified: Date.now() }
          : n
      )
    );
  }, []);

  // persist notes to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("notes", JSON.stringify(notes));
    } catch (e) {
      // ignore quota errors for now
      // Could surface a warning to the user in future
    }
  }, [notes]);

  return (
    <>
      {notes.length === 0 ? (
        <div className="empty-state">
          <p>No notes yet</p>
          <p className="empty-state-subtitle">
            Click "New Note" below to begin
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
          New Note
        </Button>
      </div>
    </>
  );
};

export default NotesHandler;
