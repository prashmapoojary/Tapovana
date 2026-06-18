
import React, { useState } from "react";
import "./EnrollMemberDrawer.css";
import DropdownIcon from "../assets/dropdownIcon.svg";
import OverlayIcon from "../assets/Overlay.png";
import { apiFetch } from "../api/http";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  tier: "SILVER",
  status: "active"
};

const EnrollMemberDrawer = ({ isOpen, onClose, onSaved, onShowToast }) => {
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setFormData(initialForm);
    setError("");
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      resetForm();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    if (!formData.name.trim()) return "Name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(formData.email.trim())) return "Enter a valid email address";
    if (!formData.phone || !formData.phone.trim()) return "Phone number is required";
    if (!/^\d{10}$/.test(formData.phone.trim())) return "Phone number must be exactly 10 digits";
    return "";
  };

  const handleSave = async () => {
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      tier: formData.tier,
      status: formData.status
    };

    try {
      setSaving(true);

      const res = await apiFetch("/api/memberships", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      if (!res || res.error) {
        throw new Error(res?.error || "Failed to save member");
      }

      if (onShowToast) {
        onShowToast("Member enrolled successfully", "success");
      }

      onClose();
      resetForm();
      if (onSaved) onSaved();
    } catch (e) {
      setError(e.message || "Failed to save member");
      if (onShowToast) onShowToast("Failed to save member", "error");
    } finally {
      setSaving(false);
    }
  };

  const validationError = validate();
  const isSaveDisabled = saving || !!validationError;

  return (
    <>
      <div
        className={`drawer-overlay ${isOpen ? "open" : ""}`}
        onClick={handleClose}
      />

      <div className={`drawer-panel ${isOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <div className="drawer-title-icon">
              <img src={OverlayIcon} alt="Enroll Member" />
            </div>
            Enroll New Member
          </div>
          <button className="drawer-close-btn" onClick={handleClose} disabled={saving}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <div className="section-label-container">
            <div className="section-badge">01</div>
            <div className="section-title">Basic Information</div>
          </div>

          <div className="form-group" style={{ marginTop: "16px" }}>
            <label className="input-label">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              className="drawer-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="member@example.com"
                className="drawer-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter 10-digit phone number"
                className="drawer-input"
              />
            </div>
          </div>

          <div className="section-label-container">
            <div className="section-badge">02</div>
            <div className="section-title">Membership Tier</div>
          </div>

          <div className="form-row">
            <div className="select-wrapper">
              <select
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="drawer-select"
              >
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
              <img src={DropdownIcon} alt="dropdown" className="select-icon" />
            </div>
          </div>


          {error && (
            <div style={{ marginTop: 12, color: "red", fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <button className="btn-cancel" onClick={handleClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave} disabled={isSaveDisabled} style={{ opacity: isSaveDisabled ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Enroll Member"}
            {!saving && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default EnrollMemberDrawer;
