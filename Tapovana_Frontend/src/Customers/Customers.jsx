import React, { useState, useEffect, useMemo } from "react";
import "./Customers.css";
import { apiFetch } from "../api/http";
import { getUser } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";
import SearchIcon from "../assets/searchIcon.svg";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIcon.png";

// Professional dummy fallback structure
const DUMMY_CUSTOMERS = [
  { id: "1", customer_id: "CUST-001", first_name: "Rahul", last_name: "Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", status: "ACTIVE", membership_status: "GOLD", total_bookings: 12, total_spent: 24500, join_date: "2024-01-15", last_activity: "2024-06-01", admin_notes: "Prefers evening slots" },
  { id: "2", customer_id: "CUST-002", first_name: "Priya", last_name: "Desai", email: "priya.d@example.com", phone: "+91 87654 32109", status: "ACTIVE", membership_status: "NONE", total_bookings: 2, total_spent: 3500, join_date: "2024-05-20", last_activity: "2024-05-22", admin_notes: "" },
  { id: "3", customer_id: "CUST-003", first_name: "Vikram", last_name: "Singh", email: "vikram.s@example.com", phone: "+91 76543 21098", status: "INACTIVE", membership_status: "PLATINUM", total_bookings: 45, total_spent: 89000, join_date: "2023-05-10", last_activity: "2023-12-10", admin_notes: "VIP Client" },
  { id: "4", customer_id: "CUST-004", first_name: "Anita", last_name: "Nair", email: "anita.n@example.com", phone: "+91 65432 10987", status: "ACTIVE", membership_status: "SILVER", total_bookings: 8, total_spent: 12000, join_date: "2024-02-22", last_activity: "2024-06-05", admin_notes: "" },
  { id: "5", customer_id: "CUST-005", first_name: "Sanjay", last_name: "Kumar", email: "sanjay.k@example.com", phone: "+91 54321 09876", status: "ARCHIVED", membership_status: "NONE", total_bookings: 1, total_spent: 1500, join_date: "2023-01-01", last_activity: "2023-01-15", admin_notes: "Duplicate account" },
];

