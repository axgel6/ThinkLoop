import React, { useState } from "react";
import Dropdown from "./Dropdown";
import Button from "./Button";
import "./settings-page.css";
import { FONT_OPTIONS, FONT_MAP, applyFont } from "./fonts";
import { COLOR_OPTIONS, applyTheme } from "./themes";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const Settings = ({ onOpenLoginModal, currentUser, onLogout }) => {
  // Safely stringify JSON for export: escape characters/sequences that can
  // cause issues if the JSON is later embedded in HTML or a <script> tag.
  // This prevents JSON injection by neutralizing </script>, U+2028/U+2029,
  // and HTML comment openers.
  const safeJSONStringify = (obj) =>
    JSON.stringify(
      obj,
      (k, v) => {
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

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");

  // persist selection and apply theme
  React.useEffect(() => {
    try {
      localStorage.setItem("settings:selected", val);
      // Apply theme immediately using helper function
      applyTheme(val);
    } catch (e) {
      /* ignore */
    }
  }, [val]);

  // Persist and apply font theme
  React.useEffect(() => {
    try {
      localStorage.setItem("settings:font", fontVal);
      // Apply font immediately using helper function
      applyFont(fontVal);
    } catch (e) {
      /* ignore */
    }
  }, [fontVal]);

  const handleUpdateName = async () => {
    if (!currentUser || !newName) return;
    setAccountError("");
    setAccountSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/auth/user/${currentUser.id}/name`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newName }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update name");
      }

      setAccountSuccess("Name updated successfully!");
      setNewName("");
      // Update local user data
      const updatedUser = { ...currentUser, name: data.name };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      window.location.reload(); // Reload to update UI
    } catch (err) {
      setAccountError(err.message);
    }
  };

  const handleUpdateUsername = async () => {
    if (!currentUser || !newUsername) return;
    setAccountError("");
    setAccountSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/auth/user/${currentUser.id}/username`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newUsername }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update username");
      }

      setAccountSuccess("Username updated successfully!");
      setNewUsername("");
      // Update local user data
      const updatedUser = { ...currentUser, username: data.username };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      window.location.reload(); // Reload to update UI
    } catch (err) {
      setAccountError(err.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentUser || !currentPassword || !newPassword) return;
    setAccountError("");
    setAccountSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/auth/user/${currentUser.id}/password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setAccountSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setAccountError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser || !deletePassword) return;
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This cannot be undone.",
      )
    ) {
      return;
    }

    setAccountError("");
    setAccountSuccess("");

    try {
      const response = await fetch(`${API_URL}/auth/user/${currentUser.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      alert("Account deleted successfully");
      onLogout();
      setShowAccountModal(false);
    } catch (err) {
      setAccountError(err.message);
    }
  };

  return (
    console.warn(
      "User accounts are not implemented yet. All data is stored locally.",
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
          </div>

          <hr className="settings-divider" />

          <div className="settings-section">
            <h2>User Account</h2>
            {currentUser ? (
              <>
                <p style={{ marginBottom: 12, color: "var(--muted, #9a9a9a)" }}>
                  Hello,{" "}
                  <strong style={{ color: "var(--fg, #dcdcdc)" }}>
                    {currentUser.name || currentUser.username}
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
            <div
              className="modal-backdrop"
              onClick={() => setShowAccountModal(false)}
            >
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="modal-close"
                  onClick={() => setShowAccountModal(false)}
                  aria-label="Close"
                ></button>
                <h1>Manage Account</h1>

                {accountError && (
                  <div
                    style={{
                      color: "#ff6b6b",
                      marginBottom: 16,
                      textAlign: "center",
                    }}
                  >
                    {accountError}
                  </div>
                )}
                {accountSuccess && (
                  <div
                    style={{
                      color: "#51cf66",
                      marginBottom: 16,
                      textAlign: "center",
                    }}
                  >
                    {accountSuccess}
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ marginBottom: 8 }}>Change Name</h3>
                  <input
                    type="text"
                    placeholder="New name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      marginBottom: 8,
                      background: "var(--panel-bg, rgba(30, 30, 30, 0.6))",
                      border:
                        "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
                      borderRadius: 8,
                      color: "var(--fg, #dcdcdc)",
                    }}
                  />
                  <Button onClick={handleUpdateName}>Update Name</Button>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ marginBottom: 8 }}>Change Username</h3>
                  <input
                    type="text"
                    placeholder="New username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      marginBottom: 8,
                      background: "var(--panel-bg, rgba(30, 30, 30, 0.6))",
                      border:
                        "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
                      borderRadius: 8,
                      color: "var(--fg, #dcdcdc)",
                    }}
                  />
                  <Button onClick={handleUpdateUsername}>
                    Update Username
                  </Button>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ marginBottom: 8 }}>Change Password</h3>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      marginBottom: 8,
                      background: "var(--panel-bg, rgba(30, 30, 30, 0.6))",
                      border:
                        "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
                      borderRadius: 8,
                      color: "var(--fg, #dcdcdc)",
                    }}
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      marginBottom: 8,
                      background: "var(--panel-bg, rgba(30, 30, 30, 0.6))",
                      border:
                        "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
                      borderRadius: 8,
                      color: "var(--fg, #dcdcdc)",
                    }}
                  />
                  <Button onClick={handleUpdatePassword}>
                    Update Password
                  </Button>
                </div>

                <div
                  style={{
                    marginBottom: 24,
                    borderTop:
                      "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
                    paddingTop: 24,
                  }}
                >
                  <h3 style={{ marginBottom: 8, color: "#ff6b6b" }}>
                    Delete Account
                  </h3>
                  <p
                    style={{
                      marginBottom: 12,
                      fontSize: 14,
                      color: "var(--muted, #9a9a9a)",
                    }}
                  >
                    This will permanently delete your account and all your
                    notes.
                  </p>
                  <input
                    type="password"
                    placeholder="Enter password to confirm"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      marginBottom: 8,
                      background: "var(--panel-bg, rgba(30, 30, 30, 0.6))",
                      border:
                        "1px solid var(--panel-border, rgba(255, 255, 255, 0.08))",
                      borderRadius: 8,
                      color: "var(--fg, #dcdcdc)",
                    }}
                  />
                  <Button
                    onClick={handleDeleteAccount}
                    style={{
                      background: "rgba(119, 0, 0, 0.473)",
                      color: "#ffb3b3",
                      border: "1px solid rgba(255, 138, 138, 0.12)",
                    }}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
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
          </div>
        </div>
      </div>
    )
  );
};

export default Settings;
