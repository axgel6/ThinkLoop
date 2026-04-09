import React, { useState, useRef, useEffect, useCallback } from "react";
import "./TextField.css";
import Button from "./Button";
import Dropdown from "./Dropdown";
import { FONT_MAP, FONT_OPTIONS } from "../utils/fonts";
import { NOTE_THEME_OPTIONS, THEME_VARS } from "../utils/themes";
import hljs from "highlight.js";
import "highlight.js/styles/stackoverflow-dark.css";

const LANGUAGE_OPTIONS = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "csharp", label: "C#" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash" },
  { id: "json", label: "JSON" },
  { id: "yaml", label: "YAML" },
  { id: "markdown", label: "Markdown" },
  { id: "php", label: "PHP" },
  { id: "ruby", label: "Ruby" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
];

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
  isPinned = false,
  onTogglePin,
  isFullScreen = false,
  onFullScreenChange,
  noteId,
  noteType = "text",
  language: languageProp = "javascript",
  onLanguageChange,
  // single-edit control
  isEditing,
  onRequestEdit,
  onExitEdit,
  // folder assignment
  folders = [],
  folderId,
  onMoveNote,
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
    typeof fontSize !== "undefined" ? fontSize : 16,
  );
  // Default per-note theme is 'default' which uses global variables
  const [noteTheme, setNoteTheme] = useState(themeProp ?? "default");
  // Code note language
  const [noteLanguage, setNoteLanguage] = useState(
    languageProp ?? "javascript",
  );
  // Edit mode: controlled by parent when isEditing prop is provided, otherwise local
  const [localEditMode, setLocalEditMode] = useState(false);
  const isEditMode = isEditing !== undefined ? isEditing : localEditMode;
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const folderPickerRef = useRef(null);

  const startEdit = () => {
    setShowFolderPicker(false);
    if (isEditing !== undefined) {
      onRequestEdit?.();
    } else {
      setLocalEditMode(true);
    }
  };

  const stopEdit = useCallback(() => {
    if (isEditing !== undefined) {
      onExitEdit?.();
    } else {
      setLocalEditMode(false);
    }
  }, [isEditing, onExitEdit]);

  const currentFolder = folders?.find((f) => String(f.id) === String(folderId));

  // Close folder picker on outside click
  useEffect(() => {
    if (!showFolderPicker) return;
    const handler = (e) => {
      if (
        folderPickerRef.current &&
        !folderPickerRef.current.contains(e.target)
      ) {
        setShowFolderPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFolderPicker]);

  const editorRef = useRef(null);
  // Color picker refs
  const textColorRef = useRef(null);
  const highlightColorRef = useRef(null);
  // Per-selection text / highlight colors
  const [textColor, setTextColor] = useState("#e0e0e0");
  const [highlightColor, setHighlightColor] = useState("#ffff00");
  // Active format state – updated on selection change
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });
  // Undo/redo stacks for editor content (HTML strings)
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastSnapshotTimeRef = useRef(Date.now());
  const lastSnapshotTextRef = useRef(
    String(initialValue || "").replace(/<[^>]+>/g, ""),
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
          // update active format state
          setFormatState({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            strikeThrough: document.queryCommandState("strikeThrough"),
          });
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

  // THEME_OPTIONS and THEME_VARS now imported from themes.js

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

  // When in edit mode, focus editor and place cursor at the end.
  // This also covers newly-created notes that mount directly in edit mode.
  useEffect(() => {
    if (!isEditMode || !editorRef.current) return;

    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }, [isEditMode]);

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

  // Restore last editor selection then apply a color command
  const applyColorFormat = (cmd, color) => {
    const range = lastEditorRangeRef.current;
    if (
      range &&
      editorRef.current &&
      editorRef.current.contains(range.commonAncestorContainer)
    ) {
      editorRef.current.focus();
      restoreEditorSelection(range);
    } else {
      editorRef.current?.focus();
    }
    handleFormat(cmd, color);
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
      0,
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
      0,
    );
  };

  // expose stable refs for use in event listeners (avoid adding functions to effect deps)
  undoRef.current = undo;
  redoRef.current = redo;

  const getClosestBlock = (node) => {
    const editor = editorRef.current;
    if (!editor || !node) return null;
    let cur = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (cur && cur !== editor) {
      const tag = cur.nodeName;
      if (
        [
          "P",
          "DIV",
          "LI",
          "H1",
          "H2",
          "H3",
          "H4",
          "H5",
          "H6",
          "BLOCKQUOTE",
          "PRE",
        ].includes(tag)
      ) {
        return cur;
      }
      cur = cur.parentNode;
    }
    return editor;
  };

  const buildRangeInNodeByChars = (root, startChar, endChar) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let charCount = 0;
    let startNode = null;
    let endNode = null;
    let startOffset = 0;
    let endOffset = 0;

    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const len = textNode.nodeValue.length;
      const nextCount = charCount + len;

      if (!startNode && startChar >= charCount && startChar <= nextCount) {
        startNode = textNode;
        startOffset = startChar - charCount;
      }

      if (!endNode && endChar >= charCount && endChar <= nextCount) {
        endNode = textNode;
        endOffset = endChar - charCount;
        break;
      }

      charCount = nextCount;
    }

    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, Math.max(0, startOffset));
    range.setEnd(endNode, Math.max(0, endOffset));
    return range;
  };

  const getBlockPrefixAtCaret = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;

    const caretRange = sel.getRangeAt(0);
    if (!editor.contains(caretRange.startContainer)) return null;

    const block = getClosestBlock(caretRange.startContainer);
    if (!block) return null;

    const blockRange = document.createRange();
    blockRange.selectNodeContents(block);
    blockRange.setEnd(caretRange.startContainer, caretRange.startOffset);

    return {
      block,
      prefix: blockRange.toString(),
      caretRange,
    };
  };

  const stripPrefixToken = (block, tokenLength) => {
    const range = buildRangeInNodeByChars(block, 0, tokenLength);
    if (!range) return;
    range.deleteContents();
  };

  const tryApplyMarkdownShortcut = () => {
    const blockData = getBlockPrefixAtCaret();
    if (!blockData) return false;

    const typed = `${blockData.prefix} `;
    const normalized = typed.replace(/\u00a0/g, " ");
    const shortcuts = [
      {
        token: "# ",
        apply: () => document.execCommand("formatBlock", false, "H1"),
      },
      {
        token: "## ",
        apply: () => document.execCommand("formatBlock", false, "H2"),
      },
      {
        token: "### ",
        apply: () => document.execCommand("formatBlock", false, "H3"),
      },
      {
        token: "> ",
        apply: () => document.execCommand("formatBlock", false, "BLOCKQUOTE"),
      },
      {
        token: "``` ",
        apply: () => document.execCommand("formatBlock", false, "PRE"),
      },
      {
        token: "- ",
        apply: () => document.execCommand("insertUnorderedList", false, null),
      },
      {
        token: "* ",
        apply: () => document.execCommand("insertUnorderedList", false, null),
      },
      {
        token: "1. ",
        apply: () => document.execCommand("insertOrderedList", false, null),
      },
    ];

    const match = shortcuts.find((s) => normalized === s.token);
    if (!match) return false;

    stripPrefixToken(blockData.block, match.token.length - 1);
    match.apply();
    handleInput();
    return true;
  };

  const tryBreakOutOfStyledBlockOnEnter = () => {
    const blockData = getBlockPrefixAtCaret();
    if (!blockData) return false;

    const { block, prefix } = blockData;
    const tag = block.nodeName;
    const isHeading = ["H1", "H2", "H3", "H4", "H5", "H6"].includes(tag);
    const isQuote = tag === "BLOCKQUOTE";
    if (!isHeading && !isQuote) return false;

    const fullText = (block.innerText || "").replace(/\u00a0/g, " ");
    const isAtEnd = prefix.length === fullText.length;
    if (!isAtEnd) return false;

    document.execCommand("insertParagraph", false, null);
    document.execCommand("formatBlock", false, "P");
    handleInput();
    return true;
  };

  const handleEditorKeyDown = (e) => {
    if (!isEditMode) return;

    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
      return;
    }

    if (e.key === " " && tryApplyMarkdownShortcut()) {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter" && tryBreakOutOfStyledBlockOnEnter()) {
      e.preventDefault();
    }
  };

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

  // Handle Escape key to exit edit mode or close full-screen
  useEffect(() => {
    if (!isEditMode && !isFullScreen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (isFullScreen) {
          onFullScreenChange?.(null);
        } else {
          stopEdit();
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isEditMode, isFullScreen, onFullScreenChange, stopEdit]);

  // --- Code note rendering ---
  if (noteType === "code") {
    const highlighted = (() => {
      try {
        return hljs.highlight(value || "", {
          language: noteLanguage,
          ignoreIllegals: true,
        }).value;
      } catch {
        return hljs.highlightAuto(value || "").value;
      }
    })();

    return (
      <div
        className={`text-field code-note ${isEditMode ? "edit-mode" : "view-mode"}`}
        style={themeVars}
        onClick={() => !isEditMode && startEdit()}
      >
        {!isEditMode && (
          <div className="note-header">
            <div className="note-header-content">
              <div className="note-title-display-row">
                {isPinned && <span className="note-pin-indicator">Pinned</span>}
                <div className="note-title-display">
                  {noteTitle || "New code note"}
                </div>
                <span className="code-note-lang-badge">{noteLanguage}</span>
              </div>
              {lastModified && (
                <div className="note-last-modified-header">
                  Last modified: {formatRelative(lastModified)}
                </div>
              )}
            </div>
          </div>
        )}

        {isEditMode && (
          <div className="toolbar">
            <div className="toolbar-scroll">
              <div className="lang-picker">
                <Dropdown
                  options={LANGUAGE_OPTIONS}
                  value={noteLanguage}
                  onChange={(v) => {
                    setNoteLanguage(v);
                    if (onLanguageChange) onLanguageChange(v);
                  }}
                />
              </div>
              <div className="theme-picker">
                <Dropdown
                  options={NOTE_THEME_OPTIONS}
                  value={noteTheme}
                  onChange={(v) => {
                    setNoteTheme(v);
                    if (onThemeChange) onThemeChange(v);
                  }}
                />
              </div>
            </div>
            <div className="toolbar-actions">
              <Button
                className="done-btn"
                onClick={() => stopEdit()}
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
            </div>
          </div>
        )}

        {isEditMode ? (
          <textarea
            className="code-editor"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (onChange) onChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const ta = e.target;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const spaces = "  ";
                const newVal =
                  value.substring(0, start) + spaces + value.substring(end);
                setValue(newVal);
                if (onChange) onChange(newVal);
                requestAnimationFrame(() => {
                  ta.selectionStart = ta.selectionEnd = start + spaces.length;
                });
              }
            }}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Write your code here..."
          />
        ) : (
          <pre className="code-view">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        )}

        {isEditMode && (
          <div className="note-footer">
            <input
              className="note-title-input"
              value={noteTitle}
              onChange={handleTitleChange}
              placeholder="Type here to rename note"
              aria-label="Note title"
            />
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
            <div className="note-footer-actions">
              {onTogglePin && (
                <Button
                  className={`pin-btn${isPinned ? " active" : ""}`}
                  onClick={onTogglePin}
                  aria-label={isPinned ? "Unpin note" : "Pin note"}
                  title={isPinned ? "Unpin note" : "Pin note"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 17v5" />
                    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                    <path d="M5 9h14" />
                    <path d="M7 9l-2 7h14l-2-7" />
                  </svg>
                </Button>
              )}
              {onRemove && (
                <Button
                  className="remove-btn"
                  onClick={onRemove}
                  aria-label="Remove note"
                  title="Remove note"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`text-field ${isEditMode ? "edit-mode" : "view-mode"}`}
      style={themeVars}
    >
      {/* Top bar with title and last modified - shown in view mode */}
      {!isEditMode && (
        <div className="note-header" onClick={() => startEdit()}>
          <div className="note-header-content">
            <div className="note-header-top-row">
              {isPinned && <span className="note-pin-indicator">Pinned</span>}
              <div className="note-title-display">
                {noteTitle || "New note"}
              </div>
              {folders.length > 0 && (
                <div
                  className="note-folder-badge-wrapper"
                  ref={folderPickerRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={`note-folder-badge${currentFolder ? " has-folder" : ""}`}
                    onClick={() => setShowFolderPicker((v) => !v)}
                    title={
                      currentFolder
                        ? `Folder: ${currentFolder.name}`
                        : "Move to folder"
                    }
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 15 15"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H5.5L7 5H12.5C13.05 5 13.5 5.45 13.5 6V11C13.5 11.55 13.05 12 12.5 12H2.5C1.95 12 1.5 11.55 1.5 11V4.5Z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{currentFolder ? currentFolder.name : "folder"}</span>
                  </button>
                  {showFolderPicker && (
                    <div className="note-folder-picker">
                      <button
                        className={`note-folder-picker-item${!folderId ? " active" : ""}`}
                        onClick={() => {
                          onMoveNote?.(null);
                          setShowFolderPicker(false);
                        }}
                      >
                        No folder
                      </button>
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          className={`note-folder-picker-item${String(folderId) === String(f.id) ? " active" : ""}`}
                          onClick={() => {
                            onMoveNote?.(f.id);
                            setShowFolderPicker(false);
                          }}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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
            {/* ── Text formatting ── */}
            <div className="toolbar-group">
              <button
                className={`format-btn${formatState.bold ? " is-active" : ""}`}
                onClick={() => handleFormat("bold")}
                title="Bold (⌘B)"
              >
                <b>B</b>
              </button>
              <button
                className={`format-btn${formatState.italic ? " is-active" : ""}`}
                onClick={() => handleFormat("italic")}
                title="Italic (⌘I)"
              >
                <i>I</i>
              </button>
              <button
                className={`format-btn${formatState.underline ? " is-active" : ""}`}
                onClick={() => handleFormat("underline")}
                title="Underline (⌘U)"
              >
                <u>U</u>
              </button>
              <button
                className={`format-btn${formatState.strikeThrough ? " is-active" : ""}`}
                onClick={() => handleFormat("strikeThrough")}
                title="Strikethrough"
              >
                <s>S</s>
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* ── Headings ── */}
            <div className="toolbar-group">
              <button
                className="format-btn format-btn--label"
                onClick={() => handleFormat("formatBlock", "H1")}
                title="Heading 1"
              >
                H1
              </button>
              <button
                className="format-btn format-btn--label"
                onClick={() => handleFormat("formatBlock", "H2")}
                title="Heading 2"
              >
                H2
              </button>
              <button
                className="format-btn format-btn--label"
                onClick={() => handleFormat("formatBlock", "H3")}
                title="Heading 3"
              >
                H3
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* ── Lists ── */}
            <div className="toolbar-group">
              <button
                className="format-btn"
                onClick={() => handleFormat("insertUnorderedList")}
                title="Bullet List"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle
                    cx="4"
                    cy="6"
                    r="1.5"
                    fill="currentColor"
                    stroke="none"
                  />
                  <circle
                    cx="4"
                    cy="12"
                    r="1.5"
                    fill="currentColor"
                    stroke="none"
                  />
                  <circle
                    cx="4"
                    cy="18"
                    r="1.5"
                    fill="currentColor"
                    stroke="none"
                  />
                  <line x1="9" y1="6" x2="21" y2="6" />
                  <line x1="9" y1="12" x2="21" y2="12" />
                  <line x1="9" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                className="format-btn"
                onClick={() => handleFormat("insertOrderedList")}
                title="Numbered List"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="10" y1="6" x2="21" y2="6" />
                  <line x1="10" y1="12" x2="21" y2="12" />
                  <line x1="10" y1="18" x2="21" y2="18" />
                  <text
                    x="2"
                    y="8"
                    fontSize="6.5"
                    fill="currentColor"
                    stroke="none"
                    fontFamily="monospace"
                  >
                    1.
                  </text>
                  <text
                    x="2"
                    y="14"
                    fontSize="6.5"
                    fill="currentColor"
                    stroke="none"
                    fontFamily="monospace"
                  >
                    2.
                  </text>
                  <text
                    x="2"
                    y="20"
                    fontSize="6.5"
                    fill="currentColor"
                    stroke="none"
                    fontFamily="monospace"
                  >
                    3.
                  </text>
                </svg>
              </button>
            </div>

            <div className="toolbar-divider" />

            {/* ── Font & Size ── */}
            <div className="font-picker">
              <Dropdown
                options={FONT_OPTIONS}
                value={noteFont}
                onChange={(v) => {
                  setNoteFont(v);
                  if (onFontChange) onFontChange(v);
                }}
                fontPreview={true}
                fontMap={FONT_MAP}
              />
            </div>
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

            <div className="toolbar-divider" />

            {/* ── Colors ── */}
            <div className="toolbar-group">
              <div className="color-btn-wrapper">
                <button
                  className="format-btn color-btn"
                  title="Text Color"
                  onClick={() => textColorRef.current?.click()}
                >
                  <span className="color-btn-label">A</span>
                  <span
                    className="color-indicator"
                    style={{ background: textColor }}
                  />
                </button>
                <input
                  ref={textColorRef}
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    applyColorFormat("foreColor", e.target.value);
                  }}
                  className="hidden-color-input"
                />
              </div>
              <div className="color-btn-wrapper">
                <button
                  className="format-btn color-btn"
                  title="Highlight Color"
                  onClick={() => highlightColorRef.current?.click()}
                >
                  <span
                    className="color-btn-label"
                    style={{
                      background: highlightColor,
                      color: "#111",
                      borderRadius: "2px",
                      padding: "0 2px",
                    }}
                  >
                    A
                  </span>
                  <span
                    className="color-indicator"
                    style={{ background: highlightColor }}
                  />
                </button>
                <input
                  ref={highlightColorRef}
                  type="color"
                  value={highlightColor}
                  onChange={(e) => {
                    setHighlightColor(e.target.value);
                    applyColorFormat("hiliteColor", e.target.value);
                  }}
                  className="hidden-color-input"
                />
              </div>
            </div>

            <div className="toolbar-divider" />

            {/* ── Note color / theme ── */}
            <div className="theme-picker">
              <Dropdown
                options={NOTE_THEME_OPTIONS}
                value={noteTheme}
                onChange={(v) => {
                  setNoteTheme(v);
                  if (onThemeChange) onThemeChange(v);
                }}
              />
            </div>
          </div>

          {/* ── Pinned right-side actions ── */}
          <div className="toolbar-actions">
            <Button
              className="undo-btn"
              onClick={() => {
                const active = document.activeElement;
                const inTitle = active?.classList?.contains("note-title-input");
                undo(inTitle);
              }}
              aria-label="Undo"
              title="Undo (⌘Z)"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </Button>
            <Button
              className="redo-btn"
              onClick={() => {
                const active = document.activeElement;
                const inTitle = active?.classList?.contains("note-title-input");
                redo(inTitle);
              }}
              aria-label="Redo"
              title="Redo (⌘⇧Z)"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
              </svg>
            </Button>
            <Button
              className="done-btn"
              onClick={() => stopEdit()}
              aria-label="Done editing"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>{" "}
              Done
            </Button>
          </div>
        </div>
      )}

      <div
        ref={editorRef}
        className="editor"
        contentEditable={isEditMode}
        onInput={handleInput}
        onKeyDown={handleEditorKeyDown}
        onClick={() => !isEditMode && startEdit()}
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
            placeholder="Type here to rename note"
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

          <div className="note-footer-actions">
            {onTogglePin && (
              <Button
                className={`pin-btn${isPinned ? " active" : ""}`}
                onClick={onTogglePin}
                aria-label={isPinned ? "Unpin note" : "Pin note"}
                title={isPinned ? "Unpin note" : "Pin note"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 17v5" />
                  <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                  <path d="M5 9h14" />
                  <path d="M7 9l-2 7h14l-2-7" />
                </svg>
              </Button>
            )}

            {onFullScreenChange && (
              <Button
                className="fullscreen-btn"
                onClick={() => onFullScreenChange(String(noteId))}
                aria-label="Fullscreen note"
                title="Fullscreen note"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </Button>
            )}

            {onRemove && (
              <Button
                className="remove-btn"
                onClick={onRemove}
                aria-label="Remove note"
                title="Remove note"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Full-screen modal */}
      {isFullScreen && (
        <div className="fullscreen-modal">
          <div
            className="fullscreen-modal-overlay"
            onClick={() => onFullScreenChange?.(null)}
          />
          <div className="fullscreen-modal-content" style={themeVars}>
            <div className="fullscreen-header">
              <div className="fullscreen-title">{noteTitle || "Untitled"}</div>
              <Button
                className="fullscreen-close-btn"
                onClick={() => onFullScreenChange?.(null)}
                aria-label="Close fullscreen"
                title="Close fullscreen (Esc)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>
            <div
              ref={editorRef}
              className="fullscreen-editor"
              style={{
                fontSize: `${noteFontSize}px`,
                fontFamily: FONT_MAP[noteFont] || "monospace",
              }}
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TextField;
