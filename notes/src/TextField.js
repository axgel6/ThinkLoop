import React, { useState, useRef, useEffect } from "react";
import "./TextField.css";
import Button from "./Button";
import Dropdown from "./Dropdown";

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
}) => {
  const [value, setValue] = useState(initialValue);
  const [noteTitle, setNoteTitle] = useState(title);
  // Default per-note font is Inter
  const [noteFont, setNoteFont] = useState(fontProp ?? "inter");
  // Default per-note theme is 'default' which uses global variables
  const [noteTheme, setNoteTheme] = useState(themeProp ?? "default");
  const editorRef = useRef(null);

  const THEME_OPTIONS = [
    { id: "default", label: "Match Theme" },
    { id: "dark", label: "Dark" },
    { id: "blue", label: "Blue" },
    { id: "gray", label: "Gray" },
    { id: "cream", label: "Cream" },
    { id: "purple", label: "Purple" },
    { id: "pink", label: "Pink" },
    { id: "skyblue", label: "Sky Blue" },
    { id: "sage", label: "Sage" },
  ];

  // Map theme ids to CSS variable overrides (copied from index.css)
  const THEME_VARS = {
    dark: {
      "--bg": "#000000",
      "--fg": "#e0e0e0",
      "--muted": "#9a9a9a",
      "--panel-bg": "rgba(30, 30, 30, 0.6)",
      "--panel-border": "rgba(255, 255, 255, 0.08)",
      "--panel-bg-solid": "rgb(20, 20, 20)",
    },
    blue: {
      "--bg": "#0a1628",
      "--fg": "#e3f2ff",
      "--muted": "#7cb3ff",
      "--panel-bg": "rgba(20, 60, 120, 0.4)",
      "--panel-border": "rgba(124, 179, 255, 0.3)",
      "--panel-bg-solid": "#1a3a5c",
    },
    gray: {
      "--bg": "#1a1a1e",
      "--fg": "#f5f5f5",
      "--muted": "#b8b8c0",
      "--panel-bg": "rgba(50, 50, 55, 0.5)",
      "--panel-border": "rgba(180, 180, 190, 0.2)",
      "--panel-bg-solid": "#2d2d32",
    },
    cream: {
      "--bg": "#f5f1e8",
      "--fg": "#3d2e1f",
      "--muted": "#8b7355",
      "--panel-bg": "rgba(235, 220, 200, 0.6)",
      "--panel-border": "rgba(139, 115, 85, 0.25)",
      "--panel-bg-solid": "#ebe4d6",
    },
    purple: {
      "--bg": "#ceb4ff",
      "--fg": "#2d1b4e",
      "--muted": "#7c5cba",
      "--panel-bg": "rgba(230, 220, 255, 0.6)",
      "--panel-border": "rgba(124, 92, 186, 0.25)",
      "--panel-bg-solid": "#e6dcff",
    },
    pink: {
      "--bg": "#ffe5f0",
      "--fg": "#4a1e35",
      "--muted": "#c75a8a",
      "--panel-bg": "rgba(255, 220, 240, 0.7)",
      "--panel-border": "rgba(199, 90, 138, 0.25)",
      "--panel-bg-solid": "#ffd6e8",
    },
    skyblue: {
      "--bg": "#e3f2fd",
      "--fg": "#1e3a5f",
      "--muted": "#4a90c7",
      "--panel-bg": "rgba(220, 240, 255, 0.7)",
      "--panel-border": "rgba(74, 144, 199, 0.25)",
      "--panel-bg-solid": "#d1e9ff",
    },
    sage: {
      "--bg": "#e8f3e8",
      "--fg": "#2d4a2d",
      "--muted": "#6b8e6b",
      "--panel-bg": "rgba(220, 235, 220, 0.7)",
      "--panel-border": "rgba(107, 142, 107, 0.25)",
      "--panel-bg-solid": "#d8ead8",
    },
  };

  // Update content when parent changes it
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // keep local title in sync with parent
  useEffect(() => {
    setNoteTitle(title);
  }, [title]);

  // sync font/theme props -> local state
  useEffect(() => {
    if (fontProp !== undefined && fontProp !== noteFont) setNoteFont(fontProp);
  }, [fontProp, noteFont]);

  useEffect(() => {
    if (themeProp !== undefined && themeProp !== noteTheme)
      setNoteTheme(themeProp);
  }, [themeProp, noteTheme]);

  // Reflect state to contenteditable div
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Handle content changes
  const handleInput = () => {
    const newValue = editorRef.current.innerHTML;
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
    setNoteTitle(t);
    if (onTitleChange) onTitleChange(t);
  };

  // Note: we now call onFontChange/onThemeChange directly from the dropdown
  // handlers to avoid extra effect-driven notifications which caused shuffling.

  // Prepare inline variables for the selected theme (or undefined for default)
  const themeVars = noteTheme === "default" ? undefined : THEME_VARS[noteTheme];

  return (
    <div className="text-field" style={themeVars}>
      <div className="toolbar">
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
          {/* Local options and labels (renamed): Mono, Inter, Merriweather, Patrick Hand */}
          {/** Options ids match global theme keys used elsewhere **/}
          {/** Dropdown will call setNoteFont with the id string **/}
          <Dropdown
            options={[
              { id: "inter", label: "Inter" },
              { id: "mono", label: "Mono" },
              { id: "paper", label: "Merriweather" },
              { id: "handwritten", label: "Patrick Hand" },
            ]}
            value={noteFont}
            onChange={(v) => {
              setNoteFont(v);
              if (onFontChange) onFontChange(v);
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

      <div
        ref={editorRef}
        className="editor"
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        aria-label="Note editor"
        placeholder="Write your note..."
        style={{
          fontFamily:
            noteFont === "mono"
              ? '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace'
              : noteFont === "inter"
              ? '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              : noteFont === "paper"
              ? '"Merriweather", Georgia, "Times New Roman", serif'
              : noteFont === "handwritten"
              ? '"Patrick Hand", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              : undefined,
        }}
      />

      {/* Bottom mini-bar with editable title and remove button */}
      <div className="note-footer">
        <input
          className="note-title-input"
          value={noteTitle}
          onChange={handleTitleChange}
          placeholder="Untitled"
          aria-label="Note title"
        />
        {onRemove && (
          <Button
            className="remove-btn"
            onClick={onRemove}
            aria-label="Remove note"
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default TextField;
