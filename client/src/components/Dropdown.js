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
}) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setHighlight(-1);
      return;
    }
    const onKey = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, options.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlight >= 0) onChange(options[highlight].id);
        setOpen(false);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOutside = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target))
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [open, highlight, options, onChange]);

  const selectedLabel = options.find((o) => o.id === value)?.label || placeholder;
  const rect = open && btnRef.current ? btnRef.current.getBoundingClientRect() : null;

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

      {open && rect &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className="custom-select-list"
            style={{
              top: rect.bottom + 6,
              left: rect.left,
              minWidth: Math.max(rect.width, 180),
            }}
          >
            {options.map((o, idx) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                className={"custom-select-option" + (idx === highlight ? " highlight" : "")}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => { onChange(o.id); setOpen(false); }}
                style={fontPreview && fontMap[o.id] ? { fontFamily: fontMap[o.id] } : undefined}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
};

export default Dropdown;
