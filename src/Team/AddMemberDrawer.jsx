import React, { useState, useRef, useEffect } from "react";
import "./AddMemberDrawer.css";
import DropdownIcon from "../assets/dropdownIcon.svg";
import OverlayIcon from "../assets/Overlay.png";
import ProfilePlaceholder from "../assets/profile.png";
import ProfileButtonIcon from "../assets/profileButton.png";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  specialization: "",
  autoGeneratePassword: true,
  sendEmailInvitation: true
};

const AddMemberDrawer = ({ isOpen, onClose, onSaved }) => {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setError("");
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const resetForm = () => {
    setPhotoPreview(null);
    setFormData(initialForm);
    setError("");
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      // If you want to reset each time drawer closes:
      resetForm();
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview only. (Upload integration can be added when backend supports it.)
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!formData.firstName.trim()) return "First name is required";
    if (!formData.lastName.trim()) return "Last name is required";
    if (!formData.email.trim()) return "Work email is required";
    if (!/\S+@\S+\.\S+/.test(formData.email.trim())) return "Please enter a valid email";
    if (!formData.role) return "Please select a role";
    return "";
  };

  const handleSave = async () => {
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    // Map frontend keys to backend expected keys
    const payload = {
      email: formData.email.trim().toLowerCase(),
      role: formData.role, // 'SUPER_ADMIN' | 'CO_ADMIN' | 'DOCTOR' | 'THERAPIST'
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      phone: formData.phone?.trim() || null,
      specialization: formData.specialization?.trim() || null,

      // image not uploaded yet
      avatar_url: null,

      // toggles (must match backend)
      auto_generate_password: Boolean(formData.autoGeneratePassword),
      send_invite_email: Boolean(formData.sendEmailInvitation)
    };

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/api/teams/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.error || "Failed to create user");
        return;
      }

      // success
      onClose();
      resetForm();
      if (onSaved) onSaved();
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
              <img src={OverlayIcon} alt="Add Member" />
            </div>
            Add New Team Member
          </div>
          <button className="drawer-close-btn" onClick={handleClose} disabled={saving}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* Section 01 */}
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
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="input-label">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. Julian"
                className="drawer-input"
              />
            </div>

            <div className="form-group">
              <label className="input-label">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Pierce"
                className="drawer-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Work Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="j.pierce@wellness.center"
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
                placeholder="+1 (555) 000-0000"
                className="drawer-input"
              />
            </div>
          </div>

          {/* Section 02 */}
          <div className="section-label-container">
            <div className="section-badge">02</div>
            <div className="section-title">Role & Assignment</div>
          </div>

          <div className="form-row">
            <div className="select-wrapper">
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="drawer-select"
              >
                <option value="" disabled>
                  Select a role...
                </option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="CO_ADMIN">Co Admin</option>
                <option value="DOCTOR">Doctor</option>
                <option value="THERAPIST">Therapist</option>
              </select>
              <img src={DropdownIcon} alt="dropdown" className="select-icon" />
            </div>
          </div>

          <div className="form-row">
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              placeholder="e.g. Cardiology / Operations"
              className="drawer-input"
            />
            <div className="input-hint">Required for practitioners and doctors</div>
          </div>

          {/* Section 03 */}
          <div className="section-label-container">
            <div className="section-badge">03</div>
            <div className="section-title">Account Settings</div>
          </div>

          <div className="settings-card">
            <div className="settings-row">
              <label className="custom-checkbox-container">
                <input
                  type="checkbox"
                  name="autoGeneratePassword"
                  checked={formData.autoGeneratePassword}
                  onChange={handleChange}
                  className="hidden-checkbox"
                />
                <div className="custom-checkbox">
                  <svg
                    className="check-icon"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="settings-info">
                  <div className="settings-label">Auto-generate password</div>
                  <div className="settings-subtitle">
                    A secure temporary password will be created
                  </div>
                </div>
              </label>
            </div>

            <div className="settings-row divider-top">
              <div className="settings-info">
                <div className="settings-label">Send email invitation</div>
                <div className="settings-subtitle">
                  User will receive login details immediately
                </div>
              </div>

              <label className="custom-toggle-container">
                <input
                  type="checkbox"
                  name="sendEmailInvitation"
                  checked={formData.sendEmailInvitation}
                  onChange={handleChange}
                  className="hidden-toggle"
                />
                <div className="toggle-track">
                  <div className="toggle-thumb" />
                </div>
              </label>
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
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save User"}
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
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default AddMemberDrawer;