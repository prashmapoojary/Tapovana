import React, { useState, useEffect, useMemo } from "react";
import "./Customers.css";
import "../Team/AddMemberDrawer.css";
import { apiFetch } from "../api/http";
import { getUser } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import FilterIcon from "../assets/filterIcon.svg";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIcon.png";

const DUMMY_CUSTOMERS = [
  { id: "1", customer_id: "CUST-001", first_name: "Rahul", last_name: "Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", status: "ACTIVE", membership_status: "GOLD", total_bookings: 12, total_spent: 24500, join_date: "2024-01-15", last_activity: "2026-06-01", admin_notes: "Prefers evening slots" },
  { id: "2", customer_id: "CUST-002", first_name: "Priya", last_name: "Desai", email: "priya.d@example.com", phone: "+91 87654 32109", status: "ACTIVE", membership_status: "NONE", total_bookings: 2, total_spent: 3500, join_date: "2024-05-20", last_activity: "2026-05-22", admin_notes: "" },
  { id: "3", customer_id: "CUST-003", first_name: "Vikram", last_name: "Singh", email: "vikram.s@example.com", phone: "+91 76543 21098", status: "INACTIVE", membership_status: "PLATINUM", total_bookings: 45, total_spent: 89000, join_date: "2023-05-10", last_activity: "2026-04-10", admin_notes: "VIP Client. Always books premium packages." },
  { id: "4", customer_id: "CUST-004", first_name: "Anita", last_name: "Nair", email: "anita.n@example.com", phone: "+91 65432 10987", status: "ACTIVE", membership_status: "SILVER", total_bookings: 8, total_spent: 12000, join_date: "2024-02-22", last_activity: "2026-06-05", admin_notes: "Allergic to sesame oil." },
  { id: "5", customer_id: "CUST-005", first_name: "Sanjay", last_name: "Kumar", email: "sanjay.k@example.com", phone: "+91 54321 09876", status: "ARCHIVED", membership_status: "NONE", total_bookings: 1, total_spent: 1500, join_date: "2023-01-01", last_activity: "2023-01-15", admin_notes: "Duplicate account. Archived on request." },
];

const MEMBERSHIP_TIERS = ["NONE", "SILVER", "GOLD", "PLATINUM"];

const getMockBookings = (customerId) => {
  const list = [
    { service: "Abhyanga Massage", staff: "Dr. Aravind Swamy", date: "2026-06-10 10:00 AM", status: "COMPLETED" },
    { service: "Shirodhara Therapy", staff: "Therapist Ramesh K.", date: "2026-06-14 02:30 PM", status: "COMPLETED" },
    { service: "Panchakarma Consultation", staff: "Dr. Deepika Mohan", date: "2026-06-25 09:00 AM", status: "UPCOMING" }
  ];
  if (customerId === "CUST-002") {
    return [
      { service: "Ayurvedic Consultation", staff: "Dr. Deepika Mohan", date: "2026-05-22 11:30 AM", status: "COMPLETED" },
      { service: "Yoga Nidra Session", staff: "Therapist Ramesh K.", date: "2026-06-20 04:00 PM", status: "UPCOMING" }
    ];
  }
  if (customerId === "CUST-003") {
    return [
      { service: "Kaya Kalpa Udvarthanam", staff: "Therapist Ramesh K.", date: "2026-04-10 03:00 PM", status: "COMPLETED" },
      { service: "Snehapana Treatment", staff: "Dr. Aravind Swamy", date: "2026-06-26 10:00 AM", status: "UPCOMING" },
      { service: "Shirodhara Session", staff: "Therapist Ramesh K.", date: "2026-06-28 01:00 PM", status: "UPCOMING" }
    ];
  }
  return list;
};

