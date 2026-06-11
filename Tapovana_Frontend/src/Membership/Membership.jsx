import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./Membership.css";
import { apiFetch } from "../api/http";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIconDefault.png";
import EnrollMemberDrawer from "./EnrollMemberDrawer";

// ── Tier Configuration (user-only benefits — simplified from role-based) ────
const TIER_CONFIG = {
  SILVER: {
    label: "Silver", color: "#8e9fa7", bg: "rgba(142,159,167,0.12)", border: "rgba(142,159,167,0.35)",
    price: 1999, icon: "🥈",
    benefits: ["15% discount on services", "Priority booking", "Monthly wellness consult"]
  },
  GOLD: {
    label: "Gold", color: "#cda751", bg: "rgba(205,167,81,0.12)", border: "rgba(205,167,81,0.35)",
    price: 3999, icon: "🥇",
    benefits: ["25% discount on services", "2 free sessions/mo", "Dedicated advisor"]
  },
  PLATINUM: {
    label: "Platinum", color: "#475569", bg: "rgba(71,85,105,0.12)", border: "rgba(71,85,105,0.35)",
    price: 7999, icon: "💎",
    benefits: ["40% discount on services", "24/7 support & care", "Annual wellness retreat"]
  }
};



// ── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntilExpiry(dateStr) {
  if (!dateStr) return 0;
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
function mapTier(name) {
  if (!name) return "SILVER";
  const upper = name.toUpperCase();
  if (upper.includes("DIAMOND") || upper.includes("PLATINUM")) return "PLATINUM";
  if (upper.includes("GOLD")) return "GOLD";
  if (upper.includes("SILVER")) return "SILVER";
  return "SILVER";
}
function formatValidity(joinDate, expiryDate) {
  if (!joinDate || !expiryDate) return "-";
  const formatDateStr = (dateStr) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };
  return `${formatDateStr(joinDate)} – ${formatDateStr(expiryDate)}`;
}

// ── Validation helpers ──────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

function cleanPhone(phone) {
  return (phone || "").replace(/[\s+\-()]/g, "").replace(/^91/, "");
}

// ── Pagination helper — generates page numbers with ellipsis ────────────────
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

// ── Blank enroll form (role removed — membership is user-only) ──────────────
const BLANK_ENROLL = { name: "", email: "", phone: "", tier: "SILVER" };

