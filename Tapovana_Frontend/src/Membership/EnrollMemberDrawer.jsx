
import React, { useState, useRef } from "react";
import "./EnrollMemberDrawer.css";
import DropdownIcon from "../assets/dropdownIcon.svg";
import OverlayIcon from "../assets/Overlay.png";
import ProfilePlaceholder from "../assets/profileIconDefault.png";
import ProfileButtonIcon from "../assets/profileButton.png";
import { apiFetch } from "../api/http";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  tier: "SILVER",
  status: "pending"
};

const EnrollMemberDrawer = ({ isOpen, onClose, onSaved, onShowToast }) => {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSource, setPhotoSource] = useState("default");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [showPresets, setShowPresets] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const presets = [
    "avatar1.svg",
    "avatar2.svg",
    "avatar3.svg",
    "avatar4.svg",
    "avatar5.svg",
    "avatar6.svg"
  ];

  const resetForm = () => {
    setPhotoPreview(null);
    setPhotoSource("default");
    setPhotoUrl("");
    setPhotoBase64("");
    setShowPresets(false);
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

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      setPhotoSource("upload");
      setPhotoBase64(reader.result);
      setPhotoUrl("");
      setShowPresets(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (presetName) => {
    setPhotoSource("local");
    setPhotoUrl(presetName);
    setPhotoBase64("");
    setPhotoPreview(`/avatars/${presetName}`);
    setShowPresets(false);
  };

  const validate = () => {
    if (!formData.name.trim()) return "Name is required";
    if (!formData.email.trim()) return "Email is required";
    if (!/\S+@\S+\.\S+/.test(formData.email.trim())) return "Enter a valid email address";
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
      phone: formData.phone?.trim() || null,
      tier: formData.tier,
      status: formData.status,
      profile_photo_source: photoSource,
      profile_photo_url: photoUrl,
      profile_photo_base64: photoBase64
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

          <div className="profile-upload-container">
            <div className="profile-upload-box" onClick={handlePhotoClick}>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="profile-upload-preview"
                />
              ) : (
                <img
                  src={ProfilePlaceholder}
                  alt="Profile placeholder"
                  className="profile-upload-placeholder"
                />
              )}
              <div className="camera-badge">
                <img
                  src={ProfileButtonIcon}
                  alt="Upload"
                  className="camera-badge-img"
                />
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              className="profile-upload-input"
              ref={fileInputRef}
              onChange={handlePhotoChange}
            />
            <div className="profile-upload-label">Upload profile photo</div>

            <button
              type="button"
              className="btn-select-preset"
              onClick={() => setShowPresets(!showPresets)}
              style={{
                background: "transparent",
                border: "1px solid #cda751",
                borderRadius: "4px",
                color: "#cda751",
                fontSize: "12px",
                padding: "4px 10px",
                marginTop: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontFamily: "inherit"
              }}
            >
              Or Choose Preset Avatar
            </button>

            {showPresets && (
              <div className="preset-avatar-grid" style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "8px",
                marginTop: "12px",
                width: "100%",
                maxWidth: "280px"
              }}>
                {presets.map((preset) => (
                  <div
                    key={preset}
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      cursor: "pointer",
                      border: photoUrl === preset ? "2px solid #cda751" : "2px solid transparent",
                      borderRadius: "6px",
                      padding: "2px",
                      transition: "all 0.2s"
                    }}
                  >
                    <img
                      src={`/avatars/${preset}`}
                      alt={preset}
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        display: "block",
                        borderRadius: "4px"
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
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
                placeholder="+91 XXXXXXXXXX"
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
          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Status</label>
              <div className="select-wrapper">
                <select
                  name="status"
                  value={formData.status}
                  className="drawer-select"
                  disabled
                >
                  <option value="pending">Pending (Will Require Approval)</option>
                </select>
                <img src={DropdownIcon} alt="dropdown" className="select-icon" />
              </div>
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
