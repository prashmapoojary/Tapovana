import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import AddMemberDrawer from "./AddMemberDrawer";
import AddUserIcon from "../assets/Add_userIcon.svg";
import "./Team.css";
import "./AddMemberDrawer.css";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import FilterIcon from "../assets/filterIcon.svg";
import DefaultAvatar from "../assets/profile.png";
import ActionIcon from "../assets/Button.svg";
import ProfilePlaceholder from "../assets/profile.png";
import ProfileButtonIcon from "../assets/profileButton.png";

import { apiFetch } from "../api/http";
import { useAllocations } from "../utils/AllocationContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const ITEMS_PER_PAGE = 10;
const PRESET_AVATARS = [
  "avatar1.svg",
  "avatar2.svg",
  "avatar3.svg",
  "avatar4.svg",
  "avatar5.svg",
  "avatar6.svg",
];

const normalizeStatusForForm = (status) => {
  if (!status) return "ACTIVE";
  const s = String(status).toLowerCase();
  if (s === "active") return "ACTIVE";
  if (s === "inactive") return "INACTIVE";
  return status;
};

const resolveAvatarSrc = (user) => {
  if (!user) return DefaultAvatar;

  if (user.profile_photo_source === "upload" && user.profile_photo_url) {
    if (user.profile_photo_url.startsWith("http")) return user.profile_photo_url;
    if (user.profile_photo_url.startsWith("/")) return `${API_BASE}${user.profile_photo_url}`;
    return `${API_BASE}/${user.profile_photo_url}`;
  }

  if (user.profile_photo_source === "local" && user.profile_photo_url) {
    return `/avatars/${user.profile_photo_url}`;
  }

  if (user.profile_photo_source === "external" && user.profile_photo_url) {
    return user.profile_photo_url;
  }

  if (user.avatar_url) {
    if (user.avatar_url.startsWith("http") || user.avatar_url.startsWith("/")) {
      return user.avatar_url;
    }
    return `${API_BASE}${user.avatar_url}`;
  }

  return DefaultAvatar;
};

const AvatarImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(src || DefaultAvatar);

  useEffect(() => {
    setImgSrc(src || DefaultAvatar);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(DefaultAvatar)}
    />
  );
};

