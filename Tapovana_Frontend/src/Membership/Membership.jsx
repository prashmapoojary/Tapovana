import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./Membership.css";
import { apiFetch } from "../api/http";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIconDefault.png";
import EnrollMemberDrawer from "./EnrollMemberDrawer";

// ── Tier Configuration ─────────────────────────────────────────────────
const TIER_CONFIG = {
  SILVER: {
    label: "Silver", color: "#8e9fa7", bg: "rgba(142,159,167,0.12)", border: "rgba(142,159,167,0.35)",
    price: 1999,
    benefits: ["15% discount on services", "Priority booking", "Monthly wellness consult"]
  },
  GOLD: {
    label: "Gold", color: "#cda751", bg: "rgba(205,167,81,0.12)", border: "rgba(205,167,81,0.35)",
    price: 3999,
    benefits: ["25% discount on services", "2 free sessions/mo", "Dedicated advisor"]
  },
  PLATINUM: {
    label: "Platinum", color: "#475569", bg: "rgba(71,85,105,0.12)", border: "rgba(71,85,105,0.35)",
    price: 7999,
    benefits: ["40% discount on services", "24/7 support & care", "Annual wellness retreat"]
  }
};

// ── Helpers ────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntilExpiry(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatValidity(joinDate, expiryDate) {
  if (!joinDate || !expiryDate) return "-";
  const f = (d) => {
    const dt = new Date(d);
    return String(dt.getDate()).padStart(2, "0") + " " + dt.toLocaleDateString("en-US", { month: "short" }) + " " + dt.getFullYear();
  };
  return f(joinDate) + " - " + f(expiryDate);
}

// ── Validation ─────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

function cleanPhone(phone) {
  return (phone || "").replace(/[\s+\-()]/g, "").replace(/^91/, "");
}

// ── Pagination helper ──────────────────────────────────────────────────
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const BLANK_ENROLL = { name: "", email: "", phone: "", tier: "SILVER" };

const RENDER_MEMBERSHIP_API = "https://tapoclg.onrender.com/api/membership";

