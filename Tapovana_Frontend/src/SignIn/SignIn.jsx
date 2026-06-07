import React, { useState, useEffect } from "react";
import "./SignIn.css";
import sideImage from "../assets/graphic-side.png";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isChecked, setIsChecked] = useState(false);
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (token) navigate("/dashboard");
  }, [navigate]);

  const handleGenerateOtp = async () => {
    setErrorMessage("");
    setOtpError("");

    if (!email || !password || !isChecked) {
      setErrorMessage("Please fill all fields and accept terms.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMessage("Please enter a valid email.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/login/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to send OTP");
        return;
      }

      setShowOtpSection(true);
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    setErrorMessage("");

    if (!otp) {
      setOtpError("Please enter OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/login/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setOtpError(data.message || "Invalid or expired OTP");
        return;
      }

      // Save session — matches our backend response
      sessionStorage.setItem("access_token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      sessionStorage.setItem("access", JSON.stringify(data.access));
      sessionStorage.setItem("must_change", data.must_change ? "true" : "false");

      if (data.must_change) {
        navigate("/force-change-password");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setOtpError("Network error. Please try again.");
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
        <h1>Log In</h1>
        <p className="note">
          Note: This page is dedicated only for Governing Members of Tapovana
          Life Space Pvt Ltd
        </p>
        <div className="form-container">
          <label>Email</label>
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>Password</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="checkbox-container">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => setIsChecked(!isChecked)}
            />
            <label style={{ marginTop: 0 }}>I agree with the terms of use</label>
          </div>
          <div style={{ textAlign: "right", marginTop: "4px", marginBottom: "12px" }}>
            <span
              onClick={() => navigate("/reset-password")}
              style={{
                color: "#caa24a",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                textDecoration: "underline"
              }}
            >
              Forgot Password?
            </span>
          </div>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          <button className="btn" onClick={handleGenerateOtp} disabled={loading}>
            {loading ? "Please wait..." : "Generate OTP"}
          </button>
          {showOtpSection && (
            <>
              <h5 className="otp-heading">
                <b>Enter OTP received to Above Email ID</b>
              </h5>
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
              />
              {otpError && <p className="error-message">{otpError}</p>}
              <button className="btn" onClick={handleVerifyOtp} disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP and Login"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignIn;