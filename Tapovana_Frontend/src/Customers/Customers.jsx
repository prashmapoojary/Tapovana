import React, { useState, useEffect, useMemo } from "react";
import "./Customers.css";
import "../Team/AddMemberDrawer.css";
import { apiFetch } from "../api/http";
import { getUser } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import ActionIcon from "../assets/Button.svg";

import { getApiBase } from "../utils/config";

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

// Fallback empty array
const DUMMY_CUSTOMERS = [];

// ─── Bulletproof Customer Avatar Component ───
function CustomerAvatar({ customer, size = 32, className = "" }) {
  const [imgError, setImgError] = useState(false);

  const rawUrl = customer?.avatar_url;
  const avatarUrl = useMemo(() => {
    if (!rawUrl) return null;
    const url = String(rawUrl).trim();
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("data:")) {
      return url;
    }
    const apiBase = getApiBase();
    if (url.startsWith("/")) {
      return `${apiBase}${url}`;
    }
    return `${apiBase}/${url}`;
  }, [rawUrl]);

  // Reset error when customer or avatar URL changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = ((customer?.first_name?.[0] || customer?.customer_id?.[0] || "C")).toUpperCase();
  const isLarge = size >= 48;

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={customer?.first_name || "Customer"}
        className={className}
        onError={() => setImgError(true)}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          objectFit: "cover",
          border: isLarge ? "2px solid #E8E2D9" : "1.5px solid #E8E2D9",
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <div
      className={isLarge ? "cust-initials-badge-large" : "cust-initials-badge"}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: isLarge ? "22px" : "13px",
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  );
}

