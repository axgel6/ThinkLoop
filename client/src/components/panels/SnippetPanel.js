import React from "react";
import Dropdown from "../Dropdown";

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

const SnippetPanel = ({ language, onLanguageChange, onInsert, onClose }) => (
  <div className="toolbar-popover-form">
    <label className="toolbar-popover-label">Language</label>
    <Dropdown
      options={LANGUAGE_OPTIONS}
      value={language}
      onChange={onLanguageChange}
      placeholder="Language"
    />
    <div className="toolbar-popover-actions">
      <button className="toolbar-popover-btn ghost" onClick={onClose}>
        Cancel
      </button>
      <button className="toolbar-popover-btn" onClick={onInsert}>
        Insert Snippet
      </button>
    </div>
  </div>
);

export default SnippetPanel;
