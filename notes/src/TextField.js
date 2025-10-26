import React, { useState, useRef, useEffect } from "react";
import "./TextField.css";
import Button from "./Button";
import Dropdown from "./Dropdown";
import { FONT_MAP, FONT_OPTIONS } from "./fonts";

const FONT_SIZE_OPTIONS = [
  { id: 14, label: "14px" },
  { id: 16, label: "16px" },
  { id: 18, label: "18px" },
  { id: 20, label: "20px" },
  { id: 22, label: "22px" },
  { id: 24, label: "24px" },
  { id: 36, label: "36px" },
  { id: 48, label: "48px" },
  { id: 60, label: "60px" },
  { id: 72, label: "72px" },
  { id: 84, label: "84px" },
  { id: 96, label: "96px" },
];

const TextField = ({
  value: initialValue = "",
  onChange,
  onRemove,
  title = "",
  onTitleChange,
  font: fontProp,
  theme: themeProp,
  onFontChange,
  onThemeChange,
  // optional timestamps passed from parent note object
  lastModified,
  // optional per-note fontSize (pixels) and change handler
  fontSize,
  onFontSizeChange,
}) => {
  // keep a ticking clock to refresh relative-time labels every minute
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lastModified) return undefined;
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, [lastModified]);

  const formatRelative = (ts) => {
    if (!ts) return "";
    const diffSec = Math.floor((now - ts) / 1000);
    if (diffSec < 10) return "just now";
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) {
      const m = Math.floor(diffSec / 60);
      return m === 1 ? "1 minute ago" : `${m} minutes ago`;
    }
    if (diffSec < 86400) {
      const h = Math.floor(diffSec / 3600);
      return h === 1 ? "1 hour ago" : `${h} hours ago`;
    }
    if (diffSec < 172800) return "yesterday";
    if (diffSec < 604800) {
      const d = Math.floor(diffSec / 86400);
      return `${d} days ago`;
    }
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };
  const [value, setValue] = useState(initialValue);
  const [noteTitle, setNoteTitle] = useState(title);
  // Default per-note font is inter
  const [noteFont, setNoteFont] = useState(fontProp ?? "inter");
  // per-note font size in pixels
  const [noteFontSize, setNoteFontSize] = useState(
    // prefer explicit prop, fallback to 16
    typeof fontSize !== "undefined" ? fontSize : 16
  );
  // Default per-note theme is 'default' which uses global variables
  const [noteTheme, setNoteTheme] = useState(themeProp ?? "default");
  // Track edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const editorRef = useRef(null);
  // Undo/redo stacks for editor content (HTML strings)
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastSnapshotTimeRef = useRef(Date.now());
  const lastSnapshotTextRef = useRef(
    String(initialValue || "").replace(/<[^>]+>/g, "")
  );

  // Undo/redo stacks for the title (plain strings)
  const titleUndoStackRef = useRef([]);
  const titleRedoStackRef = useRef([]);
  const lastTitleSnapshotTimeRef = useRef(Date.now());
  const SNAPSHOT_INTERVAL = 1200; // ms
  const STACK_LIMIT = 50;

  // track last focused area ('title'|'editor'|'other')
  const lastFocusRef = useRef("other");

  const lastEditorRangeRef = useRef(null);
  const lastTitleSelRef = useRef({ start: null, end: null });

  // Stable refs for keyboard handler
  const undoRef = useRef(null);
  const redoRef = useRef(null);

  useEffect(() => {
    const onFocusIn = (e) => {
      const t = e.target;
      if (t && t.classList && t.classList.contains("note-title-input")) {
        lastFocusRef.current = "title";
      } else if (editorRef.current && editorRef.current.contains(t)) {
        lastFocusRef.current = "editor";
      } else {
        lastFocusRef.current = "other";
      }
    };

    const onSelectionChange = () => {
      try {
        const sel = window.getSelection();
        if (!sel) return;
        const active = document.activeElement;
        if (
          active &&
          active.classList &&
          active.classList.contains("note-title-input")
        ) {
          // update last title selection
          const titleInput = active;
          lastTitleSelRef.current = {
            start: titleInput.selectionStart,
            end: titleInput.selectionEnd,
          };
        } else if (
          editorRef.current &&
          sel.rangeCount > 0 &&
          editorRef.current.contains(sel.anchorNode)
        ) {
          // store a clone of the range inside editor
          lastEditorRangeRef.current = sel.getRangeAt(0).cloneRange();
        }
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  // Selection helpers to preserve caret when applying undo/redo.
  const saveEditorSelection = () => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      if (
        !editorRef.current ||
        !editorRef.current.contains(range.commonAncestorContainer)
      )
        return null;
      return range.cloneRange();
    } catch (e) {
      return null;
    }
  };

  const restoreEditorSelection = (range) => {
    try {
      if (!range) return;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {
      // ignore if failing to restore
    }
  };

  const THEME_OPTIONS = [
    { id: "default", label: "Match Theme" },
    { id: "dark", label: "Dark" },
    { id: "brown", label: "Brown" },
    { id: "blue", label: "Blue" },
    { id: "gray", label: "Gray" },
    { id: "cream", label: "Cream" },
    { id: "purple", label: "Purple" },
    { id: "pink", label: "Pink" },
    { id: "skyblue", label: "Sky Blue" },
    { id: "sage", label: "Sage" },
    { id: "sunset", label: "Sunset" },
    { id: "burgundy", label: "Burgundy" },
    { id: "forestgreen", label: "Forest Green" },
    { id: "gold", label: "Gold" },
    { id: "ai", label: "Intelligence" },
  ];

  const THEME_VARS = {
    dark: {
      "--bg": "#000000",
      "--fg": "#e0e0e0",
      "--muted": "#9a9a9a",
      "--panel-bg": "rgba(30, 30, 30, 0.6)",
      "--panel-border": "rgba(255, 255, 255, 0.08)",
      "--panel-bg-solid": "rgb(20, 20, 20)",
      "--glass-bg":
        "linear-gradient(135deg, rgba(0, 0, 0, 0.195), rgba(255, 255, 255, 0.05))",
    },
    blue: {
      "--bg": "#0a1628",
      "--fg": "#e3f2ff",
      "--muted": "#7cb3ff",
      "--panel-bg": "rgba(20, 60, 120, 0.4)",
      "--panel-border": "rgba(124, 179, 255, 0.3)",
      "--panel-bg-solid": "#1a3a5c",
      "--glass-bg":
        "linear-gradient(135deg, rgba(10, 30, 50, 0.45), rgba(124, 179, 255, 0.06))",
    },
    gray: {
      "--bg": "#1a1a1e",
      "--fg": "#f5f5f5",
      "--muted": "#b8b8c0",
      "--panel-bg": "rgba(50, 50, 55, 0.5)",
      "--panel-border": "rgba(180, 180, 190, 0.2)",
      "--panel-bg-solid": "#2d2d32",
      "--glass-bg":
        "linear-gradient(135deg, rgba(40, 40, 45, 0.55), rgba(255, 255, 255, 0.03))",
    },
    cream: {
      "--bg": "#f5f1e8",
      "--fg": "#3d2e1f",
      "--muted": "#8b7355",
      "--panel-bg": "rgba(235, 220, 200, 0.6)",
      "--panel-border": "rgba(139, 115, 85, 0.25)",
      "--panel-bg-solid": "#ebe4d6",
      "--glass-bg":
        "linear-gradient(135deg, rgba(250, 240, 225, 0.85), rgba(139, 115, 85, 0.05))",
    },
    purple: {
      "--bg": "#ceb4ff",
      "--fg": "#2d1b4e",
      "--muted": "#7c5cba",
      "--panel-bg": "rgba(230, 220, 255, 0.6)",
      "--panel-border": "rgba(124, 92, 186, 0.25)",
      "--panel-bg-solid": "#e6dcff",
      "--glass-bg":
        "linear-gradient(135deg, rgba(110, 80, 170, 0.32), rgba(255, 255, 255, 0.04))",
    },
    pink: {
      "--bg": "#fff1f6",
      "--fg": "#3a1228",
      "--muted": "#b76a93",
      "--panel-bg": "rgba(255, 240, 245, 0.62)",
      "--panel-border": "rgba(150, 100, 130, 0.12)",
      "--panel-bg-solid": "#ffe6ef",
      "--glass-bg":
        "linear-gradient(135deg, rgba(255, 230, 245, 0.6), rgba(255, 255, 255, 0.02))",
    },
    skyblue: {
      "--bg": "#e3f2fd",
      "--fg": "#1e3a5f",
      "--muted": "#4a90c7",
      "--panel-bg": "rgba(220, 240, 255, 0.7)",
      "--panel-border": "rgba(74, 144, 199, 0.25)",
      "--panel-bg-solid": "#d1e9ff",
      "--glass-bg":
        "linear-gradient(135deg, rgba(200, 230, 250, 0.9), rgba(74, 144, 199, 0.04))",
    },
    sage: {
      "--bg": "#e8f3e8",
      "--fg": "#2d4a2d",
      "--muted": "#6b8e6b",
      "--panel-bg": "rgba(220, 235, 220, 0.7)",
      "--panel-border": "rgba(107, 142, 107, 0.25)",
      "--panel-bg-solid": "#d8ead8",
      "--glass-bg":
        "linear-gradient(135deg, rgba(220, 235, 220, 0.9), rgba(107, 142, 107, 0.04))",
    },
    brown: {
      "--bg": "#2b1b12",
      "--fg": "#efe6dd",
      "--muted": "#b99a85",
      "--panel-bg": "rgba(60, 40, 30, 0.6)",
      "--panel-border": "rgba(179, 128, 95, 0.25)",
      "--panel-bg-solid": "#3a2418",
      "--glass-bg":
        "linear-gradient(135deg, rgba(60, 40, 30, 0.6), rgba(255, 255, 255, 0.02))",
    },
    sunset: {
      "--bg": "#000000",
      "--fg": "#ffeded",
      "--muted": "#ffffff",
      "--panel-bg": "rgba(0, 0, 0, 0.7)",
      "--panel-border": "rgba(152, 152, 152, 0.341)",
      "--panel-bg-solid":
        "linear-gradient(135deg, rgb(0, 0, 0), rgba(0, 0, 0, 0.38))",
      "--glass-bg":
        "linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.441))",
    },
    burgundy: {
      "--bg": "#1a0a0e",
      "--fg": "#f5e9ec",
      "--muted": "#b87a87",
      "--panel-bg": "rgba(64, 0, 21, 0.6)",
      "--panel-border": "rgba(184, 122, 135, 0.25)",
      "--panel-bg-solid": "#2a0f17",
      "--glass-bg":
        "linear-gradient(135deg, rgba(64, 0, 21, 0.85), rgba(26, 10, 14, 0.9))",
    },
    forestgreen: {
      "--bg": "#0e1a0e",
      "--fg": "#e6f0e6",
      "--muted": "#7ab97a",
      "--panel-bg": "rgba(10, 40, 10, 0.6)",
      "--panel-border": "rgba(122, 185, 122, 0.25)",
      "--panel-bg-solid": "#162616",
      "--glass-bg":
        "linear-gradient(135deg, rgba(10, 40, 10, 0.85), rgba(14, 26, 14, 0.9))",
    },
    gold: {
      "--bg": "#cb9a2e",
      "--fg": "#fff8e1",
      "--muted": "#dca339",
      "--panel-bg": "rgba(30, 20, 5, 0.65)",
      "--panel-border": "rgba(255, 215, 128, 0.25)",
      "--panel-bg-solid": "#2c1f0c",
      "--glass-bg":
        "linear-gradient(135deg, rgba(255, 204, 102, 0.08), rgba(30, 20, 5, 0.85))",
    },
    ai: {
      "--bg": "#0b0b1a",
      "--fg": "#e9f0ff",
      "--muted": "#b5c6ff",
      "--panel-bg": "rgba(15, 20, 35, 0.7)",
      "--panel-border": "rgba(140, 170, 255, 0.25)",
      "--panel-bg-solid":
        "linear-gradient(135deg, #11152a, rgba(30, 35, 60, 0.5))",
      "--glass-bg":
        "linear-gradient(135deg, rgba(60, 30, 100, 0.7), rgba(20, 30, 60, 0.45))",
    },
  };

  // Use shared FONT_MAP from ./fonts

  // Update content when parent changes it
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // keep local title in sync with parent
  useEffect(() => {
    setNoteTitle(title);
  }, [title]);

  // sync font/theme props -> local state (combined)
  useEffect(() => {
    if (fontProp !== undefined && fontProp !== noteFont) setNoteFont(fontProp);
    if (typeof fontSize !== "undefined" && fontSize !== noteFontSize)
      setNoteFontSize(fontSize);
    if (themeProp !== undefined && themeProp !== noteTheme)
      setNoteTheme(themeProp);
  }, [fontProp, themeProp, fontSize, noteFont, noteTheme, noteFontSize]);

  // Reflect state to contenteditable div
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Handle content changes
  const handleInput = () => {
    const newValue = editorRef.current.innerHTML;

    // plain text for word/space detection
    const newText = (editorRef.current.innerText || "").replace(/\u00A0/g, " ");
    const nowTs = Date.now();

    // create a new snapshot when user types a whitespace (new word) or enough time elapsed
    const prevSnapshotText = lastSnapshotTextRef.current || "";
    const typedNewCharIsSpace =
      newText.length > prevSnapshotText.length && /\s$/.test(newText);
    const timeExceeded =
      nowTs - lastSnapshotTimeRef.current > SNAPSHOT_INTERVAL;

    if (typedNewCharIsSpace || timeExceeded) {
      const u = undoStackRef.current;
      u.push(value);
      if (u.length > STACK_LIMIT) u.shift();
      redoStackRef.current = [];
      lastSnapshotTimeRef.current = nowTs;
      lastSnapshotTextRef.current = newText;
    }

    setValue(newValue);
    if (onChange) onChange(newValue);
  };

  // Toolbar formatting (execCommand)
  const handleFormat = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current.focus();
    handleInput();
  };

  const handleTitleChange = (e) => {
    const t = e.target.value;
    const nowTs = Date.now();

    const timeExceeded =
      nowTs - lastTitleSnapshotTimeRef.current > SNAPSHOT_INTERVAL;
    const typedNewCharIsSpace = t.length > noteTitle.length && /\s$/.test(t);

    if (typedNewCharIsSpace || timeExceeded) {
      const tu = titleUndoStackRef.current;
      tu.push(noteTitle);
      if (tu.length > STACK_LIMIT) tu.shift();
      titleRedoStackRef.current = [];
      lastTitleSnapshotTimeRef.current = nowTs;
    }

    setNoteTitle(t);
    if (onTitleChange) onTitleChange(t);
  };

  // Undo/Redo handlers
  const undo = (forTitle = false) => {
    if (forTitle) {
      const u = titleUndoStackRef.current;
      if (u.length === 0) return;
      const prev = u.pop();
      const tr = titleRedoStackRef.current;
      tr.push(noteTitle);
      if (tr.length > STACK_LIMIT) tr.shift();
      // save/restore cursor for title
      const titleInput = document.querySelector(".note-title-input");
      // preserve focus and selection that we tracked earlier
      const lastSel = lastTitleSelRef.current;
      setNoteTitle(prev);
      if (onTitleChange) onTitleChange(prev);
      setTimeout(() => {
        if (titleInput) {
          titleInput.focus();
          if (lastSel && lastSel.start != null && lastSel.end != null) {
            titleInput.setSelectionRange(lastSel.start, lastSel.end);
          }
        }
      }, 0);
      lastTitleSnapshotTimeRef.current = Date.now();
      return;
    }

    const u = undoStackRef.current;
    if (u.length === 0) return;
    const prevHTML = u.pop();
    const rr = redoStackRef.current;
    rr.push(value);
    if (rr.length > STACK_LIMIT) rr.shift();
    // save editor selection
    const savedRange = saveEditorSelection();
    setValue(prevHTML);
    if (editorRef.current) editorRef.current.innerHTML = prevHTML;
    if (onChange) onChange(prevHTML);
    lastSnapshotTextRef.current =
      (editorRef.current && (editorRef.current.innerText || "")) || "";
    lastSnapshotTimeRef.current = Date.now();
    // try to restore selection; fall back to lastEditorRangeRef
    setTimeout(
      () => restoreEditorSelection(savedRange || lastEditorRangeRef.current),
      0
    );
  };

  const redo = (forTitle = false) => {
    if (forTitle) {
      const r = titleRedoStackRef.current;
      if (r.length === 0) return;
      const next = r.pop();
      const tu = titleUndoStackRef.current;
      tu.push(noteTitle);
      if (tu.length > STACK_LIMIT) tu.shift();
      const titleInput = document.querySelector(".note-title-input");
      const lastSel = lastTitleSelRef.current;
      setNoteTitle(next);
      if (onTitleChange) onTitleChange(next);
      setTimeout(() => {
        if (titleInput) {
          titleInput.focus();
          if (lastSel && lastSel.start != null && lastSel.end != null) {
            titleInput.setSelectionRange(lastSel.start, lastSel.end);
          }
        }
      }, 0);
      lastTitleSnapshotTimeRef.current = Date.now();
      return;
    }

    const r = redoStackRef.current;
    if (r.length === 0) return;
    const nextHTML = r.pop();
    const uu = undoStackRef.current;
    uu.push(value);
    if (uu.length > STACK_LIMIT) uu.shift();
    const savedRange = saveEditorSelection();
    setValue(nextHTML);
    if (editorRef.current) editorRef.current.innerHTML = nextHTML;
    if (onChange) onChange(nextHTML);
    lastSnapshotTextRef.current =
      (editorRef.current && (editorRef.current.innerText || "")) || "";
    lastSnapshotTimeRef.current = Date.now();
    setTimeout(
      () => restoreEditorSelection(savedRange || lastEditorRangeRef.current),
      0
    );
  };

  // expose stable refs for use in event listeners (avoid adding functions to effect deps)
  undoRef.current = undo;
  redoRef.current = redo;

  // Keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z or Ctrl+Y)
  useEffect(() => {
    const onKeyDown = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const active = document.activeElement;
      const inTitle =
        active &&
        active.classList &&
        active.classList.contains("note-title-input");

      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) redoRef.current && redoRef.current(inTitle);
        else undoRef.current && undoRef.current(inTitle);
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        redoRef.current && redoRef.current(inTitle);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Note: we now call onFontChange/onThemeChange directly from the dropdown
  // handlers to avoid extra effect-driven notifications which caused shuffling.

  // Prepare inline variables for the selected theme (or undefined for default)
  const themeVars = noteTheme === "default" ? undefined : THEME_VARS[noteTheme];

  return (
    <div
      className={`text-field ${isEditMode ? "edit-mode" : "view-mode"}`}
      style={themeVars}
    >
      {/* Top bar with title and last modified - shown in view mode */}
      {!isEditMode && (
        <div className="note-header" onClick={() => setIsEditMode(true)}>
          <div className="note-header-content">
            <div className="note-title-display">{noteTitle || "New Note"}</div>
            {lastModified && (
              <div className="note-last-modified-header">
                Last modified: {formatRelative(lastModified)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar - only shown in edit mode */}
      {isEditMode && (
        <div className="toolbar">
          <div className="toolbar-scroll">
            <button onClick={() => handleFormat("bold")}>
              <b>B</b>
            </button>
            <button onClick={() => handleFormat("italic")}>
              <i>I</i>
            </button>
            <button onClick={() => handleFormat("underline")}>
              <u>U</u>
            </button>
            <button onClick={() => handleFormat("insertUnorderedList")}>
              Bullet List
            </button>
            <button onClick={() => handleFormat("insertOrderedList")}>
              Numbered List
            </button>
            <button onClick={() => handleFormat("formatBlock", "H1")}>
              Heading
            </button>
            {/* Per-note font selector using shared Dropdown component */}
            <div className="font-picker">
              {/* Local options and labels: mono, inter, paper, handwritten */}
              {/** Options ids match global theme keys used elsewhere **/}
              {/** Dropdown will call setNoteFont with the id string **/}
              <Dropdown
                options={FONT_OPTIONS}
                value={noteFont}
                onChange={(v) => {
                  setNoteFont(v);
                  if (onFontChange) onFontChange(v);
                }}
              />
            </div>
            {/* Per-note font-size selector */}
            <div className="font-size-picker">
              <Dropdown
                options={FONT_SIZE_OPTIONS}
                value={noteFontSize}
                onChange={(v) => {
                  const size = Number(v);
                  setNoteFontSize(size);
                  if (onFontSizeChange) onFontSizeChange(size);
                }}
              />
            </div>
            {/* Per-note theme selector */}
            <div className="theme-picker">
              <Dropdown
                options={THEME_OPTIONS}
                value={noteTheme}
                onChange={(v) => {
                  setNoteTheme(v);
                  if (onThemeChange) onThemeChange(v);
                }}
              />
            </div>
          </div>
          {/* pinned right-side actions (outside scroll area so they stay put) */}
          <div className="toolbar-actions">
            <Button
              className="done-btn"
              onClick={() => setIsEditMode(false)}
              aria-label="Done editing"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 50 50"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line
                  x1="10"
                  y1="25"
                  x2="25"
                  y2="40"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <line
                  x1="25"
                  y1="40"
                  x2="40"
                  y2="10"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>{" "}
              Done
            </Button>
            <Button
              className="undo-btn"
              onClick={() => {
                const active = document.activeElement;
                const inTitle =
                  active &&
                  active.classList &&
                  active.classList.contains("note-title-input");
                undo(inTitle);
              }}
              aria-label="Undo"
              title="Undo (⌘Z)"
            >
              Undo
            </Button>
            <Button
              className="redo-btn"
              onClick={() => {
                const active = document.activeElement;
                const inTitle =
                  active &&
                  active.classList &&
                  active.classList.contains("note-title-input");
                redo(inTitle);
              }}
              aria-label="Redo"
              title="Redo (⌘⇧Z)"
            >
              Redo
            </Button>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="editor"
        contentEditable={isEditMode}
        onInput={handleInput}
        onClick={() => !isEditMode && setIsEditMode(true)}
        suppressContentEditableWarning
        aria-label="Note editor"
        placeholder="Tap to edit"
        style={{
          fontFamily: FONT_MAP[noteFont] ?? undefined,
          fontSize: noteFontSize ? `${noteFontSize}px` : undefined,
          cursor: isEditMode ? "text" : "pointer",
        }}
      />

      {/* Bottom mini-bar with editable title, last-modified label, and remove button */}
      {isEditMode && (
        <div className="note-footer">
          <input
            className="note-title-input"
            value={noteTitle}
            onChange={handleTitleChange}
            placeholder="Untitled"
            aria-label="Note title"
          />

          {/* Center: Last modified label (if available) */}
          <div
            className="note-last-modified"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {lastModified ? (
              <span>Last modified: {formatRelative(lastModified)}</span>
            ) : null}
          </div>

          {onRemove && (
            <Button
              className="remove-btn"
              onClick={onRemove}
              aria-label="Remove note"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default TextField;
