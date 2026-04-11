import React, { useState } from "react";

const FindReplacePanel = ({ matchMessage, onFindNext, onFindPrev, onReplace, onReplaceAll, onClose }) => {
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  return (
    <div className="toolbar-popover-form">
      <label className="toolbar-popover-label">Find</label>
      <input
        className="toolbar-popover-input"
        value={findQuery}
        onChange={(e) => setFindQuery(e.target.value)}
        placeholder="Search text"
      />
      <label className="toolbar-popover-label">Replace</label>
      <input
        className="toolbar-popover-input"
        value={replaceQuery}
        onChange={(e) => setReplaceQuery(e.target.value)}
        placeholder="Replacement"
      />
      <label className="toolbar-popover-check">
        <input
          type="checkbox"
          checked={caseSensitive}
          onChange={(e) => setCaseSensitive(e.target.checked)}
        />
        <span>Case sensitive</span>
      </label>
      <div className="toolbar-popover-grid">
        <button
          className="toolbar-popover-btn ghost"
          onClick={() => onFindNext(findQuery, caseSensitive)}
        >
          Find Next
        </button>
        <button
          className="toolbar-popover-btn ghost"
          onClick={() => onFindPrev(findQuery, caseSensitive)}
        >
          Find Prev
        </button>
        <button
          className="toolbar-popover-btn ghost"
          onClick={() => onReplace(findQuery, replaceQuery, caseSensitive)}
        >
          Replace
        </button>
        <button
          className="toolbar-popover-btn ghost"
          onClick={() => onReplaceAll(findQuery, replaceQuery, caseSensitive)}
        >
          Replace All
        </button>
      </div>
      <div className="toolbar-popover-hint">
        Shortcuts: Cmd/Ctrl+F opens this panel, Cmd/Ctrl+Shift+L/E/R/J aligns
        text, Cmd/Ctrl+K inserts link.
      </div>
      {matchMessage ? (
        <div className="toolbar-popover-hint">{matchMessage}</div>
      ) : null}
      <div className="toolbar-popover-actions">
        <button className="toolbar-popover-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default FindReplacePanel;
