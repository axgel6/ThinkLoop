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

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const NotesHandler = ({ currentUser }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notes from server on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        // If logged out, load local notes from localStorage
        if (!currentUser) {
          try {
            const localNotes = localStorage.getItem("localNotes");
            if (localNotes) {
              setNotes(JSON.parse(localNotes));
            } else {
              setNotes([]);
            }
          } catch (e) {
            setNotes([]);
          }
          setLoading(false);
          return;
        }

        // If logged in, fetch from server
        const url = `${API_URL}/notes?userId=${currentUser.id}`;
        const response = await fetch(url);
        if (response.ok) {
          const serverNotes = await response.json();

          // Check if there are local notes to merge
          const localNotes = localStorage.getItem("localNotes");
          if (localNotes) {
            const parsedLocalNotes = JSON.parse(localNotes);

            // Upload each local note to the server
            for (const localNote of parsedLocalNotes) {
              try {
                const noteToUpload = {
                  ...localNote,
                  userId: currentUser.id,
                };
                delete noteToUpload.id; // Remove local ID

                await fetch(`${API_URL}/notes`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(noteToUpload),
                });
              } catch (error) {
                console.error("Failed to upload local note:", error);
              }
            }

            // Clear local notes after uploading
            localStorage.removeItem("localNotes");

            // Re-fetch to get all notes including newly uploaded ones
            const refreshResponse = await fetch(url);
            if (refreshResponse.ok) {
              const allNotes = await refreshResponse.json();
              setNotes(allNotes);
            } else {
              setNotes(serverNotes);
            }
          } else {
            setNotes(serverNotes);
          }
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error);
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [currentUser]);

  // Persist local notes to localStorage when logged out
  useEffect(() => {
    if (!loading && !currentUser && notes.length >= 0) {
      try {
        localStorage.setItem("localNotes", JSON.stringify(notes));
      } catch (e) {
        console.error("Failed to save local notes:", e);
      }
    }
  }, [notes, currentUser, loading]);

  const handleNewNote = useCallback(async () => {
    const newNote = {
      content: "",
      title: "",
      font: "inter",
      fontSize: 16,
      theme: "default",
      userId: currentUser ? currentUser.id : null,
    };

    // If logged out, only create locally
    if (!currentUser) {
      const localNote = {
        ...newNote,
        id: Date.now().toString(),
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
      setNotes((prev) => [localNote, ...prev]);
      return;
    }

    // If logged in, create on server
    try {
      const response = await fetch(`${API_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });

      if (response.ok) {
        const createdNote = await response.json();
        setNotes((prev) => [createdNote, ...prev]);
      }
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [currentUser]);

  const handleRemove = useCallback(
    async (id) => {
      // Always delete locally
      setNotes((prev) => prev.filter((n) => n.id !== id));

      // Only delete from server if logged in
      if (!currentUser) return;

      try {
        await fetch(`${API_URL}/notes/${id}`, { method: "DELETE" });
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    },
    [currentUser],
  );

  const updateNoteContent = useCallback(
    async (id, content) => {
      // Always update locally
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, content, lastModified: Date.now() } : n,
        ),
      );

      // Only update server if logged in
      if (!currentUser) return;

      try {
        await fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (error) {
        console.error("Failed to update note content:", error);
      }
    },
    [currentUser],
  );

  const updateNoteTitle = useCallback(
    async (id, title) => {
      // Always update locally
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, title, lastModified: Date.now() } : n,
        ),
      );

      // Only update server if logged in
      if (!currentUser) return;

      try {
        await fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } catch (error) {
        console.error("Failed to update note title:", error);
      }
    },
    [currentUser],
  );

  const updateNoteFont = useCallback(
    async (id, font) => {
      // Always update locally
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, font, lastModified: Date.now() } : n,
        ),
      );

      // Only update server if logged in
      if (!currentUser) return;

      try {
        await fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ font }),
        });
      } catch (error) {
        console.error("Failed to update note font:", error);
      }
    },
    [currentUser],
  );

  const updateNoteTheme = useCallback(
    async (id, theme) => {
      // Always update locally
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, theme, lastModified: Date.now() } : n,
        ),
      );

      // Only update server if logged in
      if (!currentUser) return;

      try {
        await fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme }),
        });
      } catch (error) {
        console.error("Failed to update note theme:", error);
      }
    },
    [currentUser],
  );

  const updateNoteFontSize = useCallback(
    async (id, fontSize) => {
      // Always update locally
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, fontSize: Number(fontSize), lastModified: Date.now() }
            : n,
        ),
      );

      // Only update server if logged in
      if (!currentUser) return;

      try {
        await fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fontSize: Number(fontSize) }),
        });
      } catch (error) {
        console.error("Failed to update note font size:", error);
      }
    },
    [currentUser],
  );

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
              strokeWidth="10"
            />
            <line
              x1="5"
              y1="25"
              x2="45"
              y2="25"
              stroke="var(--fg, white)"
              strokeWidth="10"
            />
          </svg>
        </Button>
      </div>
    </>
  );
};

export default NotesHandler;
