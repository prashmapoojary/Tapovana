import React, { useState } from "react";
import "./ChangePasswordModal.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const ChangePasswordModal = ({ onClose }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [resetToken, setResetToken] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getUserEmail = () => {
    const userStr = sessionStorage.getItem("user");
    return userStr ? JSON.parse(userStr).email : "";
  };

  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    const email = getUserEmail();
    
    if (!email) {
      setError("User email not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to send OTP.");
      } else {
        setOtpSent(true);
        setResetToken(data.token);
        setSuccessMsg("OTP sent to your email.");
        setTimeout(() => setSuccessMsg(""), 3000); // clear success msg after 3s
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccessMsg("");
    setLoading(true);
    const email = getUserEmail();
    
    if (!email) {
      setError("User email not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to resend OTP.");
      } else {
        setResetToken(data.token);
        setOtp("");
        setSuccessMsg("A fresh OTP has been sent to your email.");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!otp || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          otp,
          password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to change password.");
        return;
      }

      setSuccessMsg("Password changed successfully.");
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-modal-overlay">
      <div className="cp-modal-card">
        <div className="cp-modal-header">
          <h3>Change Password</h3>
          <button className="cp-close-btn" onClick={onClose} disabled={loading}>
            &times;
          </button>
        </div>

        <div className="cp-modal-body">
          {successMsg && successMsg === "Password changed successfully." ? (
            <div className="cp-success-message">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <p>{successMsg}</p>
            </div>
          ) : (
            <>
              {!otpSent ? (
                <div className="cp-form">
                  <p style={{ fontSize: 14, color: "#4a5568", marginBottom: 8, lineHeight: 1.5 }}>
                    To change your password, we'll send a one-time passcode (OTP) to your registered email address for verification.
                  </p>
                  {error && <div className="cp-error-message">{error}</div>}
                  <div className="cp-modal-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="cp-btn secondary" onClick={onClose} disabled={loading}>
                      Cancel
                    </button>
                    <button type="button" className="cp-btn primary" onClick={handleSendOtp} disabled={loading}>
                      {loading ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="cp-form">
                  {successMsg && <div style={{ fontSize: 13, color: "#38a169", fontWeight: 600, marginBottom: 8 }}>{successMsg}</div>}
                  
                  <div className="cp-form-group">
                    <label>Enter OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit OTP from email"
                      maxLength={6}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        type="button" 
                        onClick={handleResendOtp} 
                        disabled={loading} 
                        style={{ background: 'none', border: 'none', color: '#3182ce', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                      >
                        Resend OTP
                      </button>
                    </div>
                  </div>

                  <div className="cp-form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                    />
                  </div>

                  <div className="cp-form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                    />
                  </div>

                  {error && <div className="cp-error-message">{error}</div>}

                  <div className="cp-modal-actions">
                    <button type="button" className="cp-btn secondary" onClick={onClose} disabled={loading}>
                      Cancel
                    </button>
                    <button type="submit" className="cp-btn primary" disabled={loading}>
                      {loading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
