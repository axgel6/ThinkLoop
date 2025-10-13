import React, { useState, useEffect } from "react";
import TextField from "./TextField";
import "./NotesHandler.css";
import Button from "./Button";

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
      // normalize entries to ensure id and content exist
      return parsed.map((n) => ({ id: n.id ?? Date.now(), content: n.content ?? "", title: n.title ?? "" }));
    } catch (e) {
      return [];
    }
  });

  const handleNewNote = () => {
    setNotes((prev) => [...prev, { id: Date.now(), content: "", title: "" }]);
  };

  const handleRemove = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const updateNoteContent = (id, content) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
  };

  const updateNoteTitle = (id, title) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
  };

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
          <p className="empty-state-subtitle">Click "New Note" below to begin</p>
        </div>
      ) : (
        notes.map((n) => (
          <div key={n.id} className="note-item">
            <TextField
              value={n.content}
              title={n.title}
              onChange={(val) => updateNoteContent(n.id, val)}
              onTitleChange={(t) => updateNoteTitle(n.id, t)}
              onRemove={() => handleRemove(n.id)}
            />
          </div>
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