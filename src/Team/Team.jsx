// import React, { useState } from "react";
// import AddMemberDrawer from "./AddMemberDrawer";
// import AddUserIcon from "../assets/Add_userIcon.svg";
// import "./Team.css";
// import SearchIcon from "../assets/searchIcon.svg";
// import DropdownIcon from "../assets/dropdownIcon.svg";
// import FilterIcon from "../assets/filterIcon.svg";
// import ProfileIcon from "../assets/profileIcon.png";
// import ActionIcon from "../assets/Button.svg";

// function Team() {
//   const [drawerOpen, setDrawerOpen] = useState(false);

//   return (
//     <div className="team-container">
//       <AddMemberDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
//       <div className="team-header">
//         <div className="team-title">
//           <h1>User & Staff Management</h1>
//           <p>Manage your medical staff, therapists, and administrative team.</p>
//         </div>

//         <button className="add-user-btn" onClick={() => setDrawerOpen(true)}>
//           <img src={AddUserIcon} className="add-icon" />
//           Add New User
//         </button>
//       </div>
//       <div className="team-card">
//         <div className="team-filters">
//           {/* Search Bar */}
//           <div className="search-box">
//             <img src={SearchIcon} className="search-icon" />
//             <input type="text" placeholder="Search by name.." />
//           </div>

//           {/* Role Dropdown */}
//           <div className="filter-dropdown">
//             <span>Role: All</span>
//             <img src={DropdownIcon} className="dropdown-icon" />
//           </div>

//           {/* Status Dropdown */}
//           <div className="filter-dropdown">
//             <span>Status: All</span>
//             <img src={DropdownIcon} className="dropdown-icon" />
//           </div>

//           {/* Filter Button */}
//           <div className="filter-btn">
//             <img src={FilterIcon} />
//           </div>
//         </div>
//       </div>
//       <div className="table-card">
//         <div className="table-scroll">
//           <table>
//             <thead>
//               <tr>
//                 <th>USER</th>
//                 <th>ROLE</th>
//                 <th>SPECIALIZATION</th>
//                 <th>ACCESS</th>
//                 <th>MOBILE</th>
//                 <th>LAST ACTIVE</th>
//                 <th>STATUS</th>
//                 <th>ACTIONS</th>
//               </tr>
//             </thead>

//             <tbody>
//               {[...Array(10)].map((_, index) => (
//                 <tr key={index}>
//                   <td className="user-cell">
//                     <img src={ProfileIcon} className="user-avatar" />

//                     <div className="user-info">
//                       <div className="user-name">Mahesh</div>
//                       <div className="user-email">s.chen@wellness.center</div>
//                     </div>
//                   </td>

//                   <td>
//                     <span className="role-badge super">Super-Admin</span>
//                   </td>

//                   <td>Operations</td>
//                   <td>Operations</td>
//                   <td>Operations</td>
//                   <td>2 mins ago</td>

//                   <td>
//                     <label className="switch">
//                       <input type="checkbox" defaultChecked />
//                       <span className="slider"></span>
//                     </label>
//                   </td>

//                   <td>
//                     <img src={ActionIcon} className="action-icon" />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         <div className="table-pagination">
//           <div className="pagination-info">Showing 1-11 of 42 users</div>

//           <div className="pagination-controls">
//             <button className="page-btn">&lt;</button>
//             <button className="page-btn active">1</button>
//             <button className="page-btn">2</button>
//             <button className="page-btn">3</button>
//             <button className="page-btn">&gt;</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Team;

import React, { useEffect, useState } from "react";
import AddMemberDrawer from "./AddMemberDrawer";
import AddUserIcon from "../assets/Add_userIcon.svg";
import "./Team.css";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import FilterIcon from "../assets/filterIcon.svg";
import DefaultAvatar from "../assets/profileIcon.png";
import ActionIcon from "../assets/Button.svg";

import { apiFetch } from "../api/http";

const EditMemberDrawer = ({ user, onClose, onSaved }) => {
  const [form, setForm] = useState({
    role: user?.role || "",
    status: user?.status || "ACTIVE",
    specialization: user?.specialization || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
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
          <div className="drawer-title">
            Edit Team Member
          </div>
          <button className="drawer-close-btn" onClick={onClose} disabled={saving}>✕</button>
        </div>
        
        <div className="drawer-body">
          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Role</label>
              <div className="select-wrapper">
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="drawer-select"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="CO_ADMIN">Co Admin</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="THERAPIST">Therapist</option>
                </select>
                <img src={DropdownIcon} alt="dropdown" className="select-icon" />
              </div>
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
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="input-label">Specialization</label>
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState(null);

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

  const toggleStatus = async (userId, currentStatusBool) => {
    const newStatus = currentStatusBool ? "INACTIVE" : "ACTIVE";
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

  // ── Client-side filter ──
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

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 whenever filters change
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

      {/* Edit Member Drawer */}
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

      {/* ── Filters Card ── */}
      <div className="team-card">
        <div className="team-filters">
          {/* Search Box — now wired */}
          <div className="search-box">
            <img src={SearchIcon} className="search-icon" alt="" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Role Dropdown — now wired */}
          <div className="filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select
              value={roleFilter}
              onChange={(e) => handleRoleFilter(e.target.value)}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: "#2f2f2f", padding: "10px 16px",
                width: "100%", cursor: "pointer", appearance: "none",
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

          {/* Status Dropdown — now wired */}
          <div className="filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: "#2f2f2f", padding: "10px 16px",
                width: "100%", cursor: "pointer", appearance: "none",
              }}
            >
              <option value="">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <img src={DropdownIcon} className="dropdown-icon" alt="" style={{ marginRight: 12 }} />
          </div>

          <div className="filter-btn">
            <img src={FilterIcon} alt="" />
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
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
                const isActive = u.status === "ACTIVE";
                return (
                  <tr key={u.user_id}>
                    <td className="user-cell">
                      <img
                        src={u.avatar_url || DefaultAvatar}
                        className="user-avatar"
                        alt=""
                      />
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
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleStatus(u.user_id, isActive)}
                        />
                        <span className="slider"></span>
                      </label>
                    </td>

                    {/* Action icon — now opens EditMemberDrawer */}
                    <td>
                      <img
                        src={ActionIcon}
                        className="action-icon"
                        alt="Edit"
                        onClick={() => setEditingUser(u)}
                      />
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

        {/* ── Pagination Footer ── */}
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