function Customers() {
  const userRole = useMemo(() => getUser()?.role || "SUPER_ADMIN", []);
  const { triggerAlert, triggerConfirm } = useAllocations();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const triggerGoldToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("join_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  // Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newMembership, setNewMembership] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // ─── Load Customers ───
  const loadCustomers = async () => {
    try {
      if (customers.length === 0) setLoading(true);
      setError(null);

      const res = await apiFetch("/api/customers?limit=100");
      if (res.success) {
        setCustomers(res.customers || []);
      } else {
        setCustomers(DUMMY_CUSTOMERS);
      }
    } catch {
      setCustomers(DUMMY_CUSTOMERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  // ─── Sync drawer form ───
  useEffect(() => {
    if (selectedCustomer) {
      setNewMembership(selectedCustomer.membership_status || "NONE");
      setAdminNotes(selectedCustomer.admin_notes || "");
    }
  }, [selectedCustomer]);

  // ─── Filter, Search & Sort Logic ───
  const filteredAndSorted = useMemo(() => {
    let result = [...customers];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        (c.first_name + " " + c.last_name).toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.customer_id || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE_INACTIVE") {
        result = result.filter(c => c.status === "ACTIVE" || c.status === "INACTIVE");
      } else {
        result = result.filter(c => c.status === statusFilter);
      }
    }

    // Membership filter
    if (membershipFilter) {
      result = result.filter(c => c.membership_status === membershipFilter);
    }

    // Date filter (by join_date)
    if (dateFrom) {
      result = result.filter(c => c.join_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(c => c.join_date <= dateTo);
    }

    // Sort
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
  }, [customers, search, statusFilter, membershipFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE) || 1;
  const paginatedList = filteredAndSorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const SortIcon = ({ col }) => {
    return null;
  };

  // ─── Permissions ───
  const canEdit = userRole === "SUPER_ADMIN" || userRole === "CO_ADMIN";
  const canArchive = userRole === "SUPER_ADMIN";

  // ─── Update Membership ───
  const handleUpdateMembership = () => {
    if (!canEdit) { triggerAlert("You do not have permission to change memberships."); return; }
    if (selectedCustomer.status === "ARCHIVED") { triggerAlert("Cannot modify an archived customer."); return; }
    if (newMembership === selectedCustomer.membership_status) { triggerAlert("Customer already has this tier."); return; }

    const oldIdx = MEMBERSHIP_TIERS.indexOf(selectedCustomer.membership_status || "NONE");
    const newIdx = MEMBERSHIP_TIERS.indexOf(newMembership);
    const isDowngrade = newIdx < oldIdx;

    const msg = isDowngrade
      ? "You are downgrading this customer to " + newMembership + ". Are you sure?"
      : "Change membership to " + newMembership + "?";

    triggerConfirm(msg, () => {
      setActionLoading(true);
      setTimeout(() => {
        setCustomers(prev => prev.map(c =>
          c.id === selectedCustomer.id ? { ...c, membership_status: newMembership } : c
        ));
        setSelectedCustomer(prev => ({ ...prev, membership_status: newMembership }));
        triggerAlert("Membership updated to: " + newMembership);
        setActionLoading(false);
      }, 500);
    });
  };

  // ─── Save Notes ───
  const handleSaveNotes = () => {
    if (!canEdit) return;
    setActionLoading(true);
    setTimeout(() => {
      setCustomers(prev => prev.map(c =>
        c.id === selectedCustomer.id ? { ...c, admin_notes: adminNotes } : c
      ));
      setSelectedCustomer(prev => ({ ...prev, admin_notes: adminNotes }));
      triggerAlert("Admin notes saved.");
      setActionLoading(false);
    }, 400);
  };

  // ─── Archive ───
  const handleArchive = () => {
    if (!canArchive) { triggerAlert("Only Super Admins can archive customers."); return; }
    triggerConfirm("Archive this customer? Their history will be preserved.", () => {
      setActionLoading(true);
      setTimeout(() => {
        setCustomers(prev => prev.map(c =>
          c.id === selectedCustomer.id ? { ...c, status: "ARCHIVED" } : c
        ));
        setSelectedCustomer(prev => ({ ...prev, status: "ARCHIVED" }));
        triggerAlert("Customer archived.");
        setActionLoading(false);
      }, 500);
    });
  };

  // ─── Skeleton ───
  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, i) => (
      <tr key={i} className="skeleton-row">
        <td><div className="skeleton-box" style={{ width: 60 }} /></td>
        <td><div className="skeleton-box" style={{ width: 120 }} /></td>
        <td><div className="skeleton-box" style={{ width: 160 }} /></td>
        <td><div className="skeleton-box" style={{ width: 100 }} /></td>
        <td><div className="skeleton-box" style={{ width: 80 }} /></td>
        <td><div className="skeleton-box" style={{ width: 70 }} /></td>
        <td><div className="skeleton-box" style={{ width: 60 }} /></td>
        <td><div className="skeleton-box" style={{ width: 40 }} /></td>
        <td><div className="skeleton-box" style={{ width: 80 }} /></td>
        <td><div className="skeleton-box" style={{ width: 80 }} /></td>
        <td><div className="skeleton-box" style={{ width: 24, borderRadius: "50%" }} /></td>
      </tr>
    ))
  );

  return (
    <div className="customers-container">
      {/* ── Drawer ── */}
      {/* ── Gold-bordered Toast Notification ── */}
      {toastMsg && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 2000,
          background: "white", color: "#2d3748", border: "2px solid #cda751",
          borderRadius: "8px", padding: "14px 24px", fontWeight: "700",
          boxShadow: "0 4px 20px rgba(205,167,81,0.2)", display: "flex",
          alignItems: "center", gap: "8px", animation: "slideIn 0.3s ease-out"
        }}>
          <span>🌿</span> {toastMsg}
        </div>
      )}

      {/* ── Drawer ── */}
      {selectedCustomer && (() => {
        const mockBookings = getMockBookings(selectedCustomer.customer_id);
        const renewalDate = selectedCustomer.join_date 
          ? new Date(new Date(selectedCustomer.join_date).setFullYear(new Date(selectedCustomer.join_date).getFullYear() + 1)).toISOString().split('T')[0]
          : "2027-06-15";
        
        const discounts = {
          PLATINUM: "20% off all Therapist sessions, 15% off Doctor consults",
          GOLD: "15% off all Therapist sessions, 10% off Doctor consults",
          SILVER: "10% off all Therapist sessions, 5% off Doctor consults",
          NONE: "No active membership discounts"
        }[selectedCustomer.membership_status || "NONE"];


        const statusClass = (selectedCustomer.status || "ACTIVE").toLowerCase();
        
        return (
          <>
            <div className="drawer-overlay open" onClick={() => setSelectedCustomer(null)} style={{ zIndex: 9999 }} />
            <div className="drawer-panel open" onClick={(e) => e.stopPropagation()} style={{ zIndex: 10000, width: "450px", maxWidth: "100%", overflowY: "auto" }}>
              <div className="drawer-header">
                <div>
                  <div className="drawer-title" style={{ fontSize: "16px", fontWeight: "700", color: "#0F172A" }}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </div>
                  <div style={{ color: "#7b8a9a", fontSize: 13, marginTop: 4 }}>
                    {selectedCustomer.customer_id} · {selectedCustomer.phone}
                  </div>
                </div>
                <button className="drawer-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
              </div>

              <div className="drawer-body">
                {selectedCustomer.status === "ARCHIVED" && (
                  <div className="cust-archived-banner" style={{ border: "1px solid #E8E2D9", background: "rgba(205,167,81,0.05)" }}>
                    <strong>This customer is ARCHIVED.</strong><br />
                    Archived profiles are read-only.
                  </div>
                )}

                {/* 1. Profile Section */}
                <div className="cust-drawer-section">
                  <h4 className="cust-section-title" style={{ color: "#0F172A", borderBottom: "1px solid #E8E2D9", paddingBottom: "6px", fontWeight: "700" }}>Profile Details</h4>
                  <div className="cust-profile-card" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <img src={DefaultAvatar} className="cust-avatar" alt="Avatar" style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid #E8E2D9" }} />
                    <div>
                      <div className="cust-name" style={{ fontSize: "16px", fontWeight: "700", color: "#2d3748" }}>{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                      <div className="cust-sub" style={{ color: "#718096", fontSize: "13px" }}>{selectedCustomer.email || "No Email"}</div>
                      <div className="cust-sub" style={{ color: "#718096", fontSize: "13px" }}>{selectedCustomer.phone}</div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <span className={`status-badge-gold ${statusClass}`}>
                          {selectedCustomer.status || "ACTIVE"}
                        </span>
                        <span className={`tier-badge-gold ${(selectedCustomer.membership_status || "NONE").toLowerCase()}`}>
                          {selectedCustomer.membership_status === "NONE" ? "Regular" : selectedCustomer.membership_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Service & Booking History Section */}
                <div className="cust-drawer-section">
                  <h4 className="cust-section-title" style={{ color: "#0F172A", borderBottom: "1px solid #E8E2D9", paddingBottom: "6px", fontWeight: "700" }}>Service & Booking History</h4>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                      <thead>
                        <tr style={{ background: "rgba(205,167,81,0.05)", borderBottom: "1px solid #E8E2D9" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Service Type</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Staff Assigned</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Date/Time</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockBookings.map((b, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #edf2f7" }}>
                            <td style={{ padding: "8px 12px", fontWeight: "600", color: "#2d3748" }}>{b.service}</td>
                            <td style={{ padding: "8px 12px", color: "#4a5568" }}>{b.staff}</td>
                            <td style={{ padding: "8px 12px", color: "#718096" }}>{b.date}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span className={`status-tag-gold ${b.status.toLowerCase()}`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Membership & Benefits Section */}
                <div className="cust-drawer-section">
                  <h4 className="cust-section-title" style={{ color: "#0F172A", borderBottom: "1px solid #E8E2D9", paddingBottom: "6px", fontWeight: "700" }}>Membership & Benefits</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", color: "#4a5568" }}>
                    <div>
                      <strong>Plan Type:</strong> {selectedCustomer.membership_status === "NONE" ? "Regular Guest" : `${selectedCustomer.membership_status} Plan`}
                    </div>
                    <div>
                      <strong>Renewal Date:</strong> {renewalDate}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <strong>Active Discounts:</strong> <span style={{ fontStyle: "italic", color: "#4a5568" }}>{discounts}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="drawer-footer">
                <button className="cust-btn-danger" onClick={handleArchive}
                  disabled={!canArchive || selectedCustomer.status === "ARCHIVED"}
                  style={{ flex: 1, height: "38px" }}>
                  {selectedCustomer.status === "ARCHIVED" ? "Archived" : "Archive Profile"}
                </button>
                <button className="btn-cancel" onClick={() => setSelectedCustomer(null)} style={{ flex: 1, height: "38px" }}>Close</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Header ── */}
      <header className="customers-header">
        <div className="customers-title">
          <h1>Customer CRM & Profiles</h1>
          <p>Manage customer tiers, track spending, and update profiles.</p>
        </div>
      </header>
      {/* ── Filters ── */}
      <div className="cust-team-card">
        <div className="cust-team-filters">
          <div className="search-box">
            <img src={SearchIcon} className="search-icon" alt="" />
            <input type="text" placeholder="Search by ID, name, phone or email..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          <div className="cust-filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#2f2f2f", padding: "10px 16px", width: "100%", cursor: "pointer", appearance: "none" }}>
              <option value="">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <img src={DropdownIcon} className="cust-dropdown-icon" alt="" style={{ marginRight: 12 }} />
          </div>

          <div className="cust-filter-dropdown" style={{ padding: 0, overflow: "hidden" }}>
            <select value={membershipFilter} onChange={(e) => { setMembershipFilter(e.target.value); setPage(1); }}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#2f2f2f", padding: "10px 16px", width: "100%", cursor: "pointer", appearance: "none" }}>
              <option value="">Tier: All</option>
              <option value="NONE">Regular</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
            <img src={DropdownIcon} className="cust-dropdown-icon" alt="" style={{ marginRight: 12 }} />
          </div>

          <div className="cust-date-wrap">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="cust-date-wrap">
            <label>To</label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="cust-table-card">
        {error && (
          <div className="cust-error-banner">
            <span>Failed to load customers. Showing cached data.</span>
            <button className="retry-btn" onClick={loadCustomers}>Retry</button>
          </div>
        )}

        <div className="cust-table-scroll">
          <table className="customers-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort("customer_id")}>ID <SortIcon col="customer_id" /></th>
                <th className="sortable-th" onClick={() => handleSort("first_name")}>NAME <SortIcon col="first_name" /></th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th className="sortable-th" onClick={() => handleSort("join_date")}>JOINED <SortIcon col="join_date" /></th>
                <th className="sortable-th" onClick={() => handleSort("status")}>STATUS <SortIcon col="status" /></th>
                <th className="sortable-th" onClick={() => handleSort("membership_status")}>TIER <SortIcon col="membership_status" /></th>
                <th className="sortable-th" onClick={() => handleSort("total_bookings")}>SESSIONS <SortIcon col="total_bookings" /></th>
                <th className="sortable-th" onClick={() => handleSort("total_spent")}>SPEND <SortIcon col="total_spent" /></th>
                <th className="sortable-th" onClick={() => handleSort("last_activity")}>ACTIVITY <SortIcon col="last_activity" /></th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && customers.length === 0 ? renderSkeleton() : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="11">
                    <div className="cust-empty-state">
                      <h3 className="cust-empty-title">No customers match your filters</h3>
                      <p className="cust-empty-sub">Try adjusting your search or filter selections.</p>
                      <button className="retry-btn" onClick={() => { setSearch(""); setMembershipFilter(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }}>Clear Filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((c) => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c)}>
                    <td className="cust-cell-name">{c.customer_id}</td>
                    <td className="cust-cell-name">{c.first_name} {c.last_name}</td>
                    <td className="cust-cell-email">{c.email || "-"}</td>
                    <td style={{ color: "#2d3748" }}>{c.phone}</td>
                    <td className="cust-cell-email">{c.join_date}</td>
                    <td><span className={"status-badge " + (c.status || "ACTIVE").toLowerCase()}>{c.status || "ACTIVE"}</span></td>
                    <td><span className={"tier-badge " + (c.membership_status || "NONE").toLowerCase()}>{c.membership_status === "NONE" ? "Regular" : c.membership_status}</span></td>
                    <td><strong className="metric-gold">{c.total_bookings || 0}</strong></td>
                    <td className="metric-teal">₹{(c.total_spent || 0).toLocaleString("en-IN")}</td>
                    <td className="cust-cell-email">{c.last_activity || "-"}</td>
                    <td onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }} style={{ textAlign: "center" }}>
                      <img src={ActionIcon} alt="Actions" className="action-icon" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="cust-table-pagination">
          <div className="pagination-text">
            Showing {paginatedList.length > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}
            {" – "}{Math.min(page * ITEMS_PER_PAGE, filteredAndSorted.length)}
            {" of "}{filteredAndSorted.length} customers
          </div>
          <div className="pagination-controls">
            <button className="page-btn-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt;</button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
              let startPage = Math.max(1, page - 1);
              let endPage = Math.min(totalPages, startPage + 2);
              startPage = Math.max(1, endPage - 2);
              return startPage + i;
            }).map((p) => (
              <button key={p} className={`page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Customers;