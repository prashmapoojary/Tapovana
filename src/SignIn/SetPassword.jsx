import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
      const res = await fetch(`${API_BASE}/api/auth/password/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.error || "Failed to set password.");
        return;
      }

      setSuccessMsg("Password set successfully. Please login.");
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h2>Set Password</h2>

      {!token && (
        <div style={{ color: "red", marginTop: 10 }}>
          Invalid link (token missing).
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
        <label>New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ width: "100%", padding: 10, margin: "8px 0 16px" }}
        />

        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ width: "100%", padding: 10, margin: "8px 0 16px" }}
        />

        {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
        {successMsg && <div style={{ color: "green", marginBottom: 12 }}>{successMsg}</div>}

        <button type="submit" disabled={loading || !token} style={{ width: "100%", padding: 10 }}>
          {loading ? "Saving..." : "Set Password"}
        </button>
      </form>
    </div>
  );
}