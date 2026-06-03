import React, { useEffect, useState, useRef } from "react";
import AddMemberDrawer from "./AddMemberDrawer";
import AddUserIcon from "../assets/Add_userIcon.svg";
import "./Team.css";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import FilterIcon from "../assets/filterIcon.svg";
import DefaultAvatar from "../assets/profileIcon.png";
import ActionIcon from "../assets/Button.svg";

import { apiFetch } from "../api/http";
import { useAllocations } from "../utils/AllocationContext";

const EditMemberDrawer = ({ user, onClose, onSaved }) => {
  const { isStaffAllocated } = useAllocations();
  const [form, setForm] = useState({
    role: user?.role || "",
    status: user?.status || "ACTIVE",
    specialization: user?.specialization || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAllocated = isStaffAllocated(user?.user_id);
  const originalRole = user?.role || "";

  const handleSave = async () => {
    setError("");

    if (form.phone && form.phone.trim()) {
      const phoneVal = form.phone.trim();
      if (!/^\d{10,15}$/.test(phoneVal)) {
        setError("Phone number must be digits only and between 10 to 15 characters long");
        return;
      }
    }

    if (form.role !== originalRole && isAllocated) {
      setError(`Cannot change role: ${user.first_name} has active session allocations. Remove allocations first before changing their role.`);
      return;
    }

    if ((form.role === "DOCTOR" || form.role === "THERAPIST") && !form.specialization?.trim()) {
      setError("Specialization is required for Doctors and Therapists");
      return;
    }

    if (form.status === "INACTIVE" && user?.status === "ACTIVE" && isAllocated) {
      const confirmed = window.confirm(
        `⚠️ Warning: ${user.first_name} ${user.last_name} has active session allocations. Deactivating them will not automatically remove those allocations. Are you sure you want to proceed?`
      );
      if (!confirmed) return;
    }

    try {
      setSaving(true);
      const res = await apiFetch(`/api/teams/users/${user.user_id}`, {
        method: "PATCH",
        body: JSON.stringify(form)
      });
      if (res.success) {
        onSaved();
      } else {
        throw new Error(res.error || "Failed to update member");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay open" onClick={onClose} style={{ zIndex: 9999 }} />
      <div className="drawer-panel open" onClick={(e) => e.stopPropagation()} style={{ zIndex: 10000 }}>
        <div className="drawer-header">
          <div className="drawer-title">Edit Team Member</div>
          <button className="drawer-close-btn" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className="drawer-body">
          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Role</label>
              {isAllocated && form.role !== originalRole && (
                <div style={{ fontSize: 11, color: "#e67e22", marginBottom: 4, padding: "4px 8px", background: "rgba(230,126,34,0.08)", borderRadius: 4 }}>
                  ⚠️ Cannot change role while staff has active allocations
                </div>
              )}
              <div className="select-wrapper">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="drawer-select"
                  disabled={isAllocated}
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="CO_ADMIN">Co Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="THERAPIST">Therapist</option>
                </select>
                <img src={DropdownIcon} alt="dropdown" className="select-icon" />
              </div>
              {isAllocated && (
                <div style={{ fontSize: 11, color: "#a0aec0", marginTop: 4 }}>
                  🔒 Role locked — staff has active allocations
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Status</label>
              <div className="select-wrapper">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="drawer-select"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <img src={DropdownIcon} alt="dropdown" className="select-icon" />
              </div>
              {isAllocated && form.status === "INACTIVE" && (
                <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 4 }}>
                  ⚠️ This staff has active allocations — deactivating will require manual removal
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="drawer-input"
                placeholder="+91 9876543210"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="input-label">
                Specialization {(form.role === "DOCTOR" || form.role === "THERAPIST") && <span style={{ color: "#e74c3c" }}>*</span>}
              </label>
              <input
                type="text"
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                className="drawer-input"
                placeholder="e.g. Ayurveda"
              />
            </div>
          </div>

          {error && <div style={{ color: "red", fontSize: 13, marginTop: 12 }}>{error}</div>}
        </div>

        <div className="drawer-footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
};

function Team() {
  const { isStaffAllocated, getStaffAllocations } = useAllocations();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  const ITEMS_PER_PAGE = 10;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await apiFetch("/api/teams/users?page=1&limit=50");
      setUsers(data.users || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDeleteMember = async (userId, firstName, lastName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${firstName} ${lastName}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/teams/users/${userId}`, {
        method: "DELETE",
      });
      await fetchUsers();
    } catch (e) {
      alert("Failed to delete member: " + e.message);
    }
  };

  const toggleStatus = async (userId, currentStatusBool) => {
    const newStatus = currentStatusBool ? "INACTIVE" : "ACTIVE";
    if (newStatus === "INACTIVE" && isStaffAllocated(userId)) {
      const u = users.find(x => x.user_id === userId);
      const name = u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "This staff member";
      const confirmed = window.confirm(
        `⚠️ Warning: ${name} has active session allocations. Deactivating them will not automatically remove those allocations. Are you sure you want to proceed?`
      );
      if (!confirmed) return;
    }
    try {
      await apiFetch(`/api/teams/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus })
      });
      await fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStatus = !statusFilter || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleRoleFilter = (val) => { setRoleFilter(val); setPage(1); };
  const handleStatusFilter = (val) => { setStatusFilter(val); setPage(1); };

  return (
    <div className="team-container">
      <AddMemberDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchUsers}
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
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select
              value={roleFilter}
              onChange={(e) => handleRoleFilter(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#2f2f2f", padding: "10px 16px", width: "100%", cursor: "pointer", appearance: "none" }}
            >
              <option value="">Role: All</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="CO_ADMIN">Co Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="THERAPIST">Therapist</option>
            </select>
            <img src={DropdownIcon} className="dropdown-icon" alt="" style={{ marginRight: 12 }} />
          </div>

          <div className="filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#2f2f2f", padding: "10px 16px", width: "100%", cursor: "pointer", appearance: "none" }}
            >
              <option value="">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <img src={DropdownIcon} className="dropdown-icon" alt="" style={{ marginRight: 12 }} />
          </div>

          <div className="filter-btn">
            <img src={FilterIcon} alt="" />
          </div>
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
                <th>ALLOCATION STATUS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map((u) => {
                const isActive = u.status === "active";
                return (
                  <tr key={u.user_id}>
                    <td className="user-cell">
                      <img src={u.avatar_url || DefaultAvatar} className="user-avatar" alt="" />
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
                      {u.role === "DOCTOR" || u.role === "THERAPIST" ? (
                        isStaffAllocated(u.user_id) ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                            <span style={{ padding: "4px 8px", borderRadius: "4px", background: "#fff9e6", color: "#b28900", fontWeight: 700, fontSize: "11px" }}>
                              Allocated
                            </span>
                            {getStaffAllocations(u.user_id).filter(a => a.status === "active").map(a => (
                              <span key={a.id} style={{ fontSize: "10px", color: "#718096", background: "#f7fafc", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0", marginTop: "2px" }}>
                                🌿 {a.sessionTitle}: {new Date(a.startDate).toLocaleDateString()} - {new Date(a.endDate).toLocaleDateString()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ padding: "4px 8px", borderRadius: "4px", background: "#e6f9ed", color: "#137333", fontWeight: 700, fontSize: "11px" }}>
                            Available
                          </span>
                        )
                      ) : (
                        <span style={{ color: "#a0aec0" }}>-</span>
                      )}
                    </td>

                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleStatus(u.user_id, isActive)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>

                    <td style={{ position: "relative" }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img
                          src={ActionIcon}
                          className="action-icon"
                          alt="Actions"
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === u.user_id ? null : u.user_id);
                          }}
                        />
                        {openActionMenu === u.user_id && (
                          <div style={{
                            position: "absolute", right: 0, top: "100%", zIndex: 1000,
                            background: "#fff", border: "1px solid #e2e8f0",
                            borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            minWidth: "140px", overflow: "hidden"
                          }}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingUser(u);
                                setOpenActionMenu(null);
                              }}
                              style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              ✏️ Edit
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMember(u.user_id, u.first_name, u.last_name);
                                setOpenActionMenu(null);
                              }}
                              style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#e53e3e", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #f0f0f0" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              🗑️ Delete
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
                  <td colSpan="8" style={{ padding: 24, textAlign: "center", color: "#7b8a9a" }}>
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-pagination">
          <div>
            Showing{" "}
            {filteredUsers.length > 0 ? (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
            {" – "}
            {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredUsers.length)}
            {" "}of{" "}
            {filteredUsers.length} users
          </div>
          <div className="pagination-controls">
            <button className="page-btn" disabled={safeCurrentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              &lt;
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let startPage = Math.max(1, safeCurrentPage - 2);
              let endPage = Math.min(totalPages, startPage + 4);
              startPage = Math.max(1, endPage - 4);
              return startPage + i;
            }).map((p) => (
              <button key={p} className={`page-btn ${safeCurrentPage === p ? "active" : ""}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="page-btn" disabled={safeCurrentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Team;