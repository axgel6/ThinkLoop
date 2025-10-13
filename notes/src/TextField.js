import React, { useState, useRef, useEffect } from "react";
import "./TextField.css";
import Button from "./Button";

const TextField = ({ value: initialValue = "", onChange, onRemove, title = "", onTitleChange }) => {
  const [value, setValue] = useState(initialValue);
  const [noteTitle, setNoteTitle] = useState(title);
  const editorRef = useRef(null);

  // Update content when parent changes it
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // keep local title in sync with parent
  useEffect(() => {
    setNoteTitle(title);
  }, [title]);

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

  return (
    <div className="text-field">
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
      </div>

      <div
        ref={editorRef}
        className="editor"
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning
        aria-label="Note editor"
        placeholder="Write your note..."
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
          <Button className="remove-btn" onClick={onRemove} aria-label="Remove note">
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default TextField;
