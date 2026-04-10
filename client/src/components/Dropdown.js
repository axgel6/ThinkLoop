import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import "./Dropdown.css";

const Dropdown = ({
  options = [],
  value = "",
  onChange = () => {},
  placeholder = "Select",
  fontPreview = false,
  fontMap = {},
  searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [searchText, setSearchText] = useState("");
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const normalizedSearch = searchText.trim().toLowerCase();
  const visibleOptions = searchable
    ? options.filter((o) =>
        String(o.label || "")
          .toLowerCase()
          .includes(normalizedSearch),
      )
    : options;

  useEffect(() => {
    if (!open) {
      setHighlight(-1);
      setSearchText("");
      return;
    }
    const onKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, visibleOptions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlight >= 0 && visibleOptions[highlight]) {
          onChange(visibleOptions[highlight].id);
        }
        setOpen(false);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOutside = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      )
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [open, highlight, visibleOptions, onChange, searchable]);

  const selectedLabel =
    options.find((o) => o.id === value)?.label || placeholder;
  const rect =
    open && btnRef.current ? btnRef.current.getBoundingClientRect() : null;
  const viewportWidth =
    typeof window !== "undefined"
      ? window.innerWidth
      : document.documentElement.clientWidth;
  const viewportHeight =
    typeof window !== "undefined"
      ? window.innerHeight
      : document.documentElement.clientHeight;

  const estimatedOptionHeight = 34;
  const estimatedSearchHeight = searchable ? 44 : 0;
  const estimatedMenuHeight = Math.min(
    260,
    Math.max(
      120,
      visibleOptions.length * estimatedOptionHeight + estimatedSearchHeight + 8,
    ),
  );

  const menuMinWidth = rect ? Math.max(rect.width, 180) : 180;
  const menuLeft = rect
    ? Math.max(8, Math.min(rect.left, viewportWidth - menuMinWidth - 8))
    : 8;
  const spaceBelow = rect ? viewportHeight - rect.bottom : 0;
  const spaceAbove = rect ? rect.top : 0;
  const openUpward =
    Boolean(rect) &&
    spaceBelow < estimatedMenuHeight + 12 &&
    spaceAbove > spaceBelow;
  const menuTop = rect
    ? openUpward
      ? Math.max(8, rect.top - estimatedMenuHeight - 6)
      : Math.max(8, Math.min(rect.bottom + 6, viewportHeight - estimatedMenuHeight - 8))
    : 8;

  const handleMenuWheel = (e) => {
    const menu = menuRef.current;
    if (!menu) return;

    const { scrollTop, scrollHeight, clientHeight } = menu;
    const delta = e.deltaY;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  return (
    <div className="custom-select">
      <button
        ref={btnRef}
        type="button"
        className="custom-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {selectedLabel}
        <span className="chev">▾</span>
      </button>

      {open &&
        rect &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className={`custom-select-list${openUpward ? " open-up" : " open-down"}`}
            onWheel={handleMenuWheel}
            style={{
              top: menuTop,
              left: menuLeft,
              minWidth: menuMinWidth,
            }}
          >
            {searchable && (
              <li className="custom-select-search-wrap" aria-hidden="true">
                <input
                  className="custom-select-search"
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setHighlight(-1);
                  }}
                  placeholder="Search..."
                  onClick={(e) => e.stopPropagation()}
                />
              </li>
            )}
            {visibleOptions.map((o, idx) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                className={
                  "custom-select-option" +
                  (idx === highlight ? " highlight" : "")
                }
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                style={
                  fontPreview && fontMap[o.id]
                    ? { fontFamily: fontMap[o.id] }
                    : undefined
                }
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
};

export default Dropdown;
