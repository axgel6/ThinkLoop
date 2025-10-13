import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import "./Dropdown.css";

// Generic accessible dropdown component
// props: options: [{id,label}], value, onChange
const Dropdown = ({
  options = [],
  value = "",
  onChange = () => {},
  placeholder = "Select",
}) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const [menuRect, setMenuRect] = useState(null);

  useEffect(() => {
    if (!open) setHighlight(-1);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, highlight, options, onChange]);

  useEffect(() => {
    const onDoc = (e) => {
      if (
        (ref.current && ref.current.contains(e.target)) ||
        (menuRef.current && menuRef.current.contains(e.target))
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Measure button rect when opening so the portal menu can be positioned
  useLayoutEffect(() => {
    if (open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setMenuRect(r);
    }
  }, [open]);

  const selectedLabel =
    options.find((o) => o.id === value)?.label || placeholder;

  return (
    <div className="custom-select" ref={ref}>
      <button
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
        // Render the list in a portal so it can float above other stacking contexts
        createPortal(
          <ul
            role="listbox"
            ref={menuRef}
            className="custom-select-list"
            style={
              menuRect
                ? {
                    position: "fixed",
                    top: menuRect.bottom + 10,
                    left: menuRect.left,
                    minWidth: Math.max(menuRect.width, 180),
                    zIndex: 10050,
                  }
                : { position: "fixed", zIndex: 10050 }
            }
          >
            {options.map((o, idx) => (
              <li
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                className={
                  "custom-select-option " +
                  (idx === highlight ? "highlight" : "")
                }
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
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
