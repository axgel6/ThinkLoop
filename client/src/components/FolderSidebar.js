import React, { useState, useCallback, useRef, useEffect } from "react";
import Button from "./Button";
import "./FolderSidebar.css";

// Build a tree from a flat list of folders
function buildTree(folders, parentId) {
  return folders
    .filter((f) => (f.parentId || null) === (parentId || null))
    .map((f) => ({ ...f, children: buildTree(folders, f.id) }));
}

// Collect all descendant ids of a folder node
function getDescendantIds(node) {
  let ids = [node.id];
  for (const child of node.children || []) {
    ids = ids.concat(getDescendantIds(child));
  }
  return ids;
}

const FolderNode = React.memo(function FolderNode({
  node,
  selectedFolderId,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onCreateSubfolder,
  depth,
  allFolders,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef(null);
  const renameRef = useRef(null);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFolderId === node.id;

  // Close context menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowMoveMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== node.name) {
      onRenameFolder(node.id, trimmed);
    }
    setRenaming(false);
  }, [renameValue, node.id, node.name, onRenameFolder]);

  const handleRenameKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") handleRenameSubmit();
      if (e.key === "Escape") {
        setRenameValue(node.name);
        setRenaming(false);
      }
    },
    [handleRenameSubmit, node.name],
  );

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  // Folders available to move into (exclude self and descendants)
  const excludedIds = getDescendantIds(node);
  const moveCandidates = allFolders.filter(
    (f) => !excludedIds.includes(f.id) && f.id !== node.parentId,
  );

  return (
    <div className="folder-node" style={{ paddingLeft: depth * 14 + "px" }}>
      <div
        className={"folder-row" + (isSelected ? " folder-row--selected" : "")}
        onClick={() => onSelectFolder(isSelected ? null : node.id)}
      >
        <button
          className="folder-collapse-btn"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((c) => !c);
          }}
          aria-label={collapsed ? "Expand folder" : "Collapse folder"}
          tabIndex={-1}
        >
          {hasChildren ? (collapsed ? "▶" : "▼") : <span style={{ opacity: 0 }}>▶</span>}
        </button>

        <span className="folder-icon" aria-hidden="true">
          {isSelected ? "📂" : "📁"}
        </span>

        {renaming ? (
          <input
            ref={renameRef}
            className="folder-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="folder-name" title={node.name}>
            {node.name}
          </span>
        )}

        <button
          className="folder-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu((v) => !v);
            setShowMoveMenu(false);
          }}
          aria-label="Folder options"
        >
          ⋯
        </button>
      </div>

      {showMenu && (
        <div className="folder-menu" ref={menuRef}>
          <button
            className="folder-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(node.id);
              setShowMenu(false);
            }}
          >
            + New subfolder
          </button>
          <button
            className="folder-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
              setShowMenu(false);
            }}
          >
            ✎ Rename
          </button>
          <button
            className="folder-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu((v) => !v);
            }}
          >
            ↗ Move to…
          </button>
          {showMoveMenu && (
            <div className="folder-move-submenu">
              <button
                className="folder-menu-item folder-move-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveFolder(node.id, null);
                  setShowMenu(false);
                  setShowMoveMenu(false);
                }}
              >
                / Root
              </button>
              {moveCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  className="folder-menu-item folder-move-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveFolder(node.id, candidate.id);
                    setShowMenu(false);
                    setShowMoveMenu(false);
                  }}
                >
                  📁 {candidate.name}
                </button>
              ))}
            </div>
          )}
          <button
            className="folder-menu-item folder-menu-item--danger"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFolder(node.id, node.name);
              setShowMenu(false);
            }}
          >
            🗑 Delete
          </button>
        </div>
      )}

      {!collapsed && hasChildren && (
        <div className="folder-children">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onMoveFolder={onMoveFolder}
              onCreateSubfolder={onCreateSubfolder}
              depth={depth + 1}
              allFolders={allFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const FolderSidebar = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
}) => {
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (showNewInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewInput]);

  const handleCreateSubfolder = useCallback((parentId) => {
    setNewFolderParentId(parentId);
    setNewFolderName("");
    setShowNewInput(true);
  }, []);

  const handleSubmitNew = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (trimmed) {
      onCreateFolder(trimmed, newFolderParentId);
    }
    setShowNewInput(false);
    setNewFolderName("");
    setNewFolderParentId(null);
  }, [newFolderName, newFolderParentId, onCreateFolder]);

  const handleNewKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") handleSubmitNew();
      if (e.key === "Escape") {
        setShowNewInput(false);
        setNewFolderName("");
      }
    },
    [handleSubmitNew],
  );

  const tree = buildTree(folders, null);

  return (
    <div className="folder-sidebar">
      <div className="folder-sidebar-header">
        <span className="folder-sidebar-title">Folders</span>
        <Button
          className="folder-new-btn icon-button"
          onClick={() => handleCreateSubfolder(null)}
          title="New folder"
          aria-label="New folder"
        >
          <svg width="14" height="14" viewBox="0 0 50 50" aria-hidden="true">
            <line x1="25" y1="5" x2="25" y2="45" stroke="currentColor" strokeWidth="10" />
            <line x1="5" y1="25" x2="45" y2="25" stroke="currentColor" strokeWidth="10" />
          </svg>
        </Button>
      </div>

      {showNewInput && (
        <div className="folder-new-input-row">
          <span className="folder-icon" aria-hidden="true">📁</span>
          <input
            ref={inputRef}
            className="folder-rename-input"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={handleSubmitNew}
            onKeyDown={handleNewKeyDown}
            placeholder="Folder name"
          />
        </div>
      )}

      <div
        className={"folder-all-notes" + (selectedFolderId === null ? " folder-row--selected" : "")}
        onClick={() => onSelectFolder(null)}
      >
        <span className="folder-icon" aria-hidden="true">🗒</span>
        <span className="folder-name">All Notes</span>
      </div>

      {tree.length === 0 && !showNewInput ? (
        <p className="folder-empty">No folders yet</p>
      ) : (
        tree.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            selectedFolderId={selectedFolderId}
            onSelectFolder={onSelectFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onMoveFolder={onMoveFolder}
            onCreateSubfolder={handleCreateSubfolder}
            depth={0}
            allFolders={folders}
          />
        ))
      )}
    </div>
  );
};

export default FolderSidebar;
