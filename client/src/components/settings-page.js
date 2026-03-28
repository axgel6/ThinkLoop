import React, { useState } from "react";
import Dropdown from "./Dropdown";
import Button from "./Button";
import AccountModal from "./AccountModal";
import "./settings-page.css";
import { FONT_OPTIONS, FONT_MAP, applyFont } from "../utils/fonts";
import { COLOR_OPTIONS, applyTheme } from "../utils/themes";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const CITY_OPTIONS = [
  { id: "Atlanta", label: "Atlanta" },
  { id: "New York", label: "New York" },
  { id: "Los Angeles", label: "Los Angeles" },
  { id: "Chicago", label: "Chicago" },
  { id: "Houston", label: "Houston" },
  { id: "Phoenix", label: "Phoenix" },
  { id: "Philadelphia", label: "Philadelphia" },
  { id: "San Antonio", label: "San Antonio" },
  { id: "San Diego", label: "San Diego" },
  { id: "Dallas", label: "Dallas" },
  { id: "San Francisco", label: "San Francisco" },
  { id: "Seattle", label: "Seattle" },
  { id: "Denver", label: "Denver" },
  { id: "Boston", label: "Boston" },
  { id: "Miami", label: "Miami" },
  { id: "London", label: "London" },
  { id: "Paris", label: "Paris" },
  { id: "Tokyo", label: "Tokyo" },
  { id: "Sydney", label: "Sydney" },
  { id: "Toronto", label: "Toronto" },
];

