import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./SetPassword.css";
import logoImg from "../assets/logo.png";

const API_BASE = (() => {
  if (typeof window === "undefined") return "https://tapovana.onrender.com";
  const hostname = window.location.hostname;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname)
  ) {
    return `http://${hostname}:5000`;
  }
  return import.meta.env.VITE_API_BASE_URL || "https://tapovana.onrender.com";
})();

export default function SetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => params.get("token"), [params]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!token) {
      setError("Invalid link: token missing.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/password/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to set password.");
        return;
      }

      setSuccessMsg("Password set successfully. Redirecting to login...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-container">
      <div className="set-password-card">

        <div className="set-password-logo">
          <img src={logoImg} alt="Tapovana" width="160" />
        </div>

        <h2 className="set-password-title">Set Your Password</h2>
        <p className="set-password-subtitle">
          Create a secure password to activate your Tapovana account.
        </p>

        {!token && (
          <div className="set-password-error">
            Invalid link — token missing.
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="set-password-field">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </div>

          <div className="set-password-field">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          {error && <div className="set-password-error">{error}</div>}
          {successMsg && <div className="set-password-success">{successMsg}</div>}

          <button
            type="submit"
            className="set-password-btn"
            disabled={loading || !token}
          >
            {loading ? "Saving..." : "Set Password"}
          </button>
        </form>

      </div>
    </div>
  );
}