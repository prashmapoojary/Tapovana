import React, { useState, useMemo, useEffect, useRef } from "react";
import "./Workshops.css";
import "../Team/AddMemberDrawer.css";
import DropdownIcon from "../assets/dropdownIcon.svg";
import { apiFetch } from "../api/http";
import { getImageUrl } from "../utils/image";
import { useAllocations } from "../utils/AllocationContext";
import AnimatedNumber from "../utils/AnimatedNumber";
import MediaPickerModal from "../components/MediaPickerModal";

// ─── Live status checker ─────────────────────────────────────────────
const getLiveStatus = (ws) => {
  if (!ws) return "unknown";
  const statusLower = String(ws.status || "").toLowerCase();
  if (statusLower === "completed" || statusLower === "cancelled") return "completed";
  const now = new Date();
  
  // If start_time and end_time are provided, use them directly
  if (ws.start_time && ws.end_time) {
    const startTime = new Date(ws.start_time);
    const endTime = new Date(ws.end_time);
    
    if (now < startTime) return "upcoming";
    if (now >= startTime && now < endTime) return "live";
    return "completed";
  }

  // Format today's date in local YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  let wsDateStr = ws.date;
  if (ws.date && typeof ws.date === 'string') {
    wsDateStr = ws.date.split('T')[0];
  } else if (ws.date instanceof Date) {
    const wYear = ws.date.getFullYear();
    const wMonth = String(ws.date.getMonth() + 1).padStart(2, '0');
    const wDay = String(ws.date.getDate()).padStart(2, '0');
    wsDateStr = `${wYear}-${wMonth}-${wDay}`;
  }

  if (wsDateStr !== today) {
    if (wsDateStr > today) return "upcoming";
    if (wsDateStr < today) return "completed";
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

  // Build Date objects for start and end
  const wsStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), wsHour, wsMinute, 0, 0);
  const wsEndMins = wsHour * 60 + wsMinute + (ws.duration || 60);
  const wsEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
    Math.floor(wsEndMins / 60), wsEndMins % 60, 0, 0);

  if (now < wsStart) return "upcoming";
  if (now >= wsStart && now < wsEnd) return "live";
  return "completed";
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
  live: { label: "🔴 LIVE", color: "#e74c3c", bg: "rgba(231,76,60,0.15)" },
  completed: { label: "Completed", color: "#a0aec0", bg: "rgba(160,174,192,0.1)" },
};

