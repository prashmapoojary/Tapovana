import React, { useEffect, useState, useRef } from "react";
import AddMemberDrawer from "./AddMemberDrawer";
import AddUserIcon from "../assets/Add_userIcon.svg";
import "./Team.css";
import "./AddMemberDrawer.css";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import FilterIcon from "../assets/filterIcon.svg";
import DefaultAvatar from "../assets/profileIconDefault.png";
import ActionIcon from "../assets/Button.svg";
import ProfilePlaceholder from "../assets/profileIconDefault.png";

import { apiFetch } from "../api/http";
import { useAllocations } from "../utils/AllocationContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const EditMemberDrawer = ({ user, onClose }) => {
  const { getStaffAllocations } = useAllocations();
  const [photoPreview, setPhotoPreview] = useState(null);
  const [allocations, setAllocations] = useState({ workshops: [], services: [], vedic_programs: [] });

  useEffect(() => {
    if (user) {
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

      const userAllocations = getStaffAllocations(user.user_id || user.id);
      setAllocations({
        workshops: userAllocations.filter(a => a.type === "workshop"),
        services: userAllocations.filter(a => a.type === "service"),
        vedic_programs: userAllocations.filter(a => a.type === "vedic_program")
      });
    }
  }, [user, getStaffAllocations]);

  if (!user) return null;

  return (
    <>
      <div className="drawer-overlay open" onClick={onClose} style={{ zIndex: 9999 }} />
      <div className="drawer-panel open" onClick={(e) => e.stopPropagation()} style={{ zIndex: 10000, width: "450px", maxWidth: "100%", overflowY: "auto" }}>
        <div className="drawer-header">
          <div className="drawer-title">Member Details</div>
          <button className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          <div className="profile-upload-container">
            <div className="profile-upload-box" style={{ cursor: "default" }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Profile preview" className="profile-upload-preview" />
              ) : (
                <img src={ProfilePlaceholder} alt="Profile placeholder" className="profile-upload-placeholder" />
              )}
            </div>
            <div className="profile-upload-label" style={{ fontWeight: 700, fontSize: 16, color: "#2d3748", marginTop: 12 }}>
              {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
            </div>
            <div style={{ color: "#7b8a9a", fontSize: 13, marginTop: 4 }}>
              {user.email}
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 24 }}>
            <div className="form-group">
              <label className="input-label">Role</label>
              <div className="drawer-input" style={{ background: "#f8f9fa", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 6, fontSize: 14, color: "#4a5568" }}>
                {user.role}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Status</label>
              <div className="drawer-input" style={{ background: "#f8f9fa", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 6, fontSize: 14, color: "#4a5568", textTransform: "capitalize" }}>
                {user.status?.toLowerCase()}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Phone Number</label>
              <div className="drawer-input" style={{ background: "#f8f9fa", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 6, fontSize: 14, color: "#4a5568" }}>
                {user.phone || "-"}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Specialization</label>
              <div className="drawer-input" style={{ background: "#f8f9fa", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: 6, fontSize: 14, color: "#4a5568" }}>
                {user.specialization || "-"}
              </div>
            </div>
          </div>

          <div className="form-section-title" style={{ marginTop: 32, fontSize: 16, fontWeight: 600, color: "#1a202c", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
            📋 Allocations &amp; Activities
          </div>

          <div className="allocations-container" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="allocation-group">
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2d3748", marginBottom: 8 }}>Workshops</div>
              {allocations.workshops.length > 0 ? (
                allocations.workshops.map(a => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", padding: "10px 14px", borderRadius: 6, marginBottom: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, color: "#4a5568", fontWeight: 500 }}>{a.sessionTitle}</div>
                    <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 12, background: a.status === "active" ? "#e6fffa" : "#edf2f7", color: a.status === "active" ? "#319795" : "#718096", fontWeight: 600 }}>
                      {a.status === "active" ? "Pending" : "Completed"}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: "#a0aec0", fontStyle: "italic" }}>No workshops assigned</div>
              )}
            </div>

            <div className="allocation-group">
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2d3748", marginBottom: 8 }}>Services</div>
              {allocations.services.length > 0 ? (
                allocations.services.map(a => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", padding: "10px 14px", borderRadius: 6, marginBottom: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, color: "#4a5568", fontWeight: 500 }}>{a.sessionTitle}</div>
                    <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 12, background: a.status === "active" ? "#e6fffa" : "#edf2f7", color: a.status === "active" ? "#319795" : "#718096", fontWeight: 600 }}>
                      {a.status === "active" ? "Pending" : "Completed"}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: "#a0aec0", fontStyle: "italic" }}>No services allocated</div>
              )}
            </div>

            <div className="allocation-group">
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2d3748", marginBottom: 8 }}>Vedic Programs</div>
              {allocations.vedic_programs.length > 0 ? (
                allocations.vedic_programs.map(a => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", padding: "10px 14px", borderRadius: 6, marginBottom: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 14, color: "#4a5568", fontWeight: 500 }}>{a.sessionTitle}</div>
                    <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 12, background: a.status === "active" ? "#e6fffa" : "#edf2f7", color: a.status === "active" ? "#319795" : "#718096", fontWeight: 600 }}>
                      {a.status === "active" ? "Pending" : "Completed"}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: "#a0aec0", fontStyle: "italic" }}>No programs assigned</div>
              )}
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn-cancel" onClick={onClose} style={{ width: "100%" }}>Close</button>
        </div>
      </div>
    </>
  );
};

