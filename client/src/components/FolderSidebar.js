import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import Button from "./Button";
import "./FolderSidebar.css";

// Folder color palette — muted, dark-theme-friendly accents
const FOLDER_COLORS = [
  "#ef6461",
  "#f0a070",
  "#e5c07b",
  "#98c379",
  "#56b6c2",
  "#61afef",
  "#c678dd",
  "#e06c75",
];

function getFolderColor(id) {
  const num = typeof id === "number" ? id : parseInt(id, 10) || 0;
  return FOLDER_COLORS[Math.abs(num) % FOLDER_COLORS.length];
}

// Portal tooltip shown on hover in compact sidebar mode
function SidebarTooltip({ label, count, color, targetRef, visible }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (visible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    }
  }, [visible, targetRef]);

  if (!visible) return null;

  return ReactDOM.createPortal(
    <div className="folder-tooltip" style={{ top: pos.top, left: pos.left }}>
      <span className="folder-tooltip-dot" style={{ background: color }} />
      <span className="folder-tooltip-name">{label}</span>
      {count > 0 && <span className="folder-tooltip-count">{count}</span>}
    </div>,
    document.body,
  );
}

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
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 3.5L5 6.5L8 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconFolder = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1.5 4.5C1.5 3.95 1.95 3.5 2.5 3.5H5.5L7 5H12.5C13.05 5 13.5 5.45 13.5 6V11C13.5 11.55 13.05 12 12.5 12H2.5C1.95 12 1.5 11.55 1.5 11V4.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const IconAllNotes = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="2"
      y="2"
      width="11"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <line
      x1="4.5"
      y1="5.5"
      x2="10.5"
      y2="5.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="4.5"
      y1="7.5"
      x2="10.5"
      y2="7.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="4.5"
      y1="9.5"
      x2="8.5"
      y2="9.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const IconTrash = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 4.5H13M5.5 4.5V3.2H9.5V4.5M11.5 4.5L11 12H4L3.5 4.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="6"
      y1="6.5"
      x2="6"
      y2="10.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="9"
      y1="6.5"
      x2="9"
      y2="10.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const IconNewFolder = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1 3.5C1 2.95 1.45 2.5 2 2.5H5L6.5 4H11.5C12.05 4 12.5 4.45 12.5 5V10.5C12.5 11.05 12.05 11.5 11.5 11.5H2C1.45 11.5 1 11.05 1 10.5V3.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <line
      x1="7"
      y1="6.5"
      x2="7"
      y2="9.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <line
      x1="5.5"
      y1="8"
      x2="8.5"
      y2="8"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const IconDots = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="3" cy="7" r="1.2" fill="currentColor" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" />
    <circle cx="11" cy="7" r="1.2" fill="currentColor" />
  </svg>
);

const IconRename = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 11L4.5 10.5L10.5 4.5L8.5 2.5L2.5 8.5L2 11Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <line
      x1="8"
      y1="3"
      x2="10"
      y2="5"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);

const IconMove = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 6.5H11M8 3.5L11 6.5L8 9.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconColorPalette = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.1" />
    <circle cx="4.5" cy="5" r="1" fill="currentColor" />
    <circle cx="7" cy="4" r="1" fill="currentColor" />
    <circle cx="9" cy="5.5" r="1" fill="currentColor" />
    <circle cx="8.5" cy="8" r="1" fill="currentColor" />
    <circle cx="5" cy="8" r="1" fill="currentColor" />
  </svg>
);

