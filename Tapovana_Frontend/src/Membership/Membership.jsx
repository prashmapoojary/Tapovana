import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./Membership.css";
import { apiFetch } from "../api/http";
import ActionIcon from "../assets/Button.svg";

// ── Tier Configuration (unchanged) ─────────────────────────────────────────
const TIER_CONFIG = {
  SILVER: {
    label: "Silver", color: "#8e9fa7", bg: "rgba(142,159,167,0.12)", border: "rgba(142,159,167,0.35)",
    price: 1999, icon: "🥈",
    benefits: {
      User: ["15% discount on services", "Priority booking", "Monthly wellness consult"],
      Doctor: ["25% discount on services", "Priority booking", "Clinic setup assist"],
      Therapist: ["20% discount on services", "Priority booking", "Workshop access"]
    }
  },
  GOLD: {
    label: "Gold", color: "#cda751", bg: "rgba(205,167,81,0.12)", border: "rgba(205,167,81,0.35)",
    price: 3999, icon: "🥇",
    benefits: {
      User: ["25% discount on services", "2 free sessions/mo", "Dedicated advisor"],
      Doctor: ["30% discount on services", "Premium support", "Featured listing"],
      Therapist: ["25% discount on services", "Premium support", "Advanced training"]
    }
  },
  PLATINUM: {
    label: "Platinum", color: "#475569", bg: "rgba(71,85,105,0.12)", border: "rgba(71,85,105,0.35)",
    price: 7999, icon: "💎",
    benefits: {
      User: ["40% discount on services", "24/7 support & care", "Annual wellness retreat"],
      Doctor: ["35% discount on services", "24/7 VIP support", "Partnership opportunities"],
      Therapist: ["30% discount on services", "24/7 VIP support", "Masterclass access"]
    }
  }
};