function Customers() {
  const userRole = useMemo(() => getUser()?.role || "SUPER_ADMIN", []); // Fallback to SUPER_ADMIN for demo if missing
  const { triggerAlert, triggerConfirm } = useAllocations();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE_INACTIVE");
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [sortBy, setSortBy] = useState("join_date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newMembership, setNewMembership] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (selectedCustomer) {
      setNewMembership(selectedCustomer.membership_status || "NONE");
      setAdminNotes(selectedCustomer.admin_notes || "");
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      // Simulate API query params
      let q = `/api/customers?page=${page}&limit=10&sortBy=${sortBy}&order=${sortOrder}`;
      if (search) q += `&search=${encodeURIComponent(search)}`;
      if (membershipFilter) q += `&membership_status=${membershipFilter}`;
      if (statusFilter) q += `&status=${statusFilter}`;
      
      const res = await apiFetch(q);
      if (res.success) {
        setCustomers(res.customers || []);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        // Fallback to dummy data
        setCustomers(DUMMY_CUSTOMERS);
        setTotalPages(Math.ceil(DUMMY_CUSTOMERS.length / 10));
      }
    } catch {
      setCustomers(DUMMY_CUSTOMERS);
      setTotalPages(Math.ceil(DUMMY_CUSTOMERS.length / 10));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, membershipFilter, statusFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Local filtering/sorting for dummy data fallback
  const filteredAndSorted = useMemo(() => {
    let result = [...customers];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.customer_id || "").toLowerCase().includes(q)
      );
    }
    
    if (membershipFilter) {
      result = result.filter(c => c.membership_status === membershipFilter);
    }
    
    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE_INACTIVE") {
        result = result.filter(c => c.status === "ACTIVE" || c.status === "INACTIVE");
      } else {
        result = result.filter(c => c.status === statusFilter);
      }
    }

    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [customers, search, membershipFilter, statusFilter, sortBy, sortOrder]);

  // Derived pagination for frontend array
  const paginatedList = filteredAndSorted.slice((page - 1) * 10, page * 10);
  const derivedTotalPages = Math.ceil(filteredAndSorted.length / 10) || 1;

  // Permissions
  const canUpdateMembership = userRole === "SUPER_ADMIN" || userRole === "CO_ADMIN";
  const canArchive = userRole === "SUPER_ADMIN";

  const validateMembershipUpdate = () => {
    if (!canUpdateMembership) {
      triggerAlert("You do not have permission to change memberships.", false);
      return false;
    }
    if (selectedCustomer.status === "ARCHIVED") {
      triggerAlert("Cannot update membership for an archived customer.", false);
      return false;
    }
    if (newMembership === selectedCustomer.membership_status) {
      triggerAlert("Customer already has this membership.", false);
      return false;
    }
    // Validation for downgrade
    const tiers = { "NONE": 0, "SILVER": 1, "GOLD": 2, "PLATINUM": 3 };
    if (tiers[newMembership] < tiers[selectedCustomer.membership_status]) {
      return "downgrade";
    }
    return true;
  };

  const handleUpdateMembership = () => {
    const validation = validateMembershipUpdate();
    if (!validation) return;
    
    const isDowngrade = validation === "downgrade";
    const msg = isDowngrade 
      ? `You are downgrading this customer to ${newMembership}. Are you sure?`
      : `Change membership to ${newMembership}?`;

    triggerConfirm(msg, () => {
      setActionLoading(true);
      // Simulate API update
      setTimeout(() => {
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, membership_status: newMembership } : c));
        setSelectedCustomer(prev => ({ ...prev, membership_status: newMembership }));
        triggerAlert(`Membership successfully updated to ${newMembership}`, true);
        setActionLoading(false);
      }, 500);
    });
  };

  const handleSaveNotes = () => {
    setActionLoading(true);
    setTimeout(() => {
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, admin_notes: adminNotes } : c));
      setSelectedCustomer(prev => ({ ...prev, admin_notes: adminNotes }));
      triggerAlert("Admin notes updated", true);
      setActionLoading(false);
    }, 400);
  };

  const handleArchive = () => {
    if (!canArchive) return;
    triggerConfirm(
      "Archive this customer? This will hide them from active lists but preserve their history.",
      () => {
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, status: "ARCHIVED" } : c));
        triggerAlert("Customer archived successfully.", true);
        setSelectedCustomer(null);
      }
    );
  };

  const renderSkeletonRow = (idx) => (
    <tr key={idx} className="skeleton-row">
      <td><div className="skeleton-box" style={{ width: "60px" }} /></td>
      <td>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="skeleton-avatar" />
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
            <div className="skeleton-box" style={{ width: "120px" }} />
            <div className="skeleton-box" style={{ width: "160px", height: "14px" }} />
          </div>
        </div>
      </td>
      <td><div className="skeleton-box" style={{ width: "100px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "80px", borderRadius: "20px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "60px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "80px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "90px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "24px", height: "24px", borderRadius: "50%" }} /></td>
    </tr>
  );

  return (
    <div className="customers-container">
      {/* ── Drawer ── */}
      {selectedCustomer && (
        <div className="cust-drawer-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="cust-drawer-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="cust-drawer-header">
              <div>
                <h2>{selectedCustomer.first_name} {selectedCustomer.last_name}</h2>
                <p>{selectedCustomer.customer_id} · {selectedCustomer.phone}</p>
              </div>
              <button className="cust-close-btn" onClick={() => setSelectedCustomer(null)}>×</button>
            </div>

            {/* Body */}
            <div className="cust-drawer-body">
              
              {/* Profile */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Customer Profile</h4>
                <div className="cust-profile-card">
                  <img src={DefaultAvatar} className="cust-avatar" alt="" />
                  <div>
                    <div className="cust-name">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                    <div className="cust-sub">{selectedCustomer.email || "No email"}</div>
                    <div className="cust-sub">{selectedCustomer.phone}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <span className={`status-badge ${selectedCustomer.status?.toLowerCase()}`}>{selectedCustomer.status}</span>
                      <span className={`tier-badge ${(selectedCustomer.membership_status || "NONE").toLowerCase()}`}>
                        {selectedCustomer.membership_status === "NONE" ? "Regular" : selectedCustomer.membership_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CRM Metrics */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">CRM Metrics</h4>
                <div className="cust-metrics-grid">
                  <div className="cust-metric">
                    <span className="cust-metric-label">Total Spend (LTV)</span>
                    <span className="cust-metric-value metric-teal">₹{(selectedCustomer.total_spent || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cust-metric">
                    <span className="cust-metric-label">Total Sessions</span>
                    <span className="cust-metric-value metric-gold">{selectedCustomer.total_bookings || 0}</span>
                  </div>
                  <div className="cust-metric">
                    <span className="cust-metric-label">Avg Monthly</span>
                    <span className="cust-metric-value">₹{Math.round((selectedCustomer.total_spent || 0) / 6).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cust-metric">
                    <span className="cust-metric-label">Joined / Active</span>
                    <span className="cust-metric-value" style={{ fontSize: 13, fontWeight: 600 }}>
                      Joined: {selectedCustomer.join_date}<br/>
                      Last: {selectedCustomer.last_activity || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Membership Control */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Membership & Permissions</h4>
                <div className="cust-update-row">
                  <select
                    className="cust-select"
                    value={newMembership}
                    onChange={(e) => setNewMembership(e.target.value)}
                    disabled={!canUpdateMembership || selectedCustomer.status === "ARCHIVED"}
                  >
                    <option value="NONE">Regular (No Discount)</option>
                    <option value="SILVER">Silver</option>
                    <option value="GOLD">Gold</option>
                    <option value="PLATINUM">Platinum</option>
                  </select>
                  <button
                    className="cust-btn-primary"
                    onClick={handleUpdateMembership}
                    disabled={actionLoading || !canUpdateMembership || selectedCustomer.status === "ARCHIVED"}
                  >
                    Update
                  </button>
                </div>
                {!canUpdateMembership && (
                  <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 4 }}>You do not have permission to change memberships.</div>
                )}
              </div>

              {/* Admin Notes */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Admin Remarks & Notes</h4>
                <textarea 
                  className="cust-textarea" 
                  placeholder="Enter private notes, preferred therapies, or client history here..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
                <button className="notes-save-btn" onClick={handleSaveNotes} disabled={actionLoading}>Save Notes</button>
              </div>

              {/* Booking History / Timeline Snippet */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Recent Activity</h4>
                <div className="history-list">
                  <div className="history-item">
                    <span>Membership Updated</span>
                    <span className="history-date">Today</span>
                  </div>
                  <div className="history-item">
                    <span>Session Completed</span>
                    <span className="history-date">{selectedCustomer.last_activity || "N/A"}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="cust-drawer-footer">
              <button 
                className="cust-btn-danger" 
                onClick={handleArchive}
                disabled={!canArchive || selectedCustomer.status === "ARCHIVED"}
              >
                {selectedCustomer.status === "ARCHIVED" ? "Archived Profile" : (canArchive ? "Archive Profile" : "Archive Locked")}
              </button>
              <button className="cust-btn-secondary" onClick={() => setSelectedCustomer(null)}>Close</button>
            </div>
            
          </div>
        </div>
      )}

      {/* Header */}
      <header className="customers-header">
        <div className="customers-title">
          <h1>Customer CRM &amp; Profiles</h1>
          <p>Verify customer lifetime spends, booking counts, and configure membership ranks.</p>
        </div>
      </header>

      {/* Filters */}
      <section className="filters-card">
        <div className="bookings-filters">
          <div className="search-box">
            <img src={SearchIcon} className="search-icon" alt="" />
            <input
              type="text"
              placeholder="Search by ID, name, phone or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          
          <div className="filter-select-wrapper">
            <label>Status</label>
            <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="ACTIVE_INACTIVE">Active & Inactive</option>
              <option value="ACTIVE">Active Only</option>
              <option value="ARCHIVED">Archived</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <label>Tier</label>
            <select className="filter-select" value={membershipFilter} onChange={(e) => { setMembershipFilter(e.target.value); setPage(1); }}>
              <option value="">All Tiers</option>
              <option value="NONE">Regular</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="customers-table-card">
        <div className="customers-table-scroll">
          <table className="customers-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("customer_id")}>CUSTOMER ID {sortBy === "customer_id" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th onClick={() => handleSort("first_name")}>CUSTOMER {sortBy === "first_name" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th>PHONE & EMAIL</th>
                <th>STATUS & MEMBERSHIP</th>
                <th onClick={() => handleSort("total_bookings")}>SESSIONS {sortBy === "total_bookings" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th onClick={() => handleSort("total_spent")}>TOTAL SPENT {sortBy === "total_spent" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th onClick={() => handleSort("last_activity")}>LAST ACTIVE {sortBy === "last_activity" && (sortOrder === "asc" ? "↑" : "↓")}</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => renderSkeletonRow(i))
              ) : error ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <h3>Error loading customers</h3>
                      <p>{error}</p>
                      <button className="retry-btn" onClick={loadCustomers}>Retry</button>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <h3>No customers match your filters</h3>
                      <p>Try adjusting your search terms or filter selections.</p>
                      <button className="retry-btn" onClick={() => { setSearch(""); setMembershipFilter(""); setStatusFilter("ACTIVE_INACTIVE"); }}>Clear Filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c)}>
                    <td className="text-bold">{c.customer_id}</td>
                    <td>
                      <div className="text-bold">{c.first_name} {c.last_name}</div>
                      <div className="text-xs text-muted">Joined: {c.join_date}</div>
                    </td>
                    <td>
                      <div style={{ color: "#2d3748" }}>{c.phone}</div>
                      <div className="text-xs text-muted">{c.email || "No Email"}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                        <span className={`status-badge ${(c.status || "ACTIVE").toLowerCase()}`}>{c.status || "ACTIVE"}</span>
                        <span className={`tier-badge ${(c.membership_status || "NONE").toLowerCase()}`}>
                          {c.membership_status === "NONE" ? "Regular" : c.membership_status}
                        </span>
                      </div>
                    </td>
                    <td><strong style={{ color: "#cda751" }}>{c.total_bookings || 0}</strong></td>
                    <td className="text-teal">₹{(c.total_spent || 0).toLocaleString("en-IN")}</td>
                    <td className="text-muted">{c.last_activity || "-"}</td>
                    <td onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}>
                      <img src={ActionIcon} alt="Actions" className="action-icon" style={{ width: 24, height: 24 }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="customers-pagination-footer">
          <div>Showing {paginatedList.length > 0 ? (page - 1) * 10 + 1 : 0} to {Math.min(page * 10, filteredAndSorted.length)} of {filteredAndSorted.length} customers</div>
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>&lt;</button>
            {Array.from({ length: derivedTotalPages }).map((_, i) => (
              <button 
                key={i}
                className={`page-btn ${page === i + 1 ? "active" : ""}`}
                onClick={() => setPage(i + 1)}
                disabled={loading}
              >
                {i + 1}
              </button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(derivedTotalPages, p + 1))} disabled={page === derivedTotalPages || loading}>&gt;</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Customers;