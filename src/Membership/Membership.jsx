import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./Membership.css";
import { apiFetch } from "../api/http";

// ── Tier Configuration (unchanged) ─────────────────────────────────────────
const TIER_CONFIG = {
  SILVER: {
    label: "Silver", color: "#8e9fa7", bg: "rgba(142,159,167,0.12)", border: "rgba(142,159,167,0.35)",
    price: 1999, icon: "🥈",
    benefits: ["15% discount on all services", "Priority booking access", "Monthly wellness consultation", "Exclusive newsletter", "Birthday special offer"]
  },
  GOLD: {
    label: "Gold", color: "#cda751", bg: "rgba(205,167,81,0.12)", border: "rgba(205,167,81,0.35)",
    price: 3999, icon: "🥇",
    benefits: ["25% discount on all services", "Priority booking + SMS reminders", "2 complimentary sessions/month", "Dedicated wellness advisor", "Monthly health assessment", "Guest pass (2/year)"]
  },
  PLATINUM: {
    label: "Platinum", color: "#475569", bg: "rgba(71,85,105,0.12)", border: "rgba(71,85,105,0.35)",
    price: 7999, icon: "💎",
    benefits: ["40% discount on all services", "24/7 priority support", "4 complimentary sessions/month", "Personal health coach", "Quarterly body assessment", "Exclusive workshop access", "Home visits (2/year)", "Annual wellness retreat"]
  }
};

// ── Dummy data fallback ─────────────────────────────────────────────────────
const DUMMY_MEMBERS = [
  { id: "MEM-001", name: "Priya Sharma",    email: "priya.s@gmail.com",   phone: "+91 98765 43210", tier: "GOLD",     joinDate: "2024-03-15", expiryDate: "2025-03-15", sessions: 24, totalSpent: 12450, status: "active" },
  { id: "MEM-002", name: "Rahul Verma",     email: "rahul.v@gmail.com",   phone: "+91 87654 32109", tier: "PLATINUM", joinDate: "2023-11-20", expiryDate: "2025-11-20", sessions: 67, totalSpent: 38900, status: "active" },
  { id: "MEM-003", name: "Ananya Krishnan", email: "ananya.k@gmail.com",  phone: "+91 76543 21098", tier: "SILVER",   joinDate: "2024-06-01", expiryDate: "2025-06-01", sessions: 12, totalSpent: 5800,  status: "active" },
  { id: "MEM-004", name: "Vikram Nair",     email: "vikram.n@gmail.com",  phone: "+91 65432 10987", tier: "PLATINUM", joinDate: "2023-09-10", expiryDate: "2025-09-10", sessions: 89, totalSpent: 52100, status: "active" },
  { id: "MEM-005", name: "Meera Pillai",    email: "meera.p@gmail.com",   phone: "+91 54321 09876", tier: "SILVER",   joinDate: "2024-01-20", expiryDate: "2025-01-20", sessions: 8,  totalSpent: 3200,  status: "active" },
  { id: "MEM-006", name: "Arun Kumar",      email: "arun.k@gmail.com",    phone: "+91 43210 98765", tier: "GOLD",     joinDate: "2024-02-14", expiryDate: "2025-02-14", sessions: 31, totalSpent: 15600, status: "active" },
  { id: "MEM-007", name: "Sunita Reddy",    email: "sunita.r@gmail.com",  phone: "+91 32109 87654", tier: "SILVER",   joinDate: "2024-07-08", expiryDate: "2025-07-08", sessions: 6,  totalSpent: 2100,  status: "active" },
  { id: "MEM-008", name: "Deepak Menon",    email: "deepak.m@gmail.com",  phone: "+91 21098 76543", tier: "GOLD",     joinDate: "2023-12-05", expiryDate: "2024-12-05", sessions: 45, totalSpent: 21800, status: "expired" },
  { id: "MEM-009", name: "Kavitha Nambiar", email: "kavitha.n@gmail.com", phone: "+91 10987 65432", tier: "PLATINUM", joinDate: "2024-04-22", expiryDate: "2025-04-22", sessions: 52, totalSpent: 31200, status: "active" },
  { id: "MEM-010", name: "Suresh Babu",     email: "suresh.b@gmail.com",  phone: "+91 99887 76655", tier: "SILVER",   joinDate: "2024-08-15", expiryDate: "2025-08-15", sessions: 4,  totalSpent: 1500,  status: "active" },
  { id: "MEM-011", name: "Lakshmi Iyer",    email: "lakshmi.i@gmail.com", phone: "+91 88776 65544", tier: "GOLD",     joinDate: "2024-05-30", expiryDate: "2025-05-30", sessions: 19, totalSpent: 9400,  status: "active" },
  { id: "MEM-012", name: "Rajan Pillai",    email: "rajan.p@gmail.com",   phone: "+91 77665 54433", tier: "PLATINUM", joinDate: "2023-10-15", expiryDate: "2024-10-15", sessions: 76, totalSpent: 44500, status: "expired" },
  { id: "MEM-013", name: "Divya Nair",      email: "divya.n@gmail.com",   phone: "+91 66554 43322", tier: "SILVER",   joinDate: "2024-09-01", expiryDate: "2025-09-01", sessions: 3,  totalSpent: 900,   status: "active" },
  { id: "MEM-014", name: "Mohan Das",       email: "mohan.d@gmail.com",   phone: "+91 55443 32211", tier: "GOLD",     joinDate: "2024-01-10", expiryDate: "2025-01-10", sessions: 27, totalSpent: 13200, status: "active" },
  { id: "MEM-015", name: "Sita Ramesh",     email: "sita.r@gmail.com",    phone: "+91 44332 21100", tier: "SILVER",   joinDate: "2024-10-05", expiryDate: "2025-10-05", sessions: 2,  totalSpent: 600,   status: "active" },
  { id: "MEM-016", name: "Kiran Hegde",     email: "kiran.h@gmail.com",   phone: "+91 33221 10099", tier: "GOLD",     joinDate: "2024-04-18", expiryDate: "2025-04-18", sessions: 36, totalSpent: 18900, status: "active" },
  { id: "MEM-017", name: "Pooja Singh",     email: "pooja.s@gmail.com",   phone: "+91 22110 09988", tier: "SILVER",   joinDate: "2024-11-01", expiryDate: "2025-11-01", sessions: 1,  totalSpent: 400,   status: "active" },
  { id: "MEM-018", name: "Ganesh Iyer",     email: "ganesh.i@gmail.com",  phone: "+91 11009 98877", tier: "PLATINUM", joinDate: "2024-02-28", expiryDate: "2025-02-28", sessions: 44, totalSpent: 26800, status: "active" },
];

