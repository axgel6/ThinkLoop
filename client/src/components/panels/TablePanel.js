import React, { useState } from "react";

const TablePanel = ({ onInsert, onClose }) => {
  const [draftColumns, setDraftColumns] = useState("3");
  const [draftRows, setDraftRows] = useState("3");

  const handleInsert = () => {
    onInsert(draftColumns, draftRows);
  };

  return (
    <div className="toolbar-popover-form">
      <label className="toolbar-popover-label">Columns (1-8)</label>
      <input
        className="toolbar-popover-input"
        type="number"
        min="1"
        max="8"
        value={draftColumns}
        onChange={(e) => setDraftColumns(e.target.value)}
      />
      <label className="toolbar-popover-label">Rows (1-20)</label>
      <input
        className="toolbar-popover-input"
        type="number"
        min="1"
        max="20"
        value={draftRows}
        onChange={(e) => setDraftRows(e.target.value)}
      />
      <div className="toolbar-popover-actions">
        <button className="toolbar-popover-btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="toolbar-popover-btn" onClick={handleInsert}>
          Insert Table
        </button>
      </div>
    </div>
  );
};

export default TablePanel;