const ViewMemberDrawer = ({ user, onClose }) => {
  const [workshops, setWorkshops] = useState([]);
  const [services, setServices] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const userId = user.user_id || user.id;

        // 1. Fetch live workshops from backend
        const wsData = await apiFetch("/api/workshops?limit=100");
        const assignedWorkshops = (wsData.workshops || []).filter(w => 
          w.assigned_staff_ids && w.assigned_staff_ids.includes(userId)
        );

        // 2. Fetch live services from backend
        const srvData = await apiFetch("/api/services?limit=100");
        const assignedServices = (srvData.services || []).filter(s => 
          s.assigned_staff_ids && s.assigned_staff_ids.includes(userId)
        );

        // 3. Fetch live user allocation details (for Vedic Programs) from backend
        const teamData = await apiFetch("/api/teams/users?page=1&limit=100");
        const currentUserData = (teamData.users || []).find(u => u.user_id === userId);
        const allocDetails = currentUserData?.allocation_details;

        const assignedPrograms = [];
        if (allocDetails && allocDetails.type === "vedic_program") {
          assignedPrograms.push({
            id: allocDetails.id,
            title: allocDetails.sessionTitle,
            startDate: allocDetails.startDate,
            endDate: allocDetails.endDate
          });
        }

        if (active) {
          setWorkshops(assignedWorkshops);
          setServices(assignedServices);
          setPrograms(assignedPrograms);
        }
      } catch (err) {
        console.error("Error fetching live allocations:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  const avatarSrc = resolveAvatarSrc(user);

  const getWorkshopStatus = (w) => {
    const wsDate = new Date(w.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return wsDate < today ? "Completed" : "Pending";
  };

  const getProgramStatus = (p) => {
    const endDate = new Date(p.endDate || p.startDate);
    if (p.endDate && p.endDate.length <= 10) {
      endDate.setHours(23, 59, 59, 999);
    }
    return endDate < new Date() ? "Completed" : "Pending";
  };

  return (
    <>
      <div className="drawer-overlay open" onClick={onClose} style={{ zIndex: 9999 }} />
      <div
        className="drawer-panel open"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10000, width: "500px", maxWidth: "95vw" }}
      >
        <div className="drawer-header">
          <div className="drawer-title">Team Member Profile Details</div>
          <button className="drawer-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", borderBottom: "1px solid #edf2f7", paddingBottom: "16px" }}>
            <AvatarImage
              src={avatarSrc}
              alt={user.first_name}
              className="profile-avatar-preview"
              style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover" }}
            />
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", color: "#1a202c" }}>
                {`${user.first_name || ""} ${user.last_name || ""}`.trim()}
              </h2>
              <span style={{ 
                display: "inline-block", 
                marginTop: "6px",
                padding: "2px 8px", 
                borderRadius: "4px", 
                fontSize: "12px", 
                fontWeight: 700, 
                color: "#cda751", 
                background: "rgba(205,167,81,0.1)" 
              }}>
                {user.role}
              </span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "14px", color: "#718096", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0" }}>Basic Information</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#4a5568", fontWeight: 500 }}>Email:</span>
                <span style={{ color: "#1a202c", fontWeight: 600 }}>{user.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#4a5568", fontWeight: 500 }}>Contact Number:</span>
                <span style={{ color: "#1a202c", fontWeight: 600 }}>{user.phone || "-"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#4a5568", fontWeight: 500 }}>Specialization:</span>
                <span style={{ color: "#1a202c", fontWeight: 600 }}>{user.specialization || "-"}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ fontSize: "14px", color: "#718096", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
              Fetching live allocation details...
            </div>
          ) : (
            <>
              <div>
                <h3 style={{ fontSize: "14px", color: "#718096", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0" }}>Workshop Allocations</h3>
                {workshops.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#a0aec0", fontStyle: "italic" }}>No workshops assigned.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {workshops.map(w => {
                      const status = getWorkshopStatus(w);
                      return (
                        <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8f9fa", borderRadius: "6px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#2d3748" }}>{w.title}</span>
                          <span style={{ 
                            fontSize: "11px", 
                            fontWeight: 700, 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            color: status === "Completed" ? "#2f855a" : "#b7791f",
                            background: status === "Completed" ? "#f0fff4" : "#fffff0"
                          }}>
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ fontSize: "14px", color: "#718096", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0" }}>Services Allocations</h3>
                {services.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#a0aec0", fontStyle: "italic" }}>No services assigned.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {services.map(s => (
                      <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8f9fa", borderRadius: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#2d3748" }}>{s.name}</span>
                        <span style={{ 
                          fontSize: "11px", 
                          fontWeight: 700, 
                          padding: "2px 6px", 
                          borderRadius: "4px", 
                          color: "#b7791f",
                          background: "#fffff0"
                        }}>
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ fontSize: "14px", color: "#718096", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0" }}>Programs Allocations</h3>
                {programs.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "#a0aec0", fontStyle: "italic" }}>No programs assigned.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {programs.map(p => {
                      const status = getProgramStatus(p);
                      return (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8f9fa", borderRadius: "6px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#2d3748" }}>{p.title}</span>
                          <span style={{ 
                            fontSize: "11px", 
                            fontWeight: 700, 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            color: status === "Completed" ? "#2f855a" : "#b7791f",
                            background: status === "Completed" ? "#f0fff4" : "#fffff0"
                          }}>
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="drawer-footer">
          <button className="btn-cancel" onClick={onClose} style={{ width: "100%" }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
};

function Team() {
  const { isStaffAllocated, getStaffAllocations, triggerConfirm, triggerAlert } = useAllocations();

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

  const actionMenuRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");
      const data = await apiFetch("/api/teams/users?page=1&limit=50");
      setUsers(data.users || []);
    } catch (e) {
      setErr(e.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchUsers();
    };
    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, [fetchUsers]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteMember = async (userId, firstName, lastName) => {
    const confirmed = await triggerConfirm(
      `Are you sure you want to delete ${firstName} ${lastName}?\n\nThis action cannot be undone.`,
      true
    );
    if (!confirmed) return;

    try {
      await apiFetch(`/api/teams/users/${userId}`, { method: "DELETE" });
      await fetchUsers();
    } catch (e) {
      triggerAlert("Failed to delete member: " + (e.message || "Unknown error"));
    }
  };

  const toggleStatus = async (userId, currentStatusBool) => {
    const newStatus = currentStatusBool ? "INACTIVE" : "ACTIVE";

    if (newStatus === "INACTIVE" && isStaffAllocated(userId)) {
      const u = users.find((x) => x.user_id === userId);
      const name = u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "This staff member";
      const confirmed = await triggerConfirm(
        `Warning: ${name} has active session allocations. Are you sure?`,
        true
      );
      if (!confirmed) return;
    }

    try {
      await apiFetch(`/api/teams/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchUsers();
    } catch (e) {
      triggerAlert(e.message || "Failed to update status");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
      const q = search.toLowerCase().trim();

      const matchSearch =
        !q ||
        fullName.includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q);

      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus = !statusFilter || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(page, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilter = (val) => {
    setRoleFilter(val);
    setPage(1);
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  return (
    <div className="team-container">
      <AddMemberDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchUsers}
      />

      {editingUser && (
        <ViewMemberDrawer
          user={editingUser}
          onClose={() => setEditingUser(null)}
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
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: "#2f2f2f",
                padding: "10px 16px",
                width: "100%",
                cursor: "pointer",
                appearance: "none",
              }}
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
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: "#2f2f2f",
                padding: "10px 16px",
                width: "100%",
                cursor: "pointer",
                appearance: "none",
              }}
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
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map((u) => {
                const isActive = u.status === "active";
                const avatarSrc = resolveAvatarSrc(u);
                const activeAllocations = getStaffAllocations(u.user_id).filter(
                  (a) => a.status === "active"
                );

                return (
                  <tr key={u.user_id}>
                    <td className="user-cell">
                      <AvatarImage
                        src={avatarSrc}
                        alt={`${u.first_name || ""} ${u.last_name || ""}`.trim() || "User avatar"}
                        className="user-avatar"
                      />

                      <div className="user-info">
                        <div className="user-name">
                          {`${u.first_name || ""} ${u.last_name || ""}`.trim()}
                        </div>
                        <div className="user-email">{u.email}</div>
                      </div>
                    </td>

                    <td>{u.role}</td>
                    <td>{u.specialization || "-"}</td>
                    <td>{u.phone || "-"}</td>
                    <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "-"}</td>



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
                      <div
                        style={{ position: "relative", display: "inline-block" }}
                        ref={openActionMenu === u.user_id ? actionMenuRef : null}
                      >
                        <img
                          src={ActionIcon}
                          className="action-icon"
                          alt="Actions"
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu((prev) => (prev === u.user_id ? null : u.user_id));
                          }}
                        />

                        {openActionMenu === u.user_id && (
                          <div
                            style={{
                              position: "absolute",
                              right: 0,
                              top: "100%",
                              zIndex: 1000,
                              background: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              minWidth: "140px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingUser(u);
                                setOpenActionMenu(null);
                              }}
                              style={{
                                padding: "10px 16px",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: "#2d3748",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f7fafc")}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                              }
                            >
                              View
                            </div>

                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMember(u.user_id, u.first_name, u.last_name);
                                setOpenActionMenu(null);
                              }}
                              style={{
                                padding: "10px 16px",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: "#e53e3e",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                borderTop: "1px solid #f0f0f0",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#fff5f5")}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = "transparent")
                              }
                            >
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
            Showing {filteredUsers.length > 0 ? startIndex + 1 : 0}
            {" – "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
          </div>

          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={safeCurrentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let startPage = Math.max(1, safeCurrentPage - 2);
              let endPage = Math.min(totalPages, startPage + 4);
              startPage = Math.max(1, endPage - 4);
              return startPage + i;
            }).map((p) => (
              <button
                key={p}
                className={`page-btn ${safeCurrentPage === p ? "active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            <button
              className="page-btn"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Team;