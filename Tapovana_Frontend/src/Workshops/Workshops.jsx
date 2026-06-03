import React, { useState, useMemo, useEffect } from "react";
import "./Workshops.css";
import { apiFetch } from "../api/http";
import { useAllocations } from "../utils/AllocationContext";
import { getImageUrl } from "../utils/image";

function WorkshopStaffAllocation({ ws, staff, onToast }) {
  const { allocateStaff, deallocateStaff, getAllocatedStaffForSession, getAllocatedStaffIds } = useAllocations();
  const [selectedStaff, setSelectedStaff] = useState(new Set());
  const [allocating, setAllocating] = useState(false);

  const allocatedIds = getAllocatedStaffIds();
  const currentAllocations = getAllocatedStaffForSession(ws.id);

  const isCompleted = ws.status === "completed" || new Date(ws.date) < new Date().setHours(0, 0, 0, 0);

  const handleStaffToggle = (staffId) => {
    if (isCompleted) return;
    const newSet = new Set(selectedStaff);
    if (newSet.has(staffId)) {
      newSet.delete(staffId);
    } else {
      newSet.add(staffId);
    }
    setSelectedStaff(newSet);
  };

  const handleAllocate = () => {
    if (isCompleted) {
      alert("Cannot allocate staff: This workshop is already completed.");
      return;
    }
    if (selectedStaff.size === 0) return;
    setAllocating(true);
    try {
      const selectedIds = Array.from(selectedStaff);
      let successCount = 0;
      selectedIds.forEach((staffId) => {
        const staffMember = staff.find((s) => s.user_id === staffId);
        if (staffMember) {
          const session = {
            id: ws.id,
            title: ws.title,
            startDate: ws.date,
            date: ws.date,
            endDate: ws.endDate || ws.date, // workshops are single-day; endDate equals date
          };
          const allocatedId = allocateStaff(staffMember, session, "workshop");
          if (allocatedId) successCount++;
        }
      });

      if (successCount > 0) {
        const names = selectedIds
          .map((id) => {
            const s = staff.find((x) => x.user_id === id);
            return s ? `${s.first_name} ${s.last_name}` : id;
          })
          .join(", ");
        onToast(`Allocated: ${names}. Simulated email notifications sent!`);
      }
      setSelectedStaff(new Set());
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setAllocating(false);
    }
  };

  const availableStaff = staff.filter((s) => {
    const isDoctorOrTherapist = s.role === "DOCTOR" || s.role === "THERAPIST";
    const isAlreadyAllocated = allocatedIds.includes(s.user_id);
    return isDoctorOrTherapist && !isAlreadyAllocated;
  });

  return (
    <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {isCompleted && (
        <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", padding: "12px", color: "#c53030", fontSize: "13px", fontWeight: 600 }}>
          🔒 Allocation locked: This workshop is completed and cannot have new staff allocated.
        </div>
      )}
      <div>
        <h4 style={{ margin: "0 0 10px", color: "#2d3748", fontSize: "14px", fontWeight: 700 }}>👥 Currently Allocated Staff</h4>
        {currentAllocations.length === 0 ? (
          <div style={{ background: "#f8f9fb", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", color: "#a0aec0", fontSize: "13px", textAlign: "center" }}>
            No staff allocated to this session yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {currentAllocations.map((alloc) => (
              <div
                key={alloc.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "#fdfbf7",
                  border: "1px solid rgba(205,167,81,0.2)",
                  borderRadius: "6px"
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "#2d3748", fontSize: "13px" }}>{alloc.staffName}</span>
                  <span style={{ fontSize: "11px", color: "#cda751", fontWeight: 700, marginLeft: "8px", background: "rgba(205,167,81,0.1)", padding: "1px 6px", borderRadius: "4px" }}>
                    {alloc.staffRole}
                  </span>
                </div>
                <button
                  onClick={() => deallocateStaff(alloc.id)}
                  style={{
                    padding: "4px 8px",
                    background: "transparent",
                    border: "1px solid #fca5a5",
                    borderRadius: "4px",
                    color: "#e74c3c",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Deallocate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr style={{ border: "0", borderTop: "1px solid #f1f3f7", margin: "4px 0" }} />

      <div>
        <h4 style={{ margin: "0 0 10px", color: "#2d3748", fontSize: "14px", fontWeight: 700 }}>🌱 Allocate New Staff (Only Available Shown)</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
          {availableStaff.length === 0 ? (
            <div style={{ color: "#a0aec0", fontSize: "13px", padding: "12px 0", textAlign: "center" }}>
              🍃 No available doctors or therapists found at this time.
            </div>
          ) : (
            availableStaff.map((s) => {
              const isSelected = selectedStaff.has(s.user_id);
              return (
                <label
                  key={s.user_id}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: isSelected ? "#fdfbf7" : "white",
                    borderColor: isSelected ? "#cda751" : "#e2e8f0",
                    transition: "all 0.2s"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleStaffToggle(s.user_id)}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "13px", color: "#4a5568", fontWeight: isSelected ? 600 : 400 }}>
                    {s.first_name} {s.last_name}
                  </span>
                  <span style={{ fontSize: "10px", color: "#718096", marginLeft: "auto", background: "#edf2f7", padding: "1px 6px", borderRadius: "4px" }}>
                    {s.role}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {availableStaff.length > 0 && (
          <button
            onClick={handleAllocate}
            disabled={allocating || selectedStaff.size === 0}
            style={{
              marginTop: "12px",
              width: "100%",
              padding: "10px",
              background: "#cda751",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {allocating ? "Saving..." : `✓ Save / Confirm Allocation (${selectedStaff.size} Selected)`}
          </button>
        )}
      </div>
    </div>
  );
}


const CATEGORY_COLORS = {
  "Yoga":       { color: "#CDA751", bg: "rgba(205,167,81,0.1)"  },
  "Meditation": { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  "Nutrition":  { color: "#2ecc71", bg: "rgba(46,204,113,0.1)"  },
  "Ayurveda":   { color: "#cda751", bg: "rgba(205,167,81,0.1)"  },
  "Holistic":   { color: "#e67e22", bg: "rgba(230,126,34,0.1)"  },
};

const STATUS_CONFIG = {
  upcoming:  { label: "Upcoming",  color: "#CDA751", bg: "rgba(205,167,81,0.1)"  },
  ongoing:   { label: "Ongoing",   color: "#2ecc71", bg: "rgba(46,204,113,0.1)"  },
  full:      { label: "Full",      color: "#e67e22", bg: "rgba(230,126,34,0.1)"  },
  completed: { label: "Completed", color: "#a0aec0", bg: "rgba(160,174,192,0.1)" },
};

const DUMMY_WORKSHOPS = [
  { id: "WS-001", title: "Morning Vinyasa Flow", category: "Yoga", instructor: "Dr. Rekha Menon", date: "2026-06-15", time: "07:00 AM", duration: 90, capacity: 20, enrolled: 18, price: 1500, status: "upcoming", description: "A dynamic yoga session focused on breath-synchronized movement to energize the body and calm the mind.", image: "https://images.unsplash.com/photo-1588286840104-8957b019727f?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-002", title: "Stress Relief Meditation", category: "Meditation", instructor: "Dr. Arjun Nair", date: "2026-06-18", time: "06:30 PM", duration: 60, capacity: 25, enrolled: 25, price: 800, status: "full", description: "Guided meditation techniques for deep relaxation and stress reduction, suitable for all levels.", image: "https://images.unsplash.com/photo-1602192509154-0b900ee1f851?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-003", title: "Ayurvedic Nutrition Workshop", category: "Nutrition", instructor: "Dr. Priya Krishnan", date: "2026-06-20", time: "10:00 AM", duration: 120, capacity: 15, enrolled: 11, price: 2500, status: "upcoming", description: "Learn the principles of Ayurvedic nutrition, seasonal eating, and customized diet planning.", image: "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-004", title: "Sound Healing & Chakra", category: "Holistic", instructor: "Guru Anandamaya", date: "2026-06-22", time: "05:00 PM", duration: 90, capacity: 12, enrolled: 7, price: 3000, status: "upcoming", description: "Experience the healing power of Tibetan singing bowls and chakra balancing for deep inner peace.", image: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-005", title: "Pranayama Intensive", category: "Yoga", instructor: "Dr. Sanjay Bhat", date: "2026-06-14", time: "07:00 AM", duration: 60, capacity: 20, enrolled: 20, price: 1200, status: "ongoing", description: "An intensive breathwork program covering all major pranayama techniques for vitality and longevity.", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-006", title: "Gut Health & Digestion", category: "Nutrition", instructor: "Dr. Priya Krishnan", date: "2026-06-10", time: "11:00 AM", duration: 90, capacity: 20, enrolled: 20, price: 2000, status: "completed", description: "Evidence-based workshop on gut microbiome, probiotics, and digestive wellness through Ayurveda.", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-007", title: "Mindfulness & Sleep Science", category: "Meditation", instructor: "Dr. Arjun Nair", date: "2026-06-25", time: "08:00 PM", duration: 60, capacity: 30, enrolled: 14, price: 600, status: "upcoming", description: "Combine mindfulness practices with sleep hygiene science for restorative and rejuvenating sleep.", image: "https://images.unsplash.com/photo-1505330622279-bf7d7fc9d8f4?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-008", title: "Abhyanga Massage Demo", category: "Ayurveda", instructor: "Dr. Kavitha Rao", date: "2026-06-28", time: "03:00 PM", duration: 120, capacity: 10, enrolled: 6, price: 3500, status: "upcoming", description: "Hands-on demonstration of traditional Ayurvedic oil massage techniques for self-care and healing.", image: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-009", title: "Flexibility & Mobility", category: "Yoga", instructor: "Dr. Rekha Menon", date: "2026-07-02", time: "08:00 AM", duration: 75, capacity: 18, enrolled: 9, price: 1000, status: "upcoming", description: "A therapeutic yoga session targeting joint mobility, flexibility and injury prevention.", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=800" },
  { id: "WS-010", title: "Detox & Cleanse Program", category: "Ayurveda", instructor: "Dr. Kavitha Rao", date: "2026-06-08", time: "09:00 AM", duration: 180, capacity: 8, enrolled: 8, price: 5000, status: "completed", description: "Three-hour deep dive into Panchakarma principles for body purification and cellular renewal.", image: "https://images.unsplash.com/photo-1579722820308-d74e571900a9?auto=format&fit=crop&q=80&w=800" },
];

// Dummy attendees per workshop (used as fallback)
const DUMMY_ATTENDEES = {
  "WS-001": [
    { ticket_id: "TKT-1001", name: "Rahul Sharma",  phone: "+91 98765 43210", payment: "PAID",    ticket_status: "confirmed" },
    { ticket_id: "TKT-1002", name: "Priya Desai",   phone: "+91 87654 32109", payment: "PAID",    ticket_status: "attended"  },
    { ticket_id: "TKT-1003", name: "Vikram Singh",  phone: "+91 76543 21098", payment: "PENDING", ticket_status: "confirmed" },
  ],
  "WS-002": [
    { ticket_id: "TKT-2001", name: "Anita Nair",    phone: "+91 65432 10987", payment: "PAID",    ticket_status: "attended"  },
    { ticket_id: "TKT-2002", name: "Sanjay Kumar",  phone: "+91 54321 09876", payment: "PAID",    ticket_status: "cancelled" },
  ],
};

// ── Blank form state for Add/Edit ──────────────────────────────────────────
const BLANK_FORM = {
  title: "", category: "Yoga", instructor: "",
  date: "", time: "", duration: 60,
  capacity: 20, price: "", status: "upcoming",
  description: "",
};

// ── WorkshopCard (enhanced with image support) ──────────────────────────────
function WorkshopCard({ w, onClick }) {
  const cat = CATEGORY_COLORS[w.category] || CATEGORY_COLORS["Yoga"];
  const st  = STATUS_CONFIG[w.status];
  const pct = Math.round((w.enrolled / w.capacity) * 100);

  const [imgFailed, setImgFailed] = useState(!w.image);

  return (
    <div className="ws-card" onClick={() => onClick(w)}>
      <div className="ws-card-banner" style={{ overflow: "hidden", position: "relative", height: "180px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px" }}>
        {!imgFailed ? (
          <img 
            src={getImageUrl(w.image)} 
            alt={w.title} 
            className="ws-card-banner-img" 
            onError={() => setImgFailed(true)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1
            }}
          />
        ) : (
          <div className="ws-card-banner-fallback" style={{
            background: `linear-gradient(135deg, ${cat.color}15, ${cat.color}35)`,
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1
          }}>
            <span style={{ fontSize: "56px", opacity: 0.7 }}>
              {w.category === "Yoga" ? "🧘" : w.category === "Meditation" ? "🕯️" : w.category === "Nutrition" ? "🥗" : w.category === "Ayurveda" ? "🌿" : "🔮"}
            </span>
          </div>
        )}
        <div className="ws-card-category-badge" style={{ background: cat.color, color: "white", zIndex: 2 }}>{w.category}</div>
        <div className="ws-card-status-badge" style={{ background: "#ffffff", color: st.color, border: `1px solid ${st.color}`, fontWeight: 700, zIndex: 2 }}>{st.label}</div>
      </div>

      <div className="ws-card-body">
        <h3 className="ws-card-title">{w.title}</h3>
        <div className="ws-card-instructor">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {w.instructor}
        </div>
        <div className="ws-card-meta">
          <div className="ws-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {w.time}
          </div>
          <div className="ws-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {w.duration} mins
          </div>
        </div>
        <div className="ws-card-enrollment">
          <div className="ws-card-enrollment-bar-wrap">
            <div className="ws-card-enrollment-bar" style={{ width: `${pct}%`, background: pct >= 100 ? "#e74c3c" : pct >= 80 ? "#e67e22" : cat.color }} />
          </div>
          <div className="ws-card-enrollment-text">
            <span>{w.enrolled}/{w.capacity} enrolled</span>
            <span style={{ color: pct >= 100 ? "#e74c3c" : cat.color, fontWeight: 700 }}>{pct}%</span>
          </div>
        </div>
        <div className="ws-card-footer">
          <span className="ws-card-price">₹{w.price.toLocaleString("en-IN")}</span>
          <button className="ws-card-btn" style={{ background: cat.color }} onClick={e => { e.stopPropagation(); onClick(w); }}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ticket status pill helper ──────────────────────────────────────────────
function TicketPill({ status }) {
  const cfg = {
    confirmed: { bg: "rgba(205,167,81,0.12)", color: "#cda751", label: "Confirmed" },
    attended:  { bg: "rgba(46,204,113,0.12)", color: "#2ecc71", label: "Attended"  },
    cancelled: { bg: "rgba(231,76,60,0.12)",  color: "#e74c3c", label: "Cancelled" },
  }[status] || { bg: "#f1f3f7", color: "#a0aec0", label: status };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}44`,
      padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700,
    }}>{cfg.label}</span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Workshops() {
  // ── Data state (API → dummy fallback) ──
  const [workshops, setWorkshops]   = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [toast, setToast] = useState(null);

  const fetchStaff = async () => {
    try {
      const res = await apiFetch("/api/teams/users?page=1&limit=100");
      if (res.success && res.users) {
        setStaff(res.users);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // ── Filter state ──
  const [category, setCategory] = useState("ALL");
  const [status,   setStatus]   = useState("ALL");
  const [search,   setSearch]   = useState("");

  // ── Detail modal state ──
  const [selectedWs,    setSelectedWs]    = useState(null);
  const [detailTab,     setDetailTab]     = useState("info");   // "info" | "attendees"
  const [attendees,     setAttendees]     = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // ── Add modal state ──
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [addForm,       setAddForm]       = useState(BLANK_FORM);
  const [addSaving,     setAddSaving]     = useState(false);
  const [addError,      setAddError]      = useState("");

  // ── Edit modal state ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm,      setEditForm]      = useState(BLANK_FORM);
  const [editSaving,    setEditSaving]    = useState(false);
  const [editError,     setEditError]     = useState("");

  const categories = ["ALL", ...Object.keys(CATEGORY_COLORS)];
  const statuses   = ["ALL", "upcoming", "ongoing", "full", "completed"];

  // ── Fetch workshops from API ──────────────────────────────────────────────
  const fetchWorkshops = async () => {
    try {
      setDataLoading(true);
      const res = await apiFetch("/api/workshops");
      if (res.success) {
        setWorkshops(res.workshops || []);
      } else {
        throw new Error("API returned failure");
      }
    } catch {
      setWorkshops(DUMMY_WORKSHOPS);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { fetchWorkshops(); }, []);

  // ── Stats (recalculated from live workshops list) ──
  const STATS = useMemo(() => ({
    total:         workshops.length,
    upcoming:      workshops.filter(w => w.status === "upcoming").length,
    totalEnrolled: workshops.reduce((s, w) => s + (w.enrolled || 0), 0),
    revenue:       workshops.reduce((s, w) => s + ((w.enrolled || 0) * (w.price || 0)), 0),
  }), [workshops]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    workshops.filter(w => {
      const matchCat    = category === "ALL" || w.category === category;
      const matchSt     = status   === "ALL" || w.status   === status;
      const matchSearch = w.title.toLowerCase().includes(search.toLowerCase()) ||
                          w.instructor.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSt && matchSearch;
    }), [workshops, category, status, search]);

  // ── Open detail modal + fetch attendees ──────────────────────────────────
  const handleOpenDetail = async (w) => {
    setSelectedWs(w);
    setDetailTab("info");
    setAttendees([]);
  };

  const handleLoadAttendees = async (ws) => {
    setAttendeesLoading(true);
    try {
      const res = await apiFetch(`/api/workshops/${ws.id}/attendees`);
      if (res.success) {
        setAttendees(res.attendees || []);
      } else throw new Error();
    } catch {
      setAttendees(DUMMY_ATTENDEES[ws.id] || []);
    } finally {
      setAttendeesLoading(false);
    }
  };

  const handleSwitchTab = (tab) => {
    setDetailTab(tab);
    if (tab === "attendees" && selectedWs) handleLoadAttendees(selectedWs);
  };

  // ── Toggle ticket status ──────────────────────────────────────────────────
  const handleToggleTicket = async (ticketId, currentStatus, bookingDate) => {
    // Cannot mark attended before booking date
    if (bookingDate) {
      const bDate = new Date(bookingDate);
      bDate.setHours(23, 59, 59, 999);
      if (bDate > new Date()) {
        alert(`Cannot mark attendance before the workshop date (${new Date(bookingDate).toLocaleDateString()}).`);
        return;
      }
    }
    const next = currentStatus === "attended" ? "confirmed" : "attended";
    try {
      await apiFetch(`/api/workshops/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ticket_status: next }),
      });
    } catch { /* ignore — update locally anyway */ }
    setAttendees(prev => prev.map(a =>
      a.ticket_id === ticketId ? { ...a, ticket_status: next } : a
    ));
  };

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm("Cancel this ticket? This cannot be undone.")) return;
    try {
      await apiFetch(`/api/workshops/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ ticket_status: "cancelled" }),
      });
    } catch { /* update locally */ }
    setAttendees(prev => prev.map(a =>
      a.ticket_id === ticketId ? { ...a, ticket_status: "cancelled" } : a
    ));
  };

  // ── Add Workshop ─────────────────────────────────────────────────────────
  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateWorkshop = async () => {
    setAddError("");
    if (!addForm.title.trim())      { setAddError("Title is required"); return; }
    if (!addForm.instructor.trim()) { setAddError("Instructor is required"); return; }
    if (!addForm.date)              { setAddError("Date is required"); return; }
    if (!addForm.price)             { setAddError("Price is required"); return; }

    // Date cannot be in the past
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const workshopDate = new Date(addForm.date);
    if (workshopDate < today) { setAddError("Workshop date cannot be set in the past"); return; }

    // Numeric validations
    if (Number(addForm.price) <= 0)    { setAddError("Price must be greater than 0"); return; }
    if (Number(addForm.capacity) < 1)  { setAddError("Capacity must be at least 1"); return; }
    if (Number(addForm.duration) <= 0) { setAddError("Duration must be greater than 0 minutes"); return; }

    // Cannot manually set status to completed when creating
    if (addForm.status === "completed") {
      setAddError("Cannot create a workshop with status 'completed'. Set a future date and mark it complete after it ends.");
      return;
    }

    try {
      setAddSaving(true);
      const res = await apiFetch("/api/workshops", {
        method: "POST",
        body: JSON.stringify({
          title:       addForm.title.trim(),
          category:    addForm.category,
          instructor:  addForm.instructor.trim(),
          date:        addForm.date,
          time:        addForm.time,
          duration:    Number(addForm.duration),
          capacity:    Number(addForm.capacity),
          price:       Number(addForm.price),
          status:      addForm.status,
          description: addForm.description.trim(),
          enrolled:    0,
        }),
      });
      if (res.success) {
        await fetchWorkshops();
      } else {
        // Add locally as fallback
        setWorkshops(prev => [{
          ...addForm,
          id: `WS-${String(prev.length + 1).padStart(3, "0")}`,
          enrolled: 0,
          duration: Number(addForm.duration),
          capacity: Number(addForm.capacity),
          price: Number(addForm.price),
        }, ...prev]);
      }
      setShowAddModal(false);
      setAddForm(BLANK_FORM);
    } catch {
      // Add locally as fallback
      setWorkshops(prev => [{
        ...addForm,
        id: `WS-${String(prev.length + 1).padStart(3, "0")}`,
        enrolled: 0,
        duration: Number(addForm.duration),
        capacity: Number(addForm.capacity),
        price: Number(addForm.price),
      }, ...prev]);
      setShowAddModal(false);
      setAddForm(BLANK_FORM);
    } finally {
      setAddSaving(false);
    }
  };

  // ── Edit Workshop ─────────────────────────────────────────────────────────
  const handleOpenEdit = (ws) => {
    setEditForm({
      title:       ws.title       || "",
      category:    ws.category    || "Yoga",
      instructor:  ws.instructor  || "",
      date:        ws.date        || "",
      time:        ws.time        || "",
      duration:    ws.duration    || 60,
      capacity:    ws.capacity    || 20,
      price:       ws.price       || "",
      status:      ws.status      || "upcoming",
      description: ws.description || "",
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    setEditError("");
    if (!editForm.title.trim())     { setEditError("Title is required"); return; }
    if (!editForm.instructor.trim()){ setEditError("Instructor is required"); return; }

    // Numeric validations
    if (Number(editForm.price) <= 0)    { setEditError("Price must be greater than 0"); return; }
    if (Number(editForm.capacity) < 1)  { setEditError("Capacity must be at least 1"); return; }
    if (Number(editForm.duration) <= 0) { setEditError("Duration must be greater than 0 minutes"); return; }

    // Capacity cannot be less than already enrolled
    if (selectedWs && Number(editForm.capacity) < (selectedWs.enrolled || 0)) {
      setEditError(`Capacity cannot be less than current enrolment (${selectedWs.enrolled} enrolled). Reduce enrolment first.`);
      return;
    }

    // Cannot set status to 'completed' if the workshop date hasn't passed yet
    if (editForm.status === "completed" && editForm.date) {
      const workshopDate = new Date(editForm.date);
      workshopDate.setHours(23, 59, 59, 999);
      if (workshopDate > new Date()) {
        setEditError(`Cannot mark as 'Completed' — workshop date (${new Date(editForm.date).toLocaleDateString()}) has not passed yet.`);
        return;
      }
    }

    try {
      setEditSaving(true);
      await apiFetch(`/api/workshops/${selectedWs.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title:       editForm.title.trim(),
          category:    editForm.category,
          instructor:  editForm.instructor.trim(),
          date:        editForm.date,
          time:        editForm.time,
          duration:    Number(editForm.duration),
          capacity:    Number(editForm.capacity),
          price:       Number(editForm.price),
          status:      editForm.status,
          description: editForm.description.trim(),
        }),
      });
      await fetchWorkshops();
    } catch {
      // Update locally as fallback
      setWorkshops(prev => prev.map(w =>
        w.id === selectedWs.id ? {
          ...w, ...editForm,
          duration: Number(editForm.duration),
          capacity: Number(editForm.capacity),
          price:    Number(editForm.price),
        } : w
      ));
    } finally {
      setEditSaving(false);
      setShowEditModal(false);
      setSelectedWs(prev => ({ ...prev, ...editForm }));
    }
  };

  // ── Reusable form field renderer ─────────────────────────────────────────
  const FormField = ({ label, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#404854", marginBottom: 2 }}>{label}</label>
      {children}
    </div>
  );

  const inputStyle = {
    padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205, 167, 81, 0.2)",
    fontSize: 13, color: "#333", outline: "none",
    fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box",
    background: "white",
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="ws-container">

      {/* ── Header ── */}
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Workshops &amp; Programs</h1>
          <p className="ws-subtitle">Manage wellness workshops, yoga classes and healing programs</p>
        </div>
        <button className="ws-add-btn" onClick={() => { setAddForm(BLANK_FORM); setAddError(""); setShowAddModal(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Workshop
        </button>
      </header>

      {/* ── Stats Row ── */}
      <section className="ws-stats-row">
        <div className="ws-stat-card">
          <div className="ws-stat-icon" style={{ background: "rgba(205,167,81,0.1)" }}>📅</div>
          <div><div className="ws-stat-value">{STATS.total}</div><div className="ws-stat-label">Total Programs</div></div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-icon" style={{ background: "rgba(46,204,113,0.1)" }}>🟢</div>
          <div><div className="ws-stat-value">{STATS.upcoming}</div><div className="ws-stat-label">Upcoming</div></div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-icon" style={{ background: "rgba(205,167,81,0.1)" }}>👥</div>
          <div><div className="ws-stat-value">{STATS.totalEnrolled}</div><div className="ws-stat-label">Total Enrolled</div></div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-icon" style={{ background: "rgba(139,92,246,0.1)" }}>💰</div>
          <div><div className="ws-stat-value">₹{(STATS.revenue / 1000).toFixed(0)}K</div><div className="ws-stat-label">Total Revenue</div></div>
        </div>
      </section>

      {/* ── Filters ── */}
      <div className="ws-filters">
        <div className="ws-search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="ws-search" placeholder="Search workshops or instructors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <select className="ws-select" value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c === "ALL" ? "All Categories" : c}</option>)}
        </select>

        <div className="ws-status-tabs">
          {statuses.map(s => (
            <button
              key={s}
              className={`ws-status-tab ${status === s ? "active" : ""}`}
              style={status === s && s !== "ALL" ? { background: STATUS_CONFIG[s]?.bg, color: STATUS_CONFIG[s]?.color, borderColor: STATUS_CONFIG[s]?.color + "66" } : {}}
              onClick={() => setStatus(s)}
            >
              {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ws-result-count">
        {dataLoading ? "Loading programs..." : `${filtered.length} programs found`}
      </div>

      {/* ── Workshop Cards Grid ── */}
      <div className="ws-grid">
        {filtered.map(w => <WorkshopCard key={w.id} w={w} onClick={handleOpenDetail} />)}
        {!dataLoading && filtered.length === 0 && (
          <div className="ws-empty">
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
            <div style={{ color: "#7b8a9a", fontSize: "15px" }}>No workshops match your search criteria</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DETAIL MODAL — with Info tab + Attendees/Tickets tab
      ══════════════════════════════════════════════════════════════════ */}
      {selectedWs && (
        <div className="ws-modal-overlay" onClick={() => setSelectedWs(null)}>
          <div className="ws-modal" style={{ width: 580 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="ws-modal-header" style={{ background: `linear-gradient(135deg, ${CATEGORY_COLORS[selectedWs.category]?.color}22, ${CATEGORY_COLORS[selectedWs.category]?.color}55)` }}>
              <div>
                <span className="ws-modal-cat" style={{ background: CATEGORY_COLORS[selectedWs.category]?.color, color: "white" }}>{selectedWs.category}</span>
                <h2 className="ws-modal-title">{selectedWs.title}</h2>
                <div className="ws-modal-instructor">by {selectedWs.instructor}</div>
              </div>
              <button className="ws-modal-close" onClick={() => setSelectedWs(null)}>✕</button>
            </div>

            {/* Tab row */}
            <div style={{ display: "flex", borderBottom: "1px solid #f1f3f7", padding: "0 28px" }}>
              {["info", "attendees", "staff"].map(t => (
                <button
                  key={t}
                  onClick={() => handleSwitchTab(t)}
                  style={{
                    padding: "12px 16px", border: "none", background: "none",
                    fontFamily: "Manrope, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    color: detailTab === t ? CATEGORY_COLORS[selectedWs.category]?.color : "#a0aec0",
                    borderBottom: detailTab === t ? `2px solid ${CATEGORY_COLORS[selectedWs.category]?.color}` : "2px solid transparent",
                    textTransform: "capitalize",
                  }}
                >
                  {t === "info" ? "📋 Info" : t === "attendees" ? `🎟️ Attendees (${attendees.length})` : "👥 Staff Allocation"}
                </button>
              ))}
            </div>

            {/* ── INFO TAB ── */}
            {detailTab === "info" && (
              <div className="ws-modal-body">
                <p className="ws-modal-desc">{selectedWs.description}</p>

                <div className="ws-modal-info-grid">
                  <div className="ws-modal-info-item">
                    <div className="ws-modal-info-label">📅 Date</div>
                    <div className="ws-modal-info-value">{new Date(selectedWs.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</div>
                  </div>
                  <div className="ws-modal-info-item">
                    <div className="ws-modal-info-label">🕐 Time</div>
                    <div className="ws-modal-info-value">{selectedWs.time} · {selectedWs.duration} mins</div>
                  </div>
                  <div className="ws-modal-info-item">
                    <div className="ws-modal-info-label">👥 Enrollment</div>
                    <div className="ws-modal-info-value">{selectedWs.enrolled} / {selectedWs.capacity} seats</div>
                  </div>
                  <div className="ws-modal-info-item">
                    <div className="ws-modal-info-label">💰 Price</div>
                    <div className="ws-modal-info-value">₹{selectedWs.price?.toLocaleString("en-IN")} per person</div>
                  </div>
                </div>

                <div className="ws-modal-actions">
                  {/* Edit Workshop — now opens edit modal */}
                  <button className="ws-modal-btn-secondary" onClick={() => handleOpenEdit(selectedWs)}>
                    ✏️ Edit Workshop
                  </button>
                  <button
                    className="ws-modal-btn-primary"
                    style={{ background: CATEGORY_COLORS[selectedWs.category]?.color }}
                    disabled={selectedWs.status === "full" || selectedWs.status === "completed"}
                    onClick={() => handleSwitchTab("attendees")}
                  >
                    {selectedWs.status === "full" ? "Workshop Full" : selectedWs.status === "completed" ? "Completed" : "🎟️ Manage Tickets"}
                  </button>
                </div>
              </div>
            )}

            {/* ── STAFF TAB ── */}
            {detailTab === "staff" && (
              <WorkshopStaffAllocation
                ws={selectedWs}
                staff={staff}
                onToast={(msg) => {
                  setToast(msg);
                  setTimeout(() => setToast(null), 4000);
                }}
              />
            )}

            {/* ── ATTENDEES / TICKETS TAB ── */}
            {detailTab === "attendees" && (
              <div className="ws-modal-body" style={{ padding: "20px 28px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#4a5568" }}>
                    {attendeesLoading ? "Loading attendees..." : `${attendees.length} registered attendees`}
                  </span>
                  {selectedWs.status !== "full" && selectedWs.status !== "completed" && (
                    <button
                      style={{
                        padding: "6px 14px", border: "none", borderRadius: 8,
                        background: CATEGORY_COLORS[selectedWs.category]?.color,
                        color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                      onClick={() => alert("Add Participant: Connect customer search to enroll modal here.")}
                    >
                      + Add Participant
                    </button>
                  )}
                </div>

                {attendeesLoading ? (
                  <div style={{ textAlign: "center", padding: 32, color: "#a0aec0" }}>Loading ticket records...</div>
                ) : attendees.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32, color: "#a0aec0", background: "#f8f9fb", borderRadius: 12, fontSize: 14 }}>
                    🎟️ No attendees registered yet.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8f9fb" }}>
                          {["Ticket ID", "Name", "Phone", "Payment", "Status", "Actions"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#8c9aa8", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {attendees.map((a, idx) => (
                          <tr key={a.ticket_id} style={{ borderTop: "1px solid #f1f3f7" }}>
                            <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11, color: "#7b8a9a" }}>{a.ticket_id}</td>
                            <td style={{ padding: "10px 12px", fontWeight: 600, color: "#2d3748" }}>{a.name}</td>
                            <td style={{ padding: "10px 12px", color: "#7b8a9a" }}>{a.phone}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <span style={{
                                background: a.payment === "PAID" ? "rgba(46,204,113,0.12)" : "rgba(230,126,34,0.12)",
                                color: a.payment === "PAID" ? "#2ecc71" : "#e67e22",
                                padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                              }}>{a.payment}</span>
                            </td>
                            <td style={{ padding: "10px 12px" }}><TicketPill status={a.ticket_status} /></td>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                {a.ticket_status !== "cancelled" && (
                                  <button
                                    onClick={() => handleToggleTicket(a.ticket_id, a.ticket_status, selectedWs.date)}
                                    style={{
                                      padding: "4px 10px", borderRadius: 6, border: "none",
                                      background: a.ticket_status === "attended" ? "rgba(46,204,113,0.12)" : "rgba(205,167,81,0.12)",
                                      color: a.ticket_status === "attended" ? "#2ecc71" : "#cda751",
                                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                                    }}
                                  >
                                    {a.ticket_status === "attended" ? "✓ Attended" : "Mark Attended"}
                                  </button>
                                )}
                                {a.ticket_status !== "cancelled" && (
                                  <button
                                    onClick={() => handleCancelTicket(a.ticket_id)}
                                    style={{
                                      padding: "4px 8px", borderRadius: 6, border: "1px solid #fca5a5",
                                      background: "white", color: "#e74c3c",
                                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ADD WORKSHOP MODAL — complete form with all fields
      ══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="ws-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ws-modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="ws-modal-header" style={{ paddingBottom: 16, borderBottom: "1px solid #E8E2D9" }}>
              <h2 className="ws-modal-title" style={{ margin: 0 }}>Create New Program</h2>
              <button className="ws-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <div className="ws-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Title */}
              <FormField label="Program Title *">
                <input name="title" value={addForm.title} onChange={handleAddFormChange}
                  className="ws-modal-input" placeholder="e.g. Sunset Yoga Flow" />
              </FormField>

              {/* Category + Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Category *">
                  <select name="category" value={addForm.category} onChange={handleAddFormChange} className="ws-modal-input">
                    {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select name="status" value={addForm.status} onChange={handleAddFormChange} className="ws-modal-input">
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </FormField>
              </div>

              {/* Instructor */}
              <FormField label="Instructor Name *">
                <input name="instructor" value={addForm.instructor} onChange={handleAddFormChange}
                  className="ws-modal-input" placeholder="e.g. Dr. Priya Krishnan" />
              </FormField>

              {/* Date + Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Date *">
                  <input type="date" name="date" value={addForm.date} onChange={handleAddFormChange} className="ws-modal-input" />
                </FormField>
                <FormField label="Start Time">
                  <input type="time" name="time" value={addForm.time} onChange={handleAddFormChange} className="ws-modal-input" />
                </FormField>
              </div>

              {/* Duration + Capacity + Price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <FormField label="Duration (mins)">
                  <input type="number" name="duration" value={addForm.duration} onChange={handleAddFormChange} className="ws-modal-input" min={15} step={15} />
                </FormField>
                <FormField label="Capacity (seats)">
                  <input type="number" name="capacity" value={addForm.capacity} onChange={handleAddFormChange} className="ws-modal-input" min={1} />
                </FormField>
                <FormField label="Price (₹) *">
                  <input type="number" name="price" value={addForm.price} onChange={handleAddFormChange} className="ws-modal-input" placeholder="1500" min={0} />
                </FormField>
              </div>

              {/* Description */}
              <FormField label="Description">
                <textarea name="description" value={addForm.description} onChange={handleAddFormChange}
                  rows={3} className="ws-modal-input" style={{ resize: "vertical" }}
                  placeholder="Brief description about this program..." />
              </FormField>

              {addError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>⚠️ {addError}</div>}

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button className="ws-modal-btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button
                  className="ws-modal-btn-primary"
                  style={{ flex: 2 }}
                  onClick={handleCreateWorkshop}
                  disabled={addSaving}
                >
                  {addSaving ? "Creating..." : "✓ Create Program"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          EDIT WORKSHOP MODAL — pre-filled form wired to PUT API
      ══════════════════════════════════════════════════════════════════ */}
      {showEditModal && selectedWs && (
        <div className="ws-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="ws-modal" style={{ width: 560 }} onClick={e => e.stopPropagation()}>
            <div className="ws-modal-header" style={{ paddingBottom: 16, borderBottom: "1px solid #f1f3f7" }}>
              <h2 className="ws-modal-title" style={{ margin: 0 }}>✏️ Edit Program</h2>
              <button className="ws-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="ws-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Title */}
              <FormField label="Program Title *">
                <input name="title" value={editForm.title} onChange={handleEditFormChange}
                  style={inputStyle} placeholder="Program title" />
              </FormField>

              {/* Category + Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Category *">
                  <select name="category" value={editForm.category} onChange={handleEditFormChange} style={inputStyle}>
                    {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select name="status" value={editForm.status} onChange={handleEditFormChange} style={inputStyle}>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="full">Full</option>
                    <option value="completed">Completed</option>
                  </select>
                </FormField>
              </div>

              {/* Instructor */}
              <FormField label="Instructor Name *">
                <input name="instructor" value={editForm.instructor} onChange={handleEditFormChange}
                  style={inputStyle} placeholder="Instructor name" />
              </FormField>

              {/* Date + Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FormField label="Date">
                  <input type="date" name="date" value={editForm.date} onChange={handleEditFormChange} style={inputStyle} />
                </FormField>
                <FormField label="Start Time">
                  <input type="time" name="time" value={editForm.time} onChange={handleEditFormChange} style={inputStyle} />
                </FormField>
              </div>

              {/* Duration + Capacity + Price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <FormField label="Duration (mins)">
                  <input type="number" name="duration" value={editForm.duration} onChange={handleEditFormChange} style={inputStyle} min={15} step={15} />
                </FormField>
                <FormField label="Capacity">
                  <input type="number" name="capacity" value={editForm.capacity} onChange={handleEditFormChange} style={inputStyle} min={1} />
                </FormField>
                <FormField label="Price (₹)">
                  <input type="number" name="price" value={editForm.price} onChange={handleEditFormChange} style={inputStyle} min={0} />
                </FormField>
              </div>

              {/* Description */}
              <FormField label="Description">
                <textarea name="description" value={editForm.description} onChange={handleEditFormChange}
                  rows={3} style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Program description..." />
              </FormField>

              {editError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>⚠️ {editError}</div>}

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button className="ws-modal-btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>Cancel</button>
                <button
                  className="ws-modal-btn-primary"
                  style={{ flex: 2, background: CATEGORY_COLORS[editForm.category]?.color || "#CDA751" }}
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                >
                  {editSaving ? "Saving..." : "✓ Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#2ecc71',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>✨ Staff Allocated Successfully!</div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>{toast}</div>
        </div>
      )}
    </div>
  );
}