export default function Membership() {
  const [members, setMembers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [tierConfig, setTierConfig] = useState(TIER_CONFIG);

  // Filters
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Member detail drawer
  const [selectedMember, setSelectedMember] = useState(null);
  const [newTier, setNewTier] = useState("");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeSaving, setUpgradeSaving] = useState(false);

  // Tier editor
  const [editingTier, setEditingTier] = useState(null);
  const [tierEditPrice, setTierEditPrice] = useState(0);
  const [tierEditBenefits, setTierEditBenefits] = useState([]);
  const [tierSaving, setTierSaving] = useState(false);

  // Modals
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState(BLANK_ENROLL);
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // Action menu & toast
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: "", desc: "", onConfirm: null });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 3000);
  };

  // ─── Fetch tiers from admin backend ─────────────────────────────────
  const fetchTiers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/memberships/tiers");
      if (res.success && res.tiers) {
        const config = { ...TIER_CONFIG };
        for (const t of res.tiers) {
          const key = t.name;
          if (config[key]) {
            config[key].price = t.price || config[key].price;
            config[key].benefits = t.benefits || config[key].benefits;
          }
        }
        setTierConfig(config);
      }
    } catch {
      // Use default TIER_CONFIG
    }
  }, []);

  // ─── Fetch members from BOTH mobile (Render) AND admin backend ─────
  const fetchMembers = useCallback(async () => {
    try {
      setDataLoading(true);

      // 1. Fetch from mobile app (Render API)
      let mobileMembers = [];
      try {
        const mobileRes = await fetch(RENDER_MEMBERSHIP_API);
        const mobileData = await mobileRes.json();
        if (mobileData.success && mobileData.memberships) {
          mobileMembers = mobileData.memberships.map((m) => {
            const tier = m.membership_name?.includes("DIAMOND") ? "PLATINUM"
              : m.membership_name?.includes("GOLD") ? "GOLD"
                : "SILVER";

            let join = m.purchase_date ? new Date(m.purchase_date) : new Date();
            let expiry = new Date(join);
            expiry.setMonth(expiry.getMonth() + 1);

            return {
              id: "mobile-" + (m.user_id || m.id || Math.random()),
              name: m.customer_name || "Unknown",
              email: m.customer_email || "-",
              phone: m.phone || "-",
              tier: tier,
              joinDate: join.toISOString().split("T")[0],
              expiryDate: expiry.toISOString().split("T")[0],
              sessions: m.available_credits || 0,
              totalSpent: 0,
              status: "active",
              profile_photo_url: m.profile_pic || null,
              source: "mobile"
            };
          });
        }
      } catch {
        console.log("Mobile API fetch failed, using admin data only");
      }

      // 2. Fetch from admin backend
      let adminMembers = [];
      try {
        const adminRes = await apiFetch("/api/memberships");
        if (adminRes.success && adminRes.memberships) {
          adminMembers = adminRes.memberships.map((m) => ({
            id: "admin-" + m.id,
            name: m.name || "Unknown",
            email: m.email || "-",
            phone: m.phone || "-",
            tier: (m.tier || "SILVER").toUpperCase(),
            joinDate: m.join_date || null,
            expiryDate: m.expiry_date || null,
            sessions: m.sessions || 0,
            totalSpent: m.total_spent || 0,
            status: m.status || "active",
            profile_photo_url: m.profile_photo_url || null,
            source: "admin"
          }));
        }
      } catch {
        console.log("Admin API fetch failed");
      }

      // 3. Merge: avoid duplicates by email (admin overwrites mobile)
      const mergedMap = new Map();
      for (const m of mobileMembers) {
        mergedMap.set(m.email, m);
      }
      for (const m of adminMembers) {
        mergedMap.set(m.email, m);
      }

      const merged = Array.from(mergedMap.values());
      console.log("Total merged members:", merged.length, "(Mobile:", mobileMembers.length, "+ Admin:", adminMembers.length, ")");
      setMembers(merged);
    } catch {
      setMembers([]);
      showToast("Failed to load members.", "error");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { fetchTiers(); }, [fetchTiers]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Stats ───────────────────────────────────────────────────────────
  const tierStats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return {
      TOTAL: members.length,
      SILVER: members.filter(m => m.tier === "SILVER" && m.status === "active").length,
      GOLD: members.filter(m => m.tier === "GOLD" && m.status === "active").length,
      PLATINUM: members.filter(m => m.tier === "PLATINUM" && m.status === "active").length,
      PENDING: members.filter(m => m.status === "pending").length,
      EXPIRED: members.filter(m => m.status === "expired" || m.status === "inactive").length,
      TOTAL_REVENUE: members.filter(m => m.status === "active").reduce((sum, m) => sum + (tierConfig[m.tier]?.price || 0), 0),
      NEW_THIS_MONTH: members.filter(m => {
        if (!m.joinDate) return false;
        const d = new Date(m.joinDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length,
      EXPIRING_SOON: members.filter(m => {
        if (m.status !== "active" || !m.expiryDate) return false;
        const days = daysUntilExpiry(m.expiryDate);
        return days > 0 && days <= 30;
      }).length,
      RENEWED: members.filter(m => m.status === "active" && m.expiryDate && new Date(m.expiryDate) < now).length,
    };
  }, [members, tierConfig]);

  // ── Per-tier analytics ──────────────────────────────────────────────
  const tierAnalytics = useMemo(() => {
    const result = {};
    for (const key of Object.keys(tierConfig)) {
      const activeMembers = members.filter(m => m.tier === key && m.status === "active");
      result[key] = {
        revenue: activeMembers.reduce((s, m) => s + (tierConfig[key]?.price || 0), 0),
        expiringSoon: activeMembers.filter(m => { const days = daysUntilExpiry(m.expiryDate); return days > 0 && days <= 30; }).length,
      };
    }
    return result;
  }, [members, tierConfig]);

  // ── Filters ─────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() =>
    members.filter(m => {
      const matchSearch = !search ||
        (m.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(search.toLowerCase()) ||
        String(m.id || "").includes(search.toLowerCase());
      const matchTier = tierFilter === "ALL" || m.tier === tierFilter;
      const matchStatus = statusFilter === "ALL" || m.status === statusFilter || (statusFilter === "expired" && m.status === "inactive");
      return matchSearch && matchTier && matchStatus;
    }), [members, search, tierFilter, statusFilter]);

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [search, tierFilter, statusFilter]);
  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  // ─── Tier Upgrade ───────────────────────────────────────────────────
  // Only admin members can be upgraded (mobile members are read-only)
  const handleUpgrade = async () => {
    if (!selectedMember || !newTier || newTier === selectedMember.tier) return;
    if (selectedMember.source !== "admin") {
      showToast("Mobile members can only be managed via sync.", "info");
      return;
    }
    try {
      setUpgradeSaving(true);
      await apiFetch("/api/memberships/" + selectedMember.id.replace("admin-", ""), {
        method: "PATCH",
        body: JSON.stringify({ tier: newTier }),
      });
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, tier: newTier } : m));
      setSelectedMember(prev => ({ ...prev, tier: newTier }));
      setUpgradeSuccess(true);
      showToast("Tier updated successfully!");
    } catch {
      showToast("Failed to update tier.", "error");
    } finally {
      setUpgradeSaving(false);
      setTimeout(() => setUpgradeSuccess(false), 2500);
    }
  };

  // ─── Tier Editor ────────────────────────────────────────────────────
  const handleOpenTierEdit = (tierKey) => {
    const cfg = tierConfig[tierKey];
    setTierEditPrice(cfg.price);
    setTierEditBenefits([...(cfg.benefits || [])]);
    setEditingTier(tierKey);
  };

  const handleSaveTier = async () => {
    try {
      setTierSaving(true);
      await apiFetch("/api/memberships/tiers/" + editingTier, {
        method: "PUT",
        body: JSON.stringify({ price: Number(tierEditPrice), benefits: tierEditBenefits }),
      });
    } catch { /* update locally */ }
    setTierConfig(prev => ({
      ...prev,
      [editingTier]: { ...prev[editingTier], price: Number(tierEditPrice), benefits: tierEditBenefits.filter(b => b.trim() !== "") }
    }));
    setTierSaving(false);
    setEditingTier(null);
    showToast("Tier config updated!");
  };

  // ─── Enroll Member ───────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!enrollForm.name.trim()) { setEnrollError("Name is required."); return; }
    if (!enrollForm.email.trim()) { setEnrollError("Email is required."); return; }
    if (!EMAIL_REGEX.test(enrollForm.email.trim())) { setEnrollError("Enter a valid email address."); return; }
    if (enrollForm.phone.trim()) {
      const cleaned = cleanPhone(enrollForm.phone);
      if (!PHONE_REGEX.test(cleaned)) { setEnrollError("Enter a valid 10-digit mobile number."); return; }
    }

    const emailLower = enrollForm.email.trim().toLowerCase();
    const exists = members.some(m => (m.email || "").toLowerCase() === emailLower);
    if (exists) { setEnrollError("A member with this email already exists."); return; }

    setEnrollSaving(true);
    setEnrollError("");

    try {
      const res = await apiFetch("/api/memberships", {
        method: "POST",
        body: JSON.stringify({
          name: enrollForm.name.trim(),
          email: emailLower,
          phone: enrollForm.phone.trim() || null,
          tier: enrollForm.tier,
          total_spent: tierConfig[enrollForm.tier]?.price || 0,
        }),
      });
      if (res.success) {
        await fetchMembers();
        showToast("Member enrolled successfully.", "success");
      } else throw new Error();
    } catch {
      setMembers(prev => [{
        id: "admin-" + Date.now(),
        name: enrollForm.name.trim(),
        email: emailLower,
        phone: enrollForm.phone.trim() || "-",
        tier: enrollForm.tier,
        joinDate: new Date().toISOString().split("T")[0],
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
        sessions: 0,
        totalSpent: tierConfig[enrollForm.tier]?.price || 0,
        status: "pending",
        source: "admin"
      }, ...prev]);
      showToast("Member enrolled successfully.", "success");
    } finally {
      setEnrollSaving(false);
      setShowEnrollModal(false);
      setEnrollForm(BLANK_ENROLL);
    }
  };

  // ─── Admin Actions ──────────────────────────────────────────────────
  const triggerAction = (e, memberId, title, desc, onConfirmFn) => {
    e.stopPropagation();
    setOpenActionMenu(null);
    setConfirmModal({ visible: true, title, desc, onConfirm: () => { onConfirmFn(); setConfirmModal({ visible: false, title: "", desc: "", onConfirm: null }); } });
  };

  const handleAccept = (e, memberId) => {
    triggerAction(e, memberId, "Activate Membership", "Are you sure?", () => {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: "active" } : m));
      showToast("Membership activated.");
    });
  };

  const handleReject = (e, memberId) => {
    triggerAction(e, memberId, "Reject Membership", "Reject this membership?", () => {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      showToast("Membership rejected.", "error");
    });
  };

  const handleDeactivate = (e, memberId) => {
    triggerAction(e, memberId, "Deactivate Membership", "Deactivate this membership?", () => {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: "inactive" } : m));
      showToast("Membership deactivated.", "info");
    });
  };

  const handleRenew = (e, memberId) => {
    triggerAction(e, memberId, "Renew Membership", "Renew for another year?", () => {
      setMembers(prev => prev.map(m => {
        if (m.id === memberId) {
          const newExpiry = new Date(m.expiryDate);
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          return { ...m, status: "active", expiryDate: newExpiry.toISOString().split("T")[0] };
        }
        return m;
      }));
      showToast("Membership renewed.");
    });
  };

  const handleDelete = (e, memberId) => {
    triggerAction(e, memberId, "Delete Record", "Permanently delete? This cannot be undone.", () => {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (selectedMember?.id === memberId) setSelectedMember(null);
      showToast("Record deleted.", "error");
    });
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, color: "#2d3748",
    outline: "none", boxSizing: "border-box", fontFamily: "Manrope, sans-serif",
    background: "white",
  };

  const actionItemStyle = {
    padding: "10px 16px", cursor: "pointer", fontSize: "14px",
    color: "#2d3748", display: "flex", alignItems: "center", gap: "8px",
  };

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="mem-container">
      {/* Toast */}
      {toast.visible && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 10001,
          background: "#fff", border: "2px solid #cda751", borderRadius: "8px",
          padding: "16px 24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          color: toast.type === "success" ? "#2e7559" : toast.type === "error" ? "#e53e3e" : "#4a5568",
          fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px",
        }}>
          {toast.type === "success" && "✓ "}
          {toast.type === "error" && "⚠ "}
          {toast.type === "info" && "ℹ "}
          {toast.message}
        </div>
      )}

      <EnrollMemberDrawer
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        onSaved={fetchMembers}
        onShowToast={showToast}
      />

      {/* Confirm Modal */}
      {confirmModal.visible && (
        <div className="global-alert-overlay" style={{ zIndex: 10002, position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="global-alert-modal" style={{ background: "white", padding: "24px", borderRadius: "12px", width: "400px", maxWidth: "90vw", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#2d3748" }}>{confirmModal.title}</h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#718096" }}>{confirmModal.desc}</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmModal({ visible: false, title: "", desc: "", onConfirm: null })}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "white", color: "#4a5568", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmModal.onConfirm}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#cda751", color: "white", fontWeight: 600, cursor: "pointer" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mem-header">
        <div>
          <h1 className="mem-title">Membership Management</h1>
          <p className="mem-subtitle">Manage Silver, Gold & Platinum tier members</p>
        </div>
        <button className="mem-add-btn" onClick={() => setShowEnrollModal(true)}>+ Enroll Member</button>
      </header>

      {/* Stats Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div className="mem-tier-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#475569", color: "white" }}>This Month</div>
          </div>
          <div className="mem-tier-count" style={{ color: "#2d3748" }}>{tierStats.NEW_THIS_MONTH}</div>
          <div className="mem-tier-label">Members joined</div>
        </div>
        {Object.entries(tierConfig).map(([key, cfg]) => (
          <div key={key} className="mem-tier-card" style={{ cursor: "pointer" }} onClick={() => handleOpenTierEdit(key)}>
            <div className="mem-tier-card-top">
              <div className="mem-tier-badge" style={{ background: cfg.color, color: "white" }}>{cfg.label}</div>
            </div>
            <div className="mem-tier-count" style={{ color: cfg.color }}>{tierStats[key]}</div>
            <div className="mem-tier-label">Active Members</div>
            <div className="mem-tier-price">Rs{cfg.price.toLocaleString("en-IN")}/year</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <div className="mem-tier-benefits-link" style={{ color: cfg.color }}>{cfg.benefits.length} benefits</div>
              {tierAnalytics[key]?.expiringSoon > 0 && (
                <span style={{ fontSize: "11px", color: "#e67e22", fontWeight: 600 }}>{tierAnalytics[key].expiringSoon} expiring</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Tier Editor Drawer */}
      {editingTier && (
        <div className="mem-detail-overlay" onClick={() => setEditingTier(null)}>
          <div className="mem-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="mem-detail-header">
              <h2 style={{ margin: 0, fontSize: 17 }}>Edit {tierConfig[editingTier].label} Tier</h2>
              <button className="mem-detail-close" onClick={() => setEditingTier(null)}>X</button>
            </div>
            <div className="mem-detail-body" style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#7b8a9a", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>Annual Price (Rs)</label>
                <input type="number" value={tierEditPrice} onChange={e => setTierEditPrice(e.target.value)} style={inputStyle} min={0} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#7b8a9a", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>Benefits List</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tierEditBenefits.map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 8 }}>
                      <input type="text" value={b} onChange={e => { const u = [...tierEditBenefits]; u[i] = e.target.value; setTierEditBenefits(u); }} style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => setTierEditBenefits(prev => prev.filter((_, idx) => idx !== i))} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "white", color: "#e74c3c", cursor: "pointer", fontSize: 12 }}>X</button>
                    </div>
                  ))}
                  <button onClick={() => setTierEditBenefits(prev => [...prev, ""])} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px dashed #CDA751", background: "transparent", color: "#CDA751", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>+ Add Benefit</button>
                </div>
              </div>
            </div>
            <div className="mem-detail-footer">
              <button onClick={() => setEditingTier(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #CDA751", background: "white", color: "#CDA751", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveTier} disabled={tierSaving} style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: "#CDA751", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{tierSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="mem-content-area">
        {/* Filters */}
        <div className="mem-filters">
          <div className="mem-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input className="mem-search" placeholder="Search by name, email or ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="mem-filter-group">
            {["ALL", "SILVER", "GOLD", "PLATINUM"].map(t => (
              <button key={t} className={"mem-filter-btn " + (tierFilter === t ? "active" : "")} onClick={() => setTierFilter(t)}>
                {t === "ALL" ? "All Tiers" : tierConfig[t].label}
              </button>
            ))}
          </div>
          <select className="mem-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="expired">Inactive/Expired</option>
          </select>
        </div>

        {/* Member Detail Drawer */}
        {selectedMember && (
          <div className="mem-detail-overlay" onClick={() => setSelectedMember(null)}>
            <div className="mem-detail-panel" onClick={e => e.stopPropagation()}>
              <div className="mem-detail-header">
                <img src={DefaultAvatar} alt="Profile" className="mem-detail-avatar-img" style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #cda751" }} />
                <div>
                  <div className="mem-detail-name">{selectedMember.name}</div>
                  <div className="mem-detail-id">#{selectedMember.id}</div>
                </div>
                <button className="mem-detail-close" onClick={() => setSelectedMember(null)}>X</button>
              </div>

              <div className="mem-detail-body">
                <div className="mem-detail-stats">
                  <div className="mem-detail-stat">
                    <div className="mem-detail-stat-value">{selectedMember.sessions}</div>
                    <div className="mem-detail-stat-label">Sessions</div>
                  </div>
                  <div className="mem-detail-stat">
                    <div className="mem-detail-stat-value">Rs{((selectedMember.totalSpent || 0) / 1000).toFixed(1)}K</div>
                    <div className="mem-detail-stat-label">Total Spent</div>
                  </div>
                  <div className="mem-detail-stat">
                    <div className="mem-detail-stat-value">{daysUntilExpiry(selectedMember.expiryDate) > 0 ? daysUntilExpiry(selectedMember.expiryDate) : "Expired"}</div>
                    <div className="mem-detail-stat-label">Days Left</div>
                  </div>
                </div>

                <div className="mem-detail-info">
                  <div className="mem-detail-row"><span>Email</span><span>{selectedMember.email}</span></div>
                  <div className="mem-detail-row"><span>Phone</span><span>{selectedMember.phone}</span></div>
                  <div className="mem-detail-row"><span>Joined</span><span>{formatDate(selectedMember.joinDate)}</span></div>
                  <div className="mem-detail-row"><span>Expiry</span><span>{formatDate(selectedMember.expiryDate)}</span></div>
                  <div className="mem-detail-row"><span>Status</span><span className={"mem-status-pill " + selectedMember.status}>{selectedMember.status}</span></div>
                </div>

                <div className="mem-upgrade-section">
                  <div className="mem-upgrade-label">Change Membership Tier</div>
                  <div className="mem-tier-select-group">
                    {Object.entries(tierConfig).map(([key, cfg]) => (
                      <div key={key} className={"mem-tier-option " + (newTier === key ? "selected" : "")}
                        style={newTier === key ? { borderColor: cfg.color, background: cfg.bg } : {}}
                        onClick={() => setNewTier(key)}>
                        <span style={{ color: newTier === key ? cfg.color : "#4a5568", fontWeight: 600 }}>{cfg.label}</span>
                        <span style={{ fontSize: "11px", color: "#a0aec0" }}>Rs{cfg.price.toLocaleString("en-IN")}/yr</span>
                      </div>
                    ))}
                  </div>
                  <div className="mem-upgrade-benefits">
                    <div className="mem-upgrade-benefits-title">Included Benefits</div>
                    {(tierConfig[newTier]?.benefits || []).map((b, i) => (
                      <div key={i} className="mem-benefit-row">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tierConfig[newTier].color} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        {b}
                      </div>
                    ))}
                  </div>
                  {selectedMember.source === "mobile" && (
                    <div style={{ fontSize: 12, color: "#e67e22", fontStyle: "italic", marginTop: 8 }}>
                      This member is from the mobile app. Tier changes won't be synced back to mobile.
                    </div>
                  )}
                </div>
              </div>

              <div className="mem-detail-footer" style={{ paddingTop: 0 }}>
                {upgradeSuccess ? (
                  <div className="mem-success-msg">Tier updated successfully!</div>
                ) : (
                  <button className="mem-upgrade-btn" style={{ background: tierConfig[newTier]?.color }}
                    onClick={handleUpgrade} disabled={newTier === selectedMember.tier || upgradeSaving}>
                    {upgradeSaving ? "Saving..." : newTier === selectedMember.tier ? "Current Tier" : "Upgrade to " + tierConfig[newTier]?.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mem-table-panel">
          <div className="mem-table-wrap">
            <div className="table-scroll">
              {dataLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#64748b", fontSize: "14px", fontWeight: 600 }}>Loading memberships...</div>
              ) : (
                <table className="mem-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Membership Tier</th>
                      <th>Validity Period</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMembers.map(m => {
                      const cfg = tierConfig[m.tier];
                      return (
                        <tr key={m.id} className={"mem-row " + (selectedMember?.id === m.id ? "selected" : "")}>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <div className="user-cell">
                              <img src={DefaultAvatar} alt="profile" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0" }} />
                              <div className="mem-name" style={{ fontWeight: 600 }}>{m.name || "Unknown"}</div>
                            </div>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <div className="mem-email">{m.email || "-"}</div>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <span className="mem-tier-pill" style={{ color: cfg?.color }}>{cfg?.label || m.tier}</span>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <span style={{ fontSize: "14px", color: "#4a5568" }}>{formatValidity(m.joinDate, m.expiryDate)}</span>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <span className={"mem-status-pill " + (m.status || "").toLowerCase()}>{m.status}</span>
                          </td>
                          <td style={{ position: "relative" }}>
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <img src={ActionIcon} className="action-icon" alt="Actions" style={{ cursor: "pointer", filter: "grayscale(100%)", transition: "filter 0.2s" }}
                                onMouseEnter={e => e.currentTarget.style.filter = "grayscale(0%)"}
                                onMouseLeave={e => e.currentTarget.style.filter = "grayscale(100%)"}
                                onClick={e => { e.stopPropagation(); setOpenActionMenu(openActionMenu === m.id ? null : m.id); }} />
                              {openActionMenu === m.id && (
                                <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 1000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "160px", overflow: "hidden", textAlign: "left" }}>
                                  <div onClick={e => { e.stopPropagation(); setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); setOpenActionMenu(null); }}
                                    style={actionItemStyle}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>View</div>
                                  {m.status === "pending" && (
                                    <>
                                      <div onClick={e => handleAccept(e, m.id)} style={{ ...actionItemStyle, color: "#27ae60" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f0fff4"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Accept</div>
                                      <div onClick={e => handleReject(e, m.id)} style={{ ...actionItemStyle, color: "#e53e3e" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Reject</div>
                                    </>
                                  )}
                                  {m.status === "active" && (
                                    <div onClick={e => handleDeactivate(e, m.id)} style={{ ...actionItemStyle, color: "#e67e22" }}
                                      onMouseEnter={e => e.currentTarget.style.background = "#fffaf0"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Deactivate</div>
                                  )}
                                  {(m.status === "expired" || m.status === "inactive") && (
                                    <div onClick={e => handleRenew(e, m.id)} style={{ ...actionItemStyle, color: "#2d8cf0" }}
                                      onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Renew</div>
                                  )}
                                  <div onClick={e => handleDelete(e, m.id)} style={{ ...actionItemStyle, color: "#e53e3e", borderTop: "1px solid #f1f3f6" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Delete</div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!dataLoading && filteredMembers.length === 0 && (
                      <tr><td colSpan="6" style={{ padding: 32, textAlign: "center", color: "#a0aec0" }}>No members match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div className="table-pagination">
            <span>Showing {filteredMembers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}</span>
            <div className="pagination-controls">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <div className="page-numbers">
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={"e-" + i} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#64748b" }}>...</span>
                  ) : (
                    <button key={p} className={currentPage === p ? "active" : ""} onClick={() => setCurrentPage(p)}>{p}</button>
                  )
                )}
              </div>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}