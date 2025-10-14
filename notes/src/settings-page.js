import React from "react";
import Dropdown from "./Dropdown";
import Button from "./Button";
import "./settings-page.css";
import { FONT_OPTIONS } from "./fonts";

const COLOR_OPTIONS = [
  { id: "one", label: "Black" },
  { id: "nine", label: "Brown" },
  { id: "two", label: "Blue" },
  { id: "three", label: "Gray" },
  { id: "four", label: "Cream" },
  { id: "five", label: "Purple" },
  { id: "six", label: "Baby Pink" },
  { id: "seven", label: "Sky Blue" },
  { id: "eight", label: "Sage Green" },
];

const Settings = () => {
  const [val, setVal] = React.useState(() => {
    try {
      return localStorage.getItem("settings:selected") ?? COLOR_OPTIONS[0].id;
    } catch (e) {
      return COLOR_OPTIONS[0].id;
    }
  });

  const [fontVal, setFontVal] = React.useState(() => {
    try {
      return localStorage.getItem("settings:font") ?? FONT_OPTIONS[0].id;
    } catch (e) {
      return FONT_OPTIONS[0].id;
    }
  });

  // persist selection and apply theme
  React.useEffect(() => {
    try {
      localStorage.setItem("settings:selected", val);

      // Apply theme immediately
      const root = document.documentElement;
      root.classList.remove(
        "theme-dark",
        "theme-blue",
        "theme-gray",
        "theme-cream",
        "theme-purple",
        "theme-pink",
        "theme-skyblue",
        "theme-sage",
        "theme-brown"
      );
      if (val === "one") root.classList.add("theme-dark");
      else if (val === "two") root.classList.add("theme-blue");
      else if (val === "three") root.classList.add("theme-gray");
      else if (val === "four") root.classList.add("theme-cream");
      else if (val === "five") root.classList.add("theme-purple");
      else if (val === "six") root.classList.add("theme-pink");
      else if (val === "seven") root.classList.add("theme-skyblue");
      else if (val === "eight") root.classList.add("theme-sage");
      else if (val === "nine") root.classList.add("theme-brown");
    } catch (e) {
      /* ignore */
    }
  }, [val]);

  // Persist and apply font theme
  React.useEffect(() => {
    try {
      localStorage.setItem("settings:font", fontVal);
      const root = document.documentElement;
      // remove any existing font classes
      root.classList.remove(
        "font-mono",
        "font-inter",
        "font-paper",
        "font-handwritten",
        "font-lora",
        "font-poppins",
        "font-cormorant",
        "font-space",
        "font-orbitron",
        "font-amatic",
        "font-greatvibes"
      );
      if (fontVal === "mono") root.classList.add("font-mono");
      else if (fontVal === "inter") root.classList.add("font-inter");
      else if (fontVal === "paper") root.classList.add("font-paper");
      else if (fontVal === "handwritten")
        root.classList.add("font-handwritten");
      else if (fontVal === "lora") root.classList.add("font-lora");
      else if (fontVal === "poppins") root.classList.add("font-poppins");
      else if (fontVal === "cormorant") root.classList.add("font-cormorant");
      else if (fontVal === "space") root.classList.add("font-space");
      else if (fontVal === "orbitron") root.classList.add("font-orbitron");
      else if (fontVal === "amatic") root.classList.add("font-amatic");
      else if (fontVal === "greatvibes") root.classList.add("font-greatvibes");
      // Notify other UI components that fonts changed so they can reflow instantly
      try {
        window.dispatchEvent(new Event("fontchange"));
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      /* ignore */
    }
  }, [fontVal]);

  return (
    <div style={{ padding: 16 }}>
      <div className="settings-toggles">
        <div className="settings-section">
          <h2>Display & Visuals</h2>
          <div style={{ marginTop: 12 }} className="controls-row">
            <label style={{ marginRight: 8 }}>Color Theme:</label>
            <Dropdown
              options={COLOR_OPTIONS}
              value={val}
              onChange={(v) => setVal(v)}
            />
            <label style={{ marginLeft: 12, marginRight: 8 }}>
              Font Theme:
            </label>
            <Dropdown
              options={FONT_OPTIONS}
              value={fontVal}
              onChange={(v) => setFontVal(v)}
            />
          </div>
        </div>

        <hr className="settings-divider" />

        <div className="settings-section">
          <h2>User Account</h2>
          <label style={{ marginRight: 8 }}>Coming Soon</label>
        </div>

        <hr className="settings-divider" />

        <div className="settings-section">
          <h2>Export</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ marginRight: 8 }}>Download backups:</label>
            <Button
              onClick={() => {
                try {
                  const raw = localStorage.getItem("notes");
                  const data = raw ? JSON.parse(raw) : [];
                  const ts = new Date().toISOString().replace(/[:.]/g, "-");
                  const filename = `notes-${ts}.json`;
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error("Failed to export notes", e);
                }
              }}
            >
              Download Notes
            </Button>

            <Button
              onClick={() => {
                try {
                  const raw = localStorage.getItem("checklist:items");
                  const data = raw ? JSON.parse(raw) : [];
                  const ts = new Date().toISOString().replace(/[:.]/g, "-");
                  const filename = `tasks-${ts}.json`;
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error("Failed to export tasks", e);
                }
              }}
            >
              Download Tasks
            </Button>
          </div>
        </div>

        <hr className="settings-divider" />

        <div className="settings-section">
          <h2>Credits</h2>
          <Button onClick={() => window.open("https://aynjel.com")}>
            Created by Angel Gutierrez
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
