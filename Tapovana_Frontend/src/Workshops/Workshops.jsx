import React, { useState, useMemo, useEffect, useRef } from "react";
import "./Workshops.css";
import { apiFetch } from "../api/http";
import { getImageUrl } from "../utils/image";
import { useAllocations } from "../utils/AllocationContext";

// ─── Live status checker ─────────────────────────────────────────────
const getLiveStatus = (ws) => {
  if (ws.status === "completed") return "completed";
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

  if (ws.date !== today) {
    if (ws.date > today) return "upcoming";
    if (ws.date < today) return "completed";
  }

  const wsTime = ws.time || "";
  let wsHour = 0, wsMinute = 0;
  if (wsTime) {
    const match = wsTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (match[3].toUpperCase() === "PM" && h !== 12) h += 12;
      if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
      wsHour = h; wsMinute = m;
    } else {
      const parts = wsTime.split(":");
      wsHour = parseInt(parts[0]) || 0;
      wsMinute = parseInt(parts[1]) || 0;
    }
  }

  const wsStartStr = wsHour.toString().padStart(2, '0') + ":" + wsMinute.toString().padStart(2, '0');
  const wsEndMins = wsHour * 60 + wsMinute + (ws.duration || 60);
  const wsEndHour = Math.floor(wsEndMins / 60);
  const wsEndMin = wsEndMins % 60;
  const wsEndStr = wsEndHour.toString().padStart(2, '0') + ":" + wsEndMin.toString().padStart(2, '0');

  if (currentTime >= wsStartStr && currentTime <= wsEndStr) return "live";
  if (currentTime < wsStartStr) return "upcoming";
  return "completed";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const w = weekdays[date.getDay()];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${w}, ${d} ${m} ${y}`;
};

const CATEGORY_COLORS = {
  "Yoga": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Meditation": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Nutrition": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Ayurveda": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Holistic": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
};

const STATUS_CONFIG = {
  upcoming: { label: "Upcoming", color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  live: { label: "LIVE", color: "#e74c3c", bg: "rgba(231,76,60,0.15)" },
  completed: { label: "Completed", color: "#a0aec0", bg: "rgba(160,174,192,0.1)" },
};

const DUMMY_WORKSHOPS = [
  { id: "WS-001", title: "Morning Vinyasa Flow", category: "Yoga", date: "2026-06-15", time: "07:00 AM", duration: 90, capacity: 20, price: 1500, status: "upcoming", description: "A dynamic yoga session focused on breath-synchronized movement to energize the body and calm the mind." },
  { id: "WS-005", title: "Pranayama Intensive", category: "Yoga", date: "2026-06-14", time: "07:00 AM", duration: 60, capacity: 20, price: 1200, status: "ongoing", description: "An intensive breathwork program covering all major pranayama techniques for vitality and longevity." },
];

const BLANK_FORM = {
  title: "", category: "Yoga", instructor_id: "", instructor_name: "",
  date: "", time: "", duration: 60, capacity: 20,
  price: "", description: "", image_url: "", image_base64: "", video_url: "", video_file: null
};

// ─── File to base64 helper ────────────────────────────────────────────────
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

// ─── Workshop Card ────────────────────────────────────────────────────────
function WorkshopCard({ w, onClick }) {
  const liveStatus = getLiveStatus(w);
  const st = STATUS_CONFIG[liveStatus] || STATUS_CONFIG.upcoming;
  const cat = CATEGORY_COLORS[w.category] || CATEGORY_COLORS["Yoga"];
  const [imgFailed, setImgFailed] = useState(!w.image && !w.image_url && !w.image_base64);
  const displayImage = w.image || w.image_url || w.image_base64;

  return (
    <div className="ws-card" onClick={() => onClick({ ...w, _liveStatus: liveStatus })}>
      <div className="ws-card-banner" style={{ overflow: "hidden", position: "relative", height: 180, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: 14 }}>
        {!imgFailed && displayImage ? (
          <img src={getImageUrl(displayImage)} alt={w.title} onError={() => setImgFailed(true)}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />
        ) : (
          <div style={{ background: `linear-gradient(135deg, ${cat.color}15, ${cat.color}35)`, width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 1 }} />
        )}
        <div className="ws-card-category-badge" style={{ background: cat.color, color: "white", zIndex: 2 }}>{w.category}</div>
        <div className="ws-card-status-badge" style={{
          background: liveStatus === "live" ? "#e74c3c" : "#ffffff", color: st.color,
          border: `1px solid ${liveStatus === "live" ? "#e74c3c" : st.color}`, fontWeight: 700, zIndex: 2,
          animation: liveStatus === "live" ? "wsPulse 1.5s infinite" : "none"
        }}>{liveStatus === "live" ? "LIVE" : st.label}</div>
      </div>
      <div className="ws-card-body">
        <h3 className="ws-card-title">{w.title}</h3>
        <div className="ws-card-instructor" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#7b8a9a" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          {w.instructor_name || w.instructor || "Not assigned"}
        </div>
        <div className="ws-card-meta">
          <div className="ws-card-meta-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#7b8a9a" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            {w.date ? new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""} {w.time}
          </div>
          <div className="ws-card-meta-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#7b8a9a" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {w.duration} mins
          </div>
        </div>
        <div className="ws-card-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #f1f3f7" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#2d3748" }}>₹{(w.price || 0).toLocaleString("en-IN")}</span>
          <button className="ws-card-btn"
            onClick={e => { e.stopPropagation(); onClick({ ...w, _liveStatus: liveStatus }); }}>
            View Workshop
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function Workshops() {
  const { allocateStaff, allocations, triggerConfirm, triggerAlert } = useAllocations();
  const [workshops, setWorkshops] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [toast, setToast] = useState(null);

  // Filters
  const [activeTab, setActiveTab] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  // Detail / Edit view
  const [selectedWs, setSelectedWs] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Video player
  const [detailVideoPlaying, setDetailVideoPlaying] = useState(false);
  const [editVideoPlaying, setEditVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  const renderPreviewSection = (displayImage, displayVideo, isEdit = false) => {
    const isPlaying = isEdit ? editVideoPlaying : detailVideoPlaying;
    const setIsPlaying = isEdit ? setEditVideoPlaying : setDetailVideoPlaying;

    if (!displayVideo) {
      if (displayImage) {
        return (
          <div style={{ borderRadius: 8, overflow: "hidden", width: "100%", maxHeight: 320 }}>
            <img src={getImageUrl(displayImage)} alt="preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        );
      }
      return null;
    }

    return (
      <div>
        {!isPlaying ? (
          <div onClick={() => setIsPlaying(true)}
            style={{ position: "relative", width: "100%", height: 280, borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "#1a1a1a" }}>
            {displayImage ? (
              <img src={getImageUrl(displayImage)} alt="video cover"
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #2d3748, #1a202c)" }} />
            )}
            {/* Play button overlay */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              width: 64, height: 64, borderRadius: "50%", background: "rgba(205,167,81,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="6 3 20 12 6 21 6 3" /></svg>
            </div>
            <div style={{ position: "absolute", bottom: 12, left: 14, color: "white", fontSize: 12, background: "rgba(0,0,0,0.6)", padding: "4px 10px", borderRadius: 4 }}>
              Click to play video
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: 8, overflow: "hidden" }}>
            {displayVideo.includes("youtube") || displayVideo.includes("youtu.be") ? (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
                <iframe src={displayVideo.replace("watch?v=", "embed/")} title="Workshop Video"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  allowFullScreen />
              </div>
            ) : (
              <video ref={videoRef} controls autoPlay style={{ width: "100%", maxHeight: 400, borderRadius: 8 }}>
                <source src={displayVideo} />
              </video>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Fetch instructors ──────────────────────────────────────────────────
  const fetchInstructors = async () => {
    try {
      const res = await apiFetch("/api/teams/users?page=1&limit=100");
      if (res.success && res.users) {
        const docsAndTherapists = res.users.filter(u => u.role === 'DOCTOR' || u.role === 'THERAPIST');
        setInstructors(docsAndTherapists);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchInstructors(); }, []);

  // ─── Fetch workshops ──────────────────────────────────────────────────
  const fetchWorkshops = async () => {
    try {
      setDataLoading(true);
      const res = await apiFetch("/api/workshops");
      if (res.success) setWorkshops(res.workshops || []);
      else throw new Error("API returned failure");
    } catch {
      if (workshops.length === 0) setWorkshops(DUMMY_WORKSHOPS);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { fetchWorkshops(); }, []);

  // Auto-refresh live status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (workshops.length > 0) setWorkshops(prev => [...prev]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Stats ─────────────────────────────────────────────────────────────
  const STATS = useMemo(() => ({
    total: workshops.length,
    upcoming: workshops.filter(w => getLiveStatus(w) === "upcoming").length,
    live: workshops.filter(w => getLiveStatus(w) === "live").length,
    completed: workshops.filter(w => getLiveStatus(w) === "completed").length,
  }), [workshops]);

  // ─── Filter logic ──────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    workshops.filter(w => {
      const liveStatus = getLiveStatus(w);
      const tabMatch = activeTab === "ALL" || liveStatus === activeTab;
      const catMatch = category === "ALL" || w.category === category;
      const searchMatch = !search ||
        (w.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (w.instructor_name || w.instructor || "").toLowerCase().includes(search.toLowerCase());
      return tabMatch && catMatch && searchMatch;
    }), [workshops, activeTab, category, search]);

  const categories = ["ALL", ...Object.keys(CATEGORY_COLORS)];
  const tabs = ["ALL", "upcoming", "live", "completed"];

  // ─── Open detail view ────────────────────────────────────────────────────
  const handleOpenDetail = (w) => {
    setSelectedWs({ ...w });
    setIsEditing(false);
    setDetailVideoPlaying(false);
    setEditVideoPlaying(false);
  };

  // ─── Close detail view ───────────────────────────────────────────────────
  const handleCloseDetail = () => {
    setSelectedWs(null);
    setIsEditing(false);
    setDetailVideoPlaying(false);
    setEditVideoPlaying(false);
  };

  // ─── Start editing ──────────────────────────────────────────────────────
  const handleStartEdit = () => {
    setEditForm({
      title: selectedWs.title || "",
      category: selectedWs.category || "Yoga",
      instructor_id: selectedWs.instructor_id || "",
      instructor_name: selectedWs.instructor_name || selectedWs.instructor || "",
      date: selectedWs.date || "",
      time: selectedWs.time || "",
      duration: selectedWs.duration || 60,
      capacity: selectedWs.capacity || 20,
      price: selectedWs.price || "",
      description: selectedWs.description || "",
      image_url: selectedWs.image_url || selectedWs.image || "",
      image_base64: selectedWs.image_base64 || "",
      video_url: selectedWs.video_url || "",
      video_file: null,
    });
    setEditError("");
    setDetailVideoPlaying(false);
    setEditVideoPlaying(false);
    setIsEditing(true);
  };

  // ─── Cancel editing ─────────────────────────────────────────────────────
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError("");
    setDetailVideoPlaying(false);
    setEditVideoPlaying(false);
  };

  // ─── Save edit ─────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    setEditError("");
    if (!editForm.title.trim()) { setEditError("Title is required"); return; }
    if (Number(editForm.price) <= 0) { setEditError("Price must be greater than 0"); return; }

    try {
      setEditSaving(true);
      const body = {
        title: editForm.title.trim(),
        category: editForm.category,
        instructor: editForm.instructor_name || null,
        instructor_id: editForm.instructor_id || null,
        date: editForm.date,
        time: editForm.time,
        duration: Number(editForm.duration),
        capacity: Number(editForm.capacity),
        price: Number(editForm.price),
        description: editForm.description.trim(),
        image_url: editForm.image_base64 || editForm.image_url || null,
        video_url: editForm.video_url || null,
        assigned_staff_ids: editForm.instructor_id ? [editForm.instructor_id] : [],
      };

      await apiFetch("/api/workshops/" + selectedWs.id, { method: "PATCH", body: JSON.stringify(body) });
      await fetchWorkshops();
      setSelectedWs(prev => ({
        ...prev, ...editForm,
        image: editForm.image_base64 || editForm.image_url || prev.image,
        image_url: editForm.image_base64 || editForm.image_url
      }));
      setIsEditing(false);
      showToast("Workshop updated!");
    } catch {
      setWorkshops(prev => prev.map(w =>
        w.id === selectedWs.id ? { ...w, ...editForm, image: editForm.image_base64 || editForm.image_url || w.image, video_url: editForm.video_url } : w
      ));
      setSelectedWs(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Delete Workshop ───────────────────────────────────────────────────
  const handleDeleteWorkshop = async () => {
    const confirmed = await triggerConfirm("Are you sure you want to delete this workshop?", true);
    if (!confirmed) return;
    try {
      await apiFetch("/api/workshops/" + selectedWs.id, { method: "DELETE" });
      await fetchWorkshops();
      handleCloseDetail();
      showToast("Workshop deleted successfully!");
    } catch {
      setWorkshops(prev => prev.filter(w => w.id !== selectedWs.id));
      handleCloseDetail();
      showToast("Workshop deleted!");
    }
  };

  // ─── Create Workshop ───────────────────────────────────────────────────
  const handleCreateWorkshop = async () => {
    setAddError("");
    if (!addForm.title.trim()) { setAddError("Title is required"); return; }
    if (!addForm.date) { setAddError("Date is required"); return; }
    if (!addForm.price) { setAddError("Price is required"); return; }
    if (Number(addForm.price) <= 0) { setAddError("Price must be greater than 0"); return; }

    // Date and Conflict Validation dry-run check
    if (addForm.instructor_id) {
      const inst = instructors.find(i => i.user_id === addForm.instructor_id || i.id === addForm.instructor_id);
      if (inst) {
        // Date Check
        const sessionEndDate = new Date(addForm.date);
        sessionEndDate.setHours(23, 59, 59, 999);
        if (sessionEndDate < new Date()) {
          allocateStaff(inst, { title: addForm.title, startDate: addForm.date, date: addForm.date, endDate: addForm.date }, "workshop");
          return; // STOP!
        }

        // Overlap Check
        const staffId = inst.user_id || inst.id;
        const sessionStart = new Date(addForm.date);
        const hasConflict = (allocations || []).some((a) => {
          if (a.staffId !== staffId || a.status === "expired") return false;
          const existingStart = new Date(a.startDate);
          const existingEnd = new Date(a.endDate);
          if (a.endDate && a.endDate.length <= 10) existingEnd.setHours(23, 59, 59, 999);
          return sessionStart <= existingEnd && sessionEndDate >= existingStart;
        });

        if (hasConflict) {
          allocateStaff(inst, { title: addForm.title, startDate: addForm.date, date: addForm.date, endDate: addForm.date }, "workshop");
          return; // STOP!
        }
      }
    }

    try {
      setAddSaving(true);
      const body = {
        title: addForm.title.trim(),
        category: addForm.category,
        instructor_id: addForm.instructor_id || null,
        instructor: addForm.instructor_name || null,
        date: addForm.date,
        time: addForm.time,
        duration: Number(addForm.duration),
        capacity: Number(addForm.capacity) || 20,
        price: Number(addForm.price),
        description: addForm.description.trim(),
        image_url: addForm.image_base64 || addForm.image_url || null,
        video_url: addForm.video_url || null,
        status: "upcoming",
        enrolled: 0,
        assigned_staff_ids: addForm.instructor_id ? [addForm.instructor_id] : [],
      };

      const res = await apiFetch("/api/workshops", { method: "POST", body: JSON.stringify(body) });
      if (res.success) {
        if (addForm.instructor_id) {
          const inst = instructors.find(i => i.user_id === addForm.instructor_id || i.id === addForm.instructor_id);
          if (inst) {
            allocateStaff(inst, { id: res.workshop?.id || Date.now(), title: addForm.title, startDate: addForm.date, date: addForm.date, endDate: addForm.date }, "workshop");
          }
        }
        await fetchWorkshops();
        setShowAddModal(false);
        setAddForm(BLANK_FORM);
        showToast("Workshop created successfully!");
      }
    } catch {
      setWorkshops(prev => [{ ...addForm, id: "WS-" + Date.now(), enrolled: 0, duration: Number(addForm.duration), capacity: Number(addForm.capacity), price: Number(addForm.price), image: addForm.image_base64 || addForm.image_url }, ...prev]);
      setShowAddModal(false);
      setAddForm(BLANK_FORM);
    } finally {
      setAddSaving(false);
    }
  };

  // ─── Image file upload handler ──────────────────────────────────────────
  const handleImageFile = async (target, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { triggerAlert("Image must be less than 5MB"); return; }
    const base64 = await fileToBase64(file);
    if (target === "add") {
      setAddForm(prev => ({ ...prev, image_base64: base64, image_url: "" }));
    } else {
      setEditForm(prev => ({ ...prev, image_base64: base64, image_url: "" }));
    }
  };

  // ─── Video file/URL handler ─────────────────────────────────────────────
  const handleVideoFile = async (target, file) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (target === "add") {
      setAddForm(prev => ({ ...prev, video_url: objectUrl, video_file: file }));
    } else {
      setEditForm(prev => ({ ...prev, video_url: objectUrl, video_file: file }));
    }
  };

  // ─── Instructor change ──────────────────────────────────────────────────
  const handleInstructorChange = (target, e) => {
    const instructorId = e.target.value;
    const instructor = instructors.find(i => i.user_id === instructorId || i.id === instructorId);
    const name = instructor ? (instructor.first_name + " " + instructor.last_name).trim() : "";
    if (target === "add") {
      setAddForm(prev => ({ ...prev, instructor_id: instructorId, instructor_name: name }));
    } else {
      setEditForm(prev => ({ ...prev, instructor_id: instructorId, instructor_name: name }));
    }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  // ─── Render edit form ──────────────────────────────────────────────────
  const renderEditForm = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {renderPreviewSection(editForm.image_base64 || editForm.image_url, editForm.video_url, true)}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Program Title</label>
        <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Category</label>
          <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }}>
            {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Instructor</label>
          <select value={editForm.instructor_id} onChange={e => handleInstructorChange("edit", e)} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }}>
            <option value="">Select Instructor</option>
            {instructors.map(i => (
              <option key={i.user_id || i.id} value={i.user_id || i.id}>
                {i.first_name} {i.last_name} ({i.role === 'DOCTOR' ? 'Dr.' : 'Therapist'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Date</label>
          <input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Start Time</label>
          <input type="time" value={editForm.time} onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Duration (mins)</label>
          <input type="number" value={editForm.duration} onChange={e => setEditForm(p => ({ ...p, duration: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} min={15} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Capacity</label>
          <input type="number" value={editForm.capacity} onChange={e => setEditForm(p => ({ ...p, capacity: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} min={1} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Price (Rs)</label>
          <input type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} min={0} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Description</label>
        <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white", resize: "vertical" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Workshop Image</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }}
            onChange={e => { if (e.target.files[0]) handleImageFile("edit", e.target.files[0]); e.target.value = ''; }} id="editImageInput" />
          <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => document.getElementById("editImageInput")?.click()}>
            Browse Image
          </button>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
          <input value={editForm.image_url} onChange={e => setEditForm(p => ({ ...p, image_url: e.target.value, image_base64: "" }))}
            style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white", flex: 1 }} placeholder="https://..." />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {(editForm.image_base64 || editForm.image_url) && (
            <div style={{ position: "relative", width: 100, height: 70, borderRadius: 6, overflow: "hidden" }}>
              <img src={getImageUrl(editForm.image_base64 || editForm.image_url)} alt="preview"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { e.target.style.display = "none"; }} />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Workshop Video (Optional)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="file" accept="video/*" style={{ display: "none" }}
            onChange={e => { if (e.target.files[0]) handleVideoFile("edit", e.target.files[0]); e.target.value = ''; }} id="editVideoInput" />
          <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => document.getElementById("editVideoInput")?.click()}>
            Browse Video
          </button>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
          <input value={editForm.video_url} onChange={e => setEditForm(p => ({ ...p, video_url: e.target.value }))}
            style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white", flex: 1 }} placeholder="https://youtube.com/..." />
        </div>
      </div>

      {editError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>{editError}</div>}
    </div>
  );

  // ─── Render detail view ─────────────────────────────────────────────────
  const renderDetailView = () => {
    if (!selectedWs) return null;
    const ws = selectedWs;
    const liveStatus = ws._liveStatus || getLiveStatus(ws);
    const displayImage = ws.image || ws.image_url || ws.image_base64;
    const displayVideo = ws.video_url;

    return (
      <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "65vh" }}>
        {/* 1. Workshop Name */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#2d3748", margin: "0 0 4px 0" }}>{ws.title}</h2>

        {/* 2. Instructor Name */}
        <p style={{ fontSize: 14, color: "#7b8a9a", margin: "0 0 16px 0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7b8a9a" strokeWidth="2" style={{ marginRight: 4, verticalAlign: "middle" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Instructor: {ws.instructor_name || ws.instructor || "Not assigned"}
        </p>

        {/* 3. Preview Section */}
        <div style={{ marginBottom: 16 }}>
          {renderPreviewSection(displayImage, displayVideo, false)}
        </div>

        {/* 4. Description */}
        <p style={{ fontSize: 15, color: "#4a5568", lineHeight: 1.7, margin: "0 0 20px 0" }}>{ws.description}</p>

        {/* 5. Workshop Details */}
        <div style={{ background: "#f8f9fb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#2d3748" }}>Workshop Details</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: "#a0aec0" }}>Date</span>
              <br />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>
                {formatDate(ws.date)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#a0aec0" }}>Time</span>
              <br />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{ws.time || "N/A"} &middot; {ws.duration} mins</span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#a0aec0" }}>Instructor</span>
              <br />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{ws.instructor_name || ws.instructor || "Not assigned"}</span>
            </div>
            <div>
              <span style={{ fontSize: 12, color: "#a0aec0" }}>Price</span>
              <br />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>₹{Number(ws.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Edit, Cancel, Delete buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button className="ws-modal-btn-secondary ws-edit-trigger-btn" style={{ flex: 1.5 }} onClick={handleStartEdit}>
            Edit Workshop
          </button>
          <button className="ws-modal-btn-secondary ws-edit-trigger-btn" style={{ flex: 1 }} onClick={handleCloseDetail}>
            Cancel
          </button>
          <button className="ws-modal-btn-secondary ws-edit-trigger-btn" style={{ flex: 1.2 }} onClick={handleDeleteWorkshop}>
            Delete Workshop
          </button>
        </div>
      </div>
    );
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="ws-container">
      {/* ── HEADER (hide when in detail view) ── */}
      {!selectedWs && (
        <>
          <header className="ws-header">
            <div>
              <h1 className="ws-title">Workshops & Programs</h1>
              <p className="ws-subtitle">Manage wellness workshops with live streaming and instructor allocation</p>
            </div>
            <button className="ws-add-btn" onClick={() => { setAddForm(BLANK_FORM); setAddError(""); setShowAddModal(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Workshop
            </button>
          </header>

          <section className="ws-stats-row">
            <div className="ws-stat-card"><div><div className="ws-stat-value">{STATS.total}</div><div className="ws-stat-label">Total Programs</div></div></div>
            <div className="ws-stat-card"><div><div className="ws-stat-value">{STATS.upcoming}</div><div className="ws-stat-label">Upcoming</div></div></div>
            <div className="ws-stat-card" style={{ borderLeft: STATS.live > 0 ? "4px solid #e74c3c" : "1px solid #eceff3" }}>
              <div><div className="ws-stat-value" style={{ color: STATS.live > 0 ? "#e74c3c" : "#2d3748" }}>{STATS.live}</div><div className="ws-stat-label">Live Now</div></div>
            </div>
            <div className="ws-stat-card"><div><div className="ws-stat-value">{STATS.completed}</div><div className="ws-stat-label">Completed</div></div></div>
          </section>

          <div className="ws-filters">
            <div className="ws-search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input className="ws-search" placeholder="Search workshops or instructors..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="ws-select" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c === "ALL" ? "All Categories" : c}</option>)}
            </select>
            <div className="ws-status-tabs">
              {tabs.map(t => (
                <button key={t} className={"ws-status-tab" + (activeTab === t ? " active" : "")}
                  style={activeTab === t && t !== "ALL" ? { background: STATUS_CONFIG[t]?.bg, color: STATUS_CONFIG[t]?.color, borderColor: (STATUS_CONFIG[t]?.color || "#CDA751") + "66" } : {}}
                  onClick={() => setActiveTab(t)}>
                  {t === "ALL" ? "All" : STATUS_CONFIG[t]?.label || t}
                </button>
              ))}
            </div>
          </div>

          <div className="ws-result-count">
            {dataLoading ? "Loading programs..." : `${filtered.length} programs found`}
          </div>
        </>
      )}

      {/* ── CARDS GRID (when not in detail view) ── */}
      {!selectedWs && (
        <div className="ws-grid">
          {filtered.map(w => <WorkshopCard key={w.id} w={w} onClick={handleOpenDetail} />)}
          {!dataLoading && filtered.length === 0 && (
            <div className="ws-empty"><div style={{ color: "#7b8a9a", fontSize: "15px" }}>No workshops match your criteria</div></div>
          )}
        </div>
      )}

      {/* ── DETAIL / EDIT VIEW ── */}
      {selectedWs && (
        <div className="ws-detail-container" style={{ animation: "wsFadeIn 0.3s ease" }}>
          {/* Back button */}
          <button onClick={handleCloseDetail}
            style={{ background: "none", border: "none", fontSize: 14, color: "#CDA751", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            Back to Workshops
          </button>

          {!isEditing ? renderDetailView() : (
            <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "65vh" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2d3748", margin: "0 0 16px 0" }}>Edit Workshop</h2>
              {renderEditForm()}
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button className="ws-modal-btn-secondary" style={{ flex: 1 }} onClick={handleCancelEdit}>Cancel</button>
                <button className="ws-modal-btn-primary" style={{ flex: 2 }} onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <div className="ws-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ws-modal" style={{ width: 620 }} onClick={e => e.stopPropagation()}>
            <div className="ws-modal-header" style={{ paddingBottom: 16, borderBottom: "1px solid #E8E2D9" }}>
              <h2 className="ws-modal-title" style={{ margin: 0 }}>Create New Workshop</h2>
              <button className="ws-modal-close" onClick={() => setShowAddModal(false)}>X</button>
            </div>
            <div className="ws-modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Program Title</label>
                  <input value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} className="ws-modal-input" placeholder="e.g. Sunset Yoga Flow" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Category</label>
                    <select value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))} className="ws-modal-input">
                      {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Instructor</label>
                    <select value={addForm.instructor_id} onChange={e => handleInstructorChange("add", e)} className="ws-modal-input">
                      <option value="">Select Instructor</option>
                      {instructors.map(i => (
                        <option key={i.user_id || i.id} value={i.user_id || i.id}>
                          {i.first_name} {i.last_name} ({i.role === 'DOCTOR' ? 'Dr.' : 'Therapist'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Date</label>
                    <input type="date" value={addForm.date} onChange={e => setAddForm(p => ({ ...p, date: e.target.value }))} className="ws-modal-input" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Start Time</label>
                    <input type="time" value={addForm.time} onChange={e => setAddForm(p => ({ ...p, time: e.target.value }))} className="ws-modal-input" />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Duration (mins)</label>
                    <input type="number" value={addForm.duration} onChange={e => setAddForm(p => ({ ...p, duration: e.target.value }))} className="ws-modal-input" min={15} step={15} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Capacity</label>
                    <input type="number" value={addForm.capacity} onChange={e => setAddForm(p => ({ ...p, capacity: e.target.value }))} className="ws-modal-input" min={1} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Price (Rs)</label>
                    <input type="number" value={addForm.price} onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))} className="ws-modal-input" placeholder="1500" min={0} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Workshop Image</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }}
                      onChange={e => { if (e.target.files[0]) handleImageFile("add", e.target.files[0]); e.target.value = ''; }} id="addImageInput" />
                    <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}
                      onClick={() => document.getElementById("addImageInput")?.click()}>
                      Browse Image
                    </button>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
                    <input value={addForm.image_url} onChange={e => setAddForm(p => ({ ...p, image_url: e.target.value, image_base64: "" }))}
                      className="ws-modal-input" style={{ flex: 1 }} placeholder="https://..." />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {(addForm.image_base64 || addForm.image_url) && (
                      <div style={{ position: "relative", width: 100, height: 70, borderRadius: 6, overflow: "hidden" }}>
                        <img src={getImageUrl(addForm.image_base64 || addForm.image_url)} alt="preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => { e.target.style.display = "none"; }} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Workshop Video (Optional)</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="file" accept="video/*" style={{ display: "none" }}
                      onChange={e => { if (e.target.files[0]) handleVideoFile("add", e.target.files[0]); e.target.value = ''; }} id="addVideoInput" />
                    <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}
                      onClick={() => document.getElementById("addVideoInput")?.click()}>
                      Browse Video
                    </button>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
                    <input value={addForm.video_url} onChange={e => setAddForm(p => ({ ...p, video_url: e.target.value }))}
                      className="ws-modal-input" style={{ flex: 1 }} placeholder="https://youtube.com/..." />
                  </div>
                  {addForm.video_url && <span style={{ fontSize: 11, color: "#4a5568", marginTop: 4 }}>Video attached</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Description</label>
                  <textarea value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} className="ws-modal-input" style={{ resize: "vertical" }} placeholder="Brief description..." />
                </div>

                {addError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>{addError}</div>}

                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button className="ws-modal-btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button className="ws-modal-btn-primary" style={{ flex: 2 }} onClick={handleCreateWorkshop} disabled={addSaving}>
                    {addSaving ? "Creating..." : "Create Workshop"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: '#CDA751', color: 'white', padding: '16px 24px',
          borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 99999
        }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{toast}</div>
        </div>
      )}
    </div>
  );
}