import React, { useState, useEffect, useMemo } from "react";
import "./Customers.css";
import { apiFetch } from "../api/http";
import { getUser } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";

import SearchIcon from "../assets/searchIcon.svg";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIcon.png";

// Professional dummy fallback structure reflecting CRM schema
const DUMMY_CUSTOMERS = [
  { id: "1", customer_id: "CUST-001", first_name: "Rahul", last_name: "Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", status: "ACTIVE", membership_status: "GOLD", total_bookings: 12, total_spent: 24500, join_date: "2024-01-15", last_activity: "2024-06-01", admin_notes: "Prefers evening slots" },
  { id: "2", customer_id: "CUST-002", first_name: "Priya", last_name: "Desai", email: "priya.d@example.com", phone: "+91 87654 32109", status: "ACTIVE", membership_status: "NONE", total_bookings: 2, total_spent: 3500, join_date: "2024-05-20", last_activity: "2024-05-22", admin_notes: "" },
  { id: "3", customer_id: "CUST-003", first_name: "Vikram", last_name: "Singh", email: "vikram.s@example.com", phone: "+91 76543 21098", status: "INACTIVE", membership_status: "PLATINUM", total_bookings: 45, total_spent: 89000, join_date: "2023-05-10", last_activity: "2023-12-10", admin_notes: "VIP Client" },
  { id: "4", customer_id: "CUST-004", first_name: "Anita", last_name: "Nair", email: "anita.n@example.com", phone: "+91 65432 10987", status: "ACTIVE", membership_status: "SILVER", total_bookings: 8, total_spent: 12000, join_date: "2024-02-22", last_activity: "2024-06-05", admin_notes: "" },
  { id: "5", customer_id: "CUST-005", first_name: "Sanjay", last_name: "Kumar", email: "sanjay.k@example.com", phone: "+91 54321 09876", status: "ARCHIVED", membership_status: "NONE", total_bookings: 1, total_spent: 1500, join_date: "2023-01-01", last_activity: "2023-01-15", admin_notes: "Duplicate account" },
];

