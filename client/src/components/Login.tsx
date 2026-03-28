import React, { useState, useRef } from "react";
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
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const username = data.get("username") as string;
    const password = data.get("password") as string;
    const name = data.get("name") as string;

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { username, password, name } : { username, password },
        ),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Authentication failed");
      }

      onLogin({ id: json.id, username: json.username, name: json.name });
      formRef.current?.reset();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h1>{isRegister ? "Sign Up" : "Sign In"}</h1>
        <p>
          {isRegister
            ? "Create a new account to get started"
            : "Welcome back to ThinkLoop"}
        </p>
        {error && <div className="error-message">{error}</div>}
        <form ref={formRef} onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                required
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Register" : "Login"}
          </button>
        </form>
        <p className="auth-toggle">
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Sign In" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
}
