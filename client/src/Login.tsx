import React, { useState } from "react";
import "./Login.css";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (userData: { id: string; username: string; name?: string }) => void;
}

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
}: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { username, password, name } : { username, password },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLogin({ id: data.id, username: data.username, name: data.name });
      setUsername("");
      setPassword("");
      setName("");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h1>{isRegister ? "Sign Up" : "Sign In"}</h1>
        {error && (
          <div
            style={{
              color: "#ff6b6b",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Register" : "Login"}
          </button>
        </form>
        <p
          style={{
            textAlign: "center",
            marginTop: "16px",
            color: "var(--muted, #9a9a9a)",
          }}
        >
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            style={{
              color: "var(--fg, #dcdcdc)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {isRegister ? "Sign In" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
}
