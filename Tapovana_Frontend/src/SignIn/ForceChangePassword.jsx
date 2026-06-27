import React, { useState } from "react";
import "./ResetPassword.css";
import logoImg from "../assets/logo.png";
import { useNavigate } from "react-router-dom";

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

export default function ForceChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
  };

  const handleGenerateOtp = async () => {
    setError("");
    setSuccessMsg("");

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/password/force-change/request-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to send OTP.");
        return;
      }

      setOtpSent(true);
      setSuccessMsg("OTP has been sent to your registered email.");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSave = async () => {
    setError("");
    setSuccessMsg("");

    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/password/force-change/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          otp,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to update password.");
        return;
      }

      setSuccessMsg("Password updated successfully! Redirecting to dashboard...");
      sessionStorage.setItem("must_change", "false");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="left-section" />
      <div className="right-section">
        <h1 style={{ fontSize: "20px" }}>Reset Password</h1>
        
        <h3 style={{ color: "#caa24a", textAlign: "center", marginBottom: "10px", fontSize: "14px" }}>Change Password Required</h3>
        <p className="note" style={{ marginBottom: "30px", fontWeight: "500", fontSize: "11px" }}>
          For security reasons, you must change your temporary password before continuing.
        </p>
        
        <div className="form-container">
          <label htmlFor="force_new_password">New Password</label>
          <input
            type="password"
            id="force_new_password"
            name="force_new_password"
            className="input-field"
            value={newPassword}
            disabled={otpSent}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters"
          />

          <label htmlFor="force_confirm_password">Confirm New Password</label>
          <input
            type="password"
            id="force_confirm_password"
            name="force_confirm_password"
            className="input-field"
            value={confirmPassword}
            disabled={otpSent}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
          />

          {!otpSent && (
            <>
              {error && <p className="error-message" style={{ fontSize: "11px" }}>{error}</p>}
              {successMsg && <p className="success-message" style={{ color: "green", textAlign: "center", fontSize: "11px" }}>{successMsg}</p>}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', flex: 1 }}
                  onClick={handleLogout}
                  disabled={loading}
                >
                  Logout
                </button>
                <button 
                  className="btn" 
                  style={{ flex: 2 }}
                  onClick={handleGenerateOtp} 
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate OTP"}
                </button>
              </div>
            </>
          )}

          {otpSent && (
            <>
              <label htmlFor="force_otp">Enter OTP Code</label>
              <input
                type="text"
                id="force_otp"
                name="force_otp"
                inputMode="numeric"
                pattern="[0-9]*"
                className="input-field"
                value={otp}
                maxLength={6}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setOtp(value);
                }}
                placeholder="6-digit code"
              />
              <div style={{ textAlign: "right", marginTop: "-8px", marginBottom: "10px" }}>
                <button
                  type="button"
                  onClick={handleGenerateOtp}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#caa24a",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    textDecoration: "underline",
                    padding: 0
                  }}
                >
                  {loading ? "Sending..." : "Resend OTP"}
                </button>
              </div>

              {error && <p className="error-message" style={{ fontSize: "11px" }}>{error}</p>}
              {successMsg && <p className="success-message" style={{ color: "green", textAlign: "center", fontSize: "11px" }}>{successMsg}</p>}
              
              <button className="btn" onClick={handleVerifyOtpAndSave} disabled={loading}>
                {loading ? "Verifying..." : "Verify and Save"}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