const Settings = ({ onOpenLoginModal, currentUser, onLogout, onUpdateUser }) => {
  // Safely stringify JSON for export: escape characters/sequences that can
  // cause issues if the JSON is later embedded in HTML or a <script> tag.
  // This prevents JSON injection by neutralizing </script>, U+2028/U+2029,
  // and HTML comment openers.
  const safeJSONStringify = (obj) =>
    JSON.stringify(
      obj,
      (_k, v) => {
        if (typeof v === "string") {
          return v
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029")
            .replace(/<\/script/gi, "<\\/script")
            .replace(/<!--/g, "<\\!--");
        }
        return v;
      },
      2,
    );
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

  const [weatherCity, setWeatherCity] = React.useState(() => {
    try {
      return localStorage.getItem("settings:weatherCity") || "Atlanta";
    } catch {
      return "Atlanta";
    }
  });

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Load theme settings from server when user logs in
  React.useEffect(() => {
    const loadUserSettings = async () => {
      if (!currentUser) return;

      setIsLoadingSettings(true);
      try {
        const response = await fetch(
          `${API_URL}/auth/user/${currentUser.id}/settings`,
        );
        if (response.ok) {
          const settings = await response.json();
          setVal(settings.colorTheme || "zero");
          setFontVal(settings.fontTheme || "zero");
          setWeatherCity(settings.weatherCity || "Atlanta");
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    loadUserSettings();
  }, [currentUser]);

  // persist selection and apply theme
  React.useEffect(() => {
    // Skip syncing during initial settings load
    if (isLoadingSettings) return;

    try {
      localStorage.setItem("settings:selected", val);
      applyTheme(val);

      // Sync to server if logged in
      if (currentUser) {
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colorTheme: val }),
        }).catch((err) => console.error("Failed to sync color theme:", err));
      }
    } catch (e) {
      /* ignore */
    }
  }, [val, currentUser, isLoadingSettings]);

  // Persist and apply font theme
  React.useEffect(() => {
    // Skip syncing during initial settings load
    if (isLoadingSettings) return;

    try {
      localStorage.setItem("settings:font", fontVal);
      applyFont(fontVal);

      // Sync to server if logged in
      if (currentUser) {
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fontTheme: fontVal }),
        }).catch((err) => console.error("Failed to sync font theme:", err));
      }
    } catch (e) {
      /* ignore */
    }
  }, [fontVal, currentUser, isLoadingSettings]);

  // Persist weather city setting
  React.useEffect(() => {
    // Skip syncing during initial settings load
    if (isLoadingSettings) return;

    try {
      localStorage.setItem("settings:weatherCity", weatherCity);
      // Dispatch custom event to notify Weather component
      window.dispatchEvent(new Event("weatherCityChanged"));

      // Sync to server if logged in
      if (currentUser) {
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weatherCity }),
        }).catch((err) => console.error("Failed to sync weather city:", err));
      }
    } catch (e) {
      /* ignore */
    }
  }, [weatherCity, currentUser, isLoadingSettings]);


  return (
    console.warn(
      "This application is not intended for production use therefore it is recommended to not store sensitive information. Please use at your own risk.",
    ),
    (
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
                fontPreview={true}
                fontMap={FONT_MAP}
              />
            </div>
            {currentUser && (
              <div style={{ marginTop: 12 }} className="controls-row">
                <label style={{ marginRight: 8 }}>Weather City:</label>
                <Dropdown
                  options={CITY_OPTIONS}
                  value={weatherCity}
                  onChange={(v) => setWeatherCity(v)}
                />
              </div>
            )}
          </div>

          <hr className="settings-divider" />

          <div className="settings-section">
            <h2>User Account</h2>
            <p>Note: Server may need a moment to wake up on first use</p>

            {currentUser ? (
              <>
                <p style={{ marginBottom: 12, color: "var(--muted, #9a9a9a)" }}>
                  Signed in as,{" "}
                  <strong style={{ color: "var(--fg, #dcdcdc)" }}>
                    {currentUser.username}
                  </strong>
                  !
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <Button onClick={() => setShowAccountModal(true)}>
                    Manage Account
                  </Button>
                  <Button onClick={onLogout}>Log Out</Button>
                </div>
              </>
            ) : (
              <Button onClick={() => onOpenLoginModal && onOpenLoginModal()}>
                Sign In / Sign Up
              </Button>
            )}
          </div>

          {showAccountModal && currentUser && (
            <AccountModal
              currentUser={currentUser}
              onClose={() => setShowAccountModal(false)}
              onUpdateUser={onUpdateUser}
              onLogout={onLogout}
            />
          )}

          <hr className="settings-divider" />

          <div className="settings-section">
            <h2>Export</h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{ marginRight: 8 }}>Download backups:</label>
              <Button
                onClick={() => {
                  try {
                    const raw = localStorage.getItem("notes");
                    const stored = raw ? JSON.parse(raw) : [];
                    // Convert numeric timestamps to the user's local date/time string
                    // so exported JSON shows the correct day/time in the user's timezone.
                    const dateOpts = {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    };
                    const data = stored.map((n) => ({
                      ...n,
                      createdAt:
                        typeof n.createdAt === "number"
                          ? new Date(n.createdAt).toLocaleString(
                              undefined,
                              dateOpts,
                            )
                          : n.createdAt,
                      lastModified:
                        typeof n.lastModified === "number"
                          ? new Date(n.lastModified).toLocaleString(
                              undefined,
                              dateOpts,
                            )
                          : n.lastModified,
                    }));
                    const ts = new Date().toISOString().replace(/[:.]/g, "-");
                    const filename = `notes-${ts}.json`;
                    const blob = new Blob([safeJSONStringify(data)], {
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
                    const stored = raw ? JSON.parse(raw) : [];
                    const dateOpts = {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    };
                    const data = stored.map((i) => ({
                      ...i,
                      createdAt:
                        typeof i.createdAt === "number"
                          ? new Date(i.createdAt).toLocaleString(
                              undefined,
                              dateOpts,
                            )
                          : i.createdAt,
                      completedAt:
                        typeof i.completedAt === "number"
                          ? new Date(i.completedAt).toLocaleString(
                              undefined,
                              dateOpts,
                            )
                          : i.completedAt,
                    }));
                    const ts = new Date().toISOString().replace(/[:.]/g, "-");
                    const filename = `tasks-${ts}.json`;
                    const blob = new Blob([safeJSONStringify(data)], {
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
            <h4>
              Try{" "}
              <a
                href="https://modelloop-frontend.onrender.com"
                target="_blank"
                rel="noopener noreferrer"
                className="modelLoop-link"
              >
                ModelLoop
              </a>
            </h4>
          </div>
        </div>
      </div>
    )
  );
};

export default Settings;
