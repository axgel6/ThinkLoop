import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./Login.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

interface User {
  id: string;
  username: string;
  name?: string;
}

interface AccountModalProps {
  currentUser: User;
  onClose: () => void;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

export default function AccountModal({
  currentUser,
  onClose,
  onUpdateUser,
  onLogout,
}: AccountModalProps) {
  const [alert, setAlert] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showAlert = (type: "error" | "success", message: string) => {
    setAlert({ type, message });
    if (type === "success") setTimeout(() => setAlert(null), 3000);
  };

  const submit = async (
    url: string,
    method: string,
    body: object,
    onSuccess: (json: any) => void,
    form: HTMLFormElement,
  ) => {
    setAlert(null);
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      onSuccess(json);
      form.reset();
    } catch (err: any) {
      showAlert("error", err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newName = new FormData(e.currentTarget).get("newName") as string;
    submit(
      `${API_URL}/auth/user/${currentUser.id}/name`, "PUT", { newName },
      (json) => {
        const updated = { ...currentUser, name: json.name };
        localStorage.setItem("currentUser", JSON.stringify(updated));
        onUpdateUser(updated);
        showAlert("success", "Name updated!");
      },
      e.currentTarget,
    );
  };

  const handleUpdateUsername = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newUsername = new FormData(e.currentTarget).get("newUsername") as string;
    submit(
      `${API_URL}/auth/user/${currentUser.id}/username`, "PUT", { newUsername },
      (json) => {
        const updated = { ...currentUser, username: json.username };
        localStorage.setItem("currentUser", JSON.stringify(updated));
        onUpdateUser(updated);
        showAlert("success", "Username updated!");
      },
      e.currentTarget,
    );
  };

  const handleUpdatePassword = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    submit(
      `${API_URL}/auth/user/${currentUser.id}/password`, "PUT",
      { currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") },
      () => showAlert("success", "Password updated!"),
      e.currentTarget,
    );
  };

  const handleDeleteAccount = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = new FormData(e.currentTarget).get("deletePassword") as string;
    submit(
      `${API_URL}/auth/user/${currentUser.id}`, "DELETE", { password },
      () => { onLogout(); onClose(); },
      e.currentTarget,
    );
  };

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content account-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <h1>Account</h1>
        <p>Signed in as <strong>{currentUser.username}</strong></p>

        {alert && (
          <div className={`account-alert ${alert.type === "error" ? "account-alert-error" : "account-alert-success"}`}>
            {alert.message}
          </div>
        )}

        <form className="account-section" onSubmit={handleUpdateName}>
          <p className="account-section-heading">Display Name</p>
          <div className="form-group">
            <input
              name="newName"
              type="text"
              placeholder={currentUser.name || "Enter display name"}
              required
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            Update Name
          </button>
        </form>

        <hr className="account-divider" />

        <form className="account-section" onSubmit={handleUpdateUsername}>
          <p className="account-section-heading">Username</p>
          <div className="form-group">
            <input
              name="newUsername"
              type="text"
              placeholder={currentUser.username}
              required
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            Update Username
          </button>
        </form>

        <hr className="account-divider" />

        <form className="account-section" onSubmit={handleUpdatePassword}>
          <p className="account-section-heading">Password</p>
          <div className="form-group">
            <input
              name="currentPassword"
              type="password"
              placeholder="Current password"
              required
            />
          </div>
          <div className="form-group">
            <input
              name="newPassword"
              type="password"
              placeholder="New password"
              required
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            Update Password
          </button>
        </form>

        <hr className="account-divider account-divider-danger" />

        {!confirmDelete ? (
          <button
            className="login-submit-btn danger account-delete-btn"
            onClick={() => setConfirmDelete(true)}
          >
            Delete Account
          </button>
        ) : (
          <form className="account-section" onSubmit={handleDeleteAccount}>
            <p className="account-section-heading account-section-heading-danger">
              Confirm deletion — this cannot be undone
            </p>
            <div className="form-group">
              <input
                name="deletePassword"
                type="password"
                placeholder="Enter password to confirm"
                required
                autoFocus
              />
            </div>
            <div className="account-confirm-actions">
              <button
                type="button"
                className="login-submit-btn"
                onClick={() => setConfirmDelete(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="login-submit-btn danger"
                disabled={loading}
              >
                {loading ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