function Customers() {
  const userRole = useMemo(() => getUser()?.role || "SUPER_ADMIN", []); // Fallback to SUPER_ADMIN for demo
  const { triggerAlert, triggerConfirm } = useAllocations();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE_INACTIVE"); // Exclude archived by default
  const [sortBy, setSortBy] = useState("join_date");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const [page, setPage] = useState(1);

  // Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newMembership, setNewMembership] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Load Customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let q = `/api/customers?limit=100`;
      if (search) q += `&search=${encodeURIComponent(search)}`;
      if (membershipFilter) q += `&membership_status=${membershipFilter}`;
      if (statusFilter) q += `&status=${statusFilter}`;

      const res = await apiFetch(q);
      if (res.success) {
        setCustomers(res.customers || []);
      } else {
        // Fallback to dummy
        setCustomers(DUMMY_CUSTOMERS);
      }
    } catch (err) {
      console.error(err);
      setCustomers(DUMMY_CUSTOMERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Sync drawer form state when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setNewMembership(selectedCustomer.membership_status || "NONE");
      setAdminNotes(selectedCustomer.admin_notes || "");
    }
  }, [selectedCustomer]);

  // Derived filtered & sorted list
  const filteredAndSorted = useMemo(() => {
    let result = [...customers];

    // Local Search filtering (backend might do this too, but for dummy fallback)
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.customer_id || "").toLowerCase().includes(q)
      );
    }

    // Local Status filtering
    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE_INACTIVE") {
        result = result.filter(c => c.status === "ACTIVE" || c.status === "INACTIVE");
      } else {
        result = result.filter(c => c.status === statusFilter);
      }
    }

    // Local Membership filtering
    if (membershipFilter) {
      result = result.filter(c => c.membership_status === membershipFilter);
    }

    // Sorting
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
  }, [customers, search, statusFilter, membershipFilter, sortBy, sortOrder]);

  const derivedTotalPages = Math.ceil(filteredAndSorted.length / 10) || 1;
  const paginatedList = filteredAndSorted.slice((page - 1) * 10, page * 10);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc"); // default desc for new sort (like newest first, highest spend)
    }
  };

  // --- Actions ---

  const canEdit = userRole === "SUPER_ADMIN" || userRole === "CO_ADMIN";
  const canArchive = userRole === "SUPER_ADMIN";

  const validateMembershipUpdate = () => {
    if (!canEdit) {
      triggerAlert("You do not have permission to change memberships.");
      return null;
    }
    if (selectedCustomer.status === "ARCHIVED") {
      triggerAlert("Cannot modify an archived customer profile.");
      return null;
    }
    if (newMembership === selectedCustomer.membership_status) {
      triggerAlert("Customer already has this membership tier.");
      return null;
    }
    
    // Check downgrade
    const tiers = ["NONE", "SILVER", "GOLD", "PLATINUM"];
    const oldIdx = tiers.indexOf(selectedCustomer.membership_status || "NONE");
    const newIdx = tiers.indexOf(newMembership);
    
    if (newIdx < oldIdx) return "downgrade";
    return "upgrade";
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
      // Simulate API call
      setTimeout(() => {
        setCustomers(prev => prev.map(c => 
          c.id === selectedCustomer.id ? { ...c, membership_status: newMembership } : c
        ));
        setSelectedCustomer(prev => ({ ...prev, membership_status: newMembership }));
        triggerAlert(`Membership updated to: ${newMembership}`, true);
        setActionLoading(false);
      }, 500);
    });
  };

  const handleSaveNotes = () => {
    if (!canEdit) return;
    setActionLoading(true);
    setTimeout(() => {
      setCustomers(prev => prev.map(c => 
        c.id === selectedCustomer.id ? { ...c, admin_notes: adminNotes } : c
      ));
      setSelectedCustomer(prev => ({ ...prev, admin_notes: adminNotes }));
      triggerAlert("Admin notes saved successfully.", true);
      setActionLoading(false);
    }, 400);
  };

  const handleArchive = () => {
    if (!canArchive) {
      triggerAlert("Only Super Admins can archive customers.");
      return;
    }

    triggerConfirm(
      "Archive this customer? Their history will be preserved, but they will be removed from active lists.",
      () => {
        setActionLoading(true);
        setTimeout(() => {
          setCustomers(prev => prev.map(c => 
            c.id === selectedCustomer.id ? { ...c, status: "ARCHIVED" } : c
          ));
          setSelectedCustomer(prev => ({ ...prev, status: "ARCHIVED" }));
          triggerAlert("Customer archived successfully.", true);
          setActionLoading(false);
        }, 500);
      }
    );
  };

  // --- Rendering Helpers ---

  const renderSortIcon = (col) => {
    if (sortBy !== col) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortOrder === "asc" ? "↑" : "↓"}</span>;
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
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div className="skeleton-box" style={{ width: "100px" }} />
          <div className="skeleton-box" style={{ width: "80px", height: "14px" }} />
        </div>
      </td>
      <td>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div className="skeleton-box" style={{ width: "60px", borderRadius: "12px" }} />
          <div className="skeleton-box" style={{ width: "70px", borderRadius: "12px", height: "14px" }} />
        </div>
      </td>
      <td><div className="skeleton-box" style={{ width: "40px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "80px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "80px" }} /></td>
      <td><div className="skeleton-box" style={{ width: "24px", borderRadius: "50%" }} /></td>
    </tr>
  );

  return (
    <div className="customers-container">

      {/* --- Drawer --- */}
      {selectedCustomer && (
        <div className="cust-drawer-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="cust-drawer-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="cust-drawer-header">
              <div>
                <h2>{selectedCustomer.first_name} {selectedCustomer.last_name}</h2>
                <p className="cust-drawer-sub">{selectedCustomer.customer_id} · {selectedCustomer.phone}</p>
              </div>
              <button className="cust-close-btn" onClick={() => setSelectedCustomer(null)}>×</button>
            </div>

            {/* Body */}
            <div className="cust-drawer-body">
              
              {selectedCustomer.status === "ARCHIVED" && (
                <div className="cust-archived-banner">
                  <strong>⚠️ This customer is ARCHIVED.</strong><br/>
                  Archived profiles are read-only to preserve audit history. To modify this profile, it must be restored by a Super Admin.
                </div>
              )}

              {/* Profile Overview */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Customer Profile</h4>
                <div className="cust-profile-card">
                  <img src={DefaultAvatar} className="cust-avatar" alt="Avatar" />
                  <div>
                    <div className="cust-name">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                    <div className="cust-sub">{selectedCustomer.email || "No Email provided"}</div>
                    <div className="cust-sub">{selectedCustomer.phone}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <span className={`status-badge ${(selectedCustomer.status || "ACTIVE").toLowerCase()}`}>
                        {selectedCustomer.status || "ACTIVE"}
                      </span>
                      <span className={`tier-badge ${(selectedCustomer.membership_status || "NONE").toLowerCase()}`}>
                        {selectedCustomer.membership_status === "NONE" ? "Regular" : selectedCustomer.membership_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
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
                      Joined: {selectedCustomer.join_date}<br />
                      Last: {selectedCustomer.last_activity || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Membership Control */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Update Membership Tier</h4>
                <div className="cust-membership-row">
                  <select
                    className="tier-select"
                    value={newMembership}
                    onChange={(e) => setNewMembership(e.target.value)}
                    disabled={!canEdit || selectedCustomer.status === "ARCHIVED"}
                  >
                    <option value="NONE">Regular (No Discount)</option>
                    <option value="SILVER">Silver (10% Off)</option>
                    <option value="GOLD">Gold (20% Off)</option>
                    <option value="PLATINUM">Platinum (30% Off)</option>
                  </select>
                  <button
                    className="cust-btn-primary"
                    onClick={handleUpdateMembership}
                    disabled={!canEdit || actionLoading || selectedCustomer.status === "ARCHIVED"}
                  >
                    {actionLoading ? "..." : "Update"}
                  </button>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Admin Remarks & Notes</h4>
                <textarea 
                  className="cust-notes-textarea" 
                  placeholder="Enter private notes, preferred therapies, or client history here..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  disabled={!canEdit || selectedCustomer.status === "ARCHIVED"}
                />
                <button 
                  className="notes-save-btn" 
                  onClick={handleSaveNotes}
                  disabled={!canEdit || actionLoading || selectedCustomer.status === "ARCHIVED"}
                >
                  Save Notes
                </button>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="cust-drawer-footer">
              <button 
                className="cust-btn-danger" 
                onClick={handleArchive}
                disabled={!canArchive || selectedCustomer.status === "ARCHIVED"}
              >
                {selectedCustomer.status === "ARCHIVED" ? "Archived" : "Archive Profile"}
              </button>
              <button className="cust-btn-secondary" onClick={() => setSelectedCustomer(null)}>Close</button>
            </div>
            
          </div>
        </div>
      )}

      {/* --- Main View --- */}
      <header className="customers-header">
        <div className="customers-title">
          <h1>Customer CRM &amp; Profiles</h1>
          <p>Verify customer lifetime spends, booking counts, update tiers, and manage profiles.</p>
        </div>
      </header>

      {/* Top Metrics */}
      <section className="crm-metrics-grid">
        <div className="crm-metric-bubble">
          <span className="crm-metric-label">Total Active Customers</span>
          <span className="crm-metric-value active-count">{customers.filter(c => c.status === "ACTIVE").length || 0}</span>
        </div>
        <div className="crm-metric-bubble">
          <span className="crm-metric-label">Total Spend Generated</span>
          <span className="crm-metric-value currency">₹{customers.reduce((sum, c) => sum + (c.total_spent || 0), 0).toLocaleString("en-IN")}</span>
        </div>
        <div className="crm-metric-bubble">
          <span className="crm-metric-label">Premium Members (Gold/Plat)</span>
          <span className="crm-metric-value sessions">{customers.filter(c => c.membership_status === "GOLD" || c.membership_status === "PLATINUM").length || 0}</span>
        </div>
        <div className="crm-metric-bubble">
          <span className="crm-metric-label">Recent Activity (30 Days)</span>
          <span className="crm-metric-value date">Updated Real-Time</span>
        </div>
      </section>

      {/* Filters */}
      <section className="filters-card">
        <div className="bookings-filters">
          <div className="search-box">
            <img src={SearchIcon} className="search-icon" alt="Search" />
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
            <label>Tier Filter</label>
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
        {error && (
          <div className="cust-error-banner">
            <span>Failed to load customer list. Showing cached or dummy data.</span>
            <button className="retry-btn" style={{ margin: 0 }} onClick={loadCustomers}>Retry</button>
          </div>
        )}

        <div className="customers-table-scroll">
          <table className="customers-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort("customer_id")}>CUSTOMER ID {renderSortIcon("customer_id")}</th>
                <th className="sortable-th" onClick={() => handleSort("first_name")}>CUSTOMER {renderSortIcon("first_name")}</th>
                <th>CONTACT INFO</th>
                <th className="sortable-th" onClick={() => handleSort("membership_status")}>STATUS & TIER {renderSortIcon("membership_status")}</th>
                <th className="sortable-th" onClick={() => handleSort("total_bookings")}>SESSIONS {renderSortIcon("total_bookings")}</th>
                <th className="sortable-th" onClick={() => handleSort("total_spent")}>TOTAL SPEND {renderSortIcon("total_spent")}</th>
                <th className="sortable-th" onClick={() => handleSort("last_activity")}>LAST ACTIVITY {renderSortIcon("last_activity")}</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => renderSkeletonRow(i))
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="cust-empty-state">
                      <h3 className="cust-empty-title">No customers match your filters</h3>
                      <p className="cust-empty-sub">Try adjusting your search terms or filter selections.</p>
                      <button className="retry-btn" onClick={() => { setSearch(""); setMembershipFilter(""); setStatusFilter("ACTIVE_INACTIVE"); }}>Clear Filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c)}>
                    <td className="cust-cell-name">{c.customer_id}</td>
                    <td>
                      <div className="cust-cell-name">{c.first_name} {c.last_name}</div>
                      <div className="cust-cell-email">Joined: {c.join_date}</div>
                    </td>
                    <td>
                      <div style={{ color: "#2d3748" }}>{c.phone}</div>
                      <div className="cust-cell-email">{c.email || "No Email"}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                        <span className={`status-badge ${(c.status || "ACTIVE").toLowerCase()}`}>{c.status || "ACTIVE"}</span>
                        <span className={`tier-badge ${(c.membership_status || "NONE").toLowerCase()}`}>
                          {c.membership_status === "NONE" ? "Regular" : c.membership_status}
                        </span>
                      </div>
                    </td>
                    <td><strong className="metric-gold">{c.total_bookings || 0}</strong></td>
                    <td className="metric-teal">₹{(c.total_spent || 0).toLocaleString("en-IN")}</td>
                    <td className="cust-cell-email">{c.last_activity || "-"}</td>
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