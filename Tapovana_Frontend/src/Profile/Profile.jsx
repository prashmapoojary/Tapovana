import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import DefaultAvatar from "../assets/profileIconDefault.png";
import { getUser, roleLabel } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";
import ChangePasswordModal from "./ChangePasswordModal";

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

const presets = [
  "avatar1.svg",
  "avatar2.svg",
  "avatar3.svg",
  "avatar4.svg",
  "avatar5.svg",
  "avatar6.svg"
];

function Profile() {
  const navigate = useNavigate();
  const { triggerAlert, triggerConfirm } = useAllocations();
  const [user, setUser] = useState(() => getUser());
  const isPractitioner = user?.role === 'DOCTOR' || user?.role === 'THERAPIST';

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSource, setPhotoSource] = useState("default");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  // Populate form with current user values
  const initForm = () => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.phone || "");
      setSpecialization(user.specialization || "");
      setPhotoSource(user.profile_photo_source || "default");
      setPhotoUrl(user.profile_photo_url || "");
      setPhotoBase64("");

      let photoUrl = user.profile_photo_url;
      if (photoUrl && /^[A-Za-z]:[/\\]/i.test(photoUrl)) {
        photoUrl = "/uploads/" + photoUrl.replace(/\\/g, '/').split('/').pop();
      }

      if (user.profile_photo_source === "upload" && photoUrl) {
        setPhotoPreview(`${API_BASE}${photoUrl}`);
      } else if (user.profile_photo_source === "local" && photoUrl) {
        setPhotoPreview(`/avatars/${photoUrl}`);
      } else if (user.avatar_url) {
        let avUrl = user.avatar_url;
        if (avUrl && /^[A-Za-z]:[/\\]/i.test(avUrl)) {
          avUrl = "/uploads/" + avUrl.replace(/\\/g, '/').split('/').pop();
        }
        setPhotoPreview(
          avUrl.startsWith("http") || avUrl.startsWith("/")
            ? avUrl
            : `${API_BASE}${avUrl}`
        );
      } else {
        setPhotoPreview(null);
      }
    }
  };

  useEffect(() => {
    initForm();
  }, [user]);

  const handlePhotoClick = () => {
    if (!isEditing) return;
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

  const handleResetPhoto = () => {
    setPhotoSource("default");
    setPhotoUrl("");
    setPhotoBase64("");
    setPhotoPreview(null);
    setShowPresets(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }

    if (phone && phone.trim()) {
      const phoneVal = phone.trim();
      if (!/^\d{10}$/.test(phoneVal)) {
        setError("Phone number must be exactly 10 digits");
        return;
      }
    }

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Session expired. Please login again.");
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone?.trim() || null,
      profile_photo_source: photoSource,
      profile_photo_url: photoUrl,
      profile_photo_base64: photoBase64
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/teams/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        setError(data.message || "Failed to update profile");
        return;
      }

      // Merge and update session storage user data
      const updatedUser = { ...user, ...data.user };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      triggerAlert("Profile updated successfully.", true);

      // Dispatch event to inform layout/other elements to reload profile images
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    initForm();
    setError("");
    setPhoneError("");
    setPhoneTouched(false);
  };

  const fullName =
    (user?.first_name || "") + (user?.last_name ? ` ${user.last_name}` : "");

  return (
    <div className="profile-container">
      <div className="profile-header-bar">
        <h2>My Profile</h2>
        <p>Manage your account settings and profile information</p>
      </div>

      <div className="profile-content-card">
        {/* Left Side: Avatar display/picker */}
        <div className="profile-avatar-column">
          <div 
            className={`profile-avatar-container ${isEditing ? "editable" : ""}`}
            onClick={handlePhotoClick}
          >
            <img
              src={photoPreview || DefaultAvatar}
              alt="Profile Avatar"
              className="profile-avatar-img"
            />
            {isEditing && (
              <div className="avatar-hover-overlay">
                <span>Click to Upload</span>
              </div>
            )}
          </div>
          
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />

          {isEditing && (
            <div className="avatar-options">
              <button
                type="button"
                className="profile-sub-btn"
                onClick={handlePhotoClick}
              >
                Upload Photo
              </button>
              <button
                type="button"
                className="profile-sub-btn"
                onClick={() => setShowPresets(!showPresets)}
              >
                Choose Preset
              </button>
              {(photoSource !== "default" || photoPreview) && (
                <button
                  type="button"
                  className="profile-sub-btn reset-btn"
                  onClick={handleResetPhoto}
                >
                  Reset Default
                </button>
              )}
            </div>
          )}

          {isEditing && showPresets && (
            <div className="presets-selector-grid animate-fade-in">
              {presets.map((preset) => (
                <div
                  key={preset}
                  onClick={() => handleSelectPreset(preset)}
                  className={`preset-grid-item ${photoUrl === preset ? "selected" : ""}`}
                >
                  <img src={`/avatars/${preset}`} alt={preset} />
                </div>
              ))}
            </div>
          )}

          <div className="avatar-info-text">
            <h3>{fullName}</h3>
            <span className="profile-role-tag">{roleLabel(user?.role)}</span>
          </div>
        </div>

        {/* Right Side: Form details */}
        <div className="profile-details-column">
          <form onSubmit={handleSave} className="profile-form">
            <div className="profile-form-grid">
              <div className="form-group-half">
                <label>First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="profile-form-input"
                    required
                  />
                ) : (
                  <div className="read-only-val">{firstName || "-"}</div>
                )}
              </div>

              <div className="form-group-half">
                <label>Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="profile-form-input"
                    required
                  />
                ) : (
                  <div className="read-only-val">{lastName || "-"}</div>
                )}
              </div>

              <div className="form-group-full">
                <label>Email Address</label>
                <div className="read-only-val disabled-field">{user?.email}</div>
                <small className="field-note">Email address cannot be changed.</small>
              </div>

              <div className="form-group-full">
                <label>Phone Number</label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => {
                        setPhoneTouched(true);
                        const cleaned = e.target.value.replace(/\D/g, "");
                        setPhone(cleaned);
                        if (cleaned.length > 0 && cleaned.length !== 10) {
                          setPhoneError("Phone number must be exactly 10 digits");
                        } else {
                          setPhoneError("");
                        }
                      }}
                      className="profile-form-input"
                      placeholder="Phone number"
                    />
                    {phoneTouched && phoneError && (
                      <span className="phone-validation-error" style={{ color: "#e74c3c", fontSize: "12px", fontWeight: "600", marginTop: "4px", display: "block" }}>
                        {phoneError}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="read-only-val">{phone || "-"}</div>
                )}
              </div>

              <div className="form-group-full">
                <label>Role</label>
                <div className="read-only-val disabled-field">{roleLabel(user?.role)}</div>
                <small className="field-note">Roles are managed by Administrators.</small>
              </div>

              {user?.specialization && (
                <div className="form-group-full">
                  <label>Specialization</label>
                  <div className="read-only-val disabled-field">{user.specialization}</div>
                </div>
              )}
            </div>

            {error && <div className="profile-error-message">{error}</div>}

            <div className="profile-actions-bar">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    className="profile-btn secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="profile-btn primary"
                    disabled={saving || !!phoneError}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="profile-btn outline"
                    onClick={() => navigate("/dashboard")}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="profile-btn secondary"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change Password
                  </button>
                  <button
                    type="button"
                    className="profile-btn primary"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>



      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

export default Profile;
