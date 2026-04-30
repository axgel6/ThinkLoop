import React, { useState } from "react";
import Dropdown from "./Dropdown";
import AccountModal from "./AccountModal";
import "./settings-page.css";
import { FONT_OPTIONS, FONT_MAP, applyFont } from "../utils/fonts";
import {
  UI_FONT_SIZE_OPTIONS,
  applyUIFontSize,
  normalizeUIFontSize,
} from "../utils/fontSize";
import { COLOR_OPTIONS, applyTheme } from "../utils/themes";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

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

// Background + accent colors for theme swatches
const THEME_SWATCHES = {
  zero: { bg: "#0a0e14", accent: "#39bae6" },
  one: { bg: "#111111", accent: "#e0e0e0" },
  light: { bg: "#ffffff", accent: "#1a1a1a" },
  two: { bg: "#0a1628", accent: "#7cb3ff" },
  three: { bg: "#1a1a1e", accent: "#c8c8d0" },
  four: { bg: "#f5f1e8", accent: "#8b7355" },
  five: { bg: "#ceb4ff", accent: "#7c5cba" },
  six: { bg: "#fff1f6", accent: "#d4789e" },
  seven: { bg: "#e3f2fd", accent: "#4a90c7" },
  eight: { bg: "#e8f3e8", accent: "#5a8e5a" },
  nine: { bg: "#2b1b12", accent: "#c4a882" },
  ten: { bg: "#0d0000", accent: "#ff7a4d" },
  eleven: { bg: "#1a0a0e", accent: "#c4808e" },
  twelve: { bg: "#0e1a0e", accent: "#6ab46a" },
  thirteen: { bg: "#cb9a2e", accent: "#fff8e1" },
  fourteen: { bg: "#0b0b1a", accent: "#8caaff" },
  fifteen: { bg: "#0a0a0a", accent: "#d0d0d0" },
  sixteen: { bg: "#3b6fb3", accent: "#4ea32f" },
  seventeen: { bg: "#8B1A1A", accent: "#ffaaaa" },
  eighteen: { bg: "#282828", accent: "#fabd2f" },
};

// SVG icons
const IconPalette = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="13.5" cy="6.5" r="1.5" />
    <circle cx="17.5" cy="10.5" r="1.5" />
    <circle cx="8.5" cy="7.5" r="1.5" />
    <circle cx="6.5" cy="12.5" r="1.5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const IconFont = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
);

