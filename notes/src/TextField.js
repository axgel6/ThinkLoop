import React, { useState, useRef, useEffect } from "react";
import "./TextField.css";

const TextField = ({ value: initialValue = "", onChange }) => {
  const [value, setValue] = useState(initialValue);
  const editorRef = useRef(null);

  // Update content when parent changes it
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

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
    </div>
  );
};

export default TextField;