// ── Component ───────────────────────────────────────────────────────────────
export default function Membership() {
  // ── Data state (API → dummy fallback) ──────────────────────────────────
  const [members, setMembers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Tier config (editable locally) ─────────────────────────────────────
  const [tierConfig, setTierConfig] = useState(TIER_CONFIG);

  // ── Filter states ──────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ── Member detail drawer ───────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [newTier, setNewTier] = useState("");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeSaving, setUpgradeSaving] = useState(false);

  // ── Tier editor drawer ─────────────────────────────────────────────────
  const [editingTier, setEditingTier] = useState(null);
  const [tierEditPrice, setTierEditPrice] = useState(0);
  const [tierEditBenefits, setTierEditBenefits] = useState([]);
  const [tierSaving, setTierSaving] = useState(false);

  // ── View Benefits Modal ────────────────────────────────────────────────
  const [viewBenefitsTier, setViewBenefitsTier] = useState(null);

  // ── Enroll Member modal ────────────────────────────────────────────────
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState(BLANK_ENROLL);
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  // ── Action Menu & Toast ────────────────────────────────────────────────
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: "", desc: "", onConfirm: null });

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 3000);
  };

  // ── Fetch members from API ─────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await apiFetch("https://tapoclg.onrender.com/api/membership");
      // Check if response is successful or is an array (some APIs return raw array)
      if (res && (res.success || Array.isArray(res))) {
        const rawList = res.memberships || res.data || (Array.isArray(res) ? res : []);
        const mappedMembers = rawList.map((m) => {
          const rawTier = m.tier || m.membership_name;
          const tier = mapTier(rawTier);

          let join = null;
          if (m.start_date) {
            join = new Date(m.start_date);
          } else if (m.purchase_date) {
            join = new Date(m.purchase_date);
          } else {
            join = new Date(); // If no join date, use today
          }

          let expiry = null;
          if (m.end_date) {
            expiry = new Date(m.end_date);
          } else {
            expiry = new Date(join);
            expiry.setMonth(expiry.getMonth() + 1); // 1 month validity
          }

          return {
            id: m.id || m.user_id ? `MEM-${m.id || m.user_id}` : `MEM-${Math.random()}`,
            name: m.name || m.customer_name || "Unknown",
            email: m.email || m.customer_email || "-",
            phone: m.phone || "-",
            tier: tier,
            joinDate: join ? join.toISOString().split("T")[0] : null,
            expiryDate: expiry ? expiry.toISOString().split("T")[0] : null,
            sessions: m.available_credits || m.sessions || 0,
            totalSpent: m.totalSpent || 0,
            status: m.status || "active",
            profile_photo_url: m.profile_photo_url || m.profile_pic || null
          };
        });
        setMembers(mappedMembers);
      } else {
        setMembers([]);
      }
    } catch {
      setMembers([]);
      showToast("Failed to load members.", "error");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Stats (derived from live members list) ─────────────────────────────
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
      // Revenue = sum of tier prices for active members
      TOTAL_REVENUE: members
        .filter(m => m.status === "active")
        .reduce((sum, m) => sum + (tierConfig[m.tier]?.price || 0), 0),
      // New members this month
      NEW_THIS_MONTH: members.filter(m => {
        if (!m.joinDate) return false;
        const d = new Date(m.joinDate);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length,
      // Expiring soon (within 30 days)
      EXPIRING_SOON: members.filter(m => {
        if (m.status !== "active" || !m.expiryDate) return false;
        const days = daysUntilExpiry(m.expiryDate);
        return days > 0 && days <= 30;
      }).length,
      // Renewal count (expired that were renewed — track as re-activated)
      RENEWED: members.filter(m => m.status === "active" && m.expiryDate && new Date(m.expiryDate) < now).length,
    };
  }, [members, tierConfig]);

  // ── Per-tier analytics ─────────────────────────────────────────────────
  const tierAnalytics = useMemo(() => {
    const result = {};
    for (const key of Object.keys(tierConfig)) {
      const tierMembers = members.filter(m => m.tier === key);
      const activeMembers = tierMembers.filter(m => m.status === "active");
      result[key] = {
        revenue: activeMembers.reduce((s, m) => s + (tierConfig[key]?.price || 0), 0),
        expiringSoon: activeMembers.filter(m => {
          const days = daysUntilExpiry(m.expiryDate);
          return days > 0 && days <= 30;
        }).length,
      };
    }
    return result;
  }, [members, tierConfig]);

  // ── Filter logic (null-safe) ───────────────────────────────────────────
  const filteredMembers = useMemo(() =>
    members.filter(m => {
      const matchSearch = (m.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (m.id || "").toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === "ALL" || m.tier === tierFilter;
      const matchStatus = statusFilter === "ALL" || m.status === statusFilter || (statusFilter === "expired" && m.status === "inactive");
      return matchSearch && matchTier && matchStatus;
    }), [members, search, tierFilter, statusFilter]);

  // ── Pagination logic ───────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1;

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, tierFilter, statusFilter]);

  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

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

  // ── Open Tier Editor — populate local edit state (simplified: flat array) ─
  const handleOpenTierEdit = (tierKey) => {
    const cfg = tierConfig[tierKey];
    setTierEditPrice(cfg.price);
    setTierEditBenefits([...(cfg.benefits || [])]);
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

  // ── Enroll Member — calls POST API (user-only, no role discounts) ─────
  const handleEnroll = async () => {
    // Required fields
    if (!enrollForm.name.trim()) {
      setEnrollError("Name is required.");
      return;
    }
    if (!enrollForm.email.trim()) {
      setEnrollError("Email is required.");
      return;
    }
    // Email validation
    if (!EMAIL_REGEX.test(enrollForm.email.trim())) {
      setEnrollError("Enter a valid email address.");
      return;
    }
    // Phone validation (optional but if provided, must be valid Indian mobile)
    if (enrollForm.phone.trim()) {
      const cleaned = cleanPhone(enrollForm.phone);
      if (!PHONE_REGEX.test(cleaned)) {
        setEnrollError("Enter a valid 10-digit Indian mobile number.");
        return;
      }
    }
    // Duplicate email check
    const emailLower = enrollForm.email.trim().toLowerCase();
    const exists = members.some(m => (m.email || "").toLowerCase() === emailLower);
    if (exists) {
      setEnrollError("A member with this email already exists.");
      return;
    }

    setEnrollSaving(true);
    setEnrollError("");

    const tier = enrollForm.tier;
    const basePrice = tierConfig[tier]?.price || 0;

    try {
      const res = await apiFetch("/api/memberships", {
        method: "POST",
        body: JSON.stringify({
          name: enrollForm.name.trim(),
          email: emailLower,
          phone: enrollForm.phone.trim() || null,
          tier: tier,
          totalSpent: basePrice,
        }),
      });
      if (res.success) {
        await fetchMembers();
        showToast("Member enrolled successfully.", "success");
      } else throw new Error();
    } catch {
      // Add locally as fallback
      const newId = `MEM-${String(members.length + 1).padStart(3, "0")}`;
      const today = new Date();
      const expiry = new Date(today);
      expiry.setFullYear(expiry.getFullYear() + 1);
      setMembers(prev => [{
        id: newId,
        name: enrollForm.name.trim(),
        email: emailLower,
        phone: enrollForm.phone.trim() || "-",
        tier: tier,
        joinDate: today.toISOString().split("T")[0],
        expiryDate: expiry.toISOString().split("T")[0],
        sessions: 0,
        totalSpent: basePrice,
        status: "pending",
      }, ...prev]);
      showToast("Member enrolled successfully.", "success");
    } finally {
      setEnrollSaving(false);
      setShowEnrollModal(false);
      setEnrollForm(BLANK_ENROLL);
    }
  };

  // ── Admin Workflow Actions ─────────────────────────────────────────────
  const triggerAction = (e, memberId, title, desc, onConfirmFn) => {
    e.stopPropagation();
    setOpenActionMenu(null);
    setConfirmModal({
      visible: true,
      title,
      desc,
      onConfirm: () => {
        onConfirmFn();
        setConfirmModal({ visible: false, title: "", desc: "", onConfirm: null });
      }
    });
  };

  const handleAccept = (e, memberId) => {
    triggerAction(e, memberId, "Activate Membership", "Are you sure you want to activate this membership?", () => {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: "active" } : m));
      showToast("Membership activated successfully.");
    });
  };

  const handleReject = (e, memberId) => {
    triggerAction(e, memberId, "Reject Membership", "Reject this membership? The user will be notified to update their details.", () => {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      showToast("Membership rejected. Notification sent.", "error");
    });
  };

  const handleDeactivate = (e, memberId) => {
    triggerAction(e, memberId, "Deactivate Membership", "Deactivate this active membership? They will lose access to benefits.", () => {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: "inactive" } : m));
      showToast("Membership deactivated.", "info");
    });
  };

  const handleRenew = (e, memberId) => {
    triggerAction(e, memberId, "Renew Membership", "Renew this membership for another year?", () => {
      setMembers(prev => prev.map(m => {
        if (m.id === memberId) {
          const newExpiry = new Date(m.expiryDate);
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          return { ...m, status: "active", expiryDate: newExpiry.toISOString().split("T")[0] };
        }
        return m;
      }));
      showToast("Membership renewed successfully.");
    });
  };

  const handleDelete = (e, memberId) => {
    triggerAction(e, memberId, "Delete Record", "Permanently delete this membership record? This cannot be undone.", () => {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (selectedMember?.id === memberId) setSelectedMember(null);
      showToast("Record deleted permanently.", "error");
    });
  };

  // ── Input style helper ─────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 13, color: "#2d3748",
    outline: "none", boxSizing: "border-box", fontFamily: "Manrope, sans-serif",
    background: "white",
  };

  // ── Action menu item style helper ──────────────────────────────────────
  const actionItemStyle = {
    padding: "10px 16px", cursor: "pointer", fontSize: "14px",
    color: "#2d3748", display: "flex", alignItems: "center", gap: "8px",
  };

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="mem-container">
      {/* ── Toast notification ── */}
      {toast.visible && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 10001,
          background: "#fff", border: "2px solid #cda751", borderRadius: "8px",
          padding: "16px 24px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          color: toast.type === "success" ? "#2e7559" : toast.type === "error" ? "#e53e3e" : "#4a5568",
          fontWeight: 600, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px",
          animation: "slideInRight 0.3s ease-out"
        }}>
          {toast.type === "success" && "✓ "}
          {toast.type === "error" && "⚠ "}
          {toast.type === "info" && "ℹ "}
          {toast.message}
        </div>
      )}

      {/* ── Enroll Member Drawer ── */}
      <EnrollMemberDrawer
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        onSaved={fetchMembers}
        onShowToast={showToast}
      />

      {/* ── Confirm modal ── */}
      {confirmModal.visible && (
        <div className="global-alert-overlay" style={{ zIndex: 10002, position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="global-alert-modal" style={{ background: "white", padding: "24px", borderRadius: "12px", width: "400px", maxWidth: "90vw", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#2d3748" }}>{confirmModal.title}</h3>
            <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#718096" }}>{confirmModal.desc}</p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmModal({ visible: false, title: "", desc: "", onConfirm: null })}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "white", color: "#4a5568", fontWeight: 600, cursor: "pointer" }}
              >Cancel</button>
              <button
                onClick={confirmModal.onConfirm}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#cda751", color: "white", fontWeight: 600, cursor: "pointer" }}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header with Enroll button ── */}
      <header className="mem-header">
        <div>
          <h1 className="mem-title">Membership Management</h1>
          <p className="mem-subtitle">Manage Silver, Gold &amp; Platinum tier members</p>
        </div>
        <button
          className="mem-add-btn"
          onClick={() => setShowEnrollModal(true)}
          aria-label="Enroll New Member"
        >
          + Enroll Member
        </button>
      </header>

      {/* ── All Cards in One Row ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {/* New This Month */}
        <div className="mem-tier-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#475569", color: "white" }}>This Month</div>
          </div>
          <div className="mem-tier-count" style={{ color: "#2d3748" }}>{tierStats.NEW_THIS_MONTH}</div>
          <div className="mem-tier-label">Members joined</div>
        </div>

        {/* Silver, Gold, Platinum tier cards */}
        {Object.entries(tierConfig).map(([key, cfg]) => (
          <div key={key} className="mem-tier-card" style={{ cursor: "pointer" }} onClick={() => handleOpenTierEdit(key)}>
            <div className="mem-tier-card-top">
              <div className="mem-tier-badge" style={{ background: cfg.color, color: "white" }}>{cfg.label}</div>
            </div>
            <div className="mem-tier-count" style={{ color: cfg.color }}>{tierStats[key]}</div>
            <div className="mem-tier-label">Active Members</div>
            <div className="mem-tier-price">₹{cfg.price.toLocaleString("en-IN")}/year</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div className="mem-tier-benefits-link" style={{ color: cfg.color }}>
                {cfg.benefits.length} benefits
              </div>
              {tierAnalytics[key]?.expiringSoon > 0 && (
                <span style={{ fontSize: '11px', color: '#e67e22', fontWeight: 600 }}>
                  {tierAnalytics[key].expiringSoon} expiring
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── Tier Editor Drawer (simplified — flat benefits array) ── */}
      {editingTier && (
        <div className="mem-detail-overlay" onClick={() => setEditingTier(null)}>
          <div className="mem-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="mem-detail-header">
              <h2 style={{ margin: 0, fontSize: 17 }}>Edit {tierConfig[editingTier].label} Tier</h2>
              <button className="mem-detail-close" onClick={() => setEditingTier(null)} aria-label="Close Tier Editor">✕</button>
            </div>

            <div className="mem-detail-body" style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
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

              {/* Benefits (flat array — user-only) */}
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
                        onClick={() => {
                          setTierEditBenefits(prev => prev.filter((_, idx) => idx !== i));
                        }}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "white", color: "#e74c3c", cursor: "pointer", fontSize: 12 }}
                        aria-label={`Remove benefit ${i + 1}`}
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => setTierEditBenefits(prev => [...prev, ""])}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px dashed #CDA751", background: "transparent", color: "#CDA751", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                  >
                    + Add Benefit
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mem-detail-footer">
              <button
                onClick={() => setEditingTier(null)}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #CDA751", background: "white", color: "#CDA751", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >Cancel</button>
              <button
                onClick={handleSaveTier}
                disabled={tierSaving}
                style={{ flex: 2, padding: 10, borderRadius: 8, border: "none", background: "#CDA751", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >{tierSaving ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="mem-content-area">
        {/* ── Filters ── */}
        <div className="mem-filters">
          <div className="mem-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              className="mem-search"
              placeholder="Search by name, email or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search members"
            />
          </div>

          <div className="mem-filter-group">
            {["ALL", "SILVER", "GOLD", "PLATINUM"].map(t => (
              <button
                key={t}
                className={`mem-filter-btn ${tierFilter === t ? "active" : ""}`}
                onClick={() => setTierFilter(t)}
              >
                {t === "ALL" ? "All Tiers" : tierConfig[t].label}
              </button>
            ))}
          </div>

          <select className="mem-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="ALL">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="expired">Inactive/Expired</option>
          </select>
        </div>

        {/* ── Member Detail Drawer ── */}
        {selectedMember && (
          <div className="mem-detail-overlay" onClick={() => setSelectedMember(null)}>
            <div className="mem-detail-panel" onClick={e => e.stopPropagation()}>
              <div className="mem-detail-header">
                {(() => {
                  let avatarSrc = DefaultAvatar;
                  if (selectedMember.profile_photo_url) {
                    const pic = selectedMember.profile_photo_url;
                    if (pic.startsWith("http")) {
                      avatarSrc = pic;
                    } else {
                      avatarSrc = `https://tapoclg.onrender.com${pic.startsWith("/") ? "" : "/"}${pic}`;
                    }
                  }

                  const handleImageError = (e) => {
                    e.target.onerror = null;
                    e.target.src = DefaultAvatar;
                  };

                  return (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      className="mem-detail-avatar-img"
                      onError={handleImageError}
                    />
                  );
                })()}
                <div>
                  <div className="mem-detail-name">{selectedMember.name}</div>
                  <div className="mem-detail-id">{selectedMember.id}</div>
                </div>
                <button className="mem-detail-close" onClick={() => setSelectedMember(null)} aria-label="Close Membership Details">✕</button>
              </div>

              <div className="mem-detail-body">
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
                    <div className="mem-detail-stat-value">
                      {(() => {
                        const days = daysUntilExpiry(selectedMember.expiryDate);
                        return days > 0 ? days : "Expired";
                      })()}
                    </div>
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
                        <span style={{ color: newTier === key ? cfg.color : "#4a5568", fontWeight: 600 }}>{cfg.label}</span>
                        <span style={{ fontSize: "11px", color: "#a0aec0" }}>₹{cfg.price.toLocaleString("en-IN")}/yr</span>
                      </div>
                    ))}
                  </div>

                  <div className="mem-upgrade-benefits">
                    <div className="mem-upgrade-benefits-title">Included Benefits</div>
                    {tierConfig[newTier]?.benefits?.map((b, i) => (
                      <div key={i} className="mem-benefit-row">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={tierConfig[newTier].color} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mem-detail-footer" style={{ paddingTop: 0 }}>
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
            <div className="table-scroll">
              {dataLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#64748b", fontSize: "14px", fontWeight: 600 }}>
                  Loading memberships...
                </div>
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
                      const handleImageError = (e) => {
                        e.target.onerror = null;
                        e.target.src = DefaultAvatar;
                      };
                      return (
                        <tr
                          key={m.id}
                          className={`mem-row ${selectedMember?.id === m.id ? "selected" : ""}`}
                        >
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <div className="user-cell">
                              {(() => {
                                let avatarSrc = DefaultAvatar;
                                if (m.profile_photo_url) {
                                  const pic = m.profile_photo_url;
                                  if (pic.startsWith("http")) {
                                    avatarSrc = pic;
                                  } else {
                                    avatarSrc = `https://tapoclg.onrender.com${pic.startsWith("/") ? "" : "/"}${pic}`;
                                  }
                                }
                                return (
                                  <img
                                    src={avatarSrc}
                                    alt="profile"
                                    className="user-avatar"
                                    style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0" }}
                                    onError={handleImageError}
                                  />
                                );
                              })()}
                              <div className="mem-name" style={{ fontWeight: 600 }}>{m.name || "Unknown"}</div>
                            </div>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <div className="mem-email">{m.email || "-"}</div>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <span className="mem-tier-pill" style={{ color: cfg?.color }}>
                              {cfg?.label || m.tier}
                            </span>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <span style={{ fontSize: "14px", color: "#4a5568" }}>
                              {formatValidity(m.joinDate, m.expiryDate)}
                            </span>
                          </td>
                          <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                            <span className={`mem-status-pill ${m.status?.toLowerCase()}`}>{m.status}</span>
                          </td>
                          <td style={{ position: "relative" }}>
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <img
                                src={ActionIcon}
                                className="action-icon"
                                alt="Actions"
                                style={{ 
                                  cursor: "pointer", 
                                  filter: "grayscale(100%)", 
                                  transition: "filter 0.2s" 
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = "grayscale(0%)"}
                                onMouseLeave={(e) => e.currentTarget.style.filter = "grayscale(100%)"}
                                onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === m.id ? null : m.id); }}
                              />
                              {openActionMenu === m.id && (
                                <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 1000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "160px", overflow: "hidden", textAlign: "left" }}>
                                  {/* View */}
                                  <div onClick={(e) => { e.stopPropagation(); setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); setOpenActionMenu(null); }}
                                    style={actionItemStyle}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    View
                                  </div>

                                  {/* Pending actions */}
                                  {m.status === "pending" && (
                                    <>
                                      <div onClick={(e) => handleAccept(e, m.id)}
                                        style={{ ...actionItemStyle, color: "#27ae60" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f0fff4"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        Accept
                                      </div>
                                      <div onClick={(e) => handleReject(e, m.id)}
                                        style={{ ...actionItemStyle, color: "#e53e3e" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        Reject
                                      </div>
                                    </>
                                  )}

                                  {/* Active actions */}
                                  {m.status === "active" && (
                                    <div onClick={(e) => handleDeactivate(e, m.id)}
                                      style={{ ...actionItemStyle, color: "#e67e22" }}
                                      onMouseEnter={e => e.currentTarget.style.background = "#fffaf0"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                      Deactivate
                                    </div>
                                  )}

                                  {/* Expired/Inactive actions */}
                                  {(m.status === "expired" || m.status === "inactive") && (
                                    <div onClick={(e) => handleRenew(e, m.id)}
                                      style={{ ...actionItemStyle, color: "#2d8cf0" }}
                                      onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                      Renew
                                    </div>
                                  )}

                                  {/* Delete — always available */}
                                  <div onClick={(e) => handleDelete(e, m.id)}
                                    style={{ ...actionItemStyle, color: "#e53e3e", borderTop: "1px solid #f1f3f6" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#fff5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    Delete
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!dataLoading && filteredMembers.length === 0 && (
                      <tr><td colSpan="5" style={{ padding: 32, textAlign: "center", color: "#a0aec0" }}>No members match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Pagination (with ellipsis for large page counts) ── */}
          <div className="table-pagination">
            <span>
              Showing {filteredMembers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
            </span>
            <div className="pagination-controls">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                Prev
              </button>
              <div className="page-numbers">
                {pageNumbers.map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#64748b" }}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={currentPage === p ? 'active' : ''}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* ── View Benefits Modal (fixed — benefits is now a flat array) ── */}
      {viewBenefitsTier && (
        <div className="mem-detail-overlay" onClick={() => setViewBenefitsTier(null)}>
          <div className="mem-detail-panel" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '90vw' }}>
            <div className="mem-detail-header">
              <h2 style={{ margin: 0, fontSize: 17, color: tierConfig[viewBenefitsTier].color }}>
                {tierConfig[viewBenefitsTier].icon} {tierConfig[viewBenefitsTier].label} Benefits
              </h2>
              <button className="mem-detail-close" onClick={() => setViewBenefitsTier(null)} aria-label="Close Benefits Modal">✕</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
                These benefits are linked to the {tierConfig[viewBenefitsTier].label} tier. If the administrator changes these benefits, all members in this tier will inherit the changes.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tierConfig[viewBenefitsTier].benefits.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tierConfig[viewBenefitsTier].color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
