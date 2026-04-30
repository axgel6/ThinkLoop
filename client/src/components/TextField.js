import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./TextField.css";
import Button from "./Button";
import Dropdown from "./Dropdown";
import { FONT_MAP, FONT_OPTIONS } from "../utils/fonts";
import { NOTE_THEME_OPTIONS, THEME_VARS } from "../utils/themes";
import hljs from "highlight.js";
import "highlight.js/styles/stackoverflow-dark.css";
import RelativeTimestamp from "./RelativeTimestamp";
import LinkPanel from "./panels/LinkPanel";
import ImagePanel from "./panels/ImagePanel";
import TablePanel from "./panels/TablePanel";
import FindReplacePanel from "./panels/FindReplacePanel";
import SnippetPanel from "./panels/SnippetPanel";
import useCodeUndo from "../hooks/useCodeUndo";

// ── Checklist paste helper ───────────────────────────────────────────────────
// Markdown-style: "- [ ]", "- [x]", "* [ ]", "[ ]", "[x]", etc.
const MD_CHECKBOX_RE =
  /^[-*\u2022]\s*\[[ xXvV\u2713]\]\s*|^\[[ xXvV\u2713]\]\s*/;
const MD_CHECKED_RE = /^[-*\u2022]\s*\[[xXvV\u2713]\]\s*|^\[[xXvV\u2713]\]\s*/;

// Returns true if the Unicode code point looks like a box/check/ballot glyph
function isBoxCodePoint(cp) {
  return (
    (cp >= 0x2610 && cp <= 0x2612) || // ☐ ☑ ☒ ballot boxes
    (cp >= 0x25a0 && cp <= 0x25ff) || // geometric shapes (□ ■ ▢ ▣ ◻ ◼ ◽ ◾ …)
    (cp >= 0x2600 && cp <= 0x27bf) || // misc symbols + dingbats (✓ ✔ ✗ ✘ ✅ …)
    cp === 0x2b1b ||
    cp === 0x2b1c || // ⬛ ⬜
    cp === 0x1f532 || // 🔲
    cp === 0x2705 ||
    cp === 0x274c // ✅ ❌
  );
}

// Returns true if the code point marks a *completed* item
function isCheckedCodePoint(cp) {
  return (
    cp === 0x2611 || // ☑
    cp === 0x2612 || // ☒
    cp === 0x2713 ||
    cp === 0x2714 || // ✓ ✔
    cp === 0x2705 // ✅
  );
}

function parseChecklistLines(raw) {
  const lines = raw.split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const cp = trimmed.codePointAt(0);
    const firstCharLen = cp > 0xffff ? 2 : 1;

    if (isBoxCodePoint(cp)) {
      const completed = isCheckedCodePoint(cp);
      const text = trimmed.slice(firstCharLen).trim();
      if (text) result.push({ text, completed });
      continue;
    }

    if (MD_CHECKBOX_RE.test(trimmed)) {
      const completed = MD_CHECKED_RE.test(trimmed);
      const text = trimmed.replace(MD_CHECKBOX_RE, "").trim();
      if (text) result.push({ text, completed });
    }
  }

  if (result.length >= 2) return result;

  // ── Heuristic fallback ────────────────────────────────────────────────────
  // If 50 %+ of non-empty lines share the same leading non-word Unicode char,
  // treat those lines as checklist items (handles unknown box glyphs).
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
  if (nonEmpty.length < 3) return null;

  const freq = new Map();
  for (const l of nonEmpty) {
    const lcp = l.codePointAt(0);
    if (lcp < 128 && /\w/.test(l[0])) continue; // skip ASCII word chars
    const key = lcp;
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  let bestCp = null;
  let bestCount = 0;
  for (const [k, n] of freq) {
    if (n > bestCount) {
      bestCount = n;
      bestCp = k;
    }
  }

  const threshold = Math.max(2, Math.ceil(nonEmpty.length * 0.4));
  if (!bestCp || bestCount < threshold) return null;

  const fallback = [];
  for (const l of nonEmpty) {
    if (l.codePointAt(0) === bestCp) {
      const charLen = bestCp > 0xffff ? 2 : 1;
      const text = l.slice(charLen).trim();
      if (text) fallback.push({ text, completed: false });
    }
  }

  return fallback.length >= 2 ? fallback : null;
}


// ────────────────────────────────────────────────────────────────────────────

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

const CODE_COLOR_THEME_OPTIONS = [
  { id: "night-owl", label: "Night Owl" },
  { id: "tokyo", label: "Tokyo Night" },
  { id: "dracula", label: "Dracula" },
  { id: "monokai", label: "Monokai" },
  { id: "nord", label: "Nord" },
  { id: "one-dark", label: "One Dark" },
  { id: "solarized", label: "Solarized Dark" },
  { id: "ayu", label: "Ayu Dark" },
  { id: "github", label: "GitHub Dark" },
  { id: "night-fox", label: "Night Fox" },
  { id: "matrix", label: "Matrix" },
  { id: "everforest", label: "Everforest" },
];

const MIN_TEXT_CONTRAST_RATIO = 3.5;

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (value) => {
  const hex = String(value || "")
    .trim()
    .replace("#", "");
  if (![3, 4, 6, 8].includes(hex.length)) return null;

  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
};

const parseRgbColor = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;

  const parts = match[1]
    .split(",")
    .map((part) => part.trim())
    .map(Number);
  if (parts.length < 3 || parts.some((n, idx) => idx < 3 && Number.isNaN(n))) {
    return null;
  }

  return {
    r: clampChannel(parts[0]),
    g: clampChannel(parts[1]),
    b: clampChannel(parts[2]),
  };
};

const parseColorToRgb = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === "transparent" || normalized === "inherit") {
    return null;
  }
  if (normalized.startsWith("#")) return parseHexColor(normalized);
  if (normalized.startsWith("rgb")) return parseRgbColor(normalized);
  return null;
};

const rgbToCss = ({ r, g, b }) =>
  `rgb(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)})`;

const toLinearSrgb = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ({ r, g, b }) =>
  0.2126 * toLinearSrgb(r) +
  0.7152 * toLinearSrgb(g) +
  0.0722 * toLinearSrgb(b);