const DUMMY_WORKSHOPS = [
  { id: "WS-001", title: "Morning Vinyasa Flow", category: "Yoga", date: "2026-06-15", time: "07:00 AM", duration: 90, capacity: 20, price: 1500, status: "upcoming", image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800", description: "A dynamic yoga session focused on breath-synchronized movement to energize the body and calm the mind." },
  { id: "WS-005", title: "Pranayama Intensive", category: "Yoga", date: "2026-06-14", time: "07:00 AM", duration: 60, capacity: 20, price: 1200, status: "ongoing", image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800", description: "An intensive breathwork program covering all major pranayama techniques for vitality and longevity." },
];

const BLANK_FORM = {
  title: "", category: "Yoga", instructor_id: "", instructor_name: "",
  date: "", time: "", duration: 60, capacity: 10000,
  price: "", description: "", image_url: "", image_base64: "", video_url: "", video_base64: "", video_file: null
};

// ─── File to base64 helper ────────────────────────────────────────────────
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

// ─── YouTube embed URL helper ─────────────────────────────────────────────
const getYouTubeEmbedUrl = (url) => {
  if (!url) return "";
  let videoId = "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    videoId = match[2];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

// ─── Chunked Upload Helper ────────────────────────────────────────────────
const uploadVideoInChunks = async (workshopId, file, onProgress) => {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunk size
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const filename = file.name;
  const mimeType = file.type;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(start, end);

    // Read chunk blob as base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // strip prefix data:*/*;base64,
        const base64Str = result.split(",")[1];
        resolve(base64Str);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(chunkBlob);
    });

    const body = {
      chunkIndex,
      chunkSize: end - start,
      byteOffset: start,
      totalSize,
      filename,
      mimeType,
      data: base64Data
    };

    const res = await apiFetch(`/api/workshops/${workshopId}/video/chunk`, {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!res.success) {
      throw new Error(res.message || `Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);
    }

    if (onProgress) {
      onProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
    }
  }
};

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
          background: liveStatus === "live" ? "#e74c3c" : "#ffffff", color: liveStatus === "live" ? "#ffffff" : st.color,
          border: `1px solid ${liveStatus === "live" ? "#e74c3c" : st.color}`, fontWeight: 700, zIndex: 2,
          animation: liveStatus === "live" ? "wsPulse 1.5s infinite" : "none"
        }}>{liveStatus === "live" ? "🔴 LIVE" : st.label}</div>
      </div>
      <div className="ws-card-body">
        <h3 className="ws-card-title">{w.title}</h3>
        <div className="ws-card-instructor" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7b8a9a" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          {w.instructor_name || w.instructor || "Not assigned"}
        </div>
        <div className="ws-card-meta">
          <div className="ws-card-meta-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7b8a9a" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            {w.date ? new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""} {w.time}
          </div>
          <div className="ws-card-meta-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7b8a9a" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {w.duration} mins
          </div>
        </div>
        <div className="ws-card-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #f1f3f7" }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#2d3748" }}>₹{(w.price || 0).toLocaleString("en-IN")}</span>
          <button className="ws-card-btn" style={{ background: liveStatus === "live" ? "#e74c3c" : cat.color, padding: "6px 12px", border: "none", borderRadius: 8, color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
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
  const { allocateStaff, triggerAlert } = useAllocations();
  const [workshops, setWorkshops] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null); // 'add_image', 'add_video', 'edit_image', 'edit_video'
  const [mediaPickerType, setMediaPickerType] = useState('image'); // 'image' or 'video'

  const handleSelectStockMedia = (url) => {
    if (mediaTarget === 'add_image') {
      setAddForm(prev => ({ ...prev, image_url: url, image_base64: "" }));
      setAddError("");
      setAllocationAttempts(0);
      setAttemptedInstructorId(null);
    } else if (mediaTarget === 'edit_image') {
      setEditForm(prev => ({ ...prev, image_url: url, image_base64: "" }));
      setEditError("");
    } else if (mediaTarget === 'add_video') {
      setAddForm(prev => ({ ...prev, video_url: url, video_base64: "" }));
      setAddError("");
      setAllocationAttempts(0);
      setAttemptedInstructorId(null);
    } else if (mediaTarget === 'edit_video') {
      setEditForm(prev => ({ ...prev, video_url: url, video_base64: "" }));
      setEditError("");
    }
    setMediaModalOpen(false);
  };
  const [dataLoading, setDataLoading] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [videoProgress, setVideoProgress] = useState(null);

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

  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAddModal]);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Video player
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  const lastTimeRef = useRef(0);

  const getElapsedLiveSeconds = (ws) => {
    if (!ws || !ws.date) return 0;
    const now = new Date();
    
    let wsYear, wsMonth, wsDay;
    if (typeof ws.date === 'string') {
      [wsYear, wsMonth, wsDay] = ws.date.split('T')[0].split('-').map(Number);
    } else if (ws.date instanceof Date) {
      wsYear = ws.date.getFullYear();
      wsMonth = ws.date.getMonth() + 1;
      wsDay = ws.date.getDate();
    } else {
      return 0;
    }
    
    let hours = 0;
    let minutes = 0;
    if (ws.time) {
      const match = ws.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        if (match[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
        if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
      } else {
        const parts = ws.time.split(':');
        hours = parseInt(parts[0], 10) || 0;
        minutes = parseInt(parts[1], 10) || 0;
      }
    }
    
    const startTime = new Date(wsYear, wsMonth - 1, wsDay, hours, minutes, 0, 0);
    const elapsed = (now.getTime() - startTime.getTime()) / 1000;
    return Math.max(0, elapsed);
  };

  const handleTimeUpdate = (e) => {
    const video = e.target;
    const ws = workshops.find(w => w.id === selectedWs?.id) || selectedWs;
    const liveStatus = getLiveStatus(ws);
    if (liveStatus === "live") {
      if (video.currentTime > lastTimeRef.current) {
        lastTimeRef.current = video.currentTime;
      }
    }
  };

  const handleSeeking = (e) => {
    const video = e.target;
    const ws = workshops.find(w => w.id === selectedWs?.id) || selectedWs;
    const liveStatus = getLiveStatus(ws);
    if (liveStatus === "live") {
      if (video.currentTime > lastTimeRef.current) {
        video.currentTime = lastTimeRef.current; // block forward seek
        triggerAlert("Forward seeking disabled during live session.", false);
      }
    }
  };

  const handlePlay = (e) => {
    const video = e.target;
    const ws = workshops.find(w => w.id === selectedWs?.id) || selectedWs;
    const liveStatus = getLiveStatus(ws);
    if (liveStatus === "live" && !video.hasSyncedLiveTime) {
      const elapsed = getElapsedLiveSeconds(ws);
      if (elapsed > 0) {
        const targetTime = Math.min(elapsed, video.duration || elapsed);
        lastTimeRef.current = targetTime;
        video.currentTime = targetTime;
      }
      video.hasSyncedLiveTime = true;
    }
  };

  const handleLoadedMetadata = (e) => {
    const video = e.target;
    const ws = workshops.find(w => w.id === selectedWs?.id) || selectedWs;
    const liveStatus = getLiveStatus(ws);
    if (liveStatus === "live" && !video.hasSyncedLiveTime) {
      const elapsed = getElapsedLiveSeconds(ws);
      if (elapsed > 0) {
        const targetTime = Math.min(elapsed, video.duration || elapsed);
        lastTimeRef.current = targetTime;
        video.currentTime = targetTime;
      }
      video.hasSyncedLiveTime = true;
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.hasSyncedLiveTime = false;
      lastTimeRef.current = 0;
    }
  }, [selectedWs?.id]);

  // Staff allocation attempts state
  const [allocationAttempts, setAllocationAttempts] = useState(0);
  const [attemptedInstructorId, setAttemptedInstructorId] = useState(null);

  // Attendees Tab and Manual Enrollment state
  const [activeDetailTab, setActiveDetailTab] = useState("details"); // "details" or "attendees"
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [memberships, setMemberships] = useState([]);

  // Fetch memberships for discount check
  const fetchMemberships = async () => {
    try {
      const res = await apiFetch("/api/memberships?limit=1000");
      if (res.success && res.memberships) {
        setMemberships(res.memberships);
      }
    } catch (err) {
      console.warn("Failed to fetch memberships in Workshops:", err);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const getAttendeeMembership = (name, email) => {
    if (!memberships || memberships.length === 0) return null;
    const match = memberships.find(m => 
      email && m.email && m.email.toLowerCase() === email.toLowerCase() &&
      name && m.name && m.name.toLowerCase() === name.toLowerCase()
    );
    return match && match.status === 'active' ? match.tier : null;
  };

  const [showManualEnroll, setShowManualEnroll] = useState(false);
  const [manualEnrollForm, setManualEnrollForm] = useState({ name: "", email: "", phone: "" });
  const [manualEnrollSaving, setManualEnrollSaving] = useState(false);
  const [manualEnrollError, setManualEnrollError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Fetch attendees for selected workshop
  const fetchAttendees = async (workshopId) => {
    try {
      setAttendeesLoading(true);
      setAttendeesError("");
      const res = await apiFetch(`/api/workshops/${workshopId}/attendees`);
      if (res.success) {
        setAttendees(res.attendees || []);
      } else {
        throw new Error(res.message || "Failed to load attendees.");
      }
    } catch (err) {
      setAttendeesError(err.message || "Error loading attendees.");
    } finally {
      setAttendeesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWs && activeDetailTab === "attendees") {
      fetchAttendees(selectedWs.id);
    }
  }, [selectedWs?.id, activeDetailTab]);

  const handleManualEnroll = async () => {
    setManualEnrollError("");
    const ws = workshops.find(w => w.id === selectedWs?.id) || selectedWs;
    const status = getLiveStatus(ws);
    const dbStatus = String(ws.status || "").toLowerCase();
    if (status === "live" || status === "completed" || dbStatus === "cancelled") {
      let errMsg = "Staff assignment and enrollment are disabled.";
      if (status === "live") {
        errMsg = "This workshop is currently live. Staff assignment and enrollment are disabled.";
      } else if (dbStatus === "cancelled") {
        errMsg = "This workshop has been cancelled. Staff assignment and enrollment are disabled.";
      } else if (status === "completed") {
        errMsg = "This workshop is completed. Staff assignment and enrollment are disabled.";
      }
      setManualEnrollError(errMsg);
      triggerAlert(errMsg, false);
      return;
    }
    if (!manualEnrollForm.name.trim() || !manualEnrollForm.email.trim()) {
      setManualEnrollError("Name and Email are required.");
      triggerAlert("Validation failed. Please check inputs.", false);
      return;
    }
    // Name: Alphabetic only
    if (!/^[A-Za-z\s]+$/.test(manualEnrollForm.name.trim())) {
      setManualEnrollError("Name must contain only alphabets.");
      triggerAlert("Validation failed. Please check inputs.", false);
      return;
    }
    // Email: Must end with .com
    if (!/^[^\s@]+@[^\s@]+\.com$/i.test(manualEnrollForm.email.trim())) {
      setManualEnrollError("Email must end with .com (e.g., @gmail.com).");
      triggerAlert("Validation failed. Please check inputs.", false);
      return;
    }
    // Phone: Must be exactly 10 digits (if provided)
    if (manualEnrollForm.phone && !/^\d{10}$/.test(manualEnrollForm.phone.trim())) {
      setManualEnrollError("Phone number must be exactly 10 digits.");
      triggerAlert("Validation failed. Please check inputs.", false);
      return;
    }
    try {
      setManualEnrollSaving(true);
      const res = await apiFetch(`/api/workshops/${selectedWs.id}/enroll`, {
        method: "POST",
        body: JSON.stringify(manualEnrollForm)
      });
      if (res.success) {
        triggerAlert("User enrolled successfully!", true);
        setManualEnrollForm({ name: "", email: "", phone: "" });
        setPhoneError("");
        setShowManualEnroll(false);
        fetchAttendees(selectedWs.id);
        fetchWorkshops();
        setSelectedWs(prev => prev ? ({ ...prev, enrolled: (prev.enrolled || 0) + 1 }) : null);
      } else {
        throw new Error(res.message || "Enrollment failed.");
      }
    } catch (err) {
      setManualEnrollError(err.message || "Failed to enroll user.");
    } finally {
      setManualEnrollSaving(false);
    }
  };

  const handleMarkAttendance = async (attendeeId, status) => {
    if (!selectedWs) return;
    const isCompleted = getLiveStatus(selectedWs) === "completed";
    if (!isCompleted && (status === "attended" || status === "absent")) {
      triggerAlert("Cannot mark attendance before the workshop is completed.", false);
      return;
    }
    const currentAttendee = attendees.find(a => a.id === attendeeId);
    if (currentAttendee && (currentAttendee.status === "attended" || currentAttendee.status === "absent") && status === "enrolled") {
      triggerAlert("Cannot revert attendee status back to Enrolled.", false);
      return;
    }

    try {
      const res = await apiFetch(`/api/workshops/${selectedWs.id}/attendees/${attendeeId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      if (res.success) {
        triggerAlert(`Marked attendee as ${status}.`, true);
        setAttendees(prev => prev.map(a => a.id === attendeeId ? { ...a, status } : a));
      } else {
        throw new Error(res.message || "Failed to update attendance.");
      }
    } catch (err) {
      triggerAlert(err.message || "Failed to update attendance.", false);
    }
  };

  const handleDeleteAttendee = async (attendeeId) => {
    if (!window.confirm("Are you sure you want to delete/remove this attendee?")) {
      return;
    }
    try {
      const res = await apiFetch(`/api/workshops/${selectedWs.id}/attendees/${attendeeId}`, {
        method: "DELETE"
      });
      if (res.success) {
        triggerAlert("Attendee deleted successfully.", true);
        setAttendees(res.attendees || []);
        fetchWorkshops();
        setSelectedWs(prev => prev ? ({ ...prev, enrolled: Math.max(0, (prev.enrolled || 0) - 1) }) : null);
      } else {
        throw new Error(res.message || "Failed to delete attendee.");
      }
    } catch (err) {
      triggerAlert(err.message || "Failed to delete attendee.", false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const token = sessionStorage.getItem("access_token") || "";
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
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE}/api/workshops/${selectedWs.id}/attendees/export`, {
        headers
      });
      if (!response.ok) throw new Error("Failed to download CSV.");
      const text = await response.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendees-${selectedWs.title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      triggerAlert("CSV exported successfully.", true);
    } catch (err) {
      triggerAlert(err.message || "Failed to export CSV.", false);
    }
  };

  const filteredAttendees = useMemo(() => {
    return (attendees || []).filter(a => {
      const matchSearch = !attendeeSearch || 
        (a.name || "").toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        (a.email || "").toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        (a.phone || "").toLowerCase().includes(attendeeSearch.toLowerCase());
      return matchSearch;
    });
  }, [attendees, attendeeSearch]);

  // ─── Fetch instructors ──────────────────────────────────────────────────
  const fetchInstructors = async () => {
    try {
      const res = await apiFetch("/api/teams/users?page=1&limit=100");
      if (res.success && res.users) {
        const docsAndTherapists = res.users.filter(u => {
          const roleUpper = String(u.role || "").toUpperCase();
          return (roleUpper === 'DOCTOR' || roleUpper === 'THERAPIST') && u.availability_status !== "On Leave";
        });
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
    } catch (err) {
      console.error("fetchWorkshops error:", err);
      triggerAlert(err.message || "Failed to load workshops.", false);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { fetchWorkshops(); }, []);

  // Auto-refresh live status every 30 seconds by fetching latest data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWorkshops();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Monthly auto-refresh page logic on the 15th of every month
  useEffect(() => {
    const checkMonthlyRefresh = () => {
      const now = new Date();
      if (now.getDate() === 15) {
        const lastRefresh = localStorage.getItem("last_monthly_refresh_date");
        const todayStr = now.toDateString();
        if (lastRefresh !== todayStr) {
          console.log("[Refresh] Midnight on the 15th detected. Clearing cache data...");
          localStorage.removeItem("workshops_cache");
          sessionStorage.removeItem("workshops_cache");
          fetchWorkshops();
          localStorage.setItem("last_monthly_refresh_date", todayStr);
        }
      }
    };

    checkMonthlyRefresh();
    const refreshInterval = setInterval(checkMonthlyRefresh, 60000); // Check once a minute
    return () => clearInterval(refreshInterval);
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
    setVideoPlaying(false);
    setActiveDetailTab("details");
    setAttendeeSearch("");
    setShowManualEnroll(false);
  };

  // ─── Close detail view ───────────────────────────────────────────────────
  const handleCloseDetail = () => {
    setSelectedWs(null);
    setIsEditing(false);
    setVideoPlaying(false);
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
      video_base64: selectedWs.video_base64 || "",
      video_file: null,
    });
    setEditError("");
    setVideoPlaying(false);
    setIsEditing(true);
  };

  // ─── Cancel editing ─────────────────────────────────────────────────────
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError("");
    setVideoPlaying(false);
  };

  // ─── Save edit ─────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    setEditError("");
    const validationError = validateWorkshopForm(editForm);
    if (validationError) {
      setEditError(validationError);
      triggerAlert("Validation failed. Please check inputs.", false);
      return;
    }

    const ws = workshops.find(w => w.id === selectedWs?.id) || selectedWs;
    if (getLiveStatus(ws) === "completed") {
      const isStaffChanged = (selectedWs?.instructor_id || null) !== (editForm.instructor_id || null);
      if (isStaffChanged) {
        const errMsg = "This workshop is completed. Staff assignment and enrollment are disabled.";
        setEditError(errMsg);
        triggerAlert(errMsg, false);
        return;
      }
    }

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
        capacity: 10000,
        price: Number(editForm.price),
        description: editForm.description.trim(),
        image_url: editForm.image_base64 || editForm.image_url || null,
        video_url: editForm.video_file ? null : (editForm.video_url || null),
        assigned_staff_ids: editForm.instructor_id ? [editForm.instructor_id] : [],
      };

      const res = await apiFetch("/api/workshops/" + selectedWs.id, { method: "PATCH", body: JSON.stringify(body) });
      if (!res.success) {
        throw new Error(res.message || "Failed to update workshop");
      }

      // If local video file is present, upload it in chunks
      if (editForm.video_file) {
        setVideoProgress(0);
        try {
          await uploadVideoInChunks(selectedWs.id, editForm.video_file, (percent) => {
            setVideoProgress(percent);
          });
        } catch (uploadErr) {
          triggerAlert(`Changes saved but video upload failed: ${uploadErr.message}`, false);
        } finally {
          setVideoProgress(null);
        }
      }

      await fetchWorkshops();
      setSelectedWs(prev => ({
        ...prev, ...editForm,
        image: editForm.image_base64 || editForm.image_url || prev.image,
        image_url: editForm.image_base64 || editForm.image_url
      }));
      setIsEditing(false);
      triggerAlert("Workshop updated!", true);
    } catch (err) {
      setEditError(err.message || "Failed to update workshop");
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Delete Workshop ───────────────────────────────────────────────────
  const handleDeleteWorkshop = () => {
    if (!selectedWs) return;
    const liveStatus = selectedWs._liveStatus || getLiveStatus(selectedWs);
    if (liveStatus === "live" || liveStatus === "ongoing") {
      triggerAlert("Cannot delete a live/ongoing workshop.", false);
      return;
    }
    if (liveStatus === "completed") {
      triggerAlert("Cannot delete a completed workshop. Only upcoming workshops can be deleted.", false);
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDeleteWorkshop = async () => {
    if (!selectedWs) return;
    try {
      setShowDeleteConfirm(false);
      setEditSaving(true);
      if (String(selectedWs.id).startsWith("WS-")) {
        // It's a dummy local workshop, just remove it locally
        setWorkshops(prev => prev.filter(w => w.id !== selectedWs.id));
        setSelectedWs(null);
        triggerAlert("Workshop deleted successfully!", true);
        return;
      }
      await apiFetch("/api/workshops/" + selectedWs.id, { method: "DELETE" });
      await fetchWorkshops();
      setSelectedWs(null);
      triggerAlert("Workshop deleted successfully!", true);
    } catch (e) {
      triggerAlert("Failed to delete workshop: " + e.message, false);
    } finally {
      setEditSaving(false);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddForm(BLANK_FORM);
    setAddError("");
    setAllocationAttempts(0);
    setAttemptedInstructorId(null);
  };

  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({ ...prev, [field]: value }));
    setAddError("");
    setAllocationAttempts(0);
    setAttemptedInstructorId(null);
  };

  // ─── Create Workshop ───────────────────────────────────────────────────
  const handleCreateWorkshop = async () => {
    setAddError("");
    const validationError = validateWorkshopForm(addForm);
    if (validationError) {
      setAddError(validationError);
      triggerAlert("Validation failed. Please check inputs.", false);
      return;
    }

    // Check staff allocation conflict attempts
    if (addForm.instructor_id && addForm.instructor_id === attemptedInstructorId && allocationAttempts >= 3) {
      setAddError("Allocation attempt 3 failed, please reassign staff.");
      triggerAlert("Validation failed. Please check inputs.", false);
      setAllocationAttempts(0);
      return;
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
        capacity: 10000,
        price: Number(addForm.price),
        description: addForm.description.trim(),
        image_url: addForm.image_base64 || addForm.image_url || null,
        video_url: addForm.video_file ? null : (addForm.video_url || null),
        status: "upcoming",
        enrolled: 0,
        assigned_staff_ids: addForm.instructor_id ? [addForm.instructor_id] : [],
      };

      const res = await apiFetch("/api/workshops", { method: "POST", body: JSON.stringify(body) });
      if (res.success) {
        const createdWs = res.workshop;

        // If local video file is present, upload it in chunks
        if (addForm.video_file) {
          setVideoProgress(0);
          try {
            await uploadVideoInChunks(createdWs.id, addForm.video_file, (percent) => {
              setVideoProgress(percent);
            });
          } catch (uploadErr) {
            triggerAlert(`Workshop created but video upload failed: ${uploadErr.message}`, false);
          } finally {
            setVideoProgress(null);
          }
        }

        if (addForm.instructor_id) {
          const inst = instructors.find(i => i.user_id === addForm.instructor_id || i.id === addForm.instructor_id);
          if (inst) {
            allocateStaff(inst, { id: createdWs?.id || Date.now(), title: addForm.title, startDate: addForm.date, date: addForm.date, endDate: addForm.date }, "workshop");
          }
        }
        await fetchWorkshops();
        setShowAddModal(false);
        setAddForm(BLANK_FORM);
        triggerAlert("Workshop created successfully", true);
      } else {
        throw new Error(res.message || "Failed to create workshop");
      }
    } catch (err) {
      if (err.message && (err.message.toLowerCase().includes("conflict") || err.message.toLowerCase().includes("limit") || err.message.toLowerCase().includes("already allocated"))) {
        const nextAttempt = allocationAttempts + 1;
        setAllocationAttempts(nextAttempt);
        setAttemptedInstructorId(addForm.instructor_id);
        
        if (nextAttempt === 1) {
          setAddError("Allocation attempt 1 failed, please try again.");
        } else if (nextAttempt === 2) {
          setAddError("Allocation attempt 2 failed, please try again.");
        } else {
          setAddError("Allocation attempt 3 failed, please reassign staff.");
        }
      } else {
        setAddError(err.message || "Error creating workshop");
      }
      triggerAlert("Error creating workshop", false);
    } finally {
      setAddSaving(false);
    }
  };

  // ─── Image file upload handler ──────────────────────────────────────────
  const handleImageFile = async (target, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { triggerAlert("Image must be less than 5MB", false); return; }
    const base64 = await fileToBase64(file);
    if (target === "add") {
      setAddForm(prev => ({ ...prev, image_base64: base64, image_url: "" }));
      setAddError("");
      setAllocationAttempts(0);
      setAttemptedInstructorId(null);
    } else {
      setEditForm(prev => ({ ...prev, image_base64: base64, image_url: "" }));
      setEditError("");
    }
  };

  // ─── Video file/URL handler ─────────────────────────────────────────────
  const handleVideoFile = (target, file) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (target === "add") {
      setAddForm(prev => ({ ...prev, video_url: objectUrl, video_base64: "", video_file: file }));
      setAddError("");
      setAllocationAttempts(0);
      setAttemptedInstructorId(null);
    } else {
      setEditForm(prev => ({ ...prev, video_url: objectUrl, video_base64: "", video_file: file }));
      setEditError("");
    }
  };

  // ─── Instructor change ──────────────────────────────────────────────────
  const handleInstructorChange = (target, e) => {
    const instructorId = e.target.value;
    const instructor = instructors.find(i => i.user_id === instructorId || i.id === instructorId);
    const name = instructor ? (instructor.first_name + " " + instructor.last_name).trim() : "";
    if (target === "add") {
      setAddForm(prev => ({ ...prev, instructor_id: instructorId, instructor_name: name }));
      setAllocationAttempts(0);
      setAttemptedInstructorId(instructorId);
      setAddError("");
    } else {
      setEditForm(prev => ({ ...prev, instructor_id: instructorId, instructor_name: name }));
    }
  };

  // ─── Render edit form ──────────────────────────────────────────────────
  const renderEditForm = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                {i.first_name} {i.last_name} ({String(i.role || "").toUpperCase() === 'DOCTOR' ? 'Dr.' : 'Therapist'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Date</label>
          <input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} min={new Date().toISOString().split("T")[0]} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Start Time</label>
          <input type="time" value={editForm.time} onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>Duration (mins)</label>
          <input type="number" value={editForm.duration} onChange={e => setEditForm(p => ({ ...p, duration: e.target.value }))} style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white" }} min={15} />
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
          <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12, borderColor: '#CDA751', color: '#CDA751' }}
            onClick={() => { setMediaTarget('edit_image'); setMediaPickerType('image'); setMediaModalOpen(true); }}>
            Stock Image
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
          <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12, borderColor: '#CDA751', color: '#CDA751' }}
            onClick={() => { setMediaTarget('edit_video'); setMediaPickerType('video'); setMediaModalOpen(true); }}>
            Stock Video
          </button>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
          <input value={editForm.video_url} onChange={e => setEditForm(p => ({ ...p, video_url: e.target.value, video_base64: "" }))}
            style={{ padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)", fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif", width: "100%", boxSizing: "border-box", background: "white", flex: 1 }} placeholder="https://youtube.com/..." />
        </div>
      </div>

      {editError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>{editError}</div>}
    </div>
  );

  // ─── Render detail view ─────────────────────────────────────────────────
  const renderDetailView = () => {
    if (!selectedWs) return null;
    const ws = workshops.find(w => w.id === selectedWs.id) || selectedWs;
    const liveStatus = getLiveStatus(ws);
    const displayImage = ws.image || ws.image_url || ws.image_base64;
    const displayVideo = ws.video_url;

    return (
      <div style={{ padding: "24px 28px" }}>
        {/* 1. Workshop Name */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#2d3748", margin: "0 0 4px 0" }}>{ws.title}</h2>

        {/* 2. Instructor Name */}
        <p style={{ fontSize: 14, color: "#7b8a9a", margin: "0 0 16px 0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7b8a9a" strokeWidth="2" style={{ marginRight: 4, verticalAlign: "middle" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Instructor: {ws.instructor_name || ws.instructor || "Not assigned"}
        </p>

        {/* Tabs Bar */}
        <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid #e2e8f0", marginBottom: "20px" }}>
          <button 
            onClick={() => setActiveDetailTab("details")}
            style={{ 
              background: "none", 
              border: "none", 
              borderBottom: activeDetailTab === "details" ? "3px solid #CDA751" : "3px solid transparent", 
              padding: "10px 4px", 
              fontSize: "14px", 
              fontWeight: 600, 
              color: activeDetailTab === "details" ? "#0F172A" : "#64748B", 
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Workshop Info
          </button>
          <button 
            onClick={() => setActiveDetailTab("attendees")}
            style={{ 
              background: "none", 
              border: "none", 
              borderBottom: activeDetailTab === "attendees" ? "3px solid #CDA751" : "3px solid transparent", 
              padding: "10px 4px", 
              fontSize: "14px", 
              fontWeight: 600, 
              color: activeDetailTab === "attendees" ? "#0F172A" : "#64748B", 
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Attendees ({ws.enrolled || 0})
          </button>
        </div>

        {activeDetailTab === "details" ? (
          <>
            {/* 3. Preview Section - Video Player with Cover Image */}
            {displayVideo && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
                  {liveStatus === "live" && (
                    <div className="video-live-badge" style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      background: "#e74c3c",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      zIndex: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      pointerEvents: "none",
                      animation: "wsPulse 1.5s infinite"
                    }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white" }}></span>
                      LIVE
                    </div>
                  )}
                  {displayVideo.includes("youtube") || displayVideo.includes("youtu.be") ? (
                    <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
                      <iframe src={getYouTubeEmbedUrl(displayVideo)} title="Workshop Video"
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        allowFullScreen />
                    </div>
                  ) : (
                    <video 
                      key={displayVideo}
                      ref={videoRef} 
                      controls 
                      poster={getImageUrl(displayImage)}
                      onTimeUpdate={handleTimeUpdate}
                      onSeeking={handleSeeking}
                      onPlay={handlePlay}
                      onLoadedMetadata={handleLoadedMetadata}
                      style={{ width: "100%", maxHeight: 400, borderRadius: 8, display: "block" }}
                    >
                      <source src={displayVideo.startsWith("http") || displayVideo.startsWith("blob:") ? displayVideo : `${API_BASE}${displayVideo}`} type="video/mp4" />
                    </video>
                  )}
                </div>
              </div>
            )}

            {/* 4. Description */}
            {!displayVideo && displayImage && (
              <div style={{ marginBottom: 16, borderRadius: 8, overflow: "hidden" }}>
                <img src={getImageUrl(displayImage)} alt={ws.title}
                  style={{ width: "100%", maxHeight: 320, objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }} />
              </div>
            )}

            <p style={{ fontSize: 15, color: "#4a5568", lineHeight: 1.7, margin: "0 0 20px 0" }}>{ws.description}</p>

            {/* 5. Workshop Details */}
            <div style={{ background: "#f8f9fb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#2d3748" }}>Workshop Details</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 12, color: "#a0aec0" }}>Date</span>
                  <br />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>
                    {ws.date ? new Date(ws.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "N/A"}
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
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>Rs{(ws.price || 0).toLocaleString("en-IN")}</span>
                  <div style={{ fontSize: "10px", color: "#64748B", marginTop: "4px", lineHeight: "1.3" }}>
                    <div>Silver Pass: Rs{Math.round((ws.price || 0) * 0.85)} (15% off)</div>
                    <div>Gold Pass: Rs{Math.round((ws.price || 0) * 0.75)} (25% off)</div>
                    <div>Diamond Pass: Rs{Math.round((ws.price || 0) * 0.60)} (40% off)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {liveStatus !== "completed" && (
              <div style={{ display: "flex", gap: 12 }}>
                <button className="ws-modal-btn-primary" style={{ flex: 1 }} onClick={handleStartEdit}>
                  Edit Workshop
                </button>
                <button className="ws-modal-btn-secondary" style={{ flex: 1, color: "#e74c3c", borderColor: "rgba(231,76,60,0.3)", background: "transparent" }} onClick={handleDeleteWorkshop}>
                  Delete Workshop
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Header Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", padding: "6px 12px", minWidth: "220px" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2" style={{ marginRight: "8px" }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input 
                    type="text" 
                    placeholder="Search attendees..." 
                    value={attendeeSearch} 
                    onChange={e => setAttendeeSearch(e.target.value)} 
                    style={{ border: "none", outline: "none", fontSize: "13px", width: "100%", background: "transparent" }}
                  />
                </div>
                <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>
                  {ws.enrolled || 0} enrolled
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                {liveStatus !== "completed" && (
                  <button 
                    onClick={() => {
                      setShowManualEnroll(!showManualEnroll);
                      setPhoneError("");
                      setManualEnrollForm({ name: "", email: "", phone: "" });
                    }}
                    className="ws-modal-btn-secondary"
                    style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                  >
                    {showManualEnroll ? "Close Form" : "+ Enroll User"}
                  </button>
                )}
                <button 
                  onClick={handleExportCSV}
                  className="ws-modal-btn-primary"
                  style={{ padding: "8px 16px", fontSize: "13px", background: "#CDA751", borderColor: "#CDA751", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "white" }}
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Manual Enroll Form Panel */}
            {showManualEnroll && (
              <div style={{ background: "#f8f9fb", border: "1px solid rgba(205,167,81,0.2)", borderRadius: "8px", padding: "16px", animation: "wsFadeIn 0.2s ease" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: "#2d3748" }}>Enroll User Manually</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#404854" }}>Full Name *</label>
                    <input 
                      type="text" 
                      value={manualEnrollForm.name} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. John Doe"
                      style={{ padding: "7px 10px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", background: "white", width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#404854" }}>Email *</label>
                    <input 
                      type="email" 
                      value={manualEnrollForm.email} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="e.g. john@example.com"
                      style={{ padding: "7px 10px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", background: "white", width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#404854" }}>Phone (Optional)</label>
                    <input 
                      type="tel" 
                      value={manualEnrollForm.phone} 
                      onChange={e => {
                        const cleaned = e.target.value.replace(/\D/g, "");
                        setManualEnrollForm(p => ({ ...p, phone: cleaned }));
                        if (cleaned.length > 0 && cleaned.length !== 10) {
                          setPhoneError("Phone number must be exactly 10 digits");
                        } else {
                          setPhoneError("");
                        }
                      }}
                      placeholder="e.g. 9876543210"
                      style={{ padding: "7px 10px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "13px", outline: "none", background: "white", width: "100%", boxSizing: "border-box" }}
                    />
                    {phoneError && (
                      <span className="phone-validation-error" style={{ color: "#e74c3c", fontSize: "12px", fontWeight: "600", marginTop: "4px", display: "block" }}>
                        {phoneError}
                      </span>
                    )}
                  </div>
                </div>
                {manualEnrollError && <div style={{ color: "#e74c3c", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>{manualEnrollError}</div>}
                <button 
                  onClick={handleManualEnroll} 
                  disabled={manualEnrollSaving || !!phoneError}
                  className="ws-modal-btn-primary"
                  style={{ padding: "6px 16px", fontSize: "12px", background: "#CDA751", borderColor: "#CDA751", color: "white", cursor: "pointer" }}
                >
                  {manualEnrollSaving ? "Enrolling..." : "Submit Enrollment"}
                </button>
              </div>
            )}

            {/* Attendees List Table */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", overflow: "hidden" }}>
              {attendeesLoading ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>Loading attendees...</div>
              ) : attendeesError ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#e74c3c" }}>{attendeesError}</div>
              ) : filteredAttendees.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748B" }}>
                  {attendeeSearch ? "No attendees match your search." : "No users enrolled in this workshop yet."}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Name</th>
                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Email</th>
                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Phone</th>
                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map(a => (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f1f3f7" }}>
                        <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 600, color: "#2d3748" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            {a.name}
                            {(() => {
                              const tier = getAttendeeMembership(a.name, a.email);
                              if (tier) {
                                const colors = {
                                  SILVER: { bg: "#E2E8F0", color: "#475569", label: "Silver Pass (15% off)" },
                                  GOLD: { bg: "#FEF3C7", color: "#D97706", label: "Gold Pass (25% off)" },
                                  PLATINUM: { bg: "#F3E8FF", color: "#7E22CE", label: "Diamond Pass (40% off)" }
                                };
                                const cfg = colors[tier.toUpperCase()] || { bg: "#E2E8F0", color: "#475569", label: `${tier} Pass` };
                                return (
                                  <span style={{
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    fontWeight: "700",
                                    background: cfg.bg,
                                    color: cfg.color,
                                    textTransform: "uppercase"
                                  }}>
                                    {cfg.label}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", color: "#4a5568" }}>{a.email}</td>
                        <td style={{ padding: "10px 16px", fontSize: "13px", color: "#4a5568" }}>{a.phone || "-"}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ 
                            fontSize: "11px", 
                            fontWeight: 700, 
                            padding: "3px 8px", 
                            borderRadius: "12px",
                            textTransform: "uppercase",
                            background: a.status === "attended" ? "rgba(34,197,94,0.12)" : a.status === "absent" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                            color: a.status === "attended" ? "#16a34a" : a.status === "absent" ? "#dc2626" : "#d97706"
                          }}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <select 
                            value={a.status} 
                            onChange={e => {
                              if (e.target.value === "delete") {
                                  handleDeleteAttendee(a.id);
                              } else {
                                  handleMarkAttendance(a.id, e.target.value);
                              }
                            }}
                            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", outline: "none", cursor: "pointer", background: "white" }}
                          >
                            <option value="enrolled" disabled={a.status === "attended" || a.status === "absent"}>Enrolled</option>
                            <option value="attended" disabled={getLiveStatus(selectedWs) !== "completed"}>Attended</option>
                            <option value="absent" disabled={getLiveStatus(selectedWs) !== "completed"}>Absent</option>
                            <option value="delete">Delete Attendee</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
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
            <button className="ws-add-btn" onClick={() => { setAddForm(BLANK_FORM); setAddError(""); setAllocationAttempts(0); setAttemptedInstructorId(null); setShowAddModal(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Workshop
            </button>
          </header>

          <section className="ws-stats-row">
            <div className="ws-stat-card">
              <div className="ws-stat-label">Total Programs</div>
              <AnimatedNumber value={STATS.total} className="ws-stat-value" />
            </div>
            <div className="ws-stat-card">
              <div className="ws-stat-label">Upcoming</div>
              <AnimatedNumber value={STATS.upcoming} className="ws-stat-value" />
            </div>
            <div className="ws-stat-card" style={STATS.live > 0 ? { borderLeft: "4px solid #e74c3c" } : undefined}>
              <div className="ws-stat-label">Live Now</div>
              <AnimatedNumber value={STATS.live} className="ws-stat-value" style={{ color: STATS.live > 0 ? "#e74c3c" : "#2d3748" }} />
            </div>
            <div className="ws-stat-card">
              <div className="ws-stat-label">Completed</div>
              <AnimatedNumber value={STATS.completed} className="ws-stat-value" />
            </div>
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
            <div style={{ padding: "24px 28px" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2d3748", margin: "0 0 16px 0" }}>Edit Workshop</h2>
              {renderEditForm()}
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button className="ws-modal-btn-secondary" style={{ flex: 1 }} onClick={handleCancelEdit}>Cancel</button>
                <button className="ws-modal-btn-primary" style={{ flex: 2 }} onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? (videoProgress !== null ? `Uploading Video ${videoProgress}%` : "Saving...") : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {showDeleteConfirm && (
        <div className="ws-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="ws-modal" style={{ width: 400, textAlign: 'center', padding: '32px 24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(205,167,81,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', overflow: 'hidden', border: '2px solid #CDA751' }}>
              <img src={getImageUrl(selectedWs?.image_url || selectedWs?.image)} alt="Workshop Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=No+Image'; }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2d3748", margin: "0 0 8px 0" }}>Delete Workshop?</h2>
            <p style={{ fontSize: 14, color: "#7b8a9a", margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Are you sure you want to delete this workshop? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="ws-modal-btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="ws-modal-btn-primary" style={{ flex: 1, background: '#CDA751', borderColor: '#CDA751' }} onClick={confirmDeleteWorkshop}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD DRAWER ── */}
      <div className={`drawer-overlay ${showAddModal ? "open" : ""}`} onClick={handleCloseAddModal} style={{ zIndex: 1000 }} />
      <div className={`drawer-panel ${showAddModal ? "open" : ""}`} style={{ zIndex: 1001, width: "420px", right: showAddModal ? 0 : "-460px" }}>
        <div className="drawer-header">
          <div className="drawer-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, color: "#CDA751" }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create New Workshop
          </div>
          <button className="drawer-close-btn" onClick={handleCloseAddModal}>✕</button>
        </div>
        <div className="drawer-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="input-label">Program Title</label>
              <input value={addForm.title} onChange={e => handleAddFormChange("title", e.target.value)} className="drawer-input" placeholder="e.g. Sunset Yoga Flow" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="input-label">Category</label>
              <div className="select-wrapper">
                <select value={addForm.category} onChange={e => handleAddFormChange("category", e.target.value)} className="drawer-select">
                  {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
                </select>
                <img src={DropdownIcon} alt="dropdown" className="select-icon" />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="input-label">Instructor</label>
              <div className="select-wrapper">
                <select value={addForm.instructor_id} onChange={e => handleInstructorChange("add", e)} className="drawer-select">
                  <option value="">Select Instructor</option>
                  {instructors.map(i => (
                    <option key={i.user_id || i.id} value={i.user_id || i.id}>
                      {i.first_name} {i.last_name} ({String(i.role || "").toUpperCase() === 'DOCTOR' ? 'Dr.' : 'Therapist'})
                    </option>
                  ))}
                </select>
                <img src={DropdownIcon} alt="dropdown" className="select-icon" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="input-label">Date</label>
                <input type="date" value={addForm.date} onChange={e => handleAddFormChange("date", e.target.value)} className="drawer-input" min={new Date().toISOString().split("T")[0]} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="input-label">Start Time</label>
                <input type="time" value={addForm.time} onChange={e => handleAddFormChange("time", e.target.value)} className="drawer-input" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="input-label">Duration (mins)</label>
                <input type="number" value={addForm.duration} onChange={e => handleAddFormChange("duration", e.target.value)} className="drawer-input" min={15} step={15} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="input-label">Price (Rs)</label>
                <input type="number" value={addForm.price} onChange={e => handleAddFormChange("price", e.target.value)} className="drawer-input" placeholder="1500" min={0} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="input-label">Workshop Image</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }}
                  onChange={e => { if (e.target.files[0]) handleImageFile("add", e.target.files[0]); e.target.value = ''; }} id="addImageInput" />
                <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={() => document.getElementById("addImageInput")?.click()}>
                  Browse Image
                </button>
                <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12, borderColor: '#CDA751', color: '#CDA751' }}
                  onClick={() => { setMediaTarget('add_image'); setMediaPickerType('image'); setMediaModalOpen(true); }}>
                  Stock Image
                </button>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
                <input value={addForm.image_url} onChange={e => handleAddFormChange("image_url", e.target.value)}
                  className="drawer-input" style={{ flex: 1 }} placeholder="https://..." />
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
              <label className="input-label">Workshop Video (Optional)</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="file" accept="video/*" style={{ display: "none" }}
                  onChange={e => { if (e.target.files[0]) handleVideoFile("add", e.target.files[0]); e.target.value = ''; }} id="addVideoInput" />
                <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={() => document.getElementById("addVideoInput")?.click()}>
                  Browse Video
                </button>
                <button type="button" className="ws-modal-btn-secondary" style={{ padding: "6px 14px", fontSize: 12, borderColor: '#CDA751', color: '#CDA751' }}
                  onClick={() => { setMediaTarget('add_video'); setMediaPickerType('video'); setMediaModalOpen(true); }}>
                  Stock Video
                </button>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
                <input value={addForm.video_url} onChange={e => handleAddFormChange("video_url", e.target.value)} className="drawer-input" placeholder="https://youtube.com/..." style={{ flex: 1 }} />
              </div>
              {addForm.video_url && <span style={{ fontSize: 11, color: "#4a5568", marginTop: 4 }}>Video attached</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="input-label">Description</label>
              <textarea value={addForm.description} onChange={e => handleAddFormChange("description", e.target.value)}
                rows={3} className="drawer-input" style={{ resize: "vertical" }} placeholder="Brief description..." />
            </div>

            {addError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600 }}>{addError}</div>}
          </div>
        </div>
        <div className="drawer-footer">
          <button className="btn-cancel" onClick={handleCloseAddModal}>Cancel</button>
          <button className="btn-save" onClick={handleCreateWorkshop} disabled={addSaving} style={{ opacity: addSaving ? 0.6 : 1 }}>
            {addSaving ? (videoProgress !== null ? `Uploading Video ${videoProgress}%` : "Creating...") : "Create Workshop"}
          </button>
        </div>
      </div>

      <MediaPickerModal 
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={handleSelectStockMedia}
        allowVideos={mediaPickerType === 'video'}
        title={mediaPickerType === 'image' ? "Select Pexels Photo" : "Select Stock Video"}
        page_type="workshops"
        category={((mediaTarget === 'add_image' || mediaTarget === 'add_video') ? addForm : editForm)?.category || 'Yoga'}
        subcategory="All"
        defaultQuery={(() => {
          const activeForm = (mediaTarget === 'add_image' || mediaTarget === 'add_video') ? addForm : editForm;
          const cat = activeForm?.category || 'Yoga';
          const type = mediaPickerType === 'video' ? 'Video' : 'Workshop';
          return `${cat} ${type}`;
        })()}
        suggestions={(() => {
          const activeForm = (mediaTarget === 'add_image' || mediaTarget === 'add_video') ? addForm : editForm;
          const cat = activeForm?.category || 'Yoga';
          if (mediaPickerType === 'video') {
            return [`${cat} Practice`, `${cat} Class`, `${cat} Tutorial`, 'Meditation Session', 'Nature Relaxing'];
          }
          return [`${cat} Workshop`, `${cat} Class`, `${cat} Retreat`, 'Meditation Studio', 'Holistic Wellness'];
        })()}
      />
    </div>
  );
}

// ─── Form validation helper ───────────────────────────────────────────────
function validateWorkshopForm(form) {
  // 1. Program Title
  const title = (form.title || "").trim();
  if (!title) {
    return "Program Title is required.";
  }
  if (title.length < 3 || title.length > 100) {
    return "Program Title must be between 3 and 100 characters.";
  }
  const titleRegex = /^[A-Za-z0-9\s.,!?'"()\-&/:;@#+]+$/;
  if (!titleRegex.test(title)) {
    return "Program Title contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed.";
  }

  // 2. Category
  const category = (form.category || "").trim();
  if (!category || category === "Select Category" || category.toLowerCase() === "select category" || category.toLowerCase() === "placeholder") {
    return "Category selection is required.";
  }

  // 3. Instructor
  const instructorId = (form.instructor_id || "").trim();
  if (!instructorId || instructorId.toLowerCase() === "select instructor" || instructorId.toLowerCase() === "select" || instructorId.toLowerCase() === "placeholder") {
    return "Instructor selection is required.";
  }

  // 4. Date
  const dateStr = (form.date || "").trim();
  if (!dateStr) {
    return "Date is required.";
  }

  const parseDateInput = (dStr) => {
    if (!dStr) return null;
    const dmy = dStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (dmy) {
      return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    }
    const ymd = dStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (ymd) {
      return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    }
    const parsed = new Date(dStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const selectedDateObj = parseDateInput(dateStr);
  if (!selectedDateObj) {
    return "Invalid date format.";
  }

  // Double check that it's a real valid date (e.g., handles 31-02-2026 correctly)
  const dmyRegex = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
  const parts = dateStr.split(/[-/]/);
  let parsedDay, parsedMonth, parsedYear;
  if (dmyRegex.test(dateStr)) {
    parsedDay = parseInt(parts[0], 10);
    parsedMonth = parseInt(parts[1], 10);
    parsedYear = parseInt(parts[2], 10);
  } else {
    parsedYear = parseInt(parts[0], 10);
    parsedMonth = parseInt(parts[1], 10);
    parsedDay = parseInt(parts[2], 10);
  }
  if (selectedDateObj.getDate() !== parsedDay || 
      selectedDateObj.getMonth() + 1 !== parsedMonth || 
      selectedDateObj.getFullYear() !== parsedYear) {
    return "Invalid date.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedMidnight = new Date(selectedDateObj);
  selectedMidnight.setHours(0, 0, 0, 0);

  if (selectedMidnight < today) {
    return "You cannot choose a previous date.";
  }

  // 5. Start Time
  const timeStr = (form.time || "").trim();
  if (!timeStr) {
    return "Start Time is required.";
  }

  const ampmRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM|am|pm)$/;
  const militaryRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!ampmRegex.test(timeStr) && !militaryRegex.test(timeStr)) {
    return "Start time must be in HH:MM AM/PM format.";
  }

  const parseTimeInput = (tStr) => {
    if (!tStr) return null;
    const matchAmpm = tStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (matchAmpm) {
      let h = parseInt(matchAmpm[1], 10);
      const m = parseInt(matchAmpm[2], 10);
      if (matchAmpm[3].toUpperCase() === "PM" && h !== 12) h += 12;
      if (matchAmpm[3].toUpperCase() === "AM" && h === 12) h = 0;
      return { hours: h, minutes: m };
    }
    const match24 = tStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      return { hours: parseInt(match24[1], 10), minutes: parseInt(match24[2], 10) };
    }
    return null;
  };

  const timeParsed = parseTimeInput(timeStr);
  if (!timeParsed) {
    return "Invalid start time format.";
  }

  if (selectedMidnight.getTime() === today.getTime()) {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    if (timeParsed.hours < currentHours || (timeParsed.hours === currentHours && timeParsed.minutes <= currentMinutes)) {
      return "You cannot choose a previous time.";
    }
  }

  // 6. Duration
  if (form.duration === undefined || form.duration === null || String(form.duration).trim() === "") {
    return "Duration is required.";
  }
  const durationNum = Number(form.duration);
  if (isNaN(durationNum) || !Number.isInteger(durationNum) || durationNum < 15 || durationNum > 480) {
    return "Duration must be between 15 and 480 minutes.";
  }

  // 7. Price
  if (form.price === undefined || form.price === null || String(form.price).trim() === "") {
    return "Price is required.";
  }
  const priceNum = Number(form.price);
  if (isNaN(priceNum) || priceNum < 100 || priceNum > 50000) {
    return "Price must be between Rs. 100 and Rs. 50,000.";
  }

  return null;
}