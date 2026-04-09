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

// SVG icon components
const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconFolder = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path
      d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H5.5L7 5H12.5C13.05 5 13.5 5.45 13.5 6V11C13.5 11.55 13.05 12 12.5 12H2.5C1.95 12 1.5 11.55 1.5 11V4.5Z"
      stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
    />
  </svg>
);

const IconAllNotes = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
    <line x1="4.5" y1="5.5" x2="10.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="7.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="9.5" x2="8.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const IconNewFolder = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M1 3.5C1 2.95 1.45 2.5 2 2.5H5L6.5 4H11.5C12.05 4 12.5 4.45 12.5 5V10.5C12.5 11.05 12.05 11.5 11.5 11.5H2C1.45 11.5 1 11.05 1 10.5V3.5Z"
      stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
    />
    <line x1="7" y1="6.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <line x1="5.5" y1="8" x2="8.5" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const IconDots = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="3" cy="7" r="1.2" fill="currentColor" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" />
    <circle cx="11" cy="7" r="1.2" fill="currentColor" />
  </svg>
);

const IconRename = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 11L4.5 10.5L10.5 4.5L8.5 2.5L2.5 8.5L2 11Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    <line x1="8" y1="3" x2="10" y2="5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const IconMove = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 6.5H11M8 3.5L11 6.5L8 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconDelete = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 4H11M5 4V2.5H8V4M10 4L9.5 10.5H3.5L3 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSubfolder = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path
      d="M1 3C1 2.45 1.45 2 2 2H4.5L5.5 3.5H10.5C11.05 3.5 11.5 3.95 11.5 4.5V9.5C11.5 10.05 11.05 10.5 10.5 10.5H2C1.45 10.5 1 10.05 1 9.5V3Z"
      stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"
    />
    <line x1="6.5" y1="5.5" x2="6.5" y2="8.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    <line x1="5" y1="7" x2="8" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

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
    (f) => !excludedIds.includes(f.id) && f.id !== (node.parentId || null),
  );

  return (
    <div className="folder-node" style={{ paddingLeft: depth * 14 + "px" }}>
      <div
        className={"folder-row" + (isSelected ? " folder-row--selected" : "")}
        onClick={() => onSelectFolder(isSelected ? null : node.id)}
      >
        <button
          className={"folder-collapse-btn" + (collapsed ? " collapsed" : "")}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((c) => !c);
          }}
          aria-label={collapsed ? "Expand folder" : "Collapse folder"}
          tabIndex={-1}
          style={{ visibility: hasChildren ? "visible" : "hidden" }}
        >
          <IconChevron />
        </button>

        <span className="folder-icon">
          <IconFolder />
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
          <IconDots />
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
            <IconSubfolder /> New subfolder
          </button>
          <button
            className="folder-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
              setShowMenu(false);
            }}
          >
            <IconRename /> Rename
          </button>
          <button
            className="folder-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu((v) => !v);
            }}
          >
            <IconMove /> Move to…
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
                Root
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
                  {candidate.name}
                </button>
              ))}
            </div>
          )}
          <div className="folder-menu-divider" />
          <button
            className="folder-menu-item folder-menu-item--danger"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFolder(node.id, node.name);
              setShowMenu(false);
            }}
          >
            <IconDelete /> Delete
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

const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FolderSidebar = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  isOpen,
  onClose,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar:collapsed") === "true"; } catch { return false; }
  });
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState(null);
  const inputRef = useRef(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar:collapsed", String(next)); } catch {}
      return next;
    });
  };

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
    <>
    {isOpen && <div className="folder-sidebar-backdrop" onClick={onClose} />}
    <div className={`folder-sidebar${isOpen ? " folder-sidebar--open" : ""}${collapsed ? " folder-sidebar--collapsed" : ""}`}>
      <div className="folder-sidebar-header">
        {!collapsed && <span className="folder-sidebar-title">Folders</span>}
        <div className="folder-sidebar-header-actions">
          {!collapsed && (
            <Button
              className="folder-new-btn icon-button"
              onClick={() => handleCreateSubfolder(null)}
              title="New folder"
              aria-label="New folder"
            >
              <IconNewFolder />
            </Button>
          )}
          <button
            className="folder-collapse-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </div>
      </div>

      {!collapsed && showNewInput && (
        <div className="folder-new-input-row">
          <span className="folder-icon"><IconFolder /></span>
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
        title={collapsed ? "All Notes" : undefined}
      >
        <span className="folder-icon"><IconAllNotes /></span>
        {!collapsed && <span className="folder-name">All Notes</span>}
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
    </>
  );
};

export default FolderSidebar;