const IconDelete = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 4H11M5 4V2.5H8V4M10 4L9.5 10.5H3.5L3 4"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconSubfolder = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1 3C1 2.45 1.45 2 2 2H4.5L5.5 3.5H10.5C11.05 3.5 11.5 3.95 11.5 4.5V9.5C11.5 10.05 11.05 10.5 10.5 10.5H2C1.45 10.5 1 10.05 1 9.5V3Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
    <line
      x1="6.5"
      y1="5.5"
      x2="6.5"
      y2="8.5"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
    <line
      x1="5"
      y1="7"
      x2="8"
      y2="7"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
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
  onColorFolder,
  depth,
  allFolders,
  noteCountByFolder,
  compact,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const menuRef = useRef(null);
  const renameRef = useRef(null);
  const rowRef = useRef(null);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFolderId === node.id;
  const noteCount = noteCountByFolder.get(String(node.id)) || 0;
  const color = node.color || getFolderColor(node.id);

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
    <div
      className="folder-node"
      style={{ paddingLeft: compact ? "0" : depth * 14 + "px" }}
    >
      <div
        ref={rowRef}
        className={"folder-row" + (isSelected ? " folder-row--selected" : "")}
        style={{ "--folder-color": color }}
        onClick={() => onSelectFolder(isSelected ? null : node.id)}
        onMouseEnter={() => compact && setTooltipVisible(true)}
        onMouseLeave={() => compact && setTooltipVisible(false)}
      >
        {compact ? (
          <>
            <span
              className={
                "folder-color-dot" +
                (isSelected ? " folder-color-dot--selected" : "")
              }
              style={{
                background: color + "26",
                borderColor: color + "66",
                color,
              }}
              aria-hidden="true"
            >
              {node.name.charAt(0).toUpperCase()}
            </span>
            <SidebarTooltip
              label={node.name}
              count={noteCount}
              color={color}
              targetRef={rowRef}
              visible={tooltipVisible}
            />
          </>
        ) : (
          <>
            <button
              className={
                "folder-collapse-btn" + (collapsed ? " collapsed" : "")
              }
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

            <span className="folder-icon" style={{ color }}>
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

            {!renaming && <span className="folder-count">{noteCount}</span>}

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
          </>
        )}
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
              setShowColorPicker(false);
            }}
          >
            <IconMove /> Move to…
          </button>
          <button
            className="folder-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker((v) => !v);
              setShowMoveMenu(false);
            }}
          >
            <IconColorPalette /> Color
          </button>
          {showColorPicker && (
            <div className="folder-color-picker">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  className={
                    "folder-color-swatch" +
                    (color === c ? " folder-color-swatch--active" : "")
                  }
                  style={{ background: c }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorFolder(node.id, c);
                    setShowMenu(false);
                    setShowColorPicker(false);
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          )}
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
              onColorFolder={onColorFolder}
              depth={depth + 1}
              allFolders={allFolders}
              noteCountByFolder={noteCountByFolder}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const IconChevronLeft = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M9 2L4 7L9 12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconChevronRight = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 2L10 7L5 12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
  onColorFolder,
  onCollapsedChange,
  isOpen,
  onClose,
  noteCountByFolder,
  totalNotesCount,
  recentlyDeletedCount,
  trashViewId,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar:collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState(null);
  const inputRef = useRef(null);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar:collapsed", String(next));
      } catch {}
      onCollapsedChange?.(next);
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
      <div
        className={`folder-sidebar${isOpen ? " folder-sidebar--open" : ""}${collapsed ? " folder-sidebar--collapsed" : ""}`}
      >
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
            <span className="folder-icon">
              <IconFolder />
            </span>
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
          className={
            "folder-all-notes" +
            (selectedFolderId === null ? " folder-row--selected" : "")
          }
          onClick={() => onSelectFolder(null)}
          title={collapsed ? "All Notes" : undefined}
        >
          <span className="folder-icon">
            <IconAllNotes />
          </span>
          {!collapsed && <span className="folder-name">All Notes</span>}
          {!collapsed && (
            <span className="folder-count">{totalNotesCount}</span>
          )}
        </div>

        {tree.length === 0 && !showNewInput && !collapsed ? (
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
              onColorFolder={onColorFolder}
              depth={0}
              allFolders={folders}
              noteCountByFolder={noteCountByFolder}
              compact={collapsed}
            />
          ))
        )}

        <div className="folder-sidebar-bottom">
          <div
            className={
              "folder-all-notes folder-all-notes--trash" +
              (selectedFolderId === trashViewId ? " folder-row--selected" : "")
            }
            onClick={() => onSelectFolder(trashViewId)}
            title={collapsed ? "Recently Deleted" : undefined}
          >
            <span className="folder-icon">
              <IconTrash />
            </span>
            {!collapsed && (
              <span className="folder-name">Recently Deleted</span>
            )}
            {!collapsed && (
              <span className="folder-count folder-count--trash">
                {recentlyDeletedCount || 0}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FolderSidebar;