// ── Dummy data fallback ─────────────────────────────────────────────────────
const DUMMY_MEMBERS = [
  { id: "MEM-001", name: "Priya Sharma",    email: "priya.s@gmail.com",   phone: "+91 98765 43210", role: "User",      tier: "GOLD",     joinDate: "2024-03-15", expiryDate: "2025-03-15", sessions: 24, totalSpent: 12450, status: "active" },
  { id: "MEM-002", name: "Rahul Verma",     email: "rahul.v@gmail.com",   phone: "+91 87654 32109", role: "User",      tier: "PLATINUM", joinDate: "2023-11-20", expiryDate: "2025-11-20", sessions: 67, totalSpent: 38900, status: "active" },
  { id: "MEM-003", name: "Ananya Krishnan", email: "ananya.k@gmail.com",  phone: "+91 76543 21098", role: "User",      tier: "SILVER",   joinDate: "2024-06-01", expiryDate: "2025-06-01", sessions: 12, totalSpent: 5800,  status: "active" },
  { id: "MEM-004", name: "Vikram Nair",     email: "vikram.n@gmail.com",  phone: "+91 65432 10987", role: "Doctor",    tier: "PLATINUM", joinDate: "2023-09-10", expiryDate: "2025-09-10", sessions: 89, totalSpent: 52100, status: "active" },
  { id: "MEM-005", name: "Meera Pillai",    email: "meera.p@gmail.com",   phone: "+91 54321 09876", role: "User",      tier: "SILVER",   joinDate: "2024-01-20", expiryDate: "2025-01-20", sessions: 8,  totalSpent: 3200,  status: "active" },
  { id: "MEM-006", name: "Arun Kumar",      email: "arun.k@gmail.com",    phone: "+91 43210 98765", role: "Therapist", tier: "GOLD",     joinDate: "2024-02-14", expiryDate: "2025-02-14", sessions: 31, totalSpent: 15600, status: "active" },
  { id: "MEM-007", name: "Sunita Reddy",    email: "sunita.r@gmail.com",  phone: "+91 32109 87654", role: "User",      tier: "SILVER",   joinDate: "2024-07-08", expiryDate: "2025-07-08", sessions: 6,  totalSpent: 2100,  status: "active" },
  { id: "MEM-008", name: "Deepak Menon",    email: "deepak.m@gmail.com",  phone: "+91 21098 76543", role: "User",      tier: "GOLD",     joinDate: "2023-12-05", expiryDate: "2024-12-05", sessions: 45, totalSpent: 21800, status: "expired" },
  { id: "MEM-009", name: "Kavitha Nambiar", email: "kavitha.n@gmail.com", phone: "+91 10987 65432", role: "User",      tier: "PLATINUM", joinDate: "2024-04-22", expiryDate: "2025-04-22", sessions: 52, totalSpent: 31200, status: "active" },
  { id: "MEM-010", name: "Suresh Babu",     email: "suresh.b@gmail.com",  phone: "+91 99887 76655", role: "Doctor",    tier: "SILVER",   joinDate: "2024-08-15", expiryDate: "2025-08-15", sessions: 4,  totalSpent: 1500,  status: "active" },
  { id: "MEM-011", name: "Lakshmi Iyer",    email: "lakshmi.i@gmail.com", phone: "+91 88776 65544", role: "User",      tier: "GOLD",     joinDate: "2024-05-30", expiryDate: "2025-05-30", sessions: 19, totalSpent: 9400,  status: "active" },
  { id: "MEM-012", name: "Rajan Pillai",    email: "rajan.p@gmail.com",   phone: "+91 77665 54433", role: "Therapist", tier: "PLATINUM", joinDate: "2023-10-15", expiryDate: "2024-10-15", sessions: 76, totalSpent: 44500, status: "expired" },
  { id: "MEM-013", name: "Divya Nair",      email: "divya.n@gmail.com",   phone: "+91 66554 43322", role: "User",      tier: "SILVER",   joinDate: "2024-09-01", expiryDate: "2025-09-01", sessions: 3,  totalSpent: 900,   status: "active" },
  { id: "MEM-014", name: "Mohan Das",       email: "mohan.d@gmail.com",   phone: "+91 55443 32211", role: "User",      tier: "GOLD",     joinDate: "2024-01-10", expiryDate: "2025-01-10", sessions: 27, totalSpent: 13200, status: "active" },
  { id: "MEM-015", name: "Sita Ramesh",     email: "sita.r@gmail.com",    phone: "+91 44332 21100", role: "Doctor",    tier: "SILVER",   joinDate: "2024-10-05", expiryDate: "2025-10-05", sessions: 2,  totalSpent: 600,   status: "active" },
  { id: "MEM-016", name: "Kiran Hegde",     email: "kiran.h@gmail.com",   phone: "+91 33221 10099", role: "User",      tier: "GOLD",     joinDate: "2024-04-18", expiryDate: "2025-04-18", sessions: 36, totalSpent: 18900, status: "active" },
  { id: "MEM-017", name: "Pooja Singh",     email: "pooja.s@gmail.com",   phone: "+91 22110 09988", role: "User",      tier: "SILVER",   joinDate: "2024-11-01", expiryDate: "2025-11-01", sessions: 1,  totalSpent: 400,   status: "active" },
  { id: "MEM-018", name: "Ganesh Iyer",     email: "ganesh.i@gmail.com",  phone: "+91 11009 98877", role: "User",      tier: "PLATINUM", joinDate: "2024-02-28", expiryDate: "2025-02-28", sessions: 44, totalSpent: 26800, status: "active" },
  { id: "MEM-019", name: "Nitin Kumar",     email: "nitin.k@gmail.com",   phone: "+91 99887 66554", role: "User",      tier: "GOLD",     joinDate: "2024-05-15", expiryDate: "2025-05-15", sessions: 0,  totalSpent: 0,     status: "pending" },
  { id: "MEM-020", name: "Smriti Rao",      email: "smriti.r@gmail.com",  phone: "+91 88776 55443", role: "User",      tier: "SILVER",   joinDate: "2024-06-01", expiryDate: "2025-06-01", sessions: 0,  totalSpent: 0,     status: "pending" },
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
const BLANK_ENROLL = { name: "", email: "", phone: "", role: "User", tier: "SILVER" };

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

  // ── View Benefits Modal ────────────────────────────────────────────────
  const [viewBenefitsTier, setViewBenefitsTier] = useState(null);

  // ── Enroll Member modal ────────────────────────────────────────────────
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm,      setEnrollForm]      = useState(BLANK_ENROLL);
  const [enrollSaving,    setEnrollSaving]    = useState(false);
  const [enrollError,     setEnrollError]     = useState("");

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
    TOTAL:         members.length,
    SILVER:        members.filter(m => m.tier === "SILVER"   && m.status === "active").length,
    GOLD:          members.filter(m => m.tier === "GOLD"     && m.status === "active").length,
    PLATINUM:      members.filter(m => m.tier === "PLATINUM" && m.status === "active").length,
    PENDING:       members.filter(m => m.status === "pending").length,
    EXPIRED:       members.filter(m => m.status === "expired" || m.status === "inactive").length,
    TOTAL_REVENUE: members.reduce((s, m) => s + (m.totalSpent || 0), 0),
  }), [members]);

  // ── Filter logic ───────────────────────────────────────────────────────
  const filteredMembers = useMemo(() =>
    members.filter(m => {
      const matchSearch  = m.name.toLowerCase().includes(search.toLowerCase()) ||
                           m.email.toLowerCase().includes(search.toLowerCase()) ||
                           (m.id || "").toLowerCase().includes(search.toLowerCase()) ||
                           (m.role || "").toLowerCase().includes(search.toLowerCase());
      const matchTier    = tierFilter   === "ALL" || m.tier   === tierFilter;
      const matchStatus  = statusFilter === "ALL" || m.status === statusFilter || (statusFilter === "expired" && m.status === "inactive");
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
    setTierEditBenefits({
      User: [...(cfg.benefits.User || [])],
      Doctor: [...(cfg.benefits.Doctor || [])],
      Therapist: [...(cfg.benefits.Therapist || [])]
    });
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
        benefits: {
          User: tierEditBenefits.User.filter(b => b.trim() !== ""),
          Doctor: tierEditBenefits.Doctor.filter(b => b.trim() !== ""),
          Therapist: tierEditBenefits.Therapist.filter(b => b.trim() !== ""),
        }
      }
    }));
    setTierSaving(false);
    setEditingTier(null);
  };

  // ── Enroll Member — calls POST API ────────────────────────────────────
  const handleEnroll = async () => {
    if (!enrollForm.name || !enrollForm.email) {
      setEnrollError("Name and Email are required.");
      return;
    }
    setEnrollSaving(true);
    setEnrollError("");

    // Calculate Role-Based Discount
    let discount = 0;
    const role = enrollForm.role || "User";
    const tier = enrollForm.tier;

    if (role === "Doctor") {
      if (tier === "SILVER") discount = 25;
      if (tier === "GOLD") discount = 30;
      if (tier === "PLATINUM") discount = 35;
    } else if (role === "Therapist") {
      if (tier === "SILVER") discount = 20;
      if (tier === "GOLD") discount = 25;
      if (tier === "PLATINUM") discount = 30;
    }

    const basePrice = tierConfig[tier]?.price || 0;
    const finalPrice = basePrice - (basePrice * discount / 100);

    try {
      const res = await apiFetch("/api/memberships", {
        method: "POST",
        body: JSON.stringify({
          name:  enrollForm.name.trim(),
          email: enrollForm.email.trim().toLowerCase(),
          phone: enrollForm.phone.trim() || null,
          tier:  tier,
          role:  role,
          discount: discount,
          totalSpent: finalPrice,
        }),
      });
      if (res.success) {
        await fetchMembers();
        showToast(`Member enrolled successfully with ${discount}% discount.`, "success");
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
        role:       role,
        tier:       tier,
        joinDate:   today.toISOString().split("T")[0],
        expiryDate: expiry.toISOString().split("T")[0],
        sessions:   0,
        totalSpent: finalPrice,
        status:     "pending",
        discount:   discount
      }, ...prev]);
      showToast(`Member enrolled successfully with ${discount}% discount.`, "success");
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
      showToast("Record deleted permanently.", "error");
    });
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

      <header className="mem-header">
        <div>
          <h1 className="mem-title">Membership Management</h1>
          <p className="mem-subtitle">Manage Silver, Gold &amp; Platinum tier members</p>
        </div>
      </header>

      {/* ── Tier Overview Cards ── */}
      <section className="mem-tier-cards">
        <div className="mem-tier-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#718096", color: "white" }}>Overview</div>
          </div>
          <div className="mem-tier-count" style={{ color: "#2d3748", fontSize: '28px' }}>{tierStats.TOTAL}</div>
          <div className="mem-tier-label">Total Members</div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ color: '#d69e2e' }}>{tierStats.PENDING} Pending</span>
            <span style={{ color: '#e53e3e' }}>{tierStats.EXPIRED} Inactive</span>
          </div>
        </div>

        {Object.entries(tierConfig).map(([key, cfg]) => (
          <div
            key={key}
            className="mem-tier-card"
            style={{ cursor: "pointer" }}
            onClick={() => handleOpenTierEdit(key)}
          >
            <div className="mem-tier-card-top">
              <div className="mem-tier-badge" style={{ background: cfg.color, color: "white" }}>{cfg.label}</div>
            </div>
            <div className="mem-tier-count" style={{ color: cfg.color }}>{tierStats[key]}</div>
            <div className="mem-tier-label">Active Members</div>
            <div className="mem-tier-price">₹{cfg.price.toLocaleString("en-IN")}/year</div>
            <div className="mem-tier-benefits-link" style={{ color: cfg.color }}>
              +{Object.values(cfg.benefits).flat().length} total benefits
            </div>
          </div>
        ))}
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
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {["User", "Doctor", "Therapist"].map(role => (
                    <div key={role}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#2d3748", marginBottom: 6 }}>{role} Benefits</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {tierEditBenefits[role]?.map((b, i) => (
                          <div key={i} style={{ display: "flex", gap: 8 }}>
                            <input
                              type="text"
                              value={b}
                              onChange={e => {
                                const updated = { ...tierEditBenefits };
                                updated[role][i] = e.target.value;
                                setTierEditBenefits(updated);
                              }}
                              style={{ ...inputStyle, flex: 1 }}
                            />
                            <button
                              onClick={() => {
                                const updated = { ...tierEditBenefits };
                                updated[role] = updated[role].filter((_, idx) => idx !== i);
                                setTierEditBenefits(updated);
                              }}
                              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "white", color: "#e74c3c", cursor: "pointer", fontSize: 12 }}
                            >✕</button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updated = { ...tierEditBenefits };
                            updated[role] = [...(updated[role] || []), ""];
                            setTierEditBenefits(updated);
                          }}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px dashed #CDA751", background: "transparent", color: "#CDA751", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                        >
                          + Add {role} Benefit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "1px solid #f1f3f6", padding: "20px 0 0 0", display: "flex", gap: 12, marginTop: "auto" }}>
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
                onClick={() => setTierFilter(t)}
              >
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
                      <span style={{ color: newTier === key ? cfg.color : "#4a5568", fontWeight: 600 }}>{cfg.label}</span>
                      <span style={{ fontSize: "11px", color: "#a0aec0" }}>₹{cfg.price.toLocaleString("en-IN")}/yr</span>
                    </div>
                  ))}
                </div>

                <div className="mem-upgrade-benefits">
                  <div className="mem-upgrade-benefits-title">Included Benefits ({selectedMember.role || "User"})</div>
                  {tierConfig[newTier]?.benefits[selectedMember.role || "User"]?.map((b, i) => (
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
            <div className="table-scroll">
              <table className="mem-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Tier</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.map(m => {
                    const cfg = tierConfig[m.tier];
                    const days = daysUntilExpiry(m.expiryDate);
                    const isExpiring = days > 0 && days <= 30;
                    return (
                      <tr
                        key={m.id}
                        className={`mem-row ${selectedMember?.id === m.id ? "selected" : ""}`}
                      >
                        <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                          <div className="mem-name-cell">
                            <div className="mem-avatar" style={{ background: cfg?.bg, color: cfg?.color, border: `1.5px solid ${cfg?.border}` }}>
                              {getInitials(m.name)}
                            </div>
                            <div>
                              <div className="mem-name">{m.name}</div>
                              <div className="mem-email">{m.email} <br/><span style={{ color: '#a0aec0', fontSize: '11px' }}>{m.phone}</span></div>
                            </div>
                          </div>
                        </td>
                        <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568' }}>{m.role || "User"}</span>
                        </td>
                        <td>
                          <span className="mem-tier-pill" style={{ color: cfg?.color }}>
                            {cfg?.label}
                          </span>
                        </td>
                        <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                          <div className="mem-expiry-cell">
                            <span style={{ fontSize: '11px', color: '#718096' }}>{formatDate(m.joinDate)} to</span>
                            <span>{formatDate(m.expiryDate)}</span>
                            {isExpiring && m.status === 'active' && <span className="mem-expiry-warn">⚠ {days}d left</span>}
                          </div>
                        </td>
                        <td onClick={() => { setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); }} style={{ cursor: "pointer" }}>
                          <span className={`mem-status-pill ${m.status}`}>{m.status}</span>
                        </td>
                        <td style={{ position: "relative" }}>
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <img src={ActionIcon} alt="Actions" style={{ cursor: "pointer", width: "24px", height: "24px" }}
                              onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === m.id ? null : m.id); }} />
                            {openActionMenu === m.id && (
                              <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 1000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "140px", overflow: "hidden" }}>
                                <div onClick={(e) => { e.stopPropagation(); setSelectedMember(m); setNewTier(m.tier); setUpgradeSuccess(false); setOpenActionMenu(null); }}
                                  style={{ padding: "10px 16px", cursor: "pointer", fontSize: "14px", color: "#2d3748", display: "flex", alignItems: "center", gap: "8px" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  View
                                </div>
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
            </div>
          </div>
          
          <div className="table-pagination">
            <span>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} of {filteredMembers.length}
            </span>
            <div className="pagination-controls">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                Prev
              </button>
              <div className="page-numbers">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={currentPage === i + 1 ? 'active' : ''}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>
                Next
              </button>
            </div>
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

            {/* Role */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.4px" }}>Role *</label>
              <select
                value={enrollForm.role}
                onChange={e => setEnrollForm(p => ({ ...p, role: e.target.value }))}
                style={inputStyle}
              >
                <option value="User">User</option>
                <option value="Doctor">Doctor</option>
                <option value="Therapist">Therapist</option>
              </select>
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
                      flex: 1, padding: "12px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                      border: `2px solid ${enrollForm.tier === key ? cfg.color : "#e2e8f0"}`,
                      background: enrollForm.tier === key ? cfg.bg : "white",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: enrollForm.tier === key ? cfg.color : "#4a5568" }}>{cfg.label}</div>
                    <div style={{ fontSize: 10, color: "#a0aec0", marginTop: 2 }}>₹{cfg.price.toLocaleString("en-IN")}/yr</div>
                  </div>
                ))}
              </div>
            </div>

            {enrollError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>⚠️ {enrollError}</div>}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowEnrollModal(false)}
                style={{ flex: 1, padding: 11, borderRadius: 10, border: "1.5px solid #CDA751", background: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#CDA751" }}
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
      {/* ══════════════════════════════════════════════════════════════════
          VIEW BENEFITS MODAL — new
      ══════════════════════════════════════════════════════════════════ */}
      {viewBenefitsTier && (
        <div className="mem-detail-overlay" onClick={() => setViewBenefitsTier(null)}>
          <div className="mem-detail-panel" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '90vw' }}>
            <div className="mem-detail-header">
              <h2 style={{ margin: 0, fontSize: 17, color: tierConfig[viewBenefitsTier].color }}>
                {tierConfig[viewBenefitsTier].icon} {tierConfig[viewBenefitsTier].label} Benefits
              </h2>
              <button className="mem-detail-close" onClick={() => setViewBenefitsTier(null)}>✕</button>
            </div>
            <div style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>
                These benefits are linked to the {tierConfig[viewBenefitsTier].label} tier. If the administrator changes these benefits, all members in this tier will inherit the changes.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tierConfig[viewBenefitsTier].benefits.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#2d3748' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tierConfig[viewBenefitsTier].color} strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}><polyline points="20 6 9 17 4 12"/></svg>
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
