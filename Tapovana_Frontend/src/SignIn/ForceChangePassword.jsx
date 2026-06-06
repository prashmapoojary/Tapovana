import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SetPassword.css"; // Reuse the SetPassword styling
import logoImg from "../assets/logo.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function ForceChangePassword() {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!currentPassword) {
      setError("Please enter your current temporary password.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/password/change`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to change password.");
        return;
      }

      setSuccessMsg("Password updated successfully. Redirecting to dashboard...");
      
      // Update session storage
      sessionStorage.setItem("must_change", "false");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="set-password-container">
      <div className="set-password-card">
        
        <div className="set-password-logo">
          <img src={logoImg} alt="Tapovana" width="160" />
        </div>

        <h2 className="set-password-title">Change Password Required</h2>
        <p className="set-password-subtitle" style={{ color: "#d97706" }}>
          For security reasons, you must change your temporary password before continuing.
        </p>

        <form onSubmit={onSubmit}>
          <div className="set-password-field">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your temporary password"
            />
          </div>

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
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          {error && <div className="set-password-error">{error}</div>}
          {successMsg && <div className="set-password-success">{successMsg}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="set-password-btn"
              style={{ background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', flex: 1 }}
              onClick={handleLogout}
              disabled={loading}
            >
              Logout
            </button>
            <button
              type="submit"
              className="set-password-btn"
              style={{ flex: 2 }}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
