import React, { useState } from "react";
import "./ResetPassword.css";
import sideImage from "../assets/graphic-side.png";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleSendOtp = async () => {
    setError("");
    setSuccessMsg("");

    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/password/forgot/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to send reset OTP.");
        return;
      }

      setResetToken(data.token);
      setOtpSent(true);
      setSuccessMsg("Reset OTP has been sent to your email.");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setSuccessMsg("");

    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/password/forgot/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          otp,
          password,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to reset password.");
        return;
      }

      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div
        className="left-section"
        style={{ backgroundImage: `url(${sideImage})` }}
      />
      <div className="right-section">
        <h1>Reset Password</h1>
        <p className="note">
          Recover access to your Tapovana Governing Member account.
        </p>
        <div className="form-container">
          <label>Email Address</label>
          <input
            type="email"
            className="input-field"
            value={email}
            disabled={otpSent}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@tapovana.com"
          />

          {!otpSent && (
            <>
              {error && <p className="error-message">{error}</p>}
              {successMsg && <p className="success-message" style={{ color: "green", textAlign: "center" }}>{successMsg}</p>}
              <button className="btn" onClick={handleSendOtp} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </>
          )}

          {otpSent && (
            <>
              <label>Enter OTP Code</label>
              <input
                type="text"
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

              <label>New Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />

              <label>Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />

              {error && <p className="error-message">{error}</p>}
              {successMsg && <p className="success-message" style={{ color: "green", textAlign: "center" }}>{successMsg}</p>}
              
              <button className="btn" onClick={handleResetPassword} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </>
          )}

          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <span
              onClick={() => navigate("/")}
              style={{
                color: "#caa24a",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "underline"
              }}
            >
              Back to Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