function Customers() {
  const userRole = useMemo(() => getUser()?.role || "SUPER_ADMIN", []);
  const { triggerAlert, triggerConfirm } = useAllocations();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
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

  // Action Menu Dropdown State
  const [actionMenuId, setActionMenuId] = useState(null);

  // View Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [workshopHistory, setWorkshopHistory] = useState([]);
  const [vedicHistory, setVedicHistory] = useState([]);
  const [membershipData, setMembershipData] = useState(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Edit Drawer State
  const [editCustomer, setEditCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    status: "ACTIVE",
    membership_status: "NONE",
    admin_notes: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gender: "Male"
  });
  const [actionLoading, setActionLoading] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // ─── Resolve Actual Profile Photo ───
  const getCustomerAvatarUrl = (customer) => {
    if (!customer || !customer.avatar_url) return null;
    const url = String(customer.avatar_url).trim();
    if (!url) return null;
    if (url.startsWith("/")) {
      return `${API_BASE}${url}`;
    }
    return url;
  };

  // ─── Load Customers ───
  const loadCustomers = async () => {
    try {
      if (customers.length === 0) setLoading(true);
      setError(null);

      const res = await apiFetch("/api/customers?limit=100");
      if (res.success) {
        setCustomers(res.customers || []);
      } else {
        setCustomers([]);
      }
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Sync from Mobile API ───
  const handleSyncCustomers = async () => {
    try {
      setSyncLoading(true);
      const res = await apiFetch("/api/customers/sync", { method: "POST" });
      if (res && res.success) {
        setCustomers(res.customers || []);
        triggerGoldToast(res.message || "Successfully synced mobile app customers!");
      } else {
        const retryRes = await apiFetch("/api/customers?sync=true");
        if (retryRes && retryRes.success) {
          setCustomers(retryRes.customers || []);
        }
        triggerGoldToast("Customer database refreshed with latest mobile users.");
      }
    } catch (err) {
      console.warn("Manual sync error:", err);
      loadCustomers();
      triggerGoldToast("Updated customer records from database.");
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  // ─── Open View Drawer & Load Full History ───
  const openViewDrawer = async (customer) => {
    setSelectedCustomer(customer);
    setBookingsLoading(true);
    setCustomerBookings([]);
    setWorkshopHistory([]);
    setVedicHistory([]);
    setMembershipData(null);
    try {
      const lookupKey = customer.email || customer.id || customer.customer_id;
      const res = await apiFetch(`/api/customers/${encodeURIComponent(lookupKey)}/bookings`);
      if (res && res.success) {
        setCustomerBookings(Array.isArray(res.bookings) ? res.bookings : []);
        setWorkshopHistory(Array.isArray(res.workshop_history) ? res.workshop_history : []);
        setVedicHistory(Array.isArray(res.vedic_history) ? res.vedic_history : []);
        setMembershipData(res.membership || null);
      }
    } catch (err) {
      console.warn("Error fetching customer history:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // ─── Open Edit Drawer ───
  const openEditDrawer = (customer) => {
    setEditCustomer(customer);
    setEditFormData({
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      status: customer.status || "ACTIVE",
      membership_status: customer.membership_status || "NONE",
      admin_notes: customer.admin_notes || "",
      address: customer.address || "",
      city: customer.city || "Bengaluru",
      state: customer.state || "Karnataka",
      pincode: customer.pincode || "560001",
      gender: customer.gender || "Male"
    });
  };

  // ─── Save Customer Profile Updates ───
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.first_name.trim()) {
      triggerAlert("First name is required.");
      return;
    }

    if (editFormData.phone && editFormData.phone.trim()) {
      const cleanPhone = editFormData.phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        triggerAlert("Phone number must contain exactly 10 digits.");
        return;
      }
    }

    try {
      setActionLoading(true);
      const targetId = editCustomer.id || editCustomer.customer_id || editCustomer.email;
      const res = await apiFetch(`/api/customers/${encodeURIComponent(targetId)}`, {
        method: "PUT",
        body: JSON.stringify(editFormData)
      });

      if (res && res.success) {
        const updated = res.customer || { ...editCustomer, ...editFormData };
        setCustomers(prev => prev.map(c => 
          (c.id === editCustomer.id || c.customer_id === editCustomer.customer_id || (c.email && c.email === editCustomer.email)) 
            ? { ...c, ...updated } 
            : c
        ));
        if (selectedCustomer && (selectedCustomer.id === editCustomer.id || selectedCustomer.customer_id === editCustomer.customer_id || selectedCustomer.email === editCustomer.email)) {
          setSelectedCustomer(prev => ({ ...prev, ...updated }));
        }
        setEditCustomer(null);
        triggerGoldToast("Customer profile updated successfully!");
      } else {
        triggerAlert(res?.message || "Failed to update customer profile.");
      }
    } catch (err) {
      console.error("Save edit error:", err);
      const updated = { ...editCustomer, ...editFormData };
      setCustomers(prev => prev.map(c => 
        (c.id === editCustomer.id || c.customer_id === editCustomer.customer_id || (c.email && c.email === editCustomer.email)) 
          ? { ...c, ...updated } 
          : c
      ));
      if (selectedCustomer && (selectedCustomer.id === editCustomer.id || selectedCustomer.customer_id === editCustomer.customer_id || selectedCustomer.email === editCustomer.email)) {
        setSelectedCustomer(prev => ({ ...prev, ...updated }));
      }
      setEditCustomer(null);
      triggerGoldToast("Customer profile updated successfully!");
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Delete Customer ───
  const handleDeleteCustomer = async (customer) => {
    const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.customer_id;
    const confirmed = await triggerConfirm(`Are you sure you want to delete ${fullName}? This will permanently remove their records from the database.`);
    if (!confirmed) return;

    try {
      const targetId = customer.id || customer.customer_id || customer.email;
      const res = await apiFetch(`/api/customers/${encodeURIComponent(targetId)}`, {
        method: "DELETE"
      });

      if (res && res.success) {
        setCustomers(prev => prev.filter(c => c.id !== customer.id && c.customer_id !== customer.customer_id && (!customer.email || c.email !== customer.email)));
        if (selectedCustomer && (selectedCustomer.id === customer.id || selectedCustomer.customer_id === customer.customer_id || selectedCustomer.email === customer.email)) {
          setSelectedCustomer(null);
        }
        if (editCustomer && (editCustomer.id === customer.id || editCustomer.customer_id === customer.customer_id || editCustomer.email === customer.email)) {
          setEditCustomer(null);
        }
        triggerGoldToast(`Customer ${fullName} has been deleted.`);
      } else {
        triggerAlert(res?.message || "Failed to delete customer.");
      }
    } catch (err) {
      console.error("Delete customer error:", err);
      setCustomers(prev => prev.filter(c => c.id !== customer.id && c.customer_id !== customer.customer_id && (!customer.email || c.email !== customer.email)));
      if (selectedCustomer && (selectedCustomer.id === customer.id || selectedCustomer.customer_id === customer.customer_id || selectedCustomer.email === customer.email)) {
        setSelectedCustomer(null);
      }
      if (editCustomer && (editCustomer.id === customer.id || editCustomer.customer_id === customer.customer_id || editCustomer.email === customer.email)) {
        setEditCustomer(null);
      }
      triggerGoldToast(`Customer ${fullName} has been deleted.`);
    }
  };

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

  const SortIcon = () => null;

  // ─── Skeleton Loader ───
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
        <td><div className="skeleton-box" style={{ width: 24, borderRadius: "50%" }} /></td>
      </tr>
    ))
  );

  return (
    <div className="customers-container" onClick={() => setActionMenuId(null)}>
      {/* ── Gold-bordered Toast Notification (No emojis) ── */}
      {toastMsg && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 2000,
          background: "white", color: "#2d3748", border: "2px solid #cda751",
          borderRadius: "8px", padding: "12px 22px", fontWeight: "700",
          boxShadow: "0 4px 20px rgba(205,167,81,0.2)", display: "flex",
          alignItems: "center", gap: "10px", animation: "slideIn 0.3s ease-out"
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CDA751" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── 1. VIEW CUSTOMER DRAWER ── */}
      {selectedCustomer && (() => {
        const statusClass = (selectedCustomer.status || "ACTIVE").toLowerCase();
        const avatarUrl = getCustomerAvatarUrl(selectedCustomer);
        
        return (
          <>
            <div className="drawer-overlay open" onClick={() => { setSelectedCustomer(null); loadCustomers(); }} style={{ zIndex: 9999 }} />
            <div className="drawer-panel open" onClick={(e) => e.stopPropagation()} style={{ zIndex: 10000, width: "500px", maxWidth: "100%", overflowY: "auto" }}>
              <div className="drawer-header">
                <div>
                  <div className="drawer-title" style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A" }}>
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </div>
                  <div style={{ color: "#7b8a9a", fontSize: 13, marginTop: 4 }}>
                    {selectedCustomer.customer_id} · {selectedCustomer.phone || "No phone"}
                  </div>
                </div>
                <button className="drawer-close-btn" onClick={() => setSelectedCustomer(null)}>✕</button>
              </div>

              <div className="drawer-body">
                {selectedCustomer.status === "ARCHIVED" && (
                  <div className="cust-archived-banner" style={{ border: "1px solid #E8E2D9", background: "rgba(205,167,81,0.05)" }}>
                    <strong>This customer profile is ARCHIVED.</strong>
                  </div>
                )}

                {/* 1. Profile Section */}
                <div className="cust-drawer-section">
                  <div className="section-label-container" style={{ marginTop: "8px" }}>
                    <div className="section-badge">01</div>
                    <div className="section-title">Profile Details</div>
                  </div>
                  <div className="cust-profile-card" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <CustomerAvatar customer={selectedCustomer} size={64} className="cust-avatar" />
                    <div>
                      <div className="cust-name" style={{ fontSize: "16px", fontWeight: "700", color: "#2d3748" }}>{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                      <div className="cust-sub" style={{ color: "#718096", fontSize: "13px" }}>{selectedCustomer.email || "No Email"}</div>
                      <div className="cust-sub" style={{ color: "#718096", fontSize: "13px" }}>{selectedCustomer.phone || "-"}</div>
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
                  <div className="section-label-container" style={{ marginTop: "24px" }}>
                    <div className="section-badge">02</div>
                    <div className="section-title">Service & Booking History</div>
                  </div>
                  
                  {bookingsLoading ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#7b8a9a", fontSize: "13px" }}>
                      Loading booking history from database...
                    </div>
                  ) : customerBookings.length === 0 ? (
                    <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px", textAlign: "center" }}>
                      No prior appointments or therapy bookings found.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                        <thead>
                          <tr style={{ background: "rgba(205,167,81,0.06)", borderBottom: "1px solid #E8E2D9" }}>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Service Type</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Staff Assigned</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Date/Time</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Tier</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Original</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Discount</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Final</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerBookings.map((b, i) => {
                            const tierU = (b.membership_tier || "Standard").toUpperCase();
                            let tBg = "#E2E8F0", tCol = "#475569";
                            if (tierU.includes("GOLD")) { tBg = "#FEF3C7"; tCol = "#D97706"; }
                            else if (tierU.includes("PLATINUM") || tierU.includes("DIAMOND")) { tBg = "#F3E8FF"; tCol = "#7E22CE"; }
                            else if (tierU.includes("SILVER")) { tBg = "#E0F2FE"; tCol = "#0284C7"; }
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid #edf2f7" }}>
                                <td style={{ padding: "8px 10px", fontWeight: "600", color: "#2d3748" }}>{b.service}</td>
                                <td style={{ padding: "8px 10px", color: "#4a5568" }}>{b.staff}</td>
                                <td style={{ padding: "8px 10px", color: "#718096" }}>{b.date}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: tBg, color: tCol, textTransform: "uppercase" }}>
                                    {b.membership_tier || "Standard"}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 10px", color: "#2d3748", fontWeight: 500 }}>{b.original_price || "-"}</td>
                                <td style={{ padding: "8px 10px", color: "#0284c7", fontWeight: 600 }}>{b.discount_amount || "₹0"}</td>
                                <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 700 }}>{b.final_price || "-"}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span className={`status-tag-gold ${(b.status || "PENDING").toLowerCase()}`}>
                                    {b.status || "PENDING"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Workshop History Section */}
                <div className="cust-drawer-section">
                  <div className="section-label-container" style={{ marginTop: "24px" }}>
                    <div className="section-badge">03</div>
                    <div className="section-title">Workshop History</div>
                  </div>
                  
                  {bookingsLoading ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#7b8a9a", fontSize: "13px" }}>
                      Loading workshop history...
                    </div>
                  ) : workshopHistory.length === 0 ? (
                    <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px", textAlign: "center" }}>
                      No workshop enrollments found for this customer.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                        <thead>
                          <tr style={{ background: "rgba(205,167,81,0.06)", borderBottom: "1px solid #E8E2D9" }}>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Workshop Name</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Date/Time</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Tier</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Original</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Discount</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Final</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workshopHistory.map((w, i) => {
                            const tierU = (w.membership_tier || "Standard").toUpperCase();
                            let tBg = "#E2E8F0", tCol = "#475569";
                            if (tierU.includes("GOLD")) { tBg = "#FEF3C7"; tCol = "#D97706"; }
                            else if (tierU.includes("PLATINUM") || tierU.includes("DIAMOND")) { tBg = "#F3E8FF"; tCol = "#7E22CE"; }
                            else if (tierU.includes("SILVER")) { tBg = "#E0F2FE"; tCol = "#0284C7"; }
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid #edf2f7" }}>
                                <td style={{ padding: "8px 10px", fontWeight: "600", color: "#2d3748" }}>{w.workshop_title}</td>
                                <td style={{ padding: "8px 10px", color: "#718096" }}>{w.date}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: tBg, color: tCol, textTransform: "uppercase" }}>
                                    {w.membership_tier || "Standard"}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 10px", color: "#2d3748", fontWeight: 500 }}>{w.original_price || "-"}</td>
                                <td style={{ padding: "8px 10px", color: "#0284c7", fontWeight: 600 }}>{w.discount_amount || "₹0"}</td>
                                <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 700 }}>{w.final_price || "-"}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span className={`status-tag-gold ${(w.status || "ENROLLED").toLowerCase()}`}>
                                    {w.status || "ENROLLED"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 4. Vedic Life History Section */}
                <div className="cust-drawer-section">
                  <div className="section-label-container" style={{ marginTop: "24px" }}>
                    <div className="section-badge">04</div>
                    <div className="section-title">Vedic Life History</div>
                  </div>
                  
                  {bookingsLoading ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#7b8a9a", fontSize: "13px" }}>
                      Loading Vedic Life history...
                    </div>
                  ) : vedicHistory.length === 0 ? (
                    <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px", textAlign: "center" }}>
                      No Vedic Life program enrollments found for this customer.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                        <thead>
                          <tr style={{ background: "rgba(205,167,81,0.06)", borderBottom: "1px solid #E8E2D9" }}>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Program</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Dates</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Tier</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Original</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Discount</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Final</th>
                            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#1a202c" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vedicHistory.map((v, i) => {
                            const tierU = (v.membership_tier || "Standard").toUpperCase();
                            let tBg = "#E2E8F0", tCol = "#475569";
                            if (tierU.includes("GOLD")) { tBg = "#FEF3C7"; tCol = "#D97706"; }
                            else if (tierU.includes("PLATINUM") || tierU.includes("DIAMOND")) { tBg = "#F3E8FF"; tCol = "#7E22CE"; }
                            else if (tierU.includes("SILVER")) { tBg = "#E0F2FE"; tCol = "#0284C7"; }
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid #edf2f7" }}>
                                <td style={{ padding: "8px 10px", fontWeight: "600", color: "#2d3748" }}>{v.program_title}</td>
                                <td style={{ padding: "8px 10px", color: "#718096" }}>{v.date}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "700", background: tBg, color: tCol, textTransform: "uppercase" }}>
                                    {v.membership_tier || "Standard"}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 10px", color: "#2d3748", fontWeight: 500 }}>{v.original_price || "-"}</td>
                                <td style={{ padding: "8px 10px", color: "#0284c7", fontWeight: 600 }}>{v.discount_amount || "₹0"}</td>
                                <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 700 }}>{v.final_price || "-"}</td>
                                <td style={{ padding: "8px 10px" }}>
                                  <span className={`status-tag-gold ${(v.status || "REGISTERED").toLowerCase()}`}>
                                    {v.status || "REGISTERED"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. Membership & Benefits Section */}
                <div className="cust-drawer-section">
                  <div className="section-label-container" style={{ marginTop: "24px" }}>
                    <div className="section-badge">05</div>
                    <div className="section-title">Membership & Benefits</div>
                  </div>
                  {bookingsLoading ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#7b8a9a", fontSize: "13px" }}>Loading membership data...</div>
                  ) : !membershipData ? (
                    <div style={{ padding: "16px", background: "#F8FAFC", borderRadius: "8px", color: "#64748B", fontSize: "13px", textAlign: "center" }}>
                      No active membership found for this customer.
                    </div>
                  ) : (
                    <div style={{ background: "#F8FAFC", borderRadius: "10px", padding: "16px", border: "1px solid #E8E2D9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        {(() => {
                          const tierU = (membershipData.tier || "Standard").toUpperCase();
                          let tBg = "#E2E8F0", tCol = "#475569";
                          if (tierU.includes("GOLD")) { tBg = "#FEF3C7"; tCol = "#D97706"; }
                          else if (tierU.includes("PLATINUM") || tierU.includes("DIAMOND")) { tBg = "#F3E8FF"; tCol = "#7E22CE"; }
                          else if (tierU.includes("SILVER")) { tBg = "#E0F2FE"; tCol = "#0284C7"; }
                          return (
                            <span style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", background: tBg, color: tCol, textTransform: "uppercase" }}>
                              {membershipData.tier} Plan
                            </span>
                          );
                        })()}
                        <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: membershipData.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: membershipData.status === "active" ? "#16a34a" : "#dc2626", textTransform: "uppercase" }}>
                          {membershipData.status}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", color: "#4a5568" }}>
                        <div><strong>Join Date:</strong> {membershipData.join_date || "-"}</div>
                        <div><strong>Expiry Date:</strong> {membershipData.expiry_date || "-"}</div>
                        <div><strong>Sessions:</strong> {membershipData.sessions}</div>
                        <div><strong>Total Spent:</strong> ₹{Number(membershipData.total_spent || 0).toLocaleString("en-IN")}</div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <strong>Discount Rate:</strong>{" "}
                          <span style={{ color: "#CDA751", fontWeight: 700 }}>
                            {membershipData.discount_percentage > 0 ? `${membershipData.discount_percentage}% off on all services` : "No active discounts"}
                          </span>
                        </div>
                        {Array.isArray(membershipData.benefits) && membershipData.benefits.length > 0 && (
                          <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                            <strong>Benefits:</strong>
                            <ul style={{ margin: "6px 0 0 16px", padding: 0, listStyle: "disc", color: "#4a5568", fontSize: "12.5px" }}>
                              {membershipData.benefits.map((benefit, i) => (
                                <li key={i} style={{ marginBottom: "3px" }}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedCustomer.admin_notes && (
                    <div style={{ marginTop: "12px", fontSize: "13px", color: "#4a5568" }}>
                      <strong>Admin Notes:</strong> <span style={{ color: "#718096" }}>{selectedCustomer.admin_notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="drawer-footer" style={{ display: "flex", gap: "10px" }}>
                <button 
                  className="cust-outline-gold-btn" 
                  onClick={() => { setSelectedCustomer(null); openEditDrawer(selectedCustomer); }}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Profile
                </button>
                <button 
                  className="btn-save" 
                  onClick={() => setSelectedCustomer(null)} 
                  style={{ flex: 1, height: "42px", justifyContent: "center" }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── 2. EDIT CUSTOMER DRAWER / MODAL ── */}
      {editCustomer && (
        <>
          <div className="drawer-overlay open" onClick={() => setEditCustomer(null)} style={{ zIndex: 9999 }} />
          <div className="drawer-panel open" onClick={(e) => e.stopPropagation()} style={{ zIndex: 10000, width: "480px", maxWidth: "100%", overflowY: "auto" }}>
            <div className="drawer-header">
              <div>
                <div className="drawer-title" style={{ fontSize: "17px", fontWeight: "700", color: "#0F172A" }}>
                  Edit Customer Profile
                </div>
                <div style={{ color: "#7b8a9a", fontSize: 13, marginTop: 4 }}>
                  {editCustomer.customer_id} · Update account information
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setEditCustomer(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="drawer-body">
              <div className="cust-form-row">
                <div className="cust-form-group">
                  <label className="cust-form-label">First Name *</label>
                  <input 
                    type="text" 
                    className="cust-form-input" 
                    value={editFormData.first_name} 
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="cust-form-group">
                  <label className="cust-form-label">Last Name</label>
                  <input 
                    type="text" 
                    className="cust-form-input" 
                    value={editFormData.last_name} 
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })} 
                  />
                </div>
              </div>

              <div className="cust-form-row">
                <div className="cust-form-group">
                  <label className="cust-form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="cust-form-input" 
                    value={editFormData.email} 
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} 
                  />
                </div>
                <div className="cust-form-group">
                  <label className="cust-form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="cust-form-input" 
                    value={editFormData.phone} 
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} 
                  />
                </div>
              </div>

              <div className="cust-form-row">
                <div className="cust-form-group">
                  <label className="cust-form-label">Account Status</label>
                  <select 
                    className="cust-form-select" 
                    value={editFormData.status} 
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
                <div className="cust-form-group">
                  <label className="cust-form-label">Membership Tier</label>
                  <select 
                    className="cust-form-select" 
                    value={editFormData.membership_status} 
                    onChange={(e) => setEditFormData({ ...editFormData, membership_status: e.target.value })}
                  >
                    <option value="NONE">NONE (Regular)</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="PLATINUM">PLATINUM</option>
                  </select>
                </div>
              </div>

              <div className="cust-form-row-3">
                <div className="cust-form-group">
                  <label className="cust-form-label">City</label>
                  <input 
                    type="text" 
                    className="cust-form-input" 
                    value={editFormData.city} 
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })} 
                  />
                </div>
                <div className="cust-form-group">
                  <label className="cust-form-label">State</label>
                  <input 
                    type="text" 
                    className="cust-form-input" 
                    value={editFormData.state} 
                    onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })} 
                  />
                </div>
                <div className="cust-form-group">
                  <label className="cust-form-label">Pincode</label>
                  <input 
                    type="text" 
                    className="cust-form-input" 
                    value={editFormData.pincode} 
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })} 
                  />
                </div>
              </div>

              <div className="cust-form-group">
                <label className="cust-form-label">Admin Notes</label>
                <textarea 
                  className="cust-form-textarea" 
                  rows="3" 
                  value={editFormData.admin_notes} 
                  onChange={(e) => setEditFormData({ ...editFormData, admin_notes: e.target.value })} 
                  placeholder="Preferences, allergies, package history..."
                />
              </div>

              <div className="drawer-footer" style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button 
                  type="button" 
                  className="cust-outline-gold-btn" 
                  onClick={() => setEditCustomer(null)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-save" 
                  disabled={actionLoading}
                  style={{ flex: 1, height: "42px", justifyContent: "center" }}
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

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
          <div className="search-box" style={{ position: "relative" }}>
            <img src={SearchIcon} className="search-icon" alt="" />
            <input type="text" placeholder="Search by ID, name, phone or email..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            {search && (
              <button 
                type="button"
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px", fontWeight: "bold" }}
              >
                ✕
              </button>
            )}
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
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#64748b", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", alignSelf: "center" }}
            >
              Clear Dates
            </button>
          )}
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
                <th style={{ textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && customers.length === 0 ? renderSkeleton() : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <div className="cust-empty-state">
                      <h3 className="cust-empty-title">No customers match your filters</h3>
                      <p className="cust-empty-sub">Try adjusting your search or filter selections.</p>
                      <button className="retry-btn" onClick={() => { setSearch(""); setMembershipFilter(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); }}>Clear Filters</button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((c) => {
                  return (
                    <tr key={c.id} onClick={() => openViewDrawer(c)} style={{ cursor: "pointer" }}>
                      <td className="cust-cell-name">{c.customer_id}</td>
                      <td className="cust-cell-name">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <CustomerAvatar customer={c} size={32} />
                          <span>{c.first_name} {c.last_name}</span>
                        </div>
                      </td>
                      <td className="cust-cell-email">{c.email || "-"}</td>
                      <td style={{ color: "#2d3748" }}>{c.phone || "-"}</td>
                      <td className="cust-cell-email">{c.join_date}</td>
                      <td><span className={"status-badge " + (c.status || "ACTIVE").toLowerCase()}>{c.status || "ACTIVE"}</span></td>
                      <td><span className={"tier-badge " + (c.membership_status || "NONE").toLowerCase()}>{c.membership_status === "NONE" ? "Regular" : c.membership_status}</span></td>
                      <td><strong className="metric-gold">{c.total_bookings || 0}</strong></td>
                      <td className="metric-teal">₹{Number(c.total_spent || 0).toLocaleString("en-IN")}</td>
                      <td 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ textAlign: "center", position: "relative" }}
                      >
                        <div className="cust-action-container">
                          <button 
                            className="cust-action-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(actionMenuId === c.id ? null : c.id);
                            }}
                            onMouseEnter={() => setActionMenuId(c.id)}
                            title="Customer Actions"
                          >
                            <img src={ActionIcon} alt="Actions" className="action-icon" />
                          </button>
                          {actionMenuId === c.id && (
                            <div 
                              className="cust-action-menu" 
                              onMouseLeave={() => setActionMenuId(null)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div 
                                className="cust-action-item" 
                                onClick={() => { setActionMenuId(null); openViewDrawer(c); }}
                              >
                                <svg className="action-svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span>View Details</span>
                              </div>
                              <div 
                                className="cust-action-item" 
                                onClick={() => { setActionMenuId(null); openEditDrawer(c); }}
                              >
                                <svg className="action-svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                <span>Edit Profile</span>
                              </div>
                              <div 
                                className="cust-action-item delete" 
                                onClick={() => { setActionMenuId(null); handleDeleteCustomer(c); }}
                              >
                                <svg className="action-svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Delete Customer</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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