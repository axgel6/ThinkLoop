import React, { useRef, useState } from "react";

const ImagePanel = ({ onInsert, onUploadFiles, onClose }) => {
  const [draftUrl, setDraftUrl] = useState("https://");
  const [draftAlt, setDraftAlt] = useState("");
  const fileInputRef = useRef(null);

  const handleInsert = () => {
    onInsert(draftUrl, draftAlt);
  };

  return (
    <div className="toolbar-popover-form">
      <label className="toolbar-popover-label">Image URL</label>
      <input
        className="toolbar-popover-input"
        value={draftUrl}
        onChange={(e) => setDraftUrl(e.target.value)}
        placeholder="https://images.example.com/pic.jpg"
      />
      <label className="toolbar-popover-label">Alt text</label>
      <input
        className="toolbar-popover-input"
        value={draftAlt}
        onChange={(e) => setDraftAlt(e.target.value)}
        placeholder="Describe the image"
      />
      <div className="toolbar-popover-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden-file-input"
          onChange={(e) => {
            onUploadFiles(e.target.files || []);
            e.target.value = "";
          }}
        />
        <button
          className="toolbar-popover-btn ghost"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </button>
        <button className="toolbar-popover-btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="toolbar-popover-btn toolbar-popover-btn--primary"
          onClick={handleInsert}
        >
          Insert Image
        </button>
      </div>
    </div>
  );
};

export default ImagePanel;