const contrastRatio = (a, b) => {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const blendRgb = (from, to, amount) => ({
  r: from.r + (to.r - from.r) * amount,
  g: from.g + (to.g - from.g) * amount,
  b: from.b + (to.b - from.b) * amount,
});

const normalizeTextColorForBackground = (
  rawColor,
  backgroundRgb,
  preferredFgRgb,
  minContrast = MIN_TEXT_CONTRAST_RATIO,
) => {
  const candidate = parseColorToRgb(rawColor);
  if (!candidate || !backgroundRgb) return null;

  if (contrastRatio(candidate, backgroundRgb) >= minContrast) {
    return rgbToCss(candidate);
  }

  const bgIsLight = relativeLuminance(backgroundRgb) > 0.55;
  const fallbackTarget =
    preferredFgRgb ||
    (bgIsLight ? { r: 24, g: 24, b: 24 } : { r: 236, g: 236, b: 236 });

  if (contrastRatio(fallbackTarget, backgroundRgb) >= minContrast) {
    for (let step = 1; step <= 10; step += 1) {
      const mixed = blendRgb(candidate, fallbackTarget, step / 10);
      if (contrastRatio(mixed, backgroundRgb) >= minContrast) {
        return rgbToCss(mixed);
      }
    }
    return rgbToCss(fallbackTarget);
  }

  return rgbToCss(
    bgIsLight ? { r: 20, g: 20, b: 20 } : { r: 240, g: 240, b: 240 },
  );
};

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
  isFullScreen: isFullScreenProp = false,
  onFullScreenChange,
  noteId,
  noteType = "text",
  language: languageProp = "javascript",
  codeColorTheme: codeColorThemeProp = "night-owl",
  showLineNumbers: showLineNumbersProp = false,
  onLanguageChange,
  onCodeColorThemeChange,
  onShowLineNumbersChange,
  onCommitEdit,
  // single-edit control
  isEditing,
  onRequestEdit,
  onExitEdit,
  // folder assignment
  folders = [],
  folderId,
  onMoveNote,
}) => {
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
  const [codeColorTheme, setCodeColorTheme] = useState(
    codeColorThemeProp ?? "night-owl",
  );
  // Show line numbers in code view
  const [showLineNumbers, setShowLineNumbers] = useState(
    Boolean(showLineNumbersProp),
  );
  // Edit mode: controlled by parent when isEditing prop is provided, otherwise local
  const [localEditMode, setLocalEditMode] = useState(false);
  const isEditMode = isEditing !== undefined ? isEditing : localEditMode;
  const [localFullScreenMode, setLocalFullScreenMode] = useState(false);
  const isFullScreen =
    onFullScreenChange !== undefined ? isFullScreenProp : localFullScreenMode;
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

  const commitPendingEdits = useCallback(() => {
    if (!hasPendingEditRef.current) return;
    onCommitEdit?.();
    hasPendingEditRef.current = false;
  }, [onCommitEdit]);

  const stopEdit = useCallback(() => {
    commitPendingEdits();
    if (isEditing !== undefined) {
      onExitEdit?.();
    } else {
      setLocalEditMode(false);
    }
  }, [commitPendingEdits, isEditing, onExitEdit]);

  const openFullScreen = useCallback(() => {
    if (onFullScreenChange !== undefined && noteId != null) {
      onFullScreenChange(String(noteId));
      return;
    }
    setLocalFullScreenMode(true);
  }, [noteId, onFullScreenChange]);

  const closeFullScreen = useCallback(() => {
    if (onFullScreenChange !== undefined) {
      onFullScreenChange(null);
      return;
    }
    setLocalFullScreenMode(false);
  }, [onFullScreenChange]);

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
  const codeEditorRef = useRef(null);
  const codeHighlightLayerRef = useRef(null);
  const codeHighlightRef = useRef(null);
  const codeLineNumbersRef = useRef(null);
  const codeViewRef = useRef(null);
  const codeViewLineNumbersRef = useRef(null);
  const textNoteRef = useRef(null);
  const codeInlineNoteRef = useRef(null);
  const floatingToolbarRef = useRef(null);
  const {
    maybeSnapshot: maybeCodeSnapshot,
    popUndo: popCodeUndo,
    popRedo: popCodeRedo,
  } = useCodeUndo();
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
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [showTablePanel, setShowTablePanel] = useState(false);
  const [showSnippetPanel, setShowSnippetPanel] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showFindReplacePanel, setShowFindReplacePanel] = useState(false);
  const [tableToolsAnchor, setTableToolsAnchor] = useState(null);
  const [toolbarPopoverAnchor, setToolbarPopoverAnchor] = useState(null);
  const [linkInitialUrl, setLinkInitialUrl] = useState("https://");
  const [linkInitialText, setLinkInitialText] = useState("");
  const [linkIsEditingExisting, setLinkIsEditingExisting] = useState(false);
  const [lineHeightValue, setLineHeightValue] = useState("1.65");
  const [findMatchMessage, setFindMatchMessage] = useState("");
  const [isEditorDragOver, setIsEditorDragOver] = useState(false);
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
  const isApplyingAutoColorRef = useRef(false);
  const SNAPSHOT_INTERVAL = 1200; // ms
  const STACK_LIMIT = 50;

  // track last focused area ('title'|'editor'|'other')
  const lastFocusRef = useRef("other");

  const lastEditorRangeRef = useRef(null);
  const lastTitleSelRef = useRef({ start: null, end: null });
  const hasPendingEditRef = useRef(false);
  const activeLinkRef = useRef(null);
  const tableContextRef = useRef(null);
  const activeTableRef = useRef(null);

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

  const getEffectiveThemePalette = useCallback(() => {
    const root = document.documentElement;
    const activeThemeId =
      noteTheme !== "default"
        ? noteTheme
        : Object.keys(THEME_VARS).find((id) =>
            root.classList.contains(`theme-${id}`),
          ) || "default";

    const palette = THEME_VARS[activeThemeId] || THEME_VARS.default;
    const bgFromVars =
      parseColorToRgb(palette?.["--panel-bg-solid"]) ||
      parseColorToRgb(palette?.["--panel-bg"]) ||
      parseColorToRgb(palette?.["--bg"]);
    const fgFromVars = parseColorToRgb(palette?.["--fg"]);

    if (bgFromVars && fgFromVars) {
      return { bg: bgFromVars, fg: fgFromVars };
    }

    const refNode = textNoteRef.current || editorRef.current;
    if (refNode) {
      let walker = refNode;
      while (walker) {
        const styles = window.getComputedStyle(walker);
        const bg = parseColorToRgb(styles.backgroundColor);
        if (bg) {
          return {
            bg,
            fg: parseColorToRgb(styles.color) ||
              fgFromVars || { r: 224, g: 224, b: 224 },
          };
        }
        walker = walker.parentElement;
      }
    }

    return {
      bg: bgFromVars || { r: 16, g: 16, b: 16 },
      fg: fgFromVars || { r: 224, g: 224, b: 224 },
    };
  }, [noteTheme]);

  const runAutoTextColorCorrection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || isApplyingAutoColorRef.current) return;

    const { bg, fg } = getEffectiveThemePalette();
    if (!bg) return;

    const nodes = editor.querySelectorAll('[style*="color"], font[color]');
    let changed = false;

    nodes.forEach((node) => {
      if (node.closest("pre, code")) return;

      const rawColor =
        node.tagName === "FONT"
          ? node.getAttribute("color") || node.style?.color
          : node.style?.color;

      if (!rawColor) return;

      const corrected = normalizeTextColorForBackground(rawColor, bg, fg);
      if (!corrected) return;

      const before = parseColorToRgb(rawColor);
      const after = parseColorToRgb(corrected);
      if (
        before &&
        after &&
        before.r === after.r &&
        before.g === after.g &&
        before.b === after.b
      ) {
        return;
      }

      if (node.tagName === "FONT") node.removeAttribute("color");
      node.style.color = corrected;
      changed = true;
    });

    const correctedPickerColor = normalizeTextColorForBackground(
      textColor,
      bg,
      fg,
    );
    if (correctedPickerColor && correctedPickerColor !== textColor) {
      setTextColor(correctedPickerColor);
    }

    if (!changed) return;

    const correctedHtml = editor.innerHTML;
    if (correctedHtml === value) return;

    isApplyingAutoColorRef.current = true;
    setValue(correctedHtml);
    hasPendingEditRef.current = true;
    if (onChange) onChange(correctedHtml);
    setTimeout(() => {
      isApplyingAutoColorRef.current = false;
    }, 0);
  }, [getEffectiveThemePalette, onChange, textColor, value]);

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
    if (
      codeColorThemeProp !== undefined &&
      codeColorThemeProp !== codeColorTheme
    ) {
      setCodeColorTheme(codeColorThemeProp);
    }
    if (languageProp !== undefined && languageProp !== noteLanguage) {
      setNoteLanguage(languageProp);
    }
    if (showLineNumbersProp !== undefined) {
      const nextShowLineNumbers = Boolean(showLineNumbersProp);
      if (nextShowLineNumbers !== showLineNumbers) {
        setShowLineNumbers(nextShowLineNumbers);
      }
    }
  }, [
    fontProp,
    themeProp,
    fontSize,
    codeColorThemeProp,
    languageProp,
    showLineNumbersProp,
    noteFont,
    noteTheme,
    noteFontSize,
    codeColorTheme,
    noteLanguage,
    showLineNumbers,
  ]);

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

  useEffect(() => {
    if (!editorRef.current) return;
    const rafId = requestAnimationFrame(() => {
      runAutoTextColorCorrection();
    });
    return () => cancelAnimationFrame(rafId);
  }, [noteTheme, runAutoTextColorCorrection]);

  useEffect(() => {
    if (noteTheme !== "default") return undefined;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      runAutoTextColorCorrection();
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, [noteTheme, runAutoTextColorCorrection]);

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
    hasPendingEditRef.current = true;
    if (onChange) onChange(newValue);
  };

  // Toolbar formatting (execCommand)
  const handleFormat = (cmd, val = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const savedRange = lastEditorRangeRef.current;
    if (
      savedRange &&
      editorRef.current.contains(savedRange.commonAncestorContainer)
    ) {
      restoreEditorSelection(savedRange);
    }

    if (cmd === "italic") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          if (!range.collapsed) {
            let italicAncestor = range.commonAncestorContainer;
            if (italicAncestor?.nodeType === Node.TEXT_NODE) {
              italicAncestor = italicAncestor.parentNode;
            }
            while (italicAncestor && italicAncestor !== editorRef.current) {
              if (
                italicAncestor.nodeName === "EM" ||
                italicAncestor.nodeName === "I"
              ) {
                const parent = italicAncestor.parentNode;
                while (italicAncestor.firstChild) {
                  parent.insertBefore(
                    italicAncestor.firstChild,
                    italicAncestor,
                  );
                }
                parent.removeChild(italicAncestor);
                handleInput();
                return;
              }
              italicAncestor = italicAncestor.parentNode;
            }

            const wrapper = document.createElement("em");
            wrapper.appendChild(range.extractContents());
            range.insertNode(wrapper);

            const nextRange = document.createRange();
            nextRange.selectNodeContents(wrapper);
            sel.removeAllRanges();
            sel.addRange(nextRange);
            lastEditorRangeRef.current = nextRange.cloneRange();
            handleInput();
            return;
          }
        }
      }
    }

    document.execCommand("styleWithCSS", false, false);
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const handleFormattingShortcut = (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if (!meta || e.altKey) return false;

    const key = String(e.key || "").toLowerCase();
    if (key === "b" || key === "i" || key === "u") {
      e.preventDefault();
      e.stopPropagation();
      const command =
        key === "b" ? "bold" : key === "i" ? "italic" : "underline";
      handleFormat(command);
      return true;
    }

    if (key === "x" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleFormat("strikeThrough");
      return true;
    }

    if (key === "l" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleFormat("justifyLeft");
      return true;
    }

    if (key === "e" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleFormat("justifyCenter");
      return true;
    }

    if (key === "r" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleFormat("justifyRight");
      return true;
    }

    if (key === "j" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleFormat("justifyFull");
      return true;
    }

    if (key === "k" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleInsertLink();
      return true;
    }

    if (key === "f" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      openFindReplacePanel();
      return true;
    }

    return false;
  };

  const handleInsertCodeSnippet = () => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    const savedRange = lastEditorRangeRef.current;
    if (
      savedRange &&
      editorRef.current.contains(savedRange.commonAncestorContainer)
    ) {
      restoreEditorSelection(savedRange);
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    const pre = document.createElement("pre");
    pre.className = "note-inline-snippet";
    const snippetLangId = noteLanguage || "snippet";
    const snippetLangLabel =
      LANGUAGE_OPTIONS.find((opt) => opt.id === snippetLangId)?.label ||
      snippetLangId;
    pre.setAttribute("data-language", snippetLangId);

    const code = document.createElement("code");
    code.setAttribute(
      "data-placeholder",
      `Start writing ${snippetLangLabel}...`,
    );
    code.textContent = "";
    pre.appendChild(code);

    range.deleteContents();
    range.insertNode(pre);

    const spacer = document.createElement("p");
    spacer.innerHTML = "<br>";
    pre.parentNode.insertBefore(spacer, pre.nextSibling);

    const caret = document.createRange();
    caret.selectNodeContents(code);
    caret.collapse(false);
    sel.removeAllRanges();
    sel.addRange(caret);
    lastEditorRangeRef.current = caret.cloneRange();

    setShowSnippetPanel(false);
    handleInput();
  };

  const getActiveSnippetBlock = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return null;

    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    if (!editorRef.current.contains(node)) return null;

    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== editorRef.current) {
      if (
        node.nodeName === "PRE" &&
        node.classList?.contains("note-inline-snippet")
      ) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  const insertTextAtSelection = (text) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    lastEditorRangeRef.current = range.cloneRange();
    handleInput();
  };

  const getActiveLinkElement = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return null;
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    if (!editorRef.current.contains(node)) return null;

    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === "A") return node;
      node = node.parentNode;
    }
    return null;
  };

  const focusEditorWithSavedRange = () => {
    if (
      lastEditorRangeRef.current &&
      editorRef.current?.contains(
        lastEditorRangeRef.current.commonAncestorContainer,
      )
    ) {
      editorRef.current.focus();
      restoreEditorSelection(lastEditorRangeRef.current);
    } else {
      editorRef.current?.focus();
    }
  };

  const positionToolbarPopoverFromToggle = (event) => {
    const toggleRect = event?.currentTarget?.getBoundingClientRect?.();
    const toolbarRect = floatingToolbarRef.current?.getBoundingClientRect?.();
    if (!toggleRect || !toolbarRect) {
      setToolbarPopoverAnchor(null);
      return;
    }

    const popoverWidth = 248;
    const margin = 8;
    const anchorCenterX =
      toggleRect.left - toolbarRect.left + toggleRect.width / 2;
    const minCenterX = popoverWidth / 2 + margin;
    const maxCenterX = toolbarRect.width - popoverWidth / 2 - margin;
    const clampedCenterX = Math.max(
      minCenterX,
      Math.min(anchorCenterX, maxCenterX),
    );
    setToolbarPopoverAnchor({
      x: clampedCenterX,
    });
  };

  const handleInsertLink = (event = null) => {
    if (event) positionToolbarPopoverFromToggle(event);
    else setToolbarPopoverAnchor(null);
    const savedRange = saveEditorSelection();
    if (savedRange) {
      lastEditorRangeRef.current = savedRange;
    }

    const sel = window.getSelection();
    const selectedText =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).toString().trim() : "";

    const activeLink = getActiveLinkElement();
    activeLinkRef.current = activeLink;

    if (activeLink) {
      setLinkInitialUrl(activeLink.getAttribute("href") || "https://");
      setLinkInitialText(activeLink.textContent || "");
      setLinkIsEditingExisting(true);
    } else {
      setLinkInitialUrl("https://");
      setLinkInitialText(selectedText || "");
      setLinkIsEditingExisting(false);
    }

    setShowTablePanel(false);
    setShowSnippetPanel(false);
    setShowImagePanel(false);
    setShowFindReplacePanel(false);
    setShowLinkPanel(true);
  };

  const applyLinkInsertion = (draftUrl, draftText) => {
    let href = draftUrl.trim();
    if (!href) return;

    if (
      !/^https?:\/\//i.test(href) &&
      !/^mailto:/i.test(href) &&
      !/^tel:/i.test(href)
    ) {
      href = `https://${href}`;
    }

    const linkText =
      draftText.trim() || href.replace(/^https?:\/\//i, "") || href;

    const escapedText = String(linkText)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const escapedHref = href
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    focusEditorWithSavedRange();

    const activeLink = getActiveLinkElement() || activeLinkRef.current;
    if (activeLink && editorRef.current?.contains(activeLink)) {
      activeLink.setAttribute("href", href);
      activeLink.setAttribute("target", "_blank");
      activeLink.setAttribute("rel", "noopener noreferrer");
      if (draftText.trim()) {
        activeLink.textContent = draftText.trim();
      }
      handleInput();
    } else {
      handleFormat(
        "insertHTML",
        `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`,
      );
    }

    activeLinkRef.current = null;
    setLinkIsEditingExisting(false);
    setShowLinkPanel(false);
  };

  const removeActiveLink = () => {
    const activeLink = getActiveLinkElement() || activeLinkRef.current;
    if (!activeLink || !editorRef.current?.contains(activeLink)) {
      setShowLinkPanel(false);
      return;
    }

    const parent = activeLink.parentNode;
    while (activeLink.firstChild) {
      parent.insertBefore(activeLink.firstChild, activeLink);
    }
    parent.removeChild(activeLink);

    activeLinkRef.current = null;
    setLinkIsEditingExisting(false);
    setShowLinkPanel(false);
    handleInput();
  };

  const handleInsertImage = (event = null) => {
    if (event) positionToolbarPopoverFromToggle(event);
    else setToolbarPopoverAnchor(null);
    const savedRange = saveEditorSelection();
    if (savedRange) {
      lastEditorRangeRef.current = savedRange;
    }

    setShowLinkPanel(false);
    setShowTablePanel(false);
    setShowSnippetPanel(false);
    setShowFindReplacePanel(false);
    setShowImagePanel(true);
  };

  const insertImageHtml = (src, alt = "") => {
    const escapedSrc = String(src)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const escapedAlt = String(alt)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    handleFormat(
      "insertHTML",
      `<figure class="note-inline-image"><img src="${escapedSrc}" alt="${escapedAlt}" loading="lazy" /><figcaption contenteditable="true">${escapedAlt || "Add a caption..."}</figcaption></figure><p><br></p>`,
    );
  };

  const applyImageInsertion = (draftUrl, draftAlt) => {
    let src = draftUrl.trim();
    if (!src) return;
    if (!/^https?:\/\//i.test(src) && !/^data:image\//i.test(src)) {
      src = `https://${src}`;
    }

    focusEditorWithSavedRange();
    insertImageHtml(src, draftAlt.trim());
    setShowImagePanel(false);
  };

  const insertImageFiles = (files) => {
    const imageFiles = Array.from(files || []).filter((f) =>
      String(f.type || "").startsWith("image/"),
    );
    if (imageFiles.length === 0) return;

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl) return;
        focusEditorWithSavedRange();
        insertImageHtml(dataUrl, file.name || "Image");
      };
      reader.readAsDataURL(file);
    });

    setShowImagePanel(false);
    setIsEditorDragOver(false);
  };

  const handleInsertTable = (event) => {
    positionToolbarPopoverFromToggle(event);
    const savedRange = saveEditorSelection();
    if (savedRange) {
      lastEditorRangeRef.current = savedRange;
    }

    setShowLinkPanel(false);
    setShowSnippetPanel(false);
    setShowTablePanel(true);
  };

  const handleOpenSnippetPanel = (event) => {
    positionToolbarPopoverFromToggle(event);
    const savedRange = saveEditorSelection();
    if (savedRange) {
      lastEditorRangeRef.current = savedRange;
    }

    setShowLinkPanel(false);
    setShowTablePanel(false);
    setShowImagePanel(false);
    setShowFindReplacePanel(false);
    setShowSnippetPanel(true);
  };

  const getTableContext = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return null;
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    if (!editorRef.current.contains(node)) return null;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    let cell = null;
    let row = null;
    let table = null;
    while (node && node !== editorRef.current) {
      if (!cell && ["TD", "TH"].includes(node.nodeName)) cell = node;
      if (!row && node.nodeName === "TR") row = node;
      if (!table && node.nodeName === "TABLE") {
        table = node;
        break;
      }
      node = node.parentNode;
    }

    if (!table) return null;
    const rowIndex = row ? Array.from(table.rows).indexOf(row) : -1;
    const cellIndex = row && cell ? Array.from(row.cells).indexOf(cell) : -1;
    return { table, row, cell, rowIndex, cellIndex };
  };

  const setActiveTable = (table) => {
    if (activeTableRef.current && activeTableRef.current !== table) {
      activeTableRef.current.removeAttribute("data-table-tools-active");
    }
    if (!table) {
      activeTableRef.current = null;
      return;
    }
    table.setAttribute("data-table-tools-active", "true");
    activeTableRef.current = table;
  };

  const focusTableCell = (cell) => {
    if (!cell) return;
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    lastEditorRangeRef.current = range.cloneRange();
  };

  const editTable = (action) => {
    focusEditorWithSavedRange();

    const liveContext = getTableContext();
    const savedContext =
      tableContextRef.current?.table &&
      editorRef.current?.contains(tableContextRef.current.table)
        ? tableContextRef.current
        : null;
    const markedTable =
      activeTableRef.current &&
      editorRef.current?.contains(activeTableRef.current)
        ? activeTableRef.current
        : null;

    const context =
      liveContext ||
      savedContext ||
      (markedTable
        ? {
            table: markedTable,
            row: markedTable.rows[0] || null,
            cell: markedTable.rows[0]?.cells[0] || null,
            rowIndex: 0,
            cellIndex: 0,
          }
        : null);
    if (!context) {
      setFindMatchMessage("Place the caret inside a table first.");
      return;
    }

    const { table, row, rowIndex, cellIndex } = context;
    setActiveTable(table);
    const rowCount = table.rows.length;
    const safeCellIndex = Math.max(0, cellIndex);

    if (action === "row-above" || action === "row-below") {
      const insertIndex = action === "row-above" ? rowIndex : rowIndex + 1;
      const newRow = table.insertRow(insertIndex);
      const templateCells = row
        ? row.cells.length
        : table.rows[0]?.cells.length || 1;
      for (let i = 0; i < templateCells; i += 1) {
        const cell = document.createElement("td");
        cell.innerHTML = "<br>";
        newRow.appendChild(cell);
      }
      focusTableCell(newRow.cells[safeCellIndex] || newRow.cells[0]);
    }

    if (action === "delete-row" && rowCount > 1 && row) {
      table.deleteRow(rowIndex);
      const targetRow = table.rows[Math.min(rowIndex, table.rows.length - 1)];
      focusTableCell(
        targetRow?.cells[Math.min(safeCellIndex, targetRow.cells.length - 1)],
      );
    }

    if (action === "col-left" || action === "col-right") {
      const insertIndex =
        action === "col-left" ? safeCellIndex : safeCellIndex + 1;
      Array.from(table.rows).forEach((tr, idx) => {
        const cellTag = idx === 0 && tr.querySelector("th") ? "th" : "td";
        const newCell = document.createElement(cellTag);
        newCell.innerHTML = idx === 0 ? "Column" : "<br>";
        tr.insertBefore(newCell, tr.cells[insertIndex] || null);
      });
      const targetRow = table.rows[Math.max(1, rowIndex)] || table.rows[0];
      focusTableCell(targetRow?.cells[insertIndex]);
    }

    if (action === "delete-col") {
      const colCount = table.rows[0]?.cells.length || 0;
      if (colCount > 1) {
        Array.from(table.rows).forEach((tr) => {
          if (tr.cells[safeCellIndex]) tr.deleteCell(safeCellIndex);
        });
      }
      const targetRow =
        table.rows[Math.min(Math.max(rowIndex, 0), table.rows.length - 1)];
      const nextCellIndex = Math.max(
        0,
        Math.min(safeCellIndex, (targetRow?.cells.length || 1) - 1),
      );
      focusTableCell(targetRow?.cells[nextCellIndex]);
    }

    if (action === "delete-table") {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      table.parentNode.insertBefore(p, table.nextSibling);
      table.parentNode.removeChild(table);
      setActiveTable(null);
      tableContextRef.current = null;
      focusTableCell(null);
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      lastEditorRangeRef.current = range.cloneRange();
    }

    handleInput();
  };

  const openFindReplacePanel = (event = null) => {
    if (event) positionToolbarPopoverFromToggle(event);
    else setToolbarPopoverAnchor(null);
    setShowLinkPanel(false);
    setShowTablePanel(false);
    setShowSnippetPanel(false);
    setShowImagePanel(false);
    setShowFindReplacePanel(true);
    setFindMatchMessage("");
  };

  useEffect(() => {
    if (!isEditMode) {
      setTableToolsAnchor(null);
      tableContextRef.current = null;
      setActiveTable(null);
      return;
    }

    const updateInlineTableTools = () => {
      const context = getTableContext();
      if (!context?.table) {
        setTableToolsAnchor(null);
        tableContextRef.current = null;
        setActiveTable(null);
        return;
      }

      tableContextRef.current = context;
      setActiveTable(context.table);

      const rect = context.table.getBoundingClientRect();
      const left = Math.max(
        12,
        Math.min(rect.right - 10, window.innerWidth - 12),
      );
      const top = Math.max(12, rect.top - 10);
      setTableToolsAnchor({ left, top });
    };

    let rafId = null;
    const scheduleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateInlineTableTools);
    };

    scheduleUpdate();
    document.addEventListener("selectionchange", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("selectionchange", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      setActiveTable(null);
    };
  }, [isEditMode, value]);

  useEffect(() => {
    if (isEditMode) return;
    setShowLinkPanel(false);
    setShowTablePanel(false);
    setShowSnippetPanel(false);
    setShowImagePanel(false);
    setShowFindReplacePanel(false);
    setToolbarPopoverAnchor(null);
  }, [isEditMode]);

  const findNextMatch = (query, caseSensitive, direction = 1) => {
    const editor = editorRef.current;
    if (!editor || !query.trim()) return;

    const textNodes = [];
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null,
    );
    let allText = "";
    while (walker.nextNode()) {
      const node = walker.currentNode;
      textNodes.push({ node, start: allText.length });
      allText += node.nodeValue || "";
    }

    const haystack = caseSensitive ? allText : allText.toLowerCase();
    const needle = caseSensitive ? query : query.toLowerCase();
    if (!needle) return;

    const sel = window.getSelection();
    let cursor = direction > 0 ? 0 : haystack.length;
    if (
      sel &&
      sel.rangeCount > 0 &&
      editor.contains(sel.anchorNode) &&
      editor.contains(sel.focusNode)
    ) {
      const range = sel.getRangeAt(0);
      const before = document.createRange();
      before.selectNodeContents(editor);
      before.setEnd(range.startContainer, range.startOffset);
      cursor = before.toString().length;
      if (direction > 0) cursor += range.toString().length;
    }

    let matchIndex =
      direction > 0
        ? haystack.indexOf(needle, cursor)
        : haystack.lastIndexOf(needle, cursor - 1);

    if (matchIndex === -1) {
      matchIndex =
        direction > 0
          ? haystack.indexOf(needle, 0)
          : haystack.lastIndexOf(needle, haystack.length);
    }

    if (matchIndex === -1) {
      setFindMatchMessage("No matches found.");
      return;
    }

    const targetRange = buildRangeInNodeByChars(
      editor,
      matchIndex,
      matchIndex + needle.length,
    );
    if (!targetRange) {
      setFindMatchMessage("Unable to select match.");
      return;
    }

    sel.removeAllRanges();
    sel.addRange(targetRange);
    lastEditorRangeRef.current = targetRange.cloneRange();
    targetRange.startContainer.parentElement?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
    setFindMatchMessage("Match selected.");
  };

  const replaceCurrentMatch = (query, replacement, caseSensitive) => {
    const sel = window.getSelection();
    const selectedText = sel?.toString?.() || "";
    if (!query.trim() || !sel || sel.rangeCount === 0) return;
    const matchesCurrent = caseSensitive
      ? selectedText === query
      : selectedText.toLowerCase() === query.toLowerCase();
    if (!matchesCurrent || !editorRef.current?.contains(sel.anchorNode)) {
      setFindMatchMessage("Select a matching result before replacing.");
      return;
    }

    const range = sel.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(replacement);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    lastEditorRangeRef.current = range.cloneRange();
    handleInput();
    findNextMatch(query, caseSensitive, 1);
  };

  const replaceAllMatches = (query, replacement, caseSensitive) => {
    const editor = editorRef.current;
    if (!editor || !query.trim()) return;
    const flags = caseSensitive ? "g" : "gi";
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, flags);

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null,
    );
    let replaced = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const original = node.nodeValue || "";
      let nodeReplacedCount = 0;
      const nextValue = original.replace(re, () => {
        nodeReplacedCount += 1;
        return replacement;
      });
      if (nodeReplacedCount > 0) {
        node.nodeValue = nextValue;
        replaced += nodeReplacedCount;
      }
    }

    if (replaced > 0) {
      handleInput();
      setFindMatchMessage(
        `Replaced ${replaced} match${replaced === 1 ? "" : "es"}.`,
      );
    } else {
      setFindMatchMessage("No matches found.");
    }
  };

  const applyLineHeightToSelection = (nextValue) => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    const block = getClosestBlock(range.startContainer);
    if (!block || block === editor) return;
    block.style.lineHeight = nextValue;
    setLineHeightValue(nextValue);
    handleInput();
  };

  const applyTableInsertion = (draftColumns, draftRows) => {
    const columnCount = Math.min(
      8,
      Math.max(1, parseInt(draftColumns, 10) || 3),
    );
    const rowCount = Math.min(20, Math.max(1, parseInt(draftRows, 10) || 3));

    const headerCells = Array.from(
      { length: columnCount },
      (_, idx) => `<th>Column ${idx + 1}</th>`,
    ).join("");
    const bodyRows = Array.from({ length: rowCount }, () => {
      const cells = Array.from(
        { length: columnCount },
        () => "<td><br></td>",
      ).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const tableHTML = `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`;

    focusEditorWithSavedRange();

    handleFormat("insertHTML", tableHTML);
    setShowTablePanel(false);
  };

  // Restore last editor selection then apply a color command
  const applyColorFormat = (cmd, color) => {
    focusEditorWithSavedRange();
    if (cmd === "foreColor") {
      const { bg, fg } = getEffectiveThemePalette();
      const correctedColor =
        normalizeTextColorForBackground(color, bg, fg) || color;
      setTextColor(correctedColor);
      handleFormat(cmd, correctedColor);
      return;
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
    hasPendingEditRef.current = true;
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
      hasPendingEditRef.current = true;
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
    hasPendingEditRef.current = true;
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
      hasPendingEditRef.current = true;
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
    hasPendingEditRef.current = true;
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
    if (getActiveSnippetBlock()) return false;

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
    if (getActiveSnippetBlock()) return false;

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

    const activeSnippet = getActiveSnippetBlock();
    if (activeSnippet) {
      if (e.key === "Tab") {
        e.preventDefault();
        insertTextAtSelection("  ");
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        insertTextAtSelection("\n");
        return;
      }
    }

    if (handleFormattingShortcut(e)) {
      return;
    }

    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.altKey && !e.shiftKey) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleFormat("indent");
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleFormat("outdent");
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        editTable("row-below");
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        editTable("row-above");
        return;
      }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
      handleInput();
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

  const updateCodeHighlight = useCallback(
    (nextValue, forcedLanguage) => {
      const highlight = codeHighlightRef.current;
      if (!highlight) return;
      const lang = forcedLanguage || noteLanguage;
      try {
        highlight.innerHTML = hljs.highlight(nextValue || "", {
          language: lang,
          ignoreIllegals: true,
        }).value;
      } catch {
        highlight.innerHTML = hljs.highlightAuto(nextValue || "").value;
      }
    },
    [noteLanguage],
  );

  const syncCodeEditorLayers = useCallback(() => {
    const editor = codeEditorRef.current;
    const highlightLayer = codeHighlightLayerRef.current;
    if (!editor || !highlightLayer) return;

    const highlightCode = codeHighlightRef.current;
    if (highlightCode) {
      const editorStyles = window.getComputedStyle(editor);
      const editorPaddingTop = parseFloat(editorStyles.paddingTop) || 0;
      const editorPaddingBottom = parseFloat(editorStyles.paddingBottom) || 0;
      const desiredCodeHeight = Math.max(
        0,
        editor.scrollHeight - editorPaddingTop - editorPaddingBottom,
      );
      highlightCode.style.minHeight = `${desiredCodeHeight}px`;
    }

    const editorMaxY = Math.max(1, editor.scrollHeight - editor.clientHeight);
    const editorMaxX = Math.max(1, editor.scrollWidth - editor.clientWidth);
    const highlightMaxY = Math.max(
      0,
      highlightLayer.scrollHeight - highlightLayer.clientHeight,
    );
    const highlightMaxX = Math.max(
      0,
      highlightLayer.scrollWidth - highlightLayer.clientWidth,
    );

    const yRatio = editor.scrollTop / editorMaxY;
    const xRatio = editor.scrollLeft / editorMaxX;

    highlightLayer.scrollTop = highlightMaxY * yRatio;
    highlightLayer.scrollLeft = highlightMaxX * xRatio;

    if (codeLineNumbersRef.current) {
      codeLineNumbersRef.current.scrollTop = editor.scrollTop;
    }
  }, []);

  const revealCodeCaret = useCallback(
    (selectionStart = null, sourceText = null) => {
      const editor = codeEditorRef.current;
      if (!editor) return;

      const caretIndex =
        typeof selectionStart === "number"
          ? selectionStart
          : (editor.selectionStart ?? 0);
      const activeText =
        typeof sourceText === "string" ? sourceText : editor.value || "";
      const beforeCaret = activeText.slice(0, Math.max(0, caretIndex));
      const lineIndex = beforeCaret.split("\n").length - 1;

      const computed = window.getComputedStyle(editor);
      const lineHeight = parseFloat(computed.lineHeight) || 23;
      const paddingTop = parseFloat(computed.paddingTop) || 0;
      const paddingBottom = parseFloat(computed.paddingBottom) || 0;

      const caretY = paddingTop + lineIndex * lineHeight;
      const visibleTop = editor.scrollTop;
      const visibleBottom =
        editor.scrollTop + editor.clientHeight - paddingBottom;
      const bottomThreshold = visibleBottom - lineHeight * 1.1;

      if (caretY >= bottomThreshold) {
        editor.scrollTop = Math.max(
          0,
          caretY - (editor.clientHeight - paddingBottom - lineHeight * 1.2),
        );
      } else if (caretY < visibleTop + paddingTop) {
        editor.scrollTop = Math.max(0, caretY - paddingTop);
      }

      syncCodeEditorLayers();
    },
    [syncCodeEditorLayers],
  );

  const runAfterCodeLayout = useCallback((cb) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cb?.();
      });
    });
  }, []);

  const commitCodeValue = useCallback(
    (
      nextValue,
      nextSelectionStart = null,
      nextSelectionEnd = nextSelectionStart,
      options = {},
    ) => {
      const { revealCaret = false } = options;
      const previousValue = value;
      const nextText = String(nextValue || "").replace(/<[^>]+>/g, "");
      if (previousValue !== nextValue) {
        maybeCodeSnapshot(previousValue, nextText);
        hasPendingEditRef.current = true;
      }

      setValue(nextValue);
      updateCodeHighlight(nextValue);
      if (onChange) onChange(nextValue);

      if (nextSelectionStart != null && codeEditorRef.current) {
        requestAnimationFrame(() => {
          const editor = codeEditorRef.current;
          if (!editor) return;
          editor.selectionStart = nextSelectionStart;
          editor.selectionEnd = nextSelectionEnd ?? nextSelectionStart;
          runAfterCodeLayout(() => {
            if (revealCaret) {
              revealCodeCaret(nextSelectionStart, nextValue);
            } else {
              syncCodeEditorLayers();
            }
          });
        });
      } else {
        runAfterCodeLayout(() => {
          if (revealCaret) {
            revealCodeCaret(null, nextValue);
          } else {
            syncCodeEditorLayers();
          }
        });
      }
    },
    [
      maybeCodeSnapshot,
      onChange,
      revealCodeCaret,
      runAfterCodeLayout,
      syncCodeEditorLayers,
      updateCodeHighlight,
      value,
    ],
  );

  const undoCode = useCallback(() => {
    const previousValue = popCodeUndo(value);
    if (previousValue === null) return;
    setValue(previousValue);
    updateCodeHighlight(previousValue);
    if (onChange) onChange(previousValue);
  }, [onChange, popCodeUndo, updateCodeHighlight, value]);

  const redoCode = useCallback(() => {
    const nextValue = popCodeRedo(value);
    if (nextValue === null) return;
    setValue(nextValue);
    updateCodeHighlight(nextValue);
    if (onChange) onChange(nextValue);
  }, [onChange, popCodeRedo, updateCodeHighlight, value]);

  const handleCodeEditorKeyDown = (e) => {
    const ta = e.target;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const indentUnit = "  ";
    const isMeta = e.metaKey || e.ctrlKey;

    if (isMeta && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      e.stopPropagation();
      undoCode();
      return;
    }

    if (
      (isMeta && e.shiftKey && (e.key === "z" || e.key === "Z")) ||
      (isMeta && (e.key === "y" || e.key === "Y"))
    ) {
      e.preventDefault();
      e.stopPropagation();
      redoCode();
      return;
    }

    if (isMeta && (e.key === "s" || e.key === "S" || e.key === "Enter")) {
      e.preventDefault();
      e.stopPropagation();
      if (isFullScreen) closeFullScreen();
      stopEdit();
      return;
    }

    const setCodeValue = (
      nextValue,
      nextStart,
      nextEnd = nextStart,
      options = {},
    ) => {
      commitCodeValue(nextValue, nextStart, nextEnd, options);
    };

    const lineStartAt = (pos) => {
      const idx = value.lastIndexOf("\n", Math.max(0, pos - 1));
      return idx === -1 ? 0 : idx + 1;
    };

    const lineEndAt = (pos) => {
      const idx = value.indexOf("\n", pos);
      return idx === -1 ? value.length : idx;
    };

    if (isMeta && (e.key === "]" || e.key === "[")) {
      e.preventDefault();
      const outdent = e.key === "[";
      const blockStart = lineStartAt(start);
      const blockEnd = lineEndAt(end);
      const block = value.slice(blockStart, blockEnd);
      const lines = block.split("\n");

      if (outdent) {
        let removedTotal = 0;
        const updated = lines.map((line) => {
          if (line.startsWith(indentUnit)) {
            removedTotal += indentUnit.length;
            return line.slice(indentUnit.length);
          }
          if (line.startsWith("\t")) {
            removedTotal += 1;
            return line.slice(1);
          }
          return line;
        });
        const newBlock = updated.join("\n");
        const newValue =
          value.slice(0, blockStart) + newBlock + value.slice(blockEnd);
        setCodeValue(
          newValue,
          Math.max(blockStart, start - indentUnit.length),
          Math.max(blockStart, end - removedTotal),
        );
      } else {
        const updated = lines.map((line) => `${indentUnit}${line}`);
        const newBlock = updated.join("\n");
        const newValue =
          value.slice(0, blockStart) + newBlock + value.slice(blockEnd);
        const addedTotal = lines.length * indentUnit.length;
        setCodeValue(newValue, start + indentUnit.length, end + addedTotal);
      }
      return;
    }

    if (isMeta && (e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (start !== end) {
        const selected = value.slice(start, end);
        const newValue = value.slice(0, end) + selected + value.slice(end);
        setCodeValue(newValue, end, end + selected.length);
        return;
      }

      const lineStart = lineStartAt(start);
      const lineEnd = lineEndAt(start);
      const lineText = value.slice(lineStart, lineEnd);
      const newline = lineEnd < value.length ? "\n" : "";
      const insertText = `${lineText}${newline}`;
      const newValue =
        value.slice(0, lineEnd) + insertText + value.slice(lineEnd);
      const nextCaret = lineEnd + insertText.length;
      setCodeValue(newValue, nextCaret);
      return;
    }

    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const blockStart = lineStartAt(start);
      const blockEnd = lineEndAt(end);
      const block = value.slice(blockStart, blockEnd);

      if (e.key === "ArrowUp") {
        if (blockStart === 0) return;
        const prevLineStart = lineStartAt(blockStart - 1);
        const prevLine = value.slice(prevLineStart, blockStart - 1);
        const before = value.slice(0, prevLineStart);
        const after = value.slice(blockEnd);
        const swapped = `${before}${block}\n${prevLine}${after}`;
        const shift = prevLine.length + 1;
        setCodeValue(
          swapped,
          Math.max(0, start - shift),
          Math.max(0, end - shift),
        );
      } else {
        if (blockEnd >= value.length) return;
        const nextLineEnd = lineEndAt(blockEnd + 1);
        const nextLine = value.slice(blockEnd + 1, nextLineEnd);
        const before = value.slice(0, blockStart);
        const after = value.slice(nextLineEnd);
        const swapped = `${before}${nextLine}\n${block}${after}`;
        const shift = nextLine.length + 1;
        setCodeValue(swapped, start + shift, end + shift);
      }
      return;
    }

    if (
      e.key === ">" &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      start === end
    ) {
      const lang = String(noteLanguage || "").toLowerCase();
      const isMarkupLang = ["html", "xml", "xhtml", "svg"].includes(lang);
      if (isMarkupLang) {
        const before = value.slice(0, start);
        const after = value.slice(end);
        const openerMatch = before.match(/<([A-Za-z][\w:-]*)(?:\s[^<>]*)?$/);
        if (openerMatch && !before.endsWith("/")) {
          const tagName = openerMatch[1];
          const lowerTag = tagName.toLowerCase();
          const voidTags = new Set([
            "area",
            "base",
            "br",
            "col",
            "embed",
            "hr",
            "img",
            "input",
            "link",
            "meta",
            "param",
            "source",
            "track",
            "wbr",
          ]);
          if (!voidTags.has(lowerTag)) {
            e.preventDefault();
            const insert = `></${tagName}>`;
            const newValue = before + insert + after;
            setCodeValue(newValue, start + 1);
            return;
          }
        }
      }
    }

    if (isMeta && e.key === "/") {
      e.preventDefault();
      const blockStart = lineStartAt(start);
      const blockEnd = lineEndAt(end);
      const block = value.slice(blockStart, blockEnd);
      const lines = block.split("\n");
      const commentPrefix = "// ";
      const shouldUncomment = lines.every(
        (line) => line.trim().length === 0 || /^\s*\/\//.test(line),
      );

      const updatedLines = lines.map((line) => {
        if (line.trim().length === 0) return line;
        if (shouldUncomment) {
          return line.replace(/^(\s*)\/\/\s?/, "$1");
        }
        const leading = (line.match(/^\s*/) || [""])[0];
        return `${leading}${commentPrefix}${line.slice(leading.length)}`;
      });

      const newBlock = updatedLines.join("\n");
      const newValue =
        value.slice(0, blockStart) + newBlock + value.slice(blockEnd);
      setCodeValue(newValue, blockStart, blockStart + newBlock.length);
      return;
    }

    const openToClose = {
      "(": ")",
      "[": "]",
      "{": "}",
      '"': '"',
      "'": "'",
      "`": "`",
    };
    const closingChars = new Set(Object.values(openToClose));

    if (
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      Object.prototype.hasOwnProperty.call(openToClose, e.key)
    ) {
      e.preventDefault();
      const close = openToClose[e.key];
      const selected = value.slice(start, end);
      const wrapped = `${e.key}${selected}${close}`;
      const newValue = value.slice(0, start) + wrapped + value.slice(end);
      if (start !== end) {
        setCodeValue(newValue, start + 1, start + 1 + selected.length);
      } else {
        setCodeValue(newValue, start + 1);
      }
      return;
    }

    if (
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      start === end &&
      closingChars.has(e.key) &&
      value[start] === e.key
    ) {
      e.preventDefault();
      setCodeValue(value, start + 1);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();

      if (start !== end && value.slice(start, end).includes("\n")) {
        const blockStart = lineStartAt(start);
        const blockEnd = lineEndAt(end);
        const block = value.slice(blockStart, blockEnd);
        const lines = block.split("\n");

        if (e.shiftKey) {
          let removedFromFirstLine = 0;
          let removedTotal = 0;
          const outdented = lines.map((line, idx) => {
            if (line.startsWith(indentUnit)) {
              if (idx === 0) removedFromFirstLine = indentUnit.length;
              removedTotal += indentUnit.length;
              return line.slice(indentUnit.length);
            }
            if (line.startsWith("\t")) {
              if (idx === 0) removedFromFirstLine = 1;
              removedTotal += 1;
              return line.slice(1);
            }
            return line;
          });
          const newBlock = outdented.join("\n");
          const newValue =
            value.slice(0, blockStart) + newBlock + value.slice(blockEnd);
          setCodeValue(
            newValue,
            Math.max(blockStart, start - removedFromFirstLine),
            Math.max(blockStart, end - removedTotal),
          );
        } else {
          const indented = lines.map((line) => `${indentUnit}${line}`);
          const newBlock = indented.join("\n");
          const newValue =
            value.slice(0, blockStart) + newBlock + value.slice(blockEnd);
          const addedTotal = lines.length * indentUnit.length;
          setCodeValue(newValue, start + indentUnit.length, end + addedTotal);
        }
        return;
      }

      if (e.shiftKey) {
        const lineStart = lineStartAt(start);
        const beforeCaret = value.slice(lineStart, start);
        if (beforeCaret.endsWith(indentUnit) || beforeCaret.endsWith("\t")) {
          const removeLen = beforeCaret.endsWith(indentUnit)
            ? indentUnit.length
            : 1;
          const newValue = value.slice(0, start - removeLen) + value.slice(end);
          setCodeValue(newValue, start - removeLen);
        }
        return;
      }

      const newValue = value.slice(0, start) + indentUnit + value.slice(end);
      setCodeValue(newValue, start + indentUnit.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const lineStart = lineStartAt(start);
      const currentLine = value.slice(lineStart, start);
      const leadingWhitespace = (currentLine.match(/^[\t ]*/) || [""])[0];
      const trimmedLine = currentLine.trimEnd();
      const prevChar = start > 0 ? value[start - 1] : "";
      const nextChar = start < value.length ? value[start] : "";

      if (
        start === end &&
        ((prevChar === "{" && nextChar === "}") ||
          (prevChar === "[" && nextChar === "]") ||
          (prevChar === "(" && nextChar === ")"))
      ) {
        const insert = `\n${leadingWhitespace}${indentUnit}\n${leadingWhitespace}`;
        const newValue = value.slice(0, start) + insert + value.slice(end);
        setCodeValue(
          newValue,
          start + 1 + leadingWhitespace.length + indentUnit.length,
          start + 1 + leadingWhitespace.length + indentUnit.length,
          { revealCaret: true },
        );
        return;
      }

      const shouldIndentMore =
        /[[{(]$/.test(trimmedLine) || /:\s*$/.test(trimmedLine);
      const nextIndent = shouldIndentMore
        ? `${leadingWhitespace}${indentUnit}`
        : leadingWhitespace;

      const insert = `\n${nextIndent}`;
      const newValue = value.slice(0, start) + insert + value.slice(end);
      setCodeValue(newValue, start + insert.length, start + insert.length, {
        revealCaret: true,
      });
      return;
    }

    if (
      e.key === "}" &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      start === end
    ) {
      const lineStart = lineStartAt(start);
      const beforeCaret = value.slice(lineStart, start);
      if (/^[\t ]+$/.test(beforeCaret)) {
        e.preventDefault();
        let normalizedIndent = beforeCaret;
        if (normalizedIndent.endsWith(indentUnit)) {
          normalizedIndent = normalizedIndent.slice(0, -indentUnit.length);
        } else if (normalizedIndent.endsWith("\t")) {
          normalizedIndent = normalizedIndent.slice(0, -1);
        }
        const replacement = `${normalizedIndent}}`;
        const newValue =
          value.slice(0, lineStart) + replacement + value.slice(end);
        setCodeValue(newValue, lineStart + replacement.length);
      }
    }
  };

  const handleCodeEditorPaste = (e) => {
    const pasted = e.clipboardData?.getData("text/plain");
    if (!pasted) return;
    if (!pasted.includes("\n") && !pasted.includes("\t")) return;

    e.preventDefault();
    const ta = e.target;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const normalized = pasted.replace(/\t/g, "  ");
    const newValue = value.slice(0, start) + normalized + value.slice(end);
    commitCodeValue(newValue, start + normalized.length);
  };

  const handleCodeAreaWheel = useCallback((e) => {
    const target = e.currentTarget;
    if (!target) return;

    const canScrollY = target.scrollHeight > target.clientHeight;
    const canScrollX = target.scrollWidth > target.clientWidth;

    if (!canScrollY && !canScrollX) return;

    // Keep wheel gestures scoped to the code area whenever it is scrollable.
    e.stopPropagation();

    const atTop = target.scrollTop <= 0;
    const atBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
    const atLeft = target.scrollLeft <= 0;
    const atRight =
      target.scrollLeft + target.clientWidth >= target.scrollWidth - 1;

    const hitsYBoundary = (e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom);
    const hitsXBoundary = (e.deltaX < 0 && atLeft) || (e.deltaX > 0 && atRight);

    // Block scroll chaining when the wheel hits the code area's boundary.
    if (hitsYBoundary || hitsXBoundary) {
      e.preventDefault();
    }
  }, []);

  const handleTextAreaWheel = useCallback((e) => {
    const target = e.currentTarget;
    if (!target) return;

    const canScrollY = target.scrollHeight > target.clientHeight + 1;
    if (!canScrollY) return;

    const atTop = target.scrollTop <= 0;
    const atBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 1;

    // Keep wheel gestures scoped to the text area whenever it is scrollable.
    e.stopPropagation();

    const hitsBoundary = (e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom);

    // Block scroll chaining when the wheel hits the note boundary.
    if (hitsBoundary) {
      e.preventDefault();
    }
  }, []);

  const handleEditorDragOver = (e) => {
    if (!isEditMode) return;
    const hasImage = Array.from(e.dataTransfer?.items || []).some((item) =>
      String(item.type || "").startsWith("image/"),
    );
    if (!hasImage) return;
    e.preventDefault();
    setIsEditorDragOver(true);
  };

  const handleEditorDragLeave = () => {
    setIsEditorDragOver(false);
  };

  const handleEditorDrop = (e) => {
    if (!isEditMode) return;
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    e.preventDefault();
    insertImageFiles(files);
  };

  const handleEditorPaste = (e) => {
    if (!isEditMode) return;

    // Image paste
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const hasImage = Array.from(files).some((f) =>
        String(f.type || "").startsWith("image/"),
      );
      if (hasImage) {
        e.preventDefault();
        insertImageFiles(files);
        return;
      }
    }

    // Checklist paste — convert lines with checkbox markers to interactive items
    const raw = e.clipboardData?.getData("text/plain");
    if (raw) {
      const parsed = parseChecklistLines(raw);
      if (parsed && parsed.length >= 2) {
        e.preventDefault();

        // Build DOM fragment directly (avoids deprecated execCommand)
        const frag = document.createDocumentFragment();
        for (const item of parsed) {
          const row = document.createElement("div");
          row.className = "note-check-item";
          row.setAttribute("data-checked", String(item.completed));

          const box = document.createElement("span");
          box.className = "note-check-box";
          box.setAttribute("contenteditable", "false");

          const label = document.createElement("span");
          label.className = "note-check-label";
          label.textContent = item.text;

          row.appendChild(box);
          row.appendChild(label);
          frag.appendChild(row);
        }

        // Insert at current cursor position, or append to editor
        const sel = window.getSelection();
        const editor = editorRef.current;
        if (
          sel &&
          sel.rangeCount > 0 &&
          editor?.contains(sel.getRangeAt(0).commonAncestorContainer)
        ) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const lastNode = frag.lastChild;
          range.insertNode(frag);
          if (lastNode) {
            const after = document.createRange();
            after.setStartAfter(lastNode);
            after.collapse(true);
            sel.removeAllRanges();
            sel.addRange(after);
          }
        } else if (editor) {
          editor.appendChild(frag);
        }

        handleInput();
      }
    }
  };

  const handleCodeViewScroll = useCallback((e) => {
    if (!codeViewLineNumbersRef.current) return;
    codeViewLineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
  }, []);

  // Handle Escape key to exit edit mode or close full-screen
  useEffect(() => {
    if (!isEditMode && !isFullScreen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (isFullScreen) {
          closeFullScreen();
          if (isEditMode) stopEdit();
        } else {
          stopEdit();
        }
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeFullScreen, isEditMode, isFullScreen, stopEdit]);

  useEffect(() => {
    if (!isEditMode || isFullScreen) return;
    if (noteType !== "text" && noteType !== "code") return;

    const handleOutsidePointer = (e) => {
      const container =
        noteType === "code" ? codeInlineNoteRef.current : textNoteRef.current;
      const toolbar = floatingToolbarRef.current;
      if (!container) return;
      if (container.contains(e.target)) return;
      if (toolbar && toolbar.contains(e.target)) return;
      stopEdit();
    };

    document.addEventListener("mousedown", handleOutsidePointer);
    document.addEventListener("touchstart", handleOutsidePointer, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleOutsidePointer);
      document.removeEventListener("touchstart", handleOutsidePointer);
    };
  }, [isEditMode, isFullScreen, noteType, stopEdit]);

  useEffect(() => {
    if (!isEditMode && !isFullScreen) return;

    const onSaveShortcut = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key !== "s" && e.key !== "S" && e.key !== "Enter") return;
      e.preventDefault();
      if (isFullScreen) closeFullScreen();
      stopEdit();
    };

    document.addEventListener("keydown", onSaveShortcut);
    return () => document.removeEventListener("keydown", onSaveShortcut);
  }, [closeFullScreen, isEditMode, isFullScreen, stopEdit]);

  useEffect(() => {
    if (!isEditMode) {
      document.body.classList.remove("editor-mode-active");
      return;
    }
    document.body.classList.add("editor-mode-active");
    return () => {
      document.body.classList.remove("editor-mode-active");
    };
  }, [isEditMode]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) commitPendingEdits();
    };
    const handleBeforeUnload = () => {
      commitPendingEdits();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [commitPendingEdits]);

  useEffect(() => {
    return () => {
      commitPendingEdits();
    };
  }, [commitPendingEdits]);

  // Sync scroll and highlight code in edit mode
  useEffect(() => {
    if (noteType !== "code" || !(isEditMode || isFullScreen)) return;

    const editor = codeEditorRef.current;
    const highlightLayer = codeHighlightLayerRef.current;
    if (!editor || !highlightLayer || !codeHighlightRef.current) return;

    // Highlight the code
    try {
      updateCodeHighlight(value || "", noteLanguage);
    } catch {
      updateCodeHighlight(value || "", noteLanguage);
    }

    // Sync scroll position
    let rafId = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        syncCodeEditorLayers();
      });
    };

    editor.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      editor.removeEventListener("scroll", handleScroll);
    };
  }, [
    isEditMode,
    isFullScreen,
    noteLanguage,
    noteType,
    syncCodeEditorLayers,
    updateCodeHighlight,
    value,
  ]);

  const renderFolderBadge = () => {
    if (!folders.length) return null;
    return (
      <div
        className="note-folder-badge-wrapper"
        ref={folderPickerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={`note-folder-badge${currentFolder ? " has-folder" : ""}`}
          onClick={() => setShowFolderPicker((v) => !v)}
          title={
            currentFolder ? `Folder: ${currentFolder.name}` : "Move to folder"
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
    );
  };

  const renderCodeEditorPanel = (isFullscreenLayout = false) => {
    const panelClassName = isFullscreenLayout
      ? `code-edit-modal code-note note-theme-${noteTheme} code-theme-${codeColorTheme}`
      : `text-field code-edit-inline code-note note-theme-${noteTheme} code-theme-${codeColorTheme} edit-mode`;

    const codeToolbar = (
      <div
        ref={floatingToolbarRef}
        className={`toolbar${
          isFullscreenLayout
            ? " code-edit-modal-toolbar"
            : " floating-editor-toolbar"
        }`}
        style={themeVars}
      >
        <div className="toolbar-scroll">
          <div className="lang-picker">
            <Dropdown
              options={LANGUAGE_OPTIONS}
              value={noteLanguage}
              onChange={(v) => {
                setNoteLanguage(v);
                hasPendingEditRef.current = true;
                if (onLanguageChange) onLanguageChange(v);
              }}
            />
          </div>
          <div className="toolbar-divider" />
          <div className="code-theme-picker">
            <Dropdown
              options={CODE_COLOR_THEME_OPTIONS}
              value={codeColorTheme}
              onChange={(v) => {
                setCodeColorTheme(v);
                hasPendingEditRef.current = true;
                if (onCodeColorThemeChange) onCodeColorThemeChange(v);
              }}
              placeholder="Code theme"
            />
          </div>
          <div className="toolbar-divider" />
          <button
            className={`format-btn${showLineNumbers ? " is-active" : ""}`}
            onClick={() => {
              const nextShowLineNumbers = !showLineNumbers;
              setShowLineNumbers(nextShowLineNumbers);
              hasPendingEditRef.current = true;
              onShowLineNumbersChange?.(nextShowLineNumbers);
            }}
            title="Toggle line numbers"
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
              <polyline points="21 6 21 22 3 22 3 6" />
              <path d="M7 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="7" y1="18" x2="17" y2="18" />
            </svg>
            <span className="format-btn-label">Lines</span>
          </button>
          <div className="toolbar-divider" />
          <div className="theme-picker">
            <Dropdown
              options={NOTE_THEME_OPTIONS}
              value={noteTheme}
              onChange={(v) => {
                setNoteTheme(v);
                hasPendingEditRef.current = true;
                if (onThemeChange) onThemeChange(v);
              }}
            />
          </div>
        </div>
        <div className="toolbar-actions">
          <Button
            className="undo-btn"
            onClick={undoCode}
            aria-label="Undo"
            title="Undo (Cmd/Ctrl+Z)"
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
            onClick={redoCode}
            aria-label="Redo"
            title="Redo (Cmd/Ctrl+Shift+Z)"
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
            onClick={() => {
              if (isFullscreenLayout) {
                closeFullScreen();
              }
              stopEdit();
            }}
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
            className="format-btn fullscreen-btn"
            onClick={isFullscreenLayout ? closeFullScreen : openFullScreen}
            aria-label={
              isFullscreenLayout
                ? "Exit fullscreen editor"
                : "Open fullscreen editor"
            }
            title={
              isFullscreenLayout
                ? "Exit fullscreen editor"
                : "Open fullscreen editor"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {isFullscreenLayout ? (
                <>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                </>
              ) : (
                <>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                </>
              )}
            </svg>
          </Button>
        </div>
      </div>
    );

    const panel = (
      <div
        ref={isFullscreenLayout ? undefined : codeInlineNoteRef}
        className={panelClassName}
        style={themeVars}
        onClick={(e) => e.stopPropagation()}
      >
        {isFullscreenLayout && codeToolbar}

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
              <span>
                Last modified: <RelativeTimestamp timestamp={lastModified} />
              </span>
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

        <div
          className={`code-editor-wrapper${showLineNumbers ? " with-line-numbers" : ""}`}
        >
          {showLineNumbers && (
            <div className="code-editor-line-numbers" ref={codeLineNumbersRef}>
              {value.split("\n").map((_, idx) => (
                <div key={idx} className="editor-line-number">
                  {idx + 1}
                </div>
              ))}
            </div>
          )}
          <div className="code-editor-highlight-container">
            <pre className="code-editor-highlight" ref={codeHighlightLayerRef}>
              <code ref={codeHighlightRef} className="hljs" />
            </pre>
            <textarea
              ref={codeEditorRef}
              className="code-editor"
              value={value}
              onChange={(e) => {
                commitCodeValue(
                  e.target.value,
                  e.target.selectionStart,
                  e.target.selectionEnd,
                );
              }}
              onKeyDown={handleCodeEditorKeyDown}
              onPaste={handleCodeEditorPaste}
              onWheel={handleCodeAreaWheel}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              placeholder="Write your code here..."
            />
          </div>
        </div>
      </div>
    );

    if (isFullscreenLayout) {
      return (
        <div
          className="code-edit-modal-overlay"
          onClick={() => closeFullScreen()}
          role="presentation"
        >
          {panel}
        </div>
      );
    }

    return (
      <>
        {typeof document !== "undefined"
          ? createPortal(codeToolbar, document.body)
          : null}
        {panel}
      </>
    );
  };

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
      <>
        {!isEditMode && !isFullScreen && (
          <div
            className={`text-field code-note note-theme-${noteTheme} code-theme-${codeColorTheme} view-mode`}
            style={themeVars}
            onClick={() => !isEditMode && startEdit()}
          >
            <div className="note-header">
              <div className="note-header-content">
                <div className="note-title-display-row">
                  {isPinned && (
                    <span className="note-pin-indicator">Pinned</span>
                  )}
                  <div className="note-title-display">
                    {noteTitle || "New code note"}
                  </div>
                  <span className="code-note-lang-badge">{noteLanguage}</span>
                  {renderFolderBadge()}
                </div>
                {lastModified && (
                  <div className="note-last-modified-header">
                    Last modified:{" "}
                    <RelativeTimestamp timestamp={lastModified} />
                  </div>
                )}
              </div>
            </div>

            <div
              className={`code-view-wrapper${showLineNumbers ? " with-line-numbers" : ""}`}
            >
              {showLineNumbers && (
                <div className="code-line-numbers" ref={codeViewLineNumbersRef}>
                  {value.split("\n").map((_, idx) => (
                    <div key={idx} className="line-number">
                      {idx + 1}
                    </div>
                  ))}
                </div>
              )}
              <pre
                className="code-view"
                ref={codeViewRef}
                onWheel={handleCodeAreaWheel}
                onScroll={handleCodeViewScroll}
              >
                <code
                  className="hljs"
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
              </pre>
            </div>
          </div>
        )}

        {isEditMode && !isFullScreen && renderCodeEditorPanel(false)}
        {isFullScreen && renderCodeEditorPanel(true)}
      </>
    );
  }

  return (
    <div
      ref={textNoteRef}
      className={`text-field note-theme-${noteTheme} ${isEditMode ? "edit-mode" : "view-mode"}`}
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
              {renderFolderBadge()}
            </div>
            {lastModified && (
              <div className="note-last-modified-header">
                Last modified: <RelativeTimestamp timestamp={lastModified} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toolbar - only shown in edit mode */}
      {isEditMode &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={floatingToolbarRef}
            className="toolbar floating-editor-toolbar"
          >
            <div className="toolbar-scroll">
              <span className="toolbar-section-tag">Text</span>
              {/* ── Text formatting ── */}
              <div className="toolbar-group">
                <button
                  className={`format-btn${formatState.bold ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("bold")}
                  title="Bold (Cmd/Ctrl+B)"
                  aria-keyshortcuts="Meta+B Control+B"
                >
                  <b>B</b>
                </button>
                <button
                  className={`format-btn${formatState.italic ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("italic")}
                  title="Italic (Cmd/Ctrl+I)"
                  aria-keyshortcuts="Meta+I Control+I"
                >
                  <span style={{ fontStyle: "italic" }}>I</span>
                </button>
                <button
                  className={`format-btn${formatState.underline ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("underline")}
                  title="Underline (Cmd/Ctrl+U)"
                  aria-keyshortcuts="Meta+U Control+U"
                >
                  <u>U</u>
                </button>
                <button
                  className={`format-btn${formatState.strikeThrough ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleFormat("strikeThrough")}
                  title="Strikethrough"
                  aria-keyshortcuts="Meta+Shift+X Control+Shift+X"
                >
                  <s>S</s>
                </button>
                <button
                  className={`format-btn format-btn--link${showLinkPanel ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleInsertLink(e)}
                  title={
                    linkIsEditingExisting ? "Edit link" : "Insert smart link"
                  }
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
                    <path d="M14.5 9.5a3.5 3.5 0 0 1 5 0l.5.5a3.5 3.5 0 0 1-5 5l-1.25-1.25" />
                    <path d="M9.5 14.5a3.5 3.5 0 0 1-5 0l-.5-.5a3.5 3.5 0 0 1 5-5L10.25 10.25" />
                    <line x1="8" y1="16" x2="16" y2="8" />
                  </svg>
                </button>
                <button
                  className={`format-btn${showImagePanel ? " is-active" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleInsertImage(e)}
                  title="Insert image"
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
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
              </div>

              <div className="toolbar-divider" />
              <span className="toolbar-section-tag">Blocks</span>

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
                <button
                  className="format-btn format-btn--label"
                  onClick={() => handleFormat("formatBlock", "H4")}
                  title="Heading 4"
                >
                  H4
                </button>
                <button
                  className="format-btn format-btn--label"
                  onClick={() => handleFormat("formatBlock", "H5")}
                  title="Heading 5"
                >
                  H5
                </button>
                <button
                  className="format-btn format-btn--label"
                  onClick={() => handleFormat("formatBlock", "H6")}
                  title="Heading 6"
                >
                  H6
                </button>
                <button
                  className="format-btn format-btn--label"
                  onClick={() => handleFormat("formatBlock", "P")}
                  title="Paragraph"
                >
                  P
                </button>
                <button
                  className="format-btn"
                  onClick={() => handleFormat("formatBlock", "BLOCKQUOTE")}
                  title="Blockquote"
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
                    <path d="M10 11H6a4 4 0 1 0 0 8h4v-8z" />
                    <path d="M22 11h-4a4 4 0 1 0 0 8h4v-8z" />
                  </svg>
                </button>
                <button
                  className="format-btn"
                  onClick={() => handleFormat("insertHorizontalRule")}
                  title="Horizontal rule"
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
                    <line x1="4" y1="12" x2="20" y2="12" />
                  </svg>
                </button>
              </div>

              <div className="toolbar-divider" />
              <span className="toolbar-section-tag">Lists</span>

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
                <button
                  className="format-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => handleInsertTable(e)}
                  title="Insert table"
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
                    <rect x="3" y="4" width="18" height="16" rx="1.5" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <line x1="9" y1="4" x2="9" y2="20" />
                    <line x1="15" y1="4" x2="15" y2="20" />
                  </svg>
                </button>
              </div>

              <div className="toolbar-divider" />
              <span className="toolbar-section-tag">Layout</span>

              <div className="toolbar-group">
                <button
                  className="format-btn"
                  onClick={() => handleFormat("justifyLeft")}
                  title="Align left"
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
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="14" y2="12" />
                    <line x1="4" y1="18" x2="18" y2="18" />
                  </svg>
                </button>
                <button
                  className="format-btn"
                  onClick={() => handleFormat("justifyCenter")}
                  title="Align center"
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
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="7" y1="12" x2="17" y2="12" />
                    <line x1="5" y1="18" x2="19" y2="18" />
                  </svg>
                </button>
                <button
                  className="format-btn"
                  onClick={() => handleFormat("justifyRight")}
                  title="Align right"
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
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="10" y1="12" x2="20" y2="12" />
                    <line x1="6" y1="18" x2="20" y2="18" />
                  </svg>
                </button>
                <button
                  className="format-btn"
                  onClick={() => handleFormat("justifyFull")}
                  title="Justify"
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
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                </button>
                <button
                  className="format-btn"
                  onClick={() => handleFormat("outdent")}
                  title="Outdent"
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
                    <polyline points="7 8 3 12 7 16" />
                    <line x1="21" y1="6" x2="11" y2="6" />
                    <line x1="21" y1="12" x2="11" y2="12" />
                    <line x1="21" y1="18" x2="11" y2="18" />
                  </svg>
                </button>
                <button
                  className="format-btn"
                  onClick={() => handleFormat("indent")}
                  title="Indent"
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
                    <polyline points="5 8 9 12 5 16" />
                    <line x1="21" y1="6" x2="11" y2="6" />
                    <line x1="21" y1="12" x2="11" y2="12" />
                    <line x1="21" y1="18" x2="11" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="toolbar-divider" />
              <span className="toolbar-section-tag">Code</span>

              {/* ── Snippet ── */}
              <button
                className={`format-btn${showSnippetPanel ? " is-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => handleOpenSnippetPanel(e)}
                title="Insert code snippet"
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
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                  <line x1="10" y1="20" x2="14" y2="4" />
                </svg>
              </button>

              <div className="toolbar-divider" />
              <span className="toolbar-section-tag">Theme</span>

              <div className="font-size-picker">
                <Dropdown
                  options={[
                    { id: "1.35", label: "LH 1.35" },
                    { id: "1.5", label: "LH 1.5" },
                    { id: "1.65", label: "LH 1.65" },
                    { id: "1.8", label: "LH 1.8" },
                    { id: "2", label: "LH 2" },
                  ]}
                  value={lineHeightValue}
                  onChange={(nextValue) =>
                    applyLineHeightToSelection(nextValue)
                  }
                  placeholder="Line height"
                />
              </div>

              <div className="toolbar-divider" />

              {/* ── Font & Size ── */}
              <div className="font-picker">
                <Dropdown
                  options={FONT_OPTIONS}
                  value={noteFont}
                  onChange={(v) => {
                    setNoteFont(v);
                    hasPendingEditRef.current = true;
                    if (onFontChange) onFontChange(v);
                  }}
                  fontPreview={true}
                  fontMap={FONT_MAP}
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
                    hasPendingEditRef.current = true;
                    if (onThemeChange) onThemeChange(v);
                  }}
                />
              </div>

              <div className="toolbar-divider" />

              <button
                className={`format-btn${showFindReplacePanel ? " is-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => openFindReplacePanel(e)}
                title="Find and replace (Cmd/Ctrl+F)"
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
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <path d="M9 11h4" />
                  <path d="M9 14h6" />
                </svg>
              </button>
            </div>

            {(showLinkPanel ||
              showTablePanel ||
              showSnippetPanel ||
              showImagePanel ||
              showFindReplacePanel) && (
              <div
                className="toolbar-popover"
                onMouseDown={(e) => e.stopPropagation()}
                style={
                  toolbarPopoverAnchor == null
                    ? undefined
                    : {
                        position: "absolute",
                        left: `${toolbarPopoverAnchor.x}px`,
                        top: "auto",
                        right: "auto",
                        bottom: "calc(100% + 10px)",
                        transform: "translateX(-50%)",
                      }
                }
              >
                {showLinkPanel && (
                  <LinkPanel
                    initialUrl={linkInitialUrl}
                    initialText={linkInitialText}
                    isEditingExisting={linkIsEditingExisting}
                    onInsert={(url, text) => applyLinkInsertion(url, text)}
                    onRemove={removeActiveLink}
                    onClose={() => {
                      setShowLinkPanel(false);
                      activeLinkRef.current = null;
                      setLinkIsEditingExisting(false);
                    }}
                  />
                )}

                {showImagePanel && (
                  <ImagePanel
                    onInsert={(url, alt) => applyImageInsertion(url, alt)}
                    onUploadFiles={insertImageFiles}
                    onClose={() => setShowImagePanel(false)}
                  />
                )}

                {showTablePanel && (
                  <TablePanel
                    onInsert={(cols, rows) => applyTableInsertion(cols, rows)}
                    onClose={() => setShowTablePanel(false)}
                  />
                )}

                {showSnippetPanel && (
                  <SnippetPanel
                    language={noteLanguage}
                    onLanguageChange={(nextLanguage) => {
                      setNoteLanguage(nextLanguage);
                      hasPendingEditRef.current = true;
                      if (onLanguageChange) onLanguageChange(nextLanguage);
                    }}
                    onInsert={handleInsertCodeSnippet}
                    onClose={() => setShowSnippetPanel(false)}
                  />
                )}

                {showFindReplacePanel && (
                  <FindReplacePanel
                    matchMessage={findMatchMessage}
                    onFindNext={(q, cs) => findNextMatch(q, cs, 1)}
                    onFindPrev={(q, cs) => findNextMatch(q, cs, -1)}
                    onReplace={(q, r, cs) => replaceCurrentMatch(q, r, cs)}
                    onReplaceAll={(q, r, cs) => replaceAllMatches(q, r, cs)}
                    onClose={() => setShowFindReplacePanel(false)}
                  />
                )}
              </div>
            )}

            {/* ── Pinned right-side actions ── */}
            <div className="toolbar-actions">
              <Button
                className="done-btn"
                onClick={() => stopEdit()}
                aria-label="Done editing"
                title="Done editing"
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
          </div>,
          document.body,
        )}

      {isEditMode &&
        tableToolsAnchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="table-tools-inline"
            style={{
              left: `${tableToolsAnchor.left}px`,
              top: `${tableToolsAnchor.top}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="table-tools-inline-btn"
              onClick={() => editTable("row-above")}
              title="Add row above"
            >
              Row↑
            </button>
            <button
              className="table-tools-inline-btn"
              onClick={() => editTable("row-below")}
              title="Add row below"
            >
              Row↓
            </button>
            <button
              className="table-tools-inline-btn"
              onClick={() => editTable("col-left")}
              title="Add column left"
            >
              Col←
            </button>
            <button
              className="table-tools-inline-btn"
              onClick={() => editTable("col-right")}
              title="Add column right"
            >
              Col→
            </button>
            <button
              className="table-tools-inline-btn"
              onClick={() => editTable("delete-row")}
              title="Delete row"
            >
              Row−
            </button>
            <button
              className="table-tools-inline-btn"
              onClick={() => editTable("delete-col")}
              title="Delete column"
            >
              Col−
            </button>
            <button
              className="table-tools-inline-btn danger"
              onClick={() => editTable("delete-table")}
              title="Delete table"
            >
              Delete
            </button>
          </div>,
          document.body,
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

          {/* Center: Last modified label + character count */}
          <div className="note-footer-meta">
            <div
              className="note-last-modified"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {lastModified && (
                <span>
                  Last modified: <RelativeTimestamp timestamp={lastModified} />
                </span>
              )}
            </div>
            <span id="editor-char-count" className="char-count">
              {value.replace(/<[^>]+>/g, "").length} characters
            </span>
          </div>

          <div className="note-footer-actions">
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

      <div
        ref={editorRef}
        className={`editor${isEditorDragOver ? " drag-over" : ""}`}
        contentEditable={isEditMode}
        onInput={handleInput}
        onKeyDownCapture={handleEditorKeyDown}
        onPaste={handleEditorPaste}
        onDragOver={handleEditorDragOver}
        onDragEnter={handleEditorDragOver}
        onDragLeave={handleEditorDragLeave}
        onDrop={handleEditorDrop}
        onWheel={handleTextAreaWheel}
        onClick={(e) => {
          // Checkbox toggle — works in both view and edit mode
          const checkBox = e.target?.closest?.(".note-check-box");
          if (checkBox) {
            const item = checkBox.closest(".note-check-item");
            if (item) {
              e.preventDefault();
              e.stopPropagation();
              const checked = item.getAttribute("data-checked") === "true";
              item.setAttribute("data-checked", String(!checked));
              const newHtml = editorRef.current.innerHTML;
              setValue(newHtml);
              hasPendingEditRef.current = true;
              if (onChange) onChange(newHtml);
              return;
            }
          }
          if (isEditMode) return;
          const linkEl = e.target?.closest?.("a[href]");
          if (linkEl) return;
          startEdit();
        }}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Note editor"
        aria-describedby="editor-char-count"
        placeholder="Tap to edit"
        style={{
          fontFamily: FONT_MAP[noteFont] ?? undefined,
          fontSize: noteFontSize ? `${noteFontSize}px` : undefined,
          cursor: isEditMode ? "text" : "pointer",
        }}
      />

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
              onWheel={handleTextAreaWheel}
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
