import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./SetPassword.css";
import logoImg from "../assets/logo.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function SetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const emailParam = useMemo(() => params.get("email") || "", [params]);
  const [email, setEmail] = useState(emailParam);
  const mode = useMemo(() => params.get("mode") || "forgot", [params]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const requestOtp = async () => {
    setError("");
    setSuccessMsg("");

    if (!email) {
      setError("Email is missing.");
      return;
    }

    try {
      setRequestingOtp(true);
      const res = await fetch(`${API_BASE}/api/admin/password/forgot/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to send OTP.");
        return;
      }

      setSuccessMsg("OTP sent to your email.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email) {
      setError("Email is missing.");
      return;
    }

    if (!otp || otp.length !== 6) {
      setError("Enter a valid 6-digit OTP.");
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
      const res = await fetch(`${API_BASE}/api/admin/password/forgot/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to update password.");
        return;
      }

      setSuccessMsg("Password updated successfully. Redirecting to login...");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("access");
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-container">
      <div className="set-password-card">
        <div className="set-password-logo" style={{ marginBottom: "4px" }}>
          <img src={logoImg} alt="Tapovana" width="90" />
        </div>

        <h2 className="set-password-title">
          {mode === "first-login" ? "Reset Your Password" : "Set New Password"}
        </h2>

        <form onSubmit={onSubmit}>
          {mode === "forgot" && (
            <div className="set-password-field">
              <label>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={requestingOtp || loading}
              />
            </div>
          )}

          <div className="set-password-field">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              disabled={loading}
            />
          </div>

          <div className="set-password-field">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={loading}
            />
          </div>

          <button
            type="button"
            className="set-password-btn"
            onClick={requestOtp}
            disabled={requestingOtp || !email || loading}
            style={{ marginBottom: "12px" }}
          >
            {requestingOtp ? "Sending OTP..." : "Send OTP"}
          </button>

          <p className="set-password-subtitle" style={{ fontSize: "11px", marginBottom: "10px", marginTop: "4px" }}>
            Enter the OTP sent to <b>{email || "your email"}</b> to complete verification.
          </p>

          <div className="set-password-field">
            <label>OTP</label>
            <input
              type="text"
              value={otp}
              maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit OTP"
              disabled={loading}
            />
          </div>

          {error && <div className="set-password-error">{error}</div>}
          {successMsg && <div className="set-password-success">{successMsg}</div>}

          <button type="submit" className="set-password-btn" disabled={loading || !email || !otp}>
            {loading ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}