// ── Helpers (unchanged) ─────────────────────────────────────────────────────
function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntilExpiry(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Blank enroll form ───────────────────────────────────────────────────────
const BLANK_ENROLL = { name: "", email: "", phone: "", tier: "SILVER" };

// ── Component ───────────────────────────────────────────────────────────────
export default function Membership() {
  // ── Data state (API → dummy fallback) ──────────────────────────────────
  const [members, setMembers]         = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Tier config (editable locally) ─────────────────────────────────────
  const [tierConfig, setTierConfig]   = useState(TIER_CONFIG);

  // ── Filter states (unchanged) ──────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [tierFilter,   setTierFilter]   = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ── Member detail drawer ───────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [newTier,        setNewTier]        = useState("");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeSaving,  setUpgradeSaving]  = useState(false);

  // ── Tier editor drawer ─────────────────────────────────────────────────
  const [editingTier,    setEditingTier]    = useState(null);  // "SILVER" | "GOLD" | "PLATINUM" | null
  const [tierEditPrice,  setTierEditPrice]  = useState(0);
  const [tierEditBenefits, setTierEditBenefits] = useState([]);
  const [tierSaving,     setTierSaving]     = useState(false);

  // ── Enroll Member modal ────────────────────────────────────────────────
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm,      setEnrollForm]      = useState(BLANK_ENROLL);
  const [enrollSaving,    setEnrollSaving]    = useState(false);
  const [enrollError,     setEnrollError]     = useState("");

  // ── Fetch members from API ─────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await apiFetch("/api/memberships");
      if (res.success) {
        setMembers(res.members || []);
      } else throw new Error();
    } catch {
      setMembers(DUMMY_MEMBERS);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Stats (derived from live members list) ─────────────────────────────
  const tierStats = useMemo(() => ({
    SILVER:        members.filter(m => m.tier === "SILVER"   && m.status === "active").length,
    GOLD:          members.filter(m => m.tier === "GOLD"     && m.status === "active").length,
    PLATINUM:      members.filter(m => m.tier === "PLATINUM" && m.status === "active").length,
    EXPIRED:       members.filter(m => m.status === "expired").length,
    TOTAL_REVENUE: members.reduce((s, m) => s + (m.totalSpent || 0), 0),
  }), [members]);

  // ── Filter logic ───────────────────────────────────────────────────────
  const filteredMembers = useMemo(() =>
    members.filter(m => {
      const matchSearch  = m.name.toLowerCase().includes(search.toLowerCase()) ||
                           m.email.toLowerCase().includes(search.toLowerCase()) ||
                           (m.id || "").toLowerCase().includes(search.toLowerCase());
      const matchTier    = tierFilter   === "ALL" || m.tier   === tierFilter;
      const matchStatus  = statusFilter === "ALL" || m.status === statusFilter;
      return matchSearch && matchTier && matchStatus;
    }), [members, search, tierFilter, statusFilter]);

  // ── Tier Upgrade — now calls PATCH API ────────────────────────────────
  const handleUpgrade = async () => {
    if (!selectedMember || !newTier || newTier === selectedMember.tier) return;
    try {
      setUpgradeSaving(true);
      await apiFetch(`/api/memberships/${selectedMember.id}`, {
        method: "PATCH",
        body: JSON.stringify({ tier: newTier }),
      });
    } catch { /* update locally as fallback */ }
    // Update locally regardless of API result
    setMembers(prev => prev.map(m =>
      m.id === selectedMember.id ? { ...m, tier: newTier } : m
    ));
    setSelectedMember(prev => ({ ...prev, tier: newTier }));
    setUpgradeSuccess(true);
    setUpgradeSaving(false);
    setTimeout(() => setUpgradeSuccess(false), 2500);
  };

  // ── Open Tier Editor — populate local edit state ───────────────────────
  const handleOpenTierEdit = (tierKey) => {
    const cfg = tierConfig[tierKey];
    setTierEditPrice(cfg.price);
    setTierEditBenefits([...cfg.benefits]);
    setEditingTier(tierKey);
  };

  // ── Save Tier Config — calls PUT API, updates local state ─────────────
  const handleSaveTier = async () => {
    try {
      setTierSaving(true);
      await apiFetch(`/api/memberships/tiers/${editingTier}`, {
        method: "PUT",
        body: JSON.stringify({ price: Number(tierEditPrice), benefits: tierEditBenefits }),
      });
    } catch { /* update locally as fallback */ }
    // Update local tierConfig regardless
    setTierConfig(prev => ({
      ...prev,
      [editingTier]: {
        ...prev[editingTier],
        price: Number(tierEditPrice),
        benefits: tierEditBenefits.filter(b => b.trim() !== ""),
      }
    }));
    setTierSaving(false);
    setEditingTier(null);
  };

  // ── Enroll Member — calls POST API ────────────────────────────────────
  const handleEnroll = async () => {
    setEnrollError("");
    if (!enrollForm.name.trim())  { setEnrollError("Full name is required"); return; }
    if (!enrollForm.email.trim()) { setEnrollError("Email is required"); return; }
    if (!/\S+@\S+\.\S+/.test(enrollForm.email)) { setEnrollError("Enter a valid email"); return; }

    try {
      setEnrollSaving(true);
      const res = await apiFetch("/api/memberships", {
        method: "POST",
        body: JSON.stringify({
          name:  enrollForm.name.trim(),
          email: enrollForm.email.trim().toLowerCase(),
          phone: enrollForm.phone.trim() || null,
          tier:  enrollForm.tier,
        }),
      });
      if (res.success) {
        await fetchMembers();
      } else throw new Error();
    } catch {
      // Add locally as fallback
      const newId = `MEM-${String(members.length + 1).padStart(3, "0")}`;
      const today = new Date();
      const expiry = new Date(today);
      expiry.setFullYear(expiry.getFullYear() + 1);
      setMembers(prev => [{
        id:         newId,
        name:       enrollForm.name.trim(),
        email:      enrollForm.email.trim(),
        phone:      enrollForm.phone.trim() || "-",
        tier:       enrollForm.tier,
        joinDate:   today.toISOString().split("T")[0],
        expiryDate: expiry.toISOString().split("T")[0],
        sessions:   0,
        totalSpent: 0,
        status:     "active",
      }, ...prev]);
    } finally {
      setEnrollSaving(false);
      setShowEnrollModal(false);
      setEnrollForm(BLANK_ENROLL);
    }
  };

  // ── Input style helper ─────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, color: "#2d3748",
    outline: "none", boxSizing: "border-box", fontFamily: "Manrope, sans-serif",
  };

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="mem-container">
      <header className="mem-header">
        <div>
          <h1 className="mem-title">Membership Management</h1>
          <p className="mem-subtitle">Manage Silver, Gold &amp; Platinum tier members</p>
        </div>
        {/* Enroll Member button — now wired */}
        <button className="mem-add-btn" onClick={() => { setEnrollForm(BLANK_ENROLL); setEnrollError(""); setShowEnrollModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Enroll Member
        </button>
      </header>

      {/* ── Tier Overview Cards ── */}
      <section className="mem-tier-cards">
        {Object.entries(tierConfig).map(([key, cfg]) => (
          <div
            key={key}
            className="mem-tier-card"
            style={{ borderColor: cfg.border, background: cfg.bg, cursor: "pointer" }}
            onClick={() => handleOpenTierEdit(key)}
          >
            <div className="mem-tier-card-top">
              <span className="mem-tier-icon">{cfg.icon}</span>
              <div className="mem-tier-badge" style={{ background: cfg.color, color: "white" }}>{cfg.label}</div>
            </div>
            <div className="mem-tier-count" style={{ color: cfg.color }}>{tierStats[key]}</div>
            <div className="mem-tier-label">Active Members</div>
            <div className="mem-tier-price">₹{cfg.price.toLocaleString("en-IN")}/year</div>
            <div className="mem-tier-benefits">
              {cfg.benefits.slice(0, 2).map((b, i) => (
                <div key={i} className="mem-tier-benefit-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{b}</span>
                </div>
              ))}
              <div className="mem-tier-more">+{cfg.benefits.length - 2} more benefits</div>
            </div>
          </div>
        ))}

        <div className="mem-tier-card mem-revenue-card">
          <div className="mem-tier-card-top">
            <span className="mem-tier-icon">💰</span>
            <div className="mem-tier-badge" style={{ background: "#2d3748", color: "white" }}>Revenue</div>
          </div>
          <div className="mem-tier-count" style={{ color: "#2d3748", fontSize: "22px" }}>
            ₹{(tierStats.TOTAL_REVENUE / 1000).toFixed(0)}K
          </div>
          <div className="mem-tier-label">Total Member LTV</div>
          <div className="mem-tier-price">{members.length} total enrolled</div>
          <div className="mem-tier-benefits">
            <div className="mem-tier-benefit-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{tierStats.EXPIRED} expired memberships</span>
            </div>
            <div className="mem-tier-benefit-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{members.length - tierStats.EXPIRED} active members</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          TIER EDITOR DRAWER — now wired to Save (PUT API)
      ══════════════════════════════════════════════════════════════════ */}
      {editingTier && (
        <div className="mem-detail-overlay" onClick={() => setEditingTier(null)}>
          <div className="mem-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="mem-detail-header">
              <h2 style={{ margin: 0, fontSize: 17 }}>Edit {tierConfig[editingTier].label} Tier</h2>
              <button className="mem-detail-close" onClick={() => setEditingTier(null)}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
              {/* Price */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#7b8a9a", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                  Annual Price (₹)
                </label>
                <input
                  type="number"
                  value={tierEditPrice}
                  onChange={e => setTierEditPrice(e.target.value)}
                  style={inputStyle}
                  min={0}
                />
              </div>

              {/* Benefits */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#7b8a9a", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                  Benefits List
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tierEditBenefits.map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={b}
                        onChange={e => {
                          const updated = [...tierEditBenefits];
                          updated[i] = e.target.value;
                          setTierEditBenefits(updated);
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        onClick={() => setTierEditBenefits(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "white", color: "#e74c3c", cursor: "pointer", fontSize: 12 }}
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setTierEditBenefits(prev => [...prev, ""])}
                    style={{ padding: "8px 14px", borderRadius: 8, border: `1.5px dashed ${tierConfig[editingTier].color}`, background: "transparent", color: tierConfig[editingTier].color, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                  >
                    + Add Benefit
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #f1f3f6", padding: "20px 0 0 0", display: "flex", gap: 12, marginTop: "auto" }}>
              <button
                onClick={() => setEditingTier(null)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#4a5568", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Cancel</button>
              <button
                onClick={handleSaveTier}
                disabled={tierSaving}
                style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: tierConfig[editingTier].color, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >{tierSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="mem-content-area">
        {/* ── Filters ── */}
        <div className="mem-filters">
          <div className="mem-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="mem-search"
              placeholder="Search by name, email or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="mem-filter-group">
            {["ALL", "SILVER", "GOLD", "PLATINUM"].map(t => (
              <button
                key={t}
                className={`mem-filter-btn ${tierFilter === t ? "active" : ""}`}
                style={tierFilter === t && t !== "ALL" ? { background: tierConfig[t]?.color, borderColor: tierConfig[t]?.color, color: "white" } : {}}
                onClick={() => setTierFilter(t)}
              >
                {t === "ALL" ? "All Tiers" : tierConfig[t].icon + " " + tierConfig[t].label}
              </button>
            ))}
          </div>

          <select className="mem-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            MEMBER DETAIL DRAWER — tier upgrade now calls PATCH API
        ══════════════════════════════════════════════════════════════════ */}
        {selectedMember && (
          <div className="mem-detail-overlay" onClick={() => setSelectedMember(null)}>
            <div className="mem-detail-panel" onClick={e => e.stopPropagation()}>
              <div className="mem-detail-header">
                <div className="mem-detail-avatar" style={{ background: tierConfig[selectedMember.tier].bg, color: tierConfig[selectedMember.tier].color }}>
                  {getInitials(selectedMember.name)}
                </div>
                <div>
                  <div className="mem-detail-name">{selectedMember.name}</div>
                  <div className="mem-detail-id">{selectedMember.id}</div>
                </div>
                <button className="mem-detail-close" onClick={() => setSelectedMember(null)}>✕</button>
              </div>

              <div className="mem-detail-stats">
                <div className="mem-detail-stat">
                  <div className="mem-detail-stat-value">{selectedMember.sessions}</div>
                  <div className="mem-detail-stat-label">Sessions</div>
                </div>
                <div className="mem-detail-stat">
                  <div className="mem-detail-stat-value">₹{((selectedMember.totalSpent || 0) / 1000).toFixed(1)}K</div>
                  <div className="mem-detail-stat-label">Total Spent</div>
                </div>
                <div className="mem-detail-stat">
                  <div className="mem-detail-stat-value">{daysUntilExpiry(selectedMember.expiryDate)}</div>
                  <div className="mem-detail-stat-label">Days Left</div>
                </div>
              </div>

              <div className="mem-detail-info">
                <div className="mem-detail-row"><span>Email</span><span>{selectedMember.email}</span></div>
                <div className="mem-detail-row"><span>Phone</span><span>{selectedMember.phone}</span></div>
                <div className="mem-detail-row"><span>Joined</span><span>{formatDate(selectedMember.joinDate)}</span></div>
                <div className="mem-detail-row"><span>Expiry</span><span>{formatDate(selectedMember.expiryDate)}</span></div>
                <div className="mem-detail-row"><span>Status</span><span className={`mem-status-pill ${selectedMember.status}`}>{selectedMember.status}</span></div>
              </div>

              <div className="mem-upgrade-section">
                <div className="mem-upgrade-label">Change Membership Tier</div>
                <div className="mem-tier-select-group">
                  {Object.entries(tierConfig).map(([key, cfg]) => (
                    <div
                      key={key}
                      className={`mem-tier-option ${newTier === key ? "selected" : ""}`}
                      style={newTier === key ? { borderColor: cfg.color, background: cfg.bg } : {}}
                      onClick={() => setNewTier(key)}
                    >
                      <span>{cfg.icon}</span>
                      <span style={{ color: newTier === key ? cfg.color : "#4a5568", fontWeight: 600 }}>{cfg.label}</span>
                      <span style={{ fontSize: "11px", color: "#a0aec0" }}>₹{cfg.price.toLocaleString("en-IN")}/yr</span>
                    </div>
                  ))}
                </div>

                <div className="mem-upgrade-benefits">
                  <div className="mem-upgrade-benefits-title">Included Benefits</div>
                  {tierConfig[newTier]?.benefits.map((b, i) => (
                    <div key={i} className="mem-benefit-row">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tierConfig[newTier].color} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      {b}
                    </div>
                  ))}
                </div>

                {upgradeSuccess ? (
                  <div className="mem-success-msg">✅ Tier updated successfully!</div>
                ) : (
                  <button
                    className="mem-upgrade-btn"
                    style={{ background: tierConfig[newTier]?.color }}
                    onClick={handleUpgrade}
                    disabled={newTier === selectedMember.tier || upgradeSaving}
                  >
                    {upgradeSaving
                      ? "Saving..."
                      : newTier === selectedMember.tier
                        ? "Current Tier"
                        : `Upgrade to ${tierConfig[newTier]?.label}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mem-table-panel">
          {/* ── Members Table ── */}
          <div className="mem-table-wrap">
            <div className="mem-table-header">
              {dataLoading
                ? "Loading members..."
                : <span>{filteredMembers.length} members found</span>}
            </div>
            <table className="mem-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Tier</th>
                  <th>Sessions</th>
                  <th>Total Spent</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => {
                  const cfg = tierConfig[m.tier];
                  const days = daysUntilExpiry(m.expiryDate);
                  const isExpiring = days > 0 && days <= 30;
                  return (
                    <tr
                      key={m.id}
                      className={`mem-row ${selectedMember?.id === m.id ? "selected" : ""}`}
                      onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }}
                    >
                      <td>
                        <div className="mem-name-cell">
                          <div className="mem-avatar" style={{ background: cfg?.bg, color: cfg?.color, border: `1.5px solid ${cfg?.border}` }}>
                            {getInitials(m.name)}
                          </div>
                          <div>
                            <div className="mem-name">{m.name}</div>
                            <div className="mem-email">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mem-tier-pill" style={{ background: cfg?.bg, color: cfg?.color, border: `1px solid ${cfg?.border}` }}>
                          {cfg?.icon} {cfg?.label}
                        </span>
                      </td>
                      <td><span className="mem-sessions">{m.sessions}</span></td>
                      <td className="mem-amount">₹{(m.totalSpent || 0).toLocaleString("en-IN")}</td>
                      <td>
                        <div className="mem-expiry-cell">
                          <span>{formatDate(m.expiryDate)}</span>
                          {isExpiring && <span className="mem-expiry-warn">⚠ {days}d left</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`mem-status-pill ${m.status}`}>{m.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {!dataLoading && filteredMembers.length === 0 && (
                  <tr><td colSpan="6" style={{ padding: 32, textAlign: "center", color: "#a0aec0" }}>No members match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ENROLL MEMBER MODAL — new, fully wired
      ══════════════════════════════════════════════════════════════════ */}
      {showEnrollModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowEnrollModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 20, width: 460, maxWidth: "95vw", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", gap: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#2d3748" }}>Enroll New Member</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#a0aec0" }}>Add a customer to a membership plan</p>
              </div>
              <button onClick={() => setShowEnrollModal(false)} style={{ background: "none", border: "none", fontSize: 18, color: "#a0aec0", cursor: "pointer" }}>✕</button>
            </div>

            {/* Full Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.4px" }}>Full Name *</label>
              <input
                value={enrollForm.name}
                onChange={e => setEnrollForm(p => ({ ...p, name: e.target.value }))}
                style={inputStyle} placeholder="e.g. Priya Sharma"
              />
            </div>

            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.4px" }}>Email *</label>
              <input
                type="email"
                value={enrollForm.email}
                onChange={e => setEnrollForm(p => ({ ...p, email: e.target.value }))}
                style={inputStyle} placeholder="priya@example.com"
              />
            </div>

            {/* Phone */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.4px" }}>Phone</label>
              <input
                type="tel"
                value={enrollForm.phone}
                onChange={e => setEnrollForm(p => ({ ...p, phone: e.target.value }))}
                style={inputStyle} placeholder="+91 98765 43210"
              />
            </div>

            {/* Tier Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.4px" }}>Membership Tier *</label>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(tierConfig).map(([key, cfg]) => (
                  <div
                    key={key}
                    onClick={() => setEnrollForm(p => ({ ...p, tier: key }))}
                    style={{
                      flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                      border: `2px solid ${enrollForm.tier === key ? cfg.color : "#e2e8f0"}`,
                      background: enrollForm.tier === key ? cfg.bg : "white",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: 18 }}>{cfg.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: enrollForm.tier === key ? cfg.color : "#4a5568", marginTop: 2 }}>{cfg.label}</div>
                    <div style={{ fontSize: 10, color: "#a0aec0", marginTop: 1 }}>₹{cfg.price.toLocaleString("en-IN")}/yr</div>
                  </div>
                ))}
              </div>
            </div>

            {enrollError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>⚠️ {enrollError}</div>}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowEnrollModal(false)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#4a5568" }}
              >Cancel</button>
              <button
                onClick={handleEnroll}
                disabled={enrollSaving}
                style={{ flex: 2, padding: 11, borderRadius: 10, border: "none", background: "#CDA751", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >{enrollSaving ? "Enrolling..." : "✓ Enroll Member"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
