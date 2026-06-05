import React, { useState, useEffect, useMemo } from "react";
import "./Customers.css";
import { apiFetch } from "../api/http";
import { getUser } from "../utils/session";
import SearchIcon from "../assets/searchIcon.svg";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIcon.png";
import { useAllocations } from "../utils/AllocationContext";

const DUMMY_CUSTOMERS = [
  { id: "1", customer_id: "CUST-001", first_name: "Rahul", last_name: "Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", membership_status: "GOLD", total_bookings: 12, total_spent: 24500, join_date: "2024-01-15" },
  { id: "2", customer_id: "CUST-002", first_name: "Priya", last_name: "Desai", email: "priya.d@example.com", phone: "+91 87654 32109", membership_status: "NONE", total_bookings: 2, total_spent: 3500, join_date: "2025-11-20" },
  { id: "3", customer_id: "CUST-003", first_name: "Vikram", last_name: "Singh", email: "vikram.s@example.com", phone: "+91 76543 21098", membership_status: "PLATINUM", total_bookings: 45, total_spent: 89000, join_date: "2023-05-10" },
  { id: "4", customer_id: "CUST-004", first_name: "Anita", last_name: "Nair", email: "anita.n@example.com", phone: "+91 65432 10987", membership_status: "SILVER", total_bookings: 8, total_spent: 12000, join_date: "2024-08-22" },
  { id: "5", customer_id: "CUST-005", first_name: "Sanjay", last_name: "Kumar", email: "sanjay.k@example.com", phone: "+91 54321 09876", membership_status: "NONE", total_bookings: 1, total_spent: 1500, join_date: "2026-05-01" },
];

function Customers() {
  const { triggerAlert, triggerConfirm } = useAllocations();
  const userRole = useMemo(() => getUser()?.role, []);

  const [customers, setCustomers] = useState(DUMMY_CUSTOMERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("");
  const [page, setPage] = useState(1);

  // Drawer state — exact same pattern as Team.jsx
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newMembership, setNewMembership] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // When customer selected, pre-fill form
  useEffect(() => {
    if (selectedCustomer) {
      setNewMembership(selectedCustomer.membership_status || "NONE");
    }
  }, [selectedCustomer]);

  // Fetch from API, fall back to dummy
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let q = `/api/customers?page=${page}&limit=10`;
        if (search) q += `&search=${encodeURIComponent(search)}`;
        if (membershipFilter) q += `&membership_status=${membershipFilter}`;
        const res = await apiFetch(q);
        if (res.success) setCustomers(res.customers || []);
        else setCustomers(DUMMY_CUSTOMERS);
      } catch {
        setCustomers(DUMMY_CUSTOMERS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, membershipFilter]);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      (`${c.first_name} ${c.last_name}`).toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleUpdateMembership = () => {
    setActionLoading(true);
    setTimeout(() => {
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, membership_status: newMembership } : c));
      setSelectedCustomer(prev => ({ ...prev, membership_status: newMembership }));
      triggerAlert(`Membership updated to: ${newMembership}`, true);
      setActionLoading(false);
    }, 300);
  };

  const handleDelete = async () => {
    const confirmed = await triggerConfirm("Delete this customer? This is irreversible.", true);
    if (!confirmed) return;
    setCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));
    setSelectedCustomer(null);
  };

  return (
    <div className="customers-container">

      {/* ── Drawer — exact same pattern as Team.jsx ── */}
      {selectedCustomer && (
        <div
          className="cust-drawer-overlay"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="cust-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
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
                    <span className={`tier-badge ${(selectedCustomer.membership_status || "NONE").toLowerCase()}`}>
                      {selectedCustomer.membership_status === "NONE" ? "Regular" : selectedCustomer.membership_status}
                    </span>
                    <div className="cust-sub" style={{ marginTop: 4 }}>Joined: {selectedCustomer.join_date}</div>
                  </div>
                </div>
              </div>

              {/* CRM Metrics */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">CRM Metrics</h4>
                <div className="cust-metrics-grid">
                  <div className="cust-metric">
                    <span className="cust-metric-label">Total Spend (LTV)</span>
                    <span className="cust-metric-value" style={{ color: "#cda751" }}>₹{(selectedCustomer.total_spent || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cust-metric">
                    <span className="cust-metric-label">Sessions</span>
                    <span className="cust-metric-value" style={{ color: "#cda751" }}>{selectedCustomer.total_bookings || 0}</span>
                  </div>
                  <div className="cust-metric">
                    <span className="cust-metric-label">Avg Monthly</span>
                    <span className="cust-metric-value">₹{Math.round((selectedCustomer.total_spent || 0) / 6).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="cust-metric">
                    <span className="cust-metric-label">Payment</span>
                    <span className="cust-metric-value" style={{ fontSize: 14 }}>UPI</span>
                  </div>
                </div>
              </div>

              {/* Membership Control */}
              <div className="cust-drawer-section">
                <h4 className="cust-section-title">Update Membership Tier</h4>
                <div style={{ display: "flex", gap: 10 }}>
                  <select
                    value={newMembership}
                    onChange={(e) => setNewMembership(e.target.value)}
                    style={{ flex: 1, height: 42, border: "1px solid #e3e7ed", borderRadius: 8, padding: "0 12px", fontSize: 14, outline: "none" }}
                  >
                    <option value="NONE">Regular (No Discount)</option>
                    <option value="SILVER">Silver (10% Off)</option>
                    <option value="GOLD">Gold (20% Off)</option>
                    <option value="PLATINUM">Platinum (30% Off)</option>
                  </select>
                  <button
                    className="cust-btn-secondary"
                    onClick={handleUpdateMembership}
                    disabled={actionLoading}
                    style={{ padding: "0 20px" }}
                  >
                    Update
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="cust-drawer-footer">
              {userRole === "SUPER_ADMIN" ? (
                <button className="cust-btn-danger" onClick={handleDelete}>Archive Profile</button>
              ) : (
                <button className="cust-btn-secondary" disabled style={{ opacity: 0.5 }}>Archive Locked (Admins Only)</button>
              )}
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
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
        {loading && <div style={{ padding: 16, color: "#7b8a9a" }}>Loading...</div>}

        <div className="customers-table-scroll">
          <table className="customers-table">
            <thead>
              <tr>
                <th>CUSTOMER ID</th>
                <th>CUSTOMER</th>
                <th>PHONE</th>
                <th>MEMBERSHIP</th>
                <th>SESSIONS</th>
                <th>TOTAL SPENT</th>
                <th>JOINED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => setSelectedCustomer(c)}>
                  <td><strong>{c.customer_id}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.first_name} {c.last_name}</div>
                    <div style={{ fontSize: 11, color: "#7b8a9a" }}>{c.email || "No Email"}</div>
                  </td>
                  <td>{c.phone}</td>
                  <td>
                    <span className={`tier-badge ${(c.membership_status || "NONE").toLowerCase()}`}>
                      {c.membership_status === "NONE" ? "Regular" : c.membership_status}
                    </span>
                  </td>
                  <td><strong>{c.total_bookings || 0} Sessions</strong></td>
                  <td><strong style={{ color: "#cda751" }}>₹{(c.total_spent || 0).toLocaleString("en-IN")}</strong></td>
                  <td>{c.join_date || "-"}</td>
                  <td onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}>
                    <img src={ActionIcon} alt="Actions" className="action-icon" />
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 32, color: "#7b8a9a" }}>No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="customers-pagination-footer">
          <div>Showing {filtered.length} customers</div>
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt;</button>
            <button className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>1</button>
            <button className="page-btn" onClick={() => setPage(p => p + 1)}>&gt;</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Customers;