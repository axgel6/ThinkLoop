import React, { useState } from "react";

const LinkPanel = ({
  initialUrl = "https://",
  initialText = "",
  isEditingExisting = false,
  onInsert,
  onRemove,
  onClose,
}) => {
  const [draftUrl, setDraftUrl] = useState(initialUrl);
  const [draftText, setDraftText] = useState(initialText);

  const handleInsert = () => {
    onInsert(draftUrl, draftText);
  };

  return (
    <div className="toolbar-popover-form">
      <label className="toolbar-popover-label">Link URL</label>
      <input
        className="toolbar-popover-input"
        value={draftUrl}
        onChange={(e) => setDraftUrl(e.target.value)}
        placeholder="https://example.com"
      />
      <label className="toolbar-popover-label">Link text</label>
      <input
        className="toolbar-popover-input"
        value={draftText}
        onChange={(e) => setDraftText(e.target.value)}
        placeholder="Optional"
      />
      <div className="toolbar-popover-actions">
        {isEditingExisting && (
          <button className="toolbar-popover-btn danger" onClick={onRemove}>
            Unlink
          </button>
        )}
        <button className="toolbar-popover-btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="toolbar-popover-btn" onClick={handleInsert}>
          {isEditingExisting ? "Save Link" : "Insert Link"}
        </button>
      </div>
    </div>
  );
};

export default LinkPanel;
