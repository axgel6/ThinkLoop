import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createWorker } from "tesseract.js";
import TextField from "./TextField";
import "./NotesHandler.css";
import "./ocr-styles.css";
import Button from "./Button";
import Dropdown from "./Dropdown";
import FolderSidebar from "./FolderSidebar";
import "./FolderSidebar.css";

const SORT_OPTIONS = [
  { id: "updated-desc", label: "Last updated (newest)" },
  { id: "updated-asc", label: "Last updated (oldest)" },
  { id: "created-desc", label: "Created (newest)" },
  { id: "created-asc", label: "Created (oldest)" },
  { id: "title-asc", label: "Title (A-Z)" },
  { id: "title-desc", label: "Title (Z-A)" },
];

const NOTE_TYPE_OPTIONS = [
  { id: "all", label: "All types" },
  { id: "text", label: "Notes" },
  { id: "code", label: "Code" },
];

const TRASH_VIEW_ID = "__recently_deleted__";
const AUTO_DELETE_AFTER_MS = 10 * 24 * 60 * 60 * 1000;

// Stable NoteItem component defined outside the parent to avoid remounts on each render.
// Defining a memoized component inside a parent recreates its type every render,
// causing React to unmount/remount children (losing focus in editors).
const NoteItem = React.memo(function NoteItem({
  note,
  updateNote,
  commitNoteEdits,
  handleRemove,
  isPinned,
  onTogglePin,
  folders,
  onMoveNote,
  isEditing,
  onRequestEdit,
  onExitEdit,
}) {
  const onChange = useCallback(
    (val) => updateNote(note.id, { content: val }, { commit: false }),
    [note.id, updateNote],
  );
  const onTitleChange = useCallback(
    (t) => updateNote(note.id, { title: t }, { commit: false }),
    [note.id, updateNote],
  );
  const onFontChange = useCallback(
    (f) => updateNote(note.id, { font: f }),
    [note.id, updateNote],
  );
  const onFontSizeChange = useCallback(
    (sz) => updateNote(note.id, { fontSize: Number(sz) }),
    [note.id, updateNote],
  );
  const onThemeChange = useCallback(
    (th) => updateNote(note.id, { theme: th }),
    [note.id, updateNote],
  );
  const onLanguageChange = useCallback(
    (lang) => updateNote(note.id, { language: lang }),
    [note.id, updateNote],
  );
  const onCodeColorThemeChange = useCallback(
    (codeColorTheme) => updateNote(note.id, { codeColorTheme }),
    [note.id, updateNote],
  );
  const onShowLineNumbersChange = useCallback(
    (showLineNumbers) => updateNote(note.id, { showLineNumbers }),
    [note.id, updateNote],
  );
  const onRemove = useCallback(
    () => handleRemove(note.id),
    [note.id, handleRemove],
  );

  const handleMoveTo = useCallback(
    (folderId) => onMoveNote(note.id, folderId),
    [note.id, onMoveNote],
  );

  return (
    <div className={`note-item${isEditing ? " note-item--editing" : ""}`}>
      <TextField
        value={note.content}
        title={note.title}
        font={note.font}
        fontSize={note.fontSize}
        theme={note.theme}
        noteType={note.noteType || "text"}
        language={note.language || "javascript"}
        codeColorTheme={note.codeColorTheme || "night-owl"}
        showLineNumbers={Boolean(note.showLineNumbers)}
        createdAt={note.createdAt}
        lastModified={note.lastModified}
        noteId={note.id}
        onChange={onChange}
        onTitleChange={onTitleChange}
        onCommitEdit={() => commitNoteEdits(note.id)}
        onFontChange={onFontChange}
        onFontSizeChange={onFontSizeChange}
        onThemeChange={onThemeChange}
        onLanguageChange={onLanguageChange}
        onCodeColorThemeChange={onCodeColorThemeChange}
        onShowLineNumbersChange={onShowLineNumbersChange}
        onRemove={onRemove}
        isPinned={isPinned}
        onTogglePin={() => onTogglePin(note.id)}
        isEditing={isEditing}
        onRequestEdit={onRequestEdit}
        onExitEdit={onExitEdit}
        folders={folders}
        folderId={note.folderId}
        onMoveNote={handleMoveTo}
      />
    </div>
  );
});

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const NotesHandler = ({ currentUser }) => {
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updated-desc");
  const [noteTypeFilter, setNoteTypeFilter] = useState("all");
  const [notesViewMode, setNotesViewMode] = useState("cards");
  const [focusedNoteId, setFocusedNoteId] = useState(null);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState(null);
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState(null);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const isFetchingNotesRef = useRef(false);
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

  const fetchNotes = useCallback(
    async ({ silent = false } = {}) => {
      if (isFetchingNotesRef.current) return;
      isFetchingNotesRef.current = true;
      if (!silent) setLoading(true);
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
        const url = `${API_URL}/notes?userId=${currentUser.id}&includeDeleted=true`;
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
        isFetchingNotesRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [currentUser],
  );

  // Fetch notes from server on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Auto refresh notes efficiently: on focus/visibility regain and periodic silent sync.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") return;
      fetchNotes({ silent: true });
    };

    const intervalId = window.setInterval(refreshIfVisible, 45000);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [fetchNotes]);

  // Fetch folders when logged in
  const fetchFolders = useCallback(async () => {
    if (!currentUser) {
      setFolders([]);
      return;
    }
    try {
      const response = await fetch(
        `${API_URL}/folders?userId=${currentUser.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleCreateFolder = useCallback(
    async (name, parentId) => {
      if (!currentUser) return;
      try {
        const response = await fetch(`${API_URL}/folders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            parentId: parentId || null,
            userId: currentUser.id,
          }),
        });
        if (response.ok) {
          const created = await response.json();
          setFolders((prev) => [...prev, created]);
        }
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
    },
    [currentUser],
  );

  const handleRenameFolder = useCallback(
    async (folderId, newName) => {
      if (!currentUser) return;
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: newName } : f)),
      );
      try {
        await fetch(`${API_URL}/folders/${folderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        });
      } catch (error) {
        console.error("Failed to rename folder:", error);
      }
    },
    [currentUser],
  );

  const handleDeleteFolder = useCallback(
    (folderId, folderName) => {
      if (!currentUser) return;
      setPendingDeleteFolder({ id: folderId, name: folderName });
    },
    [currentUser],
  );

  const handleMoveFolder = useCallback(
    async (folderId, newParentId) => {
      if (!currentUser) return;
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, parentId: newParentId } : f,
        ),
      );
      try {
        await fetch(`${API_URL}/folders/${folderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: newParentId }),
        });
      } catch (error) {
        console.error("Failed to move folder:", error);
      }
    },
    [currentUser],
  );

  const handleColorFolder = useCallback(
    async (folderId, color) => {
      if (!currentUser) return;
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, color } : f)),
      );
      try {
        await fetch(`${API_URL}/folders/${folderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color }),
        });
      } catch (error) {
        console.error("Failed to update folder color:", error);
      }
    },
    [currentUser],
  );

  const handleMoveNote = useCallback(
    async (noteId, folderId) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, folderId: folderId } : n)),
      );
      if (!currentUser) return;
      try {
        await fetch(`${API_URL}/notes/${noteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: folderId }),
        });
      } catch (error) {
        console.error("Failed to move note:", error);
      }
    },
    [currentUser],
  );

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

  useEffect(() => {
    const cutoff = Date.now() - AUTO_DELETE_AFTER_MS;
    const hasExpired = notes.some(
      (note) => note.deletedAt && Number(note.deletedAt) <= cutoff,
    );
    if (!hasExpired) return;

    setNotes((prev) =>
      prev.filter(
        (note) => !(note.deletedAt && Number(note.deletedAt) <= cutoff),
      ),
    );
  }, [notes]);

  useEffect(() => {
    if (focusedNoteId == null) return;
    const stillExists = notes.some(
      (n) => String(n.id) === String(focusedNoteId),
    );
    if (!stillExists) setFocusedNoteId(null);
  }, [focusedNoteId, notes]);

  const handleNewNote = useCallback(
    async (noteType = "text") => {
      const targetFolderId =
        selectedFolderId && selectedFolderId !== TRASH_VIEW_ID
          ? selectedFolderId
          : null;
      const newNote = {
        content: "",
        title: "",
        font: noteType === "code" ? "mono" : "inter",
        fontSize: 16,
        theme: "default",
        noteType,
        language: "python",
        codeColorTheme: noteType === "code" ? "night-owl" : undefined,
        showLineNumbers: noteType === "code" ? false : undefined,
        userId: currentUser ? currentUser.id : null,
        folderId: targetFolderId,
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
        setEditingNoteId(localNote.id);
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
        setEditingNoteId(createdNote.id);
      } catch (error) {
        console.error("Failed to create note:", error);
      }
    },
    [currentUser, selectedFolderId],
  );

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

  const handleRemove = useCallback((id) => {
    setPendingDeleteNoteId(id);
  }, []);

  const confirmDeleteNote = useCallback(async () => {
    if (!pendingDeleteNoteId) return;

    const id = pendingDeleteNoteId;
    const noteToDelete = notes.find((note) => String(note.id) === String(id));
    if (!noteToDelete) {
      setPendingDeleteNoteId(null);
      return;
    }

    const stringId = String(id);
    const isAlreadyDeleted = Boolean(noteToDelete.deletedAt);
    setPinnedIds((prev) => prev.filter((p) => p !== stringId));

    if (isAlreadyDeleted) {
      setNotes((prev) => prev.filter((n) => String(n.id) !== String(id)));
      if (focusedNoteId && String(focusedNoteId) === String(id)) {
        setFocusedNoteId(null);
      }
      if (editingNoteId && String(editingNoteId) === String(id)) {
        setEditingNoteId(null);
      }

      if (currentUser) {
        try {
          await fetch(`${API_URL}/notes/${id}`, { method: "DELETE" });
        } catch (error) {
          console.error("Failed to permanently delete note:", error);
        }
      }
      setPendingDeleteNoteId(null);
      return;
    }

    const deletedAt = Date.now();
    setNotes((prev) =>
      prev.map((n) =>
        String(n.id) === String(id)
          ? {
              ...n,
              isPinned: false,
              deletedAt,
              lastModified: deletedAt,
            }
          : n,
      ),
    );

    if (focusedNoteId && String(focusedNoteId) === String(id)) {
      setFocusedNoteId(null);
    }
    if (editingNoteId && String(editingNoteId) === String(id)) {
      setEditingNoteId(null);
    }

    if (currentUser) {
      try {
        await fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deletedAt, isPinned: false }),
        });
      } catch (error) {
        console.error("Failed to move note to recently deleted:", error);
      }
    }

    setPendingDeleteNoteId(null);
  }, [currentUser, editingNoteId, focusedNoteId, notes, pendingDeleteNoteId]);

  const handleRestoreNote = useCallback(
    async (id) => {
      const restoredAt = Date.now();
      setNotes((prev) =>
        prev.map((n) =>
          String(n.id) === String(id)
            ? {
                ...n,
                deletedAt: null,
                lastModified: restoredAt,
              }
            : n,
        ),
      );

      if (!currentUser) return;

      try {
        await fetch(`${API_URL}/notes/${id}/restore`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastModified: restoredAt }),
        });
      } catch (error) {
        console.error("Failed to restore note:", error);
      }
    },
    [currentUser],
  );

  const handleEmptyRecentlyDeleted = useCallback(async () => {
    const deletedIds = notes
      .filter((note) => note.deletedAt)
      .map((note) => String(note.id));

    if (deletedIds.length === 0) return;
    if (!window.confirm("Empty Recently Deleted? This cannot be undone.")) {
      return;
    }

    setNotes((prev) => prev.filter((note) => !note.deletedAt));
    setPinnedIds((prev) =>
      prev.filter((id) => !deletedIds.includes(String(id))),
    );

    if (!currentUser) return;

    try {
      await fetch(
        `${API_URL}/notes/recently-deleted?userId=${currentUser.id}`,
        {
          method: "DELETE",
        },
      );
    } catch (error) {
      console.error("Failed to empty recently deleted:", error);
    }
  }, [currentUser, notes]);

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

  const updateNote = useCallback(
    async (id, patch, options = {}) => {
      const commit = options.commit === true;
      const committedAt = Date.now();
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                ...patch,
                ...(commit ? { lastModified: committedAt } : {}),
              }
            : n,
        ),
      );

      if (!currentUser) return;

      const payload = {
        ...patch,
        ...(commit ? { lastModified: committedAt } : {}),
      };
      if (Object.keys(payload).length === 0) return;

      try {
        await fetch(`${API_URL}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.error("Failed to update note:", error);
      }
    },
    [currentUser],
  );

  const commitNoteEdits = useCallback(
    async (id) => {
      await updateNote(id, {}, { commit: true });
    },
    [updateNote],
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

  const activeNotes = useMemo(
    () => notes.filter((note) => !note.deletedAt),
    [notes],
  );

  const deletedNotes = useMemo(
    () => notes.filter((note) => Boolean(note.deletedAt)),
    [notes],
  );

  const confirmDeleteFolder = useCallback(async () => {
    if (!currentUser || !pendingDeleteFolder) return;

    const { id: folderId } = pendingDeleteFolder;

    const collectIds = (id) => {
      const ids = [id];
      folders
        .filter((f) => f.parentId === id)
        .forEach((child) => ids.push(...collectIds(child.id)));
      return ids;
    };

    const idsToRemove = collectIds(folderId);
    setFolders((prev) => prev.filter((f) => !idsToRemove.includes(f.id)));
    setNotes((prev) =>
      prev.map((n) =>
        idsToRemove.includes(n.folderId) ? { ...n, folderId: null } : n,
      ),
    );
    if (selectedFolderId && idsToRemove.includes(selectedFolderId)) {
      setSelectedFolderId(null);
    }

    try {
      await fetch(`${API_URL}/folders/${folderId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Failed to delete folder:", error);
    } finally {
      setPendingDeleteFolder(null);
    }
  }, [currentUser, folders, pendingDeleteFolder, selectedFolderId]);

  const cancelDeleteFolder = useCallback(() => {
    setPendingDeleteFolder(null);
  }, []);

  const folderChildrenByParent = useMemo(() => {
    const map = new Map();
    for (const folder of folders) {
      const parentKey =
        folder.parentId == null ? null : String(folder.parentId);
      const children = map.get(parentKey) || [];
      children.push(String(folder.id));
      map.set(parentKey, children);
    }
    return map;
  }, [folders]);

  const collectDescendantFolderIds = useCallback(
    (folderId) => {
      const rootId = String(folderId);
      const ids = new Set([rootId]);
      const queue = [rootId];

      while (queue.length > 0) {
        const current = queue.shift();
        const children = folderChildrenByParent.get(current) || [];
        for (const childId of children) {
          if (ids.has(childId)) continue;
          ids.add(childId);
          queue.push(childId);
        }
      }

      return ids;
    },
    [folderChildrenByParent],
  );

  const isTrashView = selectedFolderId === TRASH_VIEW_ID;

  const selectedFolderScopeIds = useMemo(() => {
    if (selectedFolderId == null || selectedFolderId === TRASH_VIEW_ID) {
      return null;
    }
    return collectDescendantFolderIds(selectedFolderId);
  }, [collectDescendantFolderIds, selectedFolderId]);

  const folderFilteredNotes = isTrashView
    ? deletedNotes
    : selectedFolderScopeIds
      ? activeNotes.filter((note) => {
          if (note.folderId == null) return false;
          return selectedFolderScopeIds.has(String(note.folderId));
        })
      : activeNotes;
  const typeFilteredNotes =
    noteTypeFilter === "all"
      ? folderFilteredNotes
      : folderFilteredNotes.filter((note) => {
          if (noteTypeFilter === "code") return note.noteType === "code";
          return (note.noteType || "text") !== "code";
        });

  const visibleNotes = normalizedQuery
    ? typeFilteredNotes.filter((note) => {
        const title = (note.title || "").toLowerCase();
        const content = (note.content || "").toLowerCase();
        return (
          title.includes(normalizedQuery) || content.includes(normalizedQuery)
        );
      })
    : typeFilteredNotes;

  const toTimestamp = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const ts = new Date(val).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  };

  // Sort to show pinned notes at the top, then apply selected ordering
  const sortedNotes = [...visibleNotes].sort((a, b) => {
    if (isTrashView) {
      return toTimestamp(b.deletedAt) - toTimestamp(a.deletedAt);
    }

    const aIsPinned = pinnedIds.includes(String(a.id)) ? 1 : 0;
    const bIsPinned = pinnedIds.includes(String(b.id)) ? 1 : 0;
    if (bIsPinned !== aIsPinned) return bIsPinned - aIsPinned;

    if (sortBy === "updated-desc") {
      return toTimestamp(b.lastModified) - toTimestamp(a.lastModified);
    }
    if (sortBy === "updated-asc") {
      return toTimestamp(a.lastModified) - toTimestamp(b.lastModified);
    }
    if (sortBy === "created-desc") {
      return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
    }
    if (sortBy === "created-asc") {
      return toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
    }
    if (sortBy === "title-desc") {
      return (b.title || "").localeCompare(a.title || "", undefined, {
        sensitivity: "base",
      });
    }

    return (a.title || "").localeCompare(b.title || "", undefined, {
      sensitivity: "base",
    });
  });

  const displayedNotes = focusedNoteId
    ? sortedNotes.filter((n) => String(n.id) === String(focusedNoteId))
    : sortedNotes;

  const folderById = useMemo(
    () => new Map(folders.map((f) => [String(f.id), f])),
    [folders],
  );

  const selectedFolderPath = useMemo(() => {
    if (selectedFolderId == null || selectedFolderId === TRASH_VIEW_ID)
      return [];

    const path = [];
    const seen = new Set();
    let cursor = folderById.get(String(selectedFolderId));

    while (cursor && !seen.has(String(cursor.id))) {
      path.unshift(cursor);
      seen.add(String(cursor.id));
      cursor =
        cursor.parentId == null
          ? null
          : folderById.get(String(cursor.parentId));
    }

    return path;
  }, [folderById, selectedFolderId]);

  const selectedFolderChildren = useMemo(() => {
    if (selectedFolderId == null || selectedFolderId === TRASH_VIEW_ID)
      return [];
    return folders.filter(
      (folder) => String(folder.parentId) === String(selectedFolderId),
    );
  }, [folders, selectedFolderId]);

  const noteCountByFolder = useMemo(() => {
    const directCounts = new Map();
    for (const note of activeNotes) {
      if (note.folderId == null) continue;
      const key = String(note.folderId);
      directCounts.set(key, (directCounts.get(key) || 0) + 1);
    }

    const totals = new Map();
    const computeTotal = (folderId) => {
      const key = String(folderId);
      if (totals.has(key)) return totals.get(key);

      let total = directCounts.get(key) || 0;
      const children = folderChildrenByParent.get(key) || [];
      for (const childId of children) {
        total += computeTotal(childId);
      }

      totals.set(key, total);
      return total;
    };

    for (const folder of folders) {
      computeTotal(folder.id);
    }

    return totals;
  }, [activeNotes, folderChildrenByParent, folders]);

  const totalNotesCount = activeNotes.length;
  const totalDeletedCount = deletedNotes.length;

  const hasSearch = normalizedQuery.length > 0;
  const focusedNote = focusedNoteId
    ? notes.find((n) => String(n.id) === String(focusedNoteId)) || null
    : null;

  const pendingDeleteNote = pendingDeleteNoteId
    ? notes.find((n) => String(n.id) === String(pendingDeleteNoteId)) || null
    : null;

  return (
    <>
      <div className="notes-layout">
        {currentUser && (
          <FolderSidebar
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id) => {
              setSelectedFolderId(id);
              setFocusedNoteId(null);
              setSidebarOpen(false);
            }}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveFolder={handleMoveFolder}
            onColorFolder={handleColorFolder}
            onCollapsedChange={(collapsed) => {
              if (!currentUser) return;
              fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sidebarCollapsed: collapsed }),
              }).catch(() => {});
            }}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            noteCountByFolder={noteCountByFolder}
            totalNotesCount={totalNotesCount}
            recentlyDeletedCount={totalDeletedCount}
            trashViewId={TRASH_VIEW_ID}
          />
        )}
        <div className="notes-main">
          <div className="notes-toolbar">
            <div className="notes-toolbar-left">
              {currentUser && (
                <button
                  className="folder-sidebar-toggle"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open folders"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <line
                      x1="2"
                      y1="4.5"
                      x2="16"
                      y2="4.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <line
                      x1="2"
                      y1="9"
                      x2="16"
                      y2="9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <line
                      x1="2"
                      y1="13.5"
                      x2="16"
                      y2="13.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
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
              {isTrashView && (
                <Button
                  onClick={handleEmptyRecentlyDeleted}
                  className="icon-button"
                  aria-label="Empty recently deleted"
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                  <span className="notes-toolbar-tooltip">
                    Empty recently deleted
                  </span>
                </Button>
              )}
              <div className="notes-type-picker">
                <Dropdown
                  options={NOTE_TYPE_OPTIONS}
                  value={noteTypeFilter}
                  onChange={setNoteTypeFilter}
                  placeholder="Type"
                />
              </div>
              <div className="notes-sort-picker">
                <Dropdown
                  options={SORT_OPTIONS}
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="Sort"
                />
              </div>
              <Button
                onClick={() => {
                  if (notesViewMode === "list") {
                    setNotesViewMode("cards");
                    return;
                  }
                  setFocusedNoteId(null);
                  setNotesViewMode("list");
                }}
                className={`icon-button${notesViewMode === "list" ? " icon-button--active" : ""}`}
                aria-label={
                  notesViewMode === "list"
                    ? "Switch to cards view"
                    : "Switch to title list view"
                }
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
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <circle cx="4" cy="6" r="1" />
                  <circle cx="4" cy="12" r="1" />
                  <circle cx="4" cy="18" r="1" />
                </svg>
                <span className="notes-toolbar-tooltip">
                  {notesViewMode === "list"
                    ? "Switch to cards view"
                    : "Switch to title list view"}
                </span>
              </Button>
              <Button
                onClick={() => setShowOCRModal(true)}
                className="icon-button"
                aria-label="Scan image"
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
                <span className="notes-toolbar-tooltip">Scan image (OCR)</span>
              </Button>
              <Button
                onClick={() => handleNewNote("code")}
                className="icon-button"
                aria-label="New code note"
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
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                <span className="notes-toolbar-tooltip">New code note</span>
              </Button>
              <Button
                onClick={() => handleNewNote("text")}
                className="icon-button"
                aria-label="New note"
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span className="notes-toolbar-tooltip">New note</span>
              </Button>
            </div>
          </div>

          {selectedFolderPath.length > 0 && (
            <div className="folder-breadcrumb">
              <span>All Notes</span>
              {selectedFolderPath.map((folder) => (
                <React.Fragment key={folder.id}>
                  <span className="folder-breadcrumb-sep">›</span>
                  <span>{folder.name}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {isTrashView && (
            <div className="trash-banner">
              <span className="trash-banner-title">Recently Deleted</span>
              <span className="trash-banner-subtitle">
                Notes are permanently deleted after 10 days.
              </span>
            </div>
          )}

          {selectedFolderChildren.length > 0 && (
            <div
              className="folder-subfolder-links"
              role="navigation"
              aria-label="Subfolders"
            >
              <span className="folder-subfolder-links-label">Subfolders</span>
              <div className="folder-subfolder-links-row">
                {selectedFolderChildren.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className="folder-subfolder-link"
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setFocusedNoteId(null);
                    }}
                  >
                    <span>{folder.name}</span>
                    <span className="folder-subfolder-link-count">
                      {noteCountByFolder.get(String(folder.id)) || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {focusedNote && (
            <div className="note-focus-filter">
              <span className="note-focus-filter-label">Filtered note:</span>
              <span className="note-focus-filter-title">
                {focusedNote.title || "Untitled note"}
              </span>
              <button
                className="note-focus-filter-clear"
                onClick={() => setFocusedNoteId(null)}
                aria-label="Clear note filter"
              >
                Clear
              </button>
            </div>
          )}

          {isTrashView ? (
            displayedNotes.length === 0 ? (
              <div className="empty-state">
                <p>Recently deleted is empty</p>
                <p className="empty-state-subtitle">
                  Deleted notes will appear here for 10 days.
                </p>
              </div>
            ) : (
              <div className="notes-title-list" role="list">
                {displayedNotes.map((n) => (
                  <div key={n.id} className="trash-note-item">
                    <div className="trash-note-meta">
                      <span className="trash-note-title">
                        {n.title || "Untitled note"}
                      </span>
                      <span className="trash-note-date">
                        Deleted {new Date(n.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="trash-note-actions">
                      <button
                        type="button"
                        className="trash-note-action"
                        onClick={() => handleRestoreNote(n.id)}
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        className="trash-note-action trash-note-action--danger"
                        onClick={() => handleRemove(n.id)}
                      >
                        Delete forever
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : notesViewMode === "list" ? (
            displayedNotes.length === 0 ? (
              <div className="empty-state">
                <p>{hasSearch ? "No matching notes" : "No notes yet"}</p>
                <p className="empty-state-subtitle">
                  {hasSearch
                    ? "Try a different search"
                    : 'Click "New Note" to begin'}
                </p>
              </div>
            ) : (
              <div className="notes-title-list" role="list">
                {displayedNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="notes-title-list-item"
                    onClick={() => {
                      setFocusedNoteId(n.id);
                      setNotesViewMode("cards");
                    }}
                  >
                    <span className="notes-title-list-item-title">
                      {n.title || "Untitled note"}
                    </span>
                    <span className="notes-title-list-item-meta-wrap">
                      {pinnedIds.includes(String(n.id)) && (
                        <span className="notes-title-list-item-pin">
                          Pinned
                        </span>
                      )}
                      <span className="notes-title-list-item-meta">
                        {n.noteType === "code" ? "Code" : "Note"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : displayedNotes.length === 0 ? (
            <div className="empty-state">
              <p>{hasSearch ? "No matching notes" : "No notes yet"}</p>
              <p className="empty-state-subtitle">
                {hasSearch
                  ? "Try a different search"
                  : 'Click "New Note" to begin'}
              </p>
            </div>
          ) : (
            displayedNotes.map((n) => (
              <NoteItem
                key={n.id}
                note={n}
                updateNote={updateNote}
                commitNoteEdits={commitNoteEdits}
                handleRemove={handleRemove}
                isPinned={pinnedIds.includes(String(n.id))}
                onTogglePin={handleTogglePin}
                folders={folders}
                onMoveNote={handleMoveNote}
                isEditing={editingNoteId === n.id}
                onRequestEdit={() => setEditingNoteId(n.id)}
                onExitEdit={() => setEditingNoteId(null)}
              />
            ))
          )}
        </div>
      </div>

      {showOCRModal && (
        <div
          className="ocr-modal-overlay"
          onClick={() => setShowOCRModal(false)}
        >
          <div className="ocr-modal-popup" onClick={(e) => e.stopPropagation()}>
            <div className="ocr-modal-header">
              <button
                className="ocr-modal-close"
                onClick={handleOCRCancel}
                aria-label="Close"
              >
                ←
              </button>
              <h2>Scan Image to Text</h2>
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

      {pendingDeleteNote && (
        <div
          className="recently-delete-modal-overlay"
          onClick={() => setPendingDeleteNoteId(null)}
        >
          <div
            className="recently-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="recently-delete-modal-header">
              <h2>
                {pendingDeleteNote.deletedAt
                  ? "Delete Permanently?"
                  : "Move to Recently Deleted?"}
              </h2>
            </div>
            <div className="recently-delete-modal-body">
              <p className="recently-delete-modal-text">
                {pendingDeleteNote.deletedAt
                  ? "This note will be permanently deleted and cannot be recovered."
                  : "This note will be moved to Recently Deleted and removed permanently after 10 days."}
              </p>
            </div>
            <div className="recently-delete-modal-actions">
              <Button
                onClick={() => setPendingDeleteNoteId(null)}
                className="recently-delete-btn recently-delete-btn--ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteNote}
                className="recently-delete-btn recently-delete-btn--primary"
              >
                {pendingDeleteNote.deletedAt
                  ? "Delete forever"
                  : "Move to recently deleted"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteFolder && (
        <div
          className="recently-delete-modal-overlay"
          onClick={cancelDeleteFolder}
        >
          <div
            className="recently-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="recently-delete-modal-header">
              <h2>Delete Folder?</h2>
            </div>
            <div className="recently-delete-modal-body">
              <p className="recently-delete-modal-text">
                Delete folder "{pendingDeleteFolder.name}"? Notes inside this
                folder and subfolders will be moved to root.
              </p>
            </div>
            <div className="recently-delete-modal-actions">
              <Button
                onClick={cancelDeleteFolder}
                className="recently-delete-btn recently-delete-btn--ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteFolder}
                className="recently-delete-btn recently-delete-btn--primary"
              >
                Delete folder
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NotesHandler;
