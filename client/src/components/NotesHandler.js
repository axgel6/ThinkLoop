import React, { useState, useEffect, useCallback, useRef } from "react";
import { createWorker } from "tesseract.js";
import TextField from "./TextField";
import "./NotesHandler.css";
import "./ocr-styles.css";
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
  isPinned,
  onTogglePin,
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
        isPinned={isPinned}
        onTogglePin={() => onTogglePin(note.id)}
      />
    </div>
  );
});

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const NotesHandler = ({ currentUser }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const pinnedStorageKey = currentUser
    ? `pinnedNotes:${currentUser.id}`
    : "pinnedNotes:guest";
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(pinnedStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(pinnedStorageKey);
      setPinnedIds(raw ? JSON.parse(raw) : []);
    } catch (e) {
      setPinnedIds([]);
    }
  }, [pinnedStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(pinnedStorageKey, JSON.stringify(pinnedIds));
    } catch (e) {
      // ignore quota errors
    }
  }, [pinnedIds, pinnedStorageKey]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
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
  }, [currentUser]);

  // Fetch notes from server on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleRefresh = useCallback(() => {
    fetchNotes();
  }, [fetchNotes]);

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

      if (!response.ok) throw new Error("Failed to create note");
      const createdNote = await response.json();
      setNotes((prev) => [createdNote, ...prev]);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [currentUser]);

  const workerRef = useRef(null);

  const handleOCRImageSelect = useCallback(async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    // Validate file type and size (max 10MB)
    if (!file.type.startsWith("image/")) {
      setOcrError("Please select a valid image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrError("Image file is too large. Maximum size is 10MB.");
      return;
    }

    setOcrError("");
    setOcrLoading(true);
    setOcrText("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const imageData = event.target?.result;
          setOcrImage(imageData);

          // Create Tesseract worker if not already created
          if (!workerRef.current) {
            workerRef.current = await createWorker();
          }

          // Extract text using Tesseract.js
          const result = await workerRef.current.recognize(imageData);

          setOcrText(result.data.text || "");
        } catch (error) {
          console.error("OCR Error:", error);
          setOcrError(
            "Failed to extract text from image. Please try another image.",
          );
        } finally {
          setOcrLoading(false);
        }
      };
      reader.onerror = () => {
        setOcrError("Failed to read file");
        setOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File read error:", error);
      setOcrError("Failed to read file");
      setOcrLoading(false);
    }
  }, []);

  const handleOCRCancel = useCallback(() => {
    setShowOCRModal(false);
    setOcrImage(null);
    setOcrText("");
    setOcrError("");
  }, []);

  const handleOCRCreateNote = useCallback(async () => {
    const trimmedText = ocrText.trim();
    if (!trimmedText) {
      setOcrError("No text to extract");
      return;
    }

    setOcrLoading(true);
    try {
      const newNote = {
        content: trimmedText,
        title: `OCR Scan ${new Date().toLocaleString()}`,
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
        handleOCRCancel();
        return;
      }

      // If logged in, create on server
      const response = await fetch(`${API_URL}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });

      if (!response.ok) throw new Error("Failed to create note");

      const createdNote = await response.json();
      setNotes((prev) => [createdNote, ...prev]);
      handleOCRCancel();
    } catch (error) {
      console.error("Failed to create note from OCR:", error);
      setOcrError(
        error instanceof Error ? error.message : "Failed to create note",
      );
    } finally {
      setOcrLoading(false);
    }
  }, [ocrText, currentUser, handleOCRCancel]);

  // Cleanup OCR worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {
          // Worker cleanup error, ignore
        });
      }
    };
  }, []);

  const handleRemove = useCallback(
    async (id) => {
      const stringId = String(id);
      setPinnedIds((prev) => prev.filter((p) => p !== stringId));
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

  const handleTogglePin = useCallback(
    (id) => {
      const stringId = String(id);
      const isPinned = pinnedIds.includes(stringId);

      // Update local state
      setPinnedIds((prev) =>
        isPinned ? prev.filter((p) => p !== stringId) : [stringId, ...prev],
      );

      // Only update server if logged in
      if (!currentUser) return;

      try {
        fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPinned: !isPinned }),
        });
      } catch (error) {
        console.error("Failed to update pin status:", error);
      }
    },
    [currentUser, pinnedIds],
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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleNotes = normalizedQuery
    ? notes.filter((note) => {
        const title = (note.title || "").toLowerCase();
        const content = (note.content || "").toLowerCase();
        return (
          title.includes(normalizedQuery) || content.includes(normalizedQuery)
        );
      })
    : notes;

  // Sort to show pinned notes at the top
  const sortedNotes = [...visibleNotes].sort((a, b) => {
    const aIsPinned = pinnedIds.includes(String(a.id)) ? 1 : 0;
    const bIsPinned = pinnedIds.includes(String(b.id)) ? 1 : 0;
    return bIsPinned - aIsPinned;
  });

  const hasSearch = normalizedQuery.length > 0;

  return (
    <>
      <div className="notes-toolbar">
        <div className="notes-toolbar-left">
          <input
            className="notes-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
          />
        </div>
        <div className="notes-toolbar-right">
          <Button
            onClick={() => setShowOCRModal(true)}
            className="icon-button"
            aria-label="Scan image"
            title="Scan image"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </Button>
          <Button
            onClick={handleNewNote}
            className="icon-button"
            aria-label="New note"
            title="New note"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 50 50"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
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
          <Button
            onClick={handleRefresh}
            className="icon-button"
            aria-label="Refresh notes"
            title="Refresh notes"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </Button>
        </div>
      </div>

      {visibleNotes.length === 0 ? (
        <div className="empty-state">
          <p>{hasSearch ? "No matching notes" : "No notes yet"}</p>
          <p className="empty-state-subtitle">
            {hasSearch ? "Try a different search" : 'Click "New Note" to begin'}
          </p>
        </div>
      ) : (
        sortedNotes.map((n) => (
          <NoteItem
            key={n.id}
            note={n}
            updateNoteContent={updateNoteContent}
            updateNoteTitle={updateNoteTitle}
            updateNoteFont={updateNoteFont}
            updateNoteTheme={updateNoteTheme}
            updateNoteFontSize={updateNoteFontSize}
            handleRemove={handleRemove}
            isPinned={pinnedIds.includes(String(n.id))}
            onTogglePin={handleTogglePin}
          />
        ))
      )}

      {showOCRModal && (
        <div className="ocr-modal-overlay">
          <div className="ocr-modal-popup">
            <div className="ocr-modal-header">
              <h2>Scan Image to Text</h2>
              <button
                className="ocr-modal-close"
                onClick={handleOCRCancel}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="ocr-modal-content">
              {!ocrText ? (
                <div className="ocr-upload-section">
                  <label className="ocr-upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOCRImageSelect}
                      disabled={ocrLoading}
                      style={{ display: "none" }}
                    />
                    <div className="ocr-upload-box">
                      {ocrLoading ? (
                        <div className="ocr-loading">
                          <div className="ocr-spinner"></div>
                          <p>Extracting text...</p>
                        </div>
                      ) : (
                        <>
                          <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <p>Click to upload image</p>
                          <p className="ocr-upload-hint">or drag and drop</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                <div className="ocr-preview-section">
                  {ocrImage && (
                    <div className="ocr-image-preview">
                      <img src={ocrImage} alt="OCR Source" />
                    </div>
                  )}
                  <div className="ocr-text-preview">
                    <label htmlFor="ocr-text-area">Extracted Text:</label>
                    <textarea
                      id="ocr-text-area"
                      className="ocr-text-area"
                      value={ocrText}
                      onChange={(e) => setOcrText(e.target.value)}
                      placeholder="Extracted text will appear here"
                    />
                  </div>
                </div>
              )}

              {ocrError && <div className="ocr-error">{ocrError}</div>}
            </div>

            <div className="ocr-modal-footer">
              <Button onClick={handleOCRCancel} className="ocr-button-cancel">
                Cancel
              </Button>
              {ocrText && (
                <Button
                  onClick={handleOCRCreateNote}
                  className="ocr-button-create"
                  disabled={ocrLoading}
                >
                  Create Note
                </Button>
              )}
              {!ocrText && (
                <Button
                  onClick={() =>
                    document.querySelector('input[type="file"]')?.click()
                  }
                  className="ocr-button-upload"
                  disabled={ocrLoading}
                >
                  Choose Image
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotesHandler;