const IconUser = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconDownload = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconCloud = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const IconCheck = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconLogOut = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconSettings2 = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconSun = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const Settings = ({
  onOpenLoginModal,
  currentUser,
  onLogout,
  onUpdateUser,
}) => {
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

  const [fontSizeVal, setFontSizeVal] = React.useState(() => {
    try {
      return normalizeUIFontSize(localStorage.getItem("settings:fontSize"));
    } catch {
      return 16;
    }
  });

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [hasLoadedRemoteSettings, setHasLoadedRemoteSettings] =
    useState(!currentUser);

  React.useEffect(() => {
    let cancelled = false;
    const loadUserSettings = async () => {
      if (!currentUser) {
        setHasLoadedRemoteSettings(true);
        return;
      }
      setHasLoadedRemoteSettings(false);
      setIsLoadingSettings(true);
      try {
        const response = await fetch(
          `${API_URL}/auth/user/${currentUser.id}/settings`,
        );
        if (response.ok && !cancelled) {
          const settings = await response.json();
          setVal(settings.colorTheme || "zero");
          setFontVal(settings.fontTheme || "zero");
          setFontSizeVal(normalizeUIFontSize(settings.fontSize));
          setWeatherCity(settings.weatherCity || "Atlanta");
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      } finally {
        if (!cancelled) {
          setIsLoadingSettings(false);
          setHasLoadedRemoteSettings(true);
        }
      }
    };
    loadUserSettings();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  React.useEffect(() => {
    if (isLoadingSettings) return;
    try {
      localStorage.setItem("settings:selected", val);
      applyTheme(val);
      if (currentUser && hasLoadedRemoteSettings) {
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ colorTheme: val }),
        }).catch((err) => console.error("Failed to sync color theme:", err));
      }
    } catch (e) {
      /* ignore */
    }
  }, [val, currentUser, isLoadingSettings, hasLoadedRemoteSettings]);

  React.useEffect(() => {
    if (isLoadingSettings) return;
    try {
      localStorage.setItem("settings:font", fontVal);
      applyFont(fontVal);
      if (currentUser && hasLoadedRemoteSettings) {
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fontTheme: fontVal }),
        }).catch((err) => console.error("Failed to sync font theme:", err));
      }
    } catch (e) {
      /* ignore */
    }
  }, [fontVal, currentUser, isLoadingSettings, hasLoadedRemoteSettings]);

  React.useEffect(() => {
    if (isLoadingSettings) return;
    try {
      localStorage.setItem("settings:weatherCity", weatherCity);
      window.dispatchEvent(new Event("weatherCityChanged"));
      if (currentUser && hasLoadedRemoteSettings) {
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weatherCity }),
        }).catch((err) => console.error("Failed to sync weather city:", err));
      }
    } catch (e) {
      /* ignore */
    }
  }, [weatherCity, currentUser, isLoadingSettings, hasLoadedRemoteSettings]);

  React.useEffect(() => {
    if (isLoadingSettings) return;
    try {
      const normalized = normalizeUIFontSize(fontSizeVal);
      localStorage.setItem("settings:fontSize", String(normalized));
      applyUIFontSize(normalized);
      if (currentUser && hasLoadedRemoteSettings) {
        fetch(`${API_URL}/auth/user/${currentUser.id}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fontSize: normalized }),
        }).catch((err) => console.error("Failed to sync font size:", err));
      }
    } catch (e) {
      /* ignore */
    }
  }, [fontSizeVal, currentUser, isLoadingSettings, hasLoadedRemoteSettings]);

  const handleExportNotes = () => {
    try {
      const raw = localStorage.getItem("notes");
      const stored = raw ? JSON.parse(raw) : [];
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
            ? new Date(n.createdAt).toLocaleString(undefined, dateOpts)
            : n.createdAt,
        lastModified:
          typeof n.lastModified === "number"
            ? new Date(n.lastModified).toLocaleString(undefined, dateOpts)
            : n.lastModified,
      }));
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const blob = new Blob([safeJSONStringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notes-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export notes", e);
    }
  };

  const handleExportTasks = () => {
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
            ? new Date(i.createdAt).toLocaleString(undefined, dateOpts)
            : i.createdAt,
        completedAt:
          typeof i.completedAt === "number"
            ? new Date(i.completedAt).toLocaleString(undefined, dateOpts)
            : i.completedAt,
      }));
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const blob = new Blob([safeJSONStringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export tasks", e);
    }
  };

  const userInitials = currentUser?.username
    ? currentUser.username.slice(0, 2).toUpperCase()
    : "?";

  const currentThemeLabel =
    COLOR_OPTIONS.find((o) => o.id === val)?.label || "Default";

  return (
    console.warn(
      "This application is not intended for production use therefore it is recommended to not store sensitive information. Please use at your own risk.",
    ),
    (
      <div className="settings-page">
        <div className="settings-inner">
          <div className="settings-page-header">
            <h1 className="settings-page-title">Settings</h1>
            <p className="settings-page-subtitle">Customize your workspace</p>
          </div>

          {/* ── Shutdown Banner ──────────────────────────────── */}
          <div className="settings-shutdown-banner" role="alert">
            <div className="settings-shutdown-banner-icon" aria-hidden="true">!</div>
            <div className="settings-shutdown-banner-body">
              <span className="settings-shutdown-banner-label">Notice</span>
              <span className="settings-shutdown-banner-text">ThinkLoop is ending development. Please export any data you wish to keep before servers shut down.</span>
              <span className="settings-shutdown-banner-date">Shutdown date: May 15, 2026</span>
            </div>
          </div>

          {/* ── Appearance Card ──────────────────────────────── */}
          <div className="settings-card" style={{ animationDelay: "0ms" }}>
            <div className="settings-card-header">
              <div className="settings-card-icon settings-card-icon--palette">
                <IconPalette />
              </div>
              <div>
                <div className="settings-card-title">Appearance</div>
                <div className="settings-card-desc">
                  Color theme and typography
                </div>
              </div>
            </div>

            {/* Color Theme */}
            <div className="settings-field">
              <div className="settings-field-label">
                <span>Color Theme</span>
                <span className="settings-field-value">
                  {currentThemeLabel}
                </span>
              </div>
              <div className="theme-swatch-grid">
                {COLOR_OPTIONS.map((option) => {
                  const swatch = THEME_SWATCHES[option.id] || {
                    bg: "#333",
                    accent: "#fff",
                  };
                  const isActive = val === option.id;
                  return (
                    <button
                      key={option.id}
                      className={`theme-swatch${isActive ? " theme-swatch--active" : ""}`}
                      onClick={() => setVal(option.id)}
                      title={option.label}
                      aria-label={option.label}
                      aria-pressed={isActive}
                    >
                      <span
                        className="theme-swatch-dot"
                        style={{
                          background: swatch.bg,
                          borderColor: isActive ? swatch.accent : "transparent",
                          boxShadow: isActive
                            ? `0 0 0 1px ${swatch.accent}44`
                            : "none",
                        }}
                      >
                        <span
                          className="theme-swatch-accent"
                          style={{ background: swatch.accent }}
                        />
                        {isActive && (
                          <span
                            className="theme-swatch-check"
                            style={{ color: swatch.accent }}
                          >
                            <IconCheck />
                          </span>
                        )}
                      </span>
                      <span className="theme-swatch-label">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="settings-divider" />

            {/* Font Theme */}
            <div className="settings-field settings-field--row">
              <div className="settings-field-label-inline">
                <div className="settings-field-icon">
                  <IconFont />
                </div>
                <div>
                  <div className="settings-field-name">Font</div>
                  <div className="settings-field-hint">UI typeface</div>
                </div>
              </div>
              <Dropdown
                options={FONT_OPTIONS}
                value={fontVal}
                onChange={(v) => setFontVal(v)}
                fontPreview={true}
                fontMap={FONT_MAP}
              />
            </div>

            <div className="settings-divider" />

            {/* UI Font Size */}
            <div className="settings-field settings-field--row">
              <div className="settings-field-label-inline">
                <div className="settings-field-icon">
                  <IconFont />
                </div>
                <div>
                  <div className="settings-field-name">Font Size</div>
                  <div className="settings-field-hint">UI text scale</div>
                </div>
              </div>
              <Dropdown
                options={UI_FONT_SIZE_OPTIONS}
                value={fontSizeVal}
                onChange={(v) => setFontSizeVal(normalizeUIFontSize(v))}
              />
            </div>

            {/* Weather City (only when logged in) */}
            {currentUser && (
              <>
                <div className="settings-divider" />
                <div className="settings-field settings-field--row">
                  <div className="settings-field-label-inline">
                    <div className="settings-field-icon">
                      <IconSun />
                    </div>
                    <div>
                      <div className="settings-field-name">Weather City</div>
                      <div className="settings-field-hint">
                        Shown on your home screen
                      </div>
                    </div>
                  </div>
                  <Dropdown
                    options={CITY_OPTIONS}
                    value={weatherCity}
                    onChange={(v) => setWeatherCity(v)}
                  />
                </div>
              </>
            )}
          </div>

          {/* ── Bottom Grid ───────────────────────────────────── */}
          <div className="settings-grid">
            {/* Account Card */}
            <div className="settings-card" style={{ animationDelay: "60ms" }}>
              <div className="settings-card-header">
                <div className="settings-card-icon settings-card-icon--user">
                  <IconUser />
                </div>
                <div>
                  <div className="settings-card-title">Account</div>
                  <div className="settings-card-desc">Sync across devices</div>
                </div>
              </div>

              {currentUser ? (
                <div className="settings-account-info">
                  <div className="settings-avatar">{userInitials}</div>
                  <div className="settings-account-details">
                    <div className="settings-account-name">
                      {currentUser.username}
                    </div>
                    <div className="settings-account-status">
                      <span className="settings-account-dot" />
                      Signed in
                    </div>
                  </div>
                  <div className="settings-account-actions">
                    <button
                      className="settings-btn settings-btn--secondary"
                      onClick={() => setShowAccountModal(true)}
                    >
                      <IconSettings2 />
                      Manage
                    </button>
                    <button
                      className="settings-btn settings-btn--ghost"
                      onClick={onLogout}
                    >
                      <IconLogOut />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="settings-signin-prompt">
                  <div className="settings-signin-icon">
                    <IconCloud />
                  </div>
                  <div className="settings-signin-text">
                    <div className="settings-signin-title">Sync your data</div>
                    <div className="settings-signin-desc">
                      Sign in to save your settings and access notes across
                      devices
                    </div>
                  </div>
                  <button
                    className="settings-btn settings-btn--primary"
                    onClick={() => onOpenLoginModal && onOpenLoginModal()}
                  >
                    Sign In / Sign Up
                  </button>
                  <p className="settings-signin-note">
                    Server may need a moment to wake up on first use
                  </p>
                </div>
              )}
            </div>

            {/* Export Card */}
            <div className="settings-card" style={{ animationDelay: "120ms" }}>
              <div className="settings-card-header">
                <div className="settings-card-icon settings-card-icon--export">
                  <IconDownload />
                </div>
                <div>
                  <div className="settings-card-title">Export</div>
                  <div className="settings-card-desc">
                    Download local backups
                  </div>
                </div>
              </div>

              <div className="settings-export-grid">
                <button
                  className="settings-export-btn"
                  onClick={handleExportNotes}
                >
                  <div className="settings-export-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="13" y2="17" />
                    </svg>
                  </div>
                  <div className="settings-export-label">Notes</div>
                  <div className="settings-export-format">JSON</div>
                </button>

                <button
                  className="settings-export-btn"
                  onClick={handleExportTasks}
                >
                  <div className="settings-export-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </div>
                  <div className="settings-export-label">Tasks</div>
                  <div className="settings-export-format">JSON</div>
                </button>
              </div>
            </div>
          </div>

          {/* ── About Card ────────────────────────────────────── */}
          <div
            className="settings-card settings-card--about"
            style={{ animationDelay: "180ms" }}
          >
            <div className="settings-about-content">
              <div className="settings-about-brand">ThinkLoop</div>
              <div className="settings-about-tagline">
                A personal dashboard.
              </div>
              <div className="settings-about-links">
                <a
                  href="https://aynjel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-about-link"
                >
                  Made by Angel Gutierrez
                </a>
                <span className="settings-about-sep">·</span>
                <a
                  href="https://modelloop-frontend.onrender.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-about-link settings-about-link--accent"
                >
                  Try ModelLoop
                </a>
              </div>
            </div>
          </div>
        </div>

        {showAccountModal && currentUser && (
          <AccountModal
            currentUser={currentUser}
            onClose={() => setShowAccountModal(false)}
            onUpdateUser={onUpdateUser}
            onLogout={onLogout}
          />
        )}
      </div>
    )
  );
};

export default Settings;