function Team() {
  const { isStaffAllocated, triggerAlert, triggerConfirm } = useAllocations();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  const ITEMS_PER_PAGE = 10;

  const getAvatarUrl = (u) => {
    if (!u) return DefaultAvatar;
    let photoUrl = u.profile_photo_url;
    if (photoUrl && /^[A-Za-z]:[/\\]/i.test(photoUrl)) {
      photoUrl = "/uploads/" + photoUrl.replace(/\\/g, '/').split('/').pop();
    }
    let avatarSrc = DefaultAvatar;
    if (u.profile_photo_source === "upload" && photoUrl) {
      avatarSrc = `${API_BASE}${photoUrl}`;
    } else if (u.profile_photo_source === "local" && photoUrl) {
      avatarSrc = `/avatars/${photoUrl}`;
    } else if (u.avatar_url) {
      let avUrl = u.avatar_url;
      if (avUrl && /^[A-Za-z]:[/\\]/i.test(avUrl)) {
        avUrl = "/uploads/" + avUrl.replace(/\\/g, '/').split('/').pop();
      }
      avatarSrc = avUrl.startsWith("http") || avUrl.startsWith("/") ? avUrl : `${API_BASE}${avUrl}`;
    }
    return avatarSrc;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await apiFetch(`/api/teams/users?page=1&limit=50&_t=${Date.now()}`);
      setUsers(data.users || data.team || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchUsers();
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const initiateDelete = (user) => {
    setDeleteConfirmUser(user);
    setOpenActionMenu(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmUser) return;
    const u = deleteConfirmUser;
    setDeleteConfirmUser(null);
    try {
      await apiFetch(`/api/teams/users/${u.user_id}`, { method: "DELETE" });
      await fetchUsers();
      showToast("Team member deleted permanently.", "success");
    } catch (e) {
      triggerAlert("Failed to delete member: " + e.message);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmUser(null);
  };

  const toggleStatus = async (userId, currentStatusBool) => {
    const newStatus = currentStatusBool ? "INACTIVE" : "ACTIVE";
    if (newStatus === "INACTIVE" && isStaffAllocated(userId)) {
      const u = users.find(x => x.user_id === userId);
      const name = u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "This staff member";
      const confirmed = await triggerConfirm(`Warning: ${name} has active session allocations. Are you sure?`);
      if (!confirmed) return;
    }
    try {
      await apiFetch(`/api/teams/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      await fetchUsers();
    } catch (e) {
      triggerAlert(e.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const matchSearch = !search ||
      fullName.includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleRoleFilter = (val) => { setRoleFilter(val); setPage(1); };
  const handleStatusFilter = (val) => { setStatusFilter(val); setPage(1); };

  const showToast = (message, type) => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 3000);
  };

  return (
    <div className="team-container">
      {deleteConfirmUser && (
        <div className="global-alert-overlay" style={{ zIndex: 10002 }}>
          <div className="global-alert-modal">
            <div className="global-alert-icon-container" style={{ background: "transparent", border: "none", marginBottom: "16px" }}>
              <img 
                src={getAvatarUrl(deleteConfirmUser)} 
                alt="Profile" 
                style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }}
                onError={(e) => { e.target.onerror = null; e.target.src = DefaultAvatar; }}
              />
            </div>
            <div className="global-alert-message">
              <p style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#2d3748" }}>
                Are you sure you want to delete {`${deleteConfirmUser.first_name || ""} ${deleteConfirmUser.last_name || ""}`.trim()}?
              </p>
              <p style={{ margin: 0, fontSize: "14px", color: "#7b8a9a" }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="global-confirm-actions">
              <button className="global-confirm-cancel-btn" onClick={cancelDelete}>Cancel</button>
              <button className="global-confirm-confirm-btn" onClick={confirmDelete}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 10001,
          background: "#fff", border: "2px solid #cda751", borderRadius: "8px",
          padding: "16px 24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          color: toast.type === "success" ? "#2e7559" : toast.type === "error" ? "#e53e3e" : "#4a5568",
          fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px",
          animation: "slideInRight 0.3s ease-out"
        }}>
          {toast.type === "success" && "✓ "}
          {toast.type === "error" && "⚠ "}
          {toast.type === "info" && "ℹ "}
          {toast.message}
        </div>
      )}

      <AddMemberDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onSaved={fetchUsers} 
        onShowToast={showToast} 
      />

      {editingUser && (
        <EditMemberDrawer
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); fetchUsers(); }}
        />
      )}

      <div className="team-header">
        <div className="team-title">
          <h1>User &amp; Staff Management</h1>
          <p>Manage your medical staff, therapists, and administrative team.</p>
        </div>
        <button className="add-user-btn" onClick={() => setDrawerOpen(true)}>
          <img src={AddUserIcon} className="add-icon" alt="" />
          Add New User
        </button>
      </div>

      <div className="team-card">
        <div className="team-filters">
          <div className="search-box">
            <img src={SearchIcon} className="search-icon" alt="" />
            <input type="text" placeholder="Search by name, email or phone..." value={search} onChange={(e) => handleSearch(e.target.value)} />
          </div>

          <div className="filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select value={roleFilter} onChange={(e) => handleRoleFilter(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#2f2f2f", padding: "10px 16px", width: "100%", cursor: "pointer", appearance: "none" }}>
              <option value="">Role: All</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="CO_ADMIN">Co Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="THERAPIST">Therapist</option>
            </select>
            <img src={DropdownIcon} className="dropdown-icon" alt="" style={{ marginRight: 12 }} />
          </div>

          <div className="filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#2f2f2f", padding: "10px 16px", width: "100%", cursor: "pointer", appearance: "none" }}>
              <option value="">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <img src={DropdownIcon} className="dropdown-icon" alt="" style={{ marginRight: 12 }} />
          </div>

          <div className="filter-btn"><img src={FilterIcon} alt="" /></div>
        </div>
      </div>

      <div className="table-card">
        {loading && <div style={{ padding: 12 }}>Loading...</div>}
        {err && <div style={{ padding: 12, color: "red" }}>{err}</div>}

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>USER</th>
                <th>ROLE</th>
                <th>SPECIALIZATION</th>
                <th>MOBILE</th>
                <th>LAST ACTIVE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((u) => {
                const isActive = u.status === "active";
                let avatarSrc = getAvatarUrl(u);
                return (
                  <tr key={u.user_id}>
                    <td className="user-cell">
                      <img src={avatarSrc} className="user-avatar" alt=""
                        onError={(e) => { e.target.onerror = null; e.target.src = DefaultAvatar; }} />
                      <div className="user-info">
                        <div className="user-name">{`${u.first_name || ""} ${u.last_name || ""}`.trim()}</div>
                        <div className="user-email">{u.email}</div>
                      </div>
                    </td>
                    <td>{u.role}</td>
                    <td>{u.specialization || "-"}</td>
                    <td>{u.phone || "-"}</td>
                    <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "-"}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={isActive} onChange={() => toggleStatus(u.user_id, isActive)} />
                        <span className="slider"></span>
                      </label>
                    </td>
                    <td style={{ position: "relative" }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img src={ActionIcon} className="action-icon" alt="Actions" style={{ cursor: "pointer" }}
                          onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === u.user_id ? null : u.user_id); }} />
                        {openActionMenu === u.user_id && (
                          <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 1000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "140px", overflow: "hidden" }}>
                            <div onClick={(e) => { e.stopPropagation(); setEditingUser(u); setOpenActionMenu(null); }}
                              style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              View
                            </div>
                            <div onClick={(e) => { e.stopPropagation(); initiateDelete(u); }}
                              style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#cda751", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #f0f0f0" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#fcf8ed"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              Delete
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: 24, textAlign: "center", color: "#7b8a9a" }}>
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <div>
            Showing {filteredUsers.length > 0 ? (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
            {" – "}
            {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredUsers.length)}
            {" "}of{" "}
            {filteredUsers.length} users
          </div>
          <div className="pagination-controls">
            <button className="page-btn" disabled={safeCurrentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>&lt;</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let startPage = Math.max(1, safeCurrentPage - 2);
              let endPage = Math.min(totalPages, startPage + 4);
              startPage = Math.max(1, endPage - 4);
              return startPage + i;
            }).map((p) => (
              <button key={p} className={`page-btn ${safeCurrentPage === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={safeCurrentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Team;