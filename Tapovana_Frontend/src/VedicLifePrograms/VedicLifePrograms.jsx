import React, { useState, useMemo, useEffect, useRef } from "react";
import "./VedicLifePrograms.css";
import "../Team/AddMemberDrawer.css";
import DropdownIcon from "../assets/dropdownIcon.svg";
import { apiFetch } from "../api/http";
import { useAllocations } from "../utils/AllocationContext";
import { getUser } from "../utils/session";
import { getImageUrl } from "../utils/image";
import MediaPickerModal from "../components/MediaPickerModal";
import SearchIcon from "../assets/searchIcon.svg";
import ActionIcon from "../assets/Button.svg";

// ─── Status checker ─────────────────────────────────────────────────────
const getProgramStatus = (program) => {
  if (program.status === 'Cancelled' || program.status === 'cancelled') return 'Cancelled';
  if (!program.startDate || !program.endDate) return "upcoming";

  const todayStr = new Date().toISOString().split('T')[0];
  const startStr = program.startDate.split('T')[0];
  const endStr = program.endDate.split('T')[0];

  if (todayStr < startStr) return "upcoming";
  if (todayStr >= startStr && todayStr <= endStr) return "ongoing";
  return "completed";
};

const STATUS_CONFIG = {
  upcoming: { label: "Upcoming", color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  ongoing: { label: "Ongoing", color: "#2ecc71", bg: "rgba(46,204,113,0.1)" },
  completed: { label: "Renewal", color: "#a0aec0", bg: "rgba(160,174,192,0.1)" },
  Cancelled: { label: "Cancelled", color: "#e74c3c", bg: "rgba(231,76,60,0.1)" },
  cancelled: { label: "Cancelled", color: "#e74c3c", bg: "rgba(231,76,60,0.1)" }
};

const PROGRAM_COLORS = {
  "Retreat": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Treatment": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Consultation": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Accommodation": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
};

const DURATION_MAP = { "7-days": 7, "14-days": 14, "30-days": 30, "custom": null };

const DUMMY_PROGRAMS = [
  {
    id: "VP-001", title: "Ayurveda Wellness Retreat", type: "Retreat",
    description: "7-day comprehensive Ayurveda retreat with personalized consultations and treatments.",
    duration: "7-days", startDate: "2026-07-01", endDate: "2026-07-07",
    capacity: 30, enrolled: 24, price: 35000,
    accommodations: "3-star Resort", consultant_id: "", consultant_name: "Dr. Priya Krishnan",
    services: ["Consultation", "Massage", "Yoga", "Nutrition"],
    languages: ["English", "Hindi", "Malayalam"],
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-002", title: "International Ayurveda Treatment Program", type: "Treatment",
    description: "30-day specialized Ayurvedic treatment for chronic conditions.",
    duration: "30-days", startDate: "2026-08-01", endDate: "2026-08-30",
    capacity: 20, enrolled: 12, price: 85000,
    accommodations: "4-star Hotel", consultant_id: "", consultant_name: "Dr. Kavitha Rao",
    services: ["Panchakarma", "Abhyanga", "Dietary Management"],
    languages: ["English", "Spanish", "French"],
    image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-003", title: "Yoga & Meditation Immersion", type: "Retreat",
    description: "14-day intensive yoga and meditation program.",
    duration: "14-days", startDate: "2026-06-15", endDate: "2026-06-28",
    capacity: 40, enrolled: 35, price: 28000,
    accommodations: "Ashram Accommodation", consultant_id: "", consultant_name: "Swami Anandamaya",
    services: ["Yoga", "Meditation", "Pranayama", "Philosophy"],
    languages: ["English", "Italian", "German"],
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
  },
];

const DUMMY_STAFF = [
  { user_id: "DR001", first_name: "Dr. Priya", last_name: "Krishnan", role: "DOCTOR", specialization: "Ayurveda" },
  { user_id: "DR002", first_name: "Dr. Kavitha", last_name: "Rao", role: "DOCTOR", specialization: "Panchakarma" },
  { user_id: "TH001", first_name: "Swami", last_name: "Anandamaya", role: "THERAPIST", specialization: "Yoga" },
  { user_id: "TH002", first_name: "Dr. Sanjay", last_name: "Bhat", role: "THERAPIST", specialization: "Nutrition" },
];

const BLANK_FORM = {
  title: "", type: "Retreat", description: "", duration: "7-days",
  startDate: "", endDate: "", capacity: 20, price: "",
  accommodations: "", consultant_id: "", consultant_name: "",
  assigned_staff_ids: [],
  services: "", languages: "", image_url: "", image_base64: "",
  registrationDeadline: ""
};

// ─── File to base64 helper ────────────────────────────────────────────────
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

// ─── Status style helper ──────────────────────────────────────────────────
const getAttendeeStatusStyles = (status) => {
  if (!status) return { bg: "rgba(205,167,81,0.12)", color: "#CDA751" };
  switch (status.toUpperCase()) {
    case 'ATTENDED':
      return { bg: "rgba(34,197,94,0.12)", color: "#16a34a" };
    case 'CHECKED_IN':
      return { bg: "rgba(13,148,136,0.12)", color: "#0d9488" };
    case 'CONFIRMED':
      return { bg: "rgba(79,70,229,0.12)", color: "#4f46e5" };
    case 'REGISTERED':
      return { bg: "rgba(205,167,81,0.12)", color: "#CDA751" };
    case 'ABSENT':
      return { bg: "rgba(239,68,68,0.12)", color: "#dc2626" };
    case 'CANCELLED':
      return { bg: "rgba(100,116,139,0.12)", color: "#64748b" };
    default:
      return { bg: "rgba(205,167,81,0.12)", color: "#CDA751" };
  }
};

// ─── Program Card ─────────────────────────────────────────────────────────
function ProgramCard({ program, onClick }) {
  const status = getProgramStatus(program);
  const st = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  const typeColor = PROGRAM_COLORS[program.type] || PROGRAM_COLORS["Retreat"];
  const pct = program.capacity ? Math.round(((program.enrolled || 0) / program.capacity) * 100) : 0;
  const [imgFailed, setImgFailed] = useState(!program.image && !program.image_url && !program.image_base64);
  const displayImage = program.image || program.image_url || program.image_base64;

  return (
    <div className="vedic-card" onClick={() => onClick({ ...program, _status: status })}>
      <div className="vedic-card-banner" style={{ overflow: "hidden", position: "relative", height: 180, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: 14 }}>
        {!imgFailed && displayImage ? (
          <img src={getImageUrl(displayImage)} alt={program.title} onError={() => setImgFailed(true)}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />
        ) : (
          <div style={{ background: `linear-gradient(135deg, ${typeColor.color}15, ${typeColor.color}35)`, width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 1 }} />
        )}
        <div className="vedic-card-category-badge" style={{ background: typeColor.color, color: "white", zIndex: 2 }}>{program.type}</div>
        <div className="vedic-card-status-badge" style={{
          background: status === "ongoing" ? "#2ecc71" : "#ffffff", color: status === "ongoing" ? "#ffffff" : st.color,
          border: `1px solid ${status === "ongoing" ? "#2ecc71" : st.color}`, fontWeight: 700, zIndex: 2,
          animation: status === "ongoing" ? "vedicPulse 1.5s infinite" : "none"
        }}>{st.label}</div>
      </div>
      <div className="vedic-card-body">
        <h3 className="vedic-card-title">{program.title}</h3>
        <div className="vedic-card-instructor" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#7b8a9a" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          {program.consultant_name || program.consultant || "Not assigned"}
        </div>
        <div className="vedic-card-meta">
          <div className="vedic-card-meta-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7b8a9a" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            {program.startDate ? new Date(program.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""} - {program.endDate ? new Date(program.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
          </div>
          <div className="vedic-card-meta-item" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7b8a9a" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {program.duration}
          </div>
        </div>

        {/* Progress Bar & Enrollment Info */}
        <div style={{ marginTop: 2 }}>
          <div style={{ width: "100%", height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
            <div style={{ width: pct + "%", height: "100%", background: pct >= 100 ? "#e74c3c" : "#CDA751", borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: "#718096", display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span>{program.enrolled || 0}/{program.capacity} enrolled</span>
            <span style={{ color: "#CDA751", fontWeight: 700 }}>{pct}%</span>
          </div>
        </div>

        <div className="vedic-card-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #f1f3f7" }}>
          <span className="vedic-card-price" style={{ fontSize: 15, fontWeight: 800, color: "#2d3748" }}>₹{(program.price || 0).toLocaleString("en-IN")}</span>
          <button className="vedic-card-btn" style={{ background: status === "ongoing" ? "#2ecc71" : typeColor.color, padding: "6px 12px", border: "none", borderRadius: 8, color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            onClick={(e) => { e.stopPropagation(); onClick({ ...program, _status: status }); }}>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form input style ─────────────────────────────────────────────────────
const inputStyle = {
  padding: "7px 10px", borderRadius: 4, border: "1px solid rgba(205,167,81,0.2)",
  fontSize: 13, color: "#333", outline: "none", fontFamily: "Manrope, sans-serif",
  width: "100%", boxSizing: "border-box", background: "white"
};

const FormField = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "#404854" }}>{label}</label>
    {children}
  </div>
);

// ─── Reusable Form Component ──────────────────────────────────────────────
function ProgramForm({ form, onChange, instructors, mode, onSearchPexels }) {
  const handleDurationChange = (duration) => {
    const newForm = { ...form, duration };
    const days = DURATION_MAP[duration];
    if (days && form.startDate) {
      const start = new Date(form.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      newForm.endDate = end.toISOString().split('T')[0];
    }
    onChange({ target: { name: "duration", value: duration } });
    if (days && form.startDate) {
      const start = new Date(form.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      setTimeout(() => {
        onChange({ target: { name: "endDate", value: end.toISOString().split('T')[0] } });
      }, 0);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Program Title">
          <input name="title" value={form.title} onChange={onChange} style={inputStyle} placeholder="e.g. Panchakarma Detox Retreat" />
        </FormField>
        <FormField label="Program Type">
          <select name="type" value={form.type} onChange={onChange} style={inputStyle}>
            <option value="Retreat">Retreat</option>
            <option value="Treatment">Treatment</option>
            <option value="Consultation">Consultation</option>
            <option value="Accommodation">Accommodation</option>
          </select>
        </FormField>
      </div>

      <FormField label="Description">
        <textarea name="description" value={form.description} onChange={onChange} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Detailed summary of the program..." />
      </FormField>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <FormField label="Duration">
          <select value={form.duration} onChange={e => handleDurationChange(e.target.value)} style={inputStyle}>
            <option value="7-days">7 days</option>
            <option value="14-days">14 days</option>
            <option value="30-days">30 days</option>
            <option value="custom">Custom</option>
          </select>
        </FormField>
        <FormField label="Price (INR)">
          <input type="number" name="price" value={form.price} onChange={onChange} style={inputStyle} placeholder="35000" min={0} />
        </FormField>
        <FormField label="Max Capacity">
          <input type="number" name="capacity" value={form.capacity} onChange={onChange} style={inputStyle} min={1} />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Start Date">
          <input type="date" name="startDate" value={form.startDate} onChange={onChange} style={inputStyle} />
        </FormField>
        <FormField label="End Date">
          <input type="date" name="endDate" value={form.endDate} onChange={onChange} style={inputStyle} />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Registration Deadline">
          <input type="date" name="registrationDeadline" value={form.registrationDeadline} onChange={onChange} style={inputStyle} min={new Date().toISOString().split("T")[0]} />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Lead Consultant">
          <select value={form.consultant_id} onChange={e => {
            const id = e.target.value;
            const inst = instructors.find(i => i.user_id === id || i.id === id);
            const name = inst ? (inst.first_name + " " + inst.last_name).trim() : "";
            const filteredStaff = (form.assigned_staff_ids || []).filter(sid => sid !== id);
            onChange({ target: { name: "consultant_id", value: id } });
            onChange({ target: { name: "consultant_name", value: name } });
            onChange({ target: { name: "assigned_staff_ids", value: filteredStaff } });
          }} style={inputStyle}>
            <option value="">Select Consultant...</option>
            {instructors.map(i => (
              <option key={i.user_id || i.id} value={i.user_id || i.id}>
                {i.first_name} {i.last_name} ({i.role === 'DOCTOR' ? 'Dr.' : 'Therapist'})
              </option>
            ))}
          </select>
          {form.consultant_name && <span style={{ fontSize: 11, color: "#cda751", marginTop: 2 }}>Selected: {form.consultant_name}</span>}
        </FormField>

        <FormField label="Assigned Specialists (Max 9)">
          <div style={{ 
            border: "1px solid rgba(205,167,81,0.2)", 
            borderRadius: 4, 
            padding: 10, 
            maxHeight: 120, 
            overflowY: "auto", 
            background: "white" 
          }}>
            {instructors.filter(i => (i.user_id || i.id) !== form.consultant_id).map(i => {
              const staffId = i.user_id || i.id;
              const isChecked = (form.assigned_staff_ids || []).includes(staffId);
              return (
                <label key={staffId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 4, color: "#333", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={e => {
                      let list = [...(form.assigned_staff_ids || [])];
                      if (e.target.checked) {
                        if (list.length >= 9) {
                          triggerAlert("Maximum 9 specialists can be assigned.", false);
                          return;
                        }
                        list.push(staffId);
                      } else {
                        list = list.filter(id => id !== staffId);
                      }
                      onChange({ target: { name: "assigned_staff_ids", value: list } });
                    }} 
                  />
                  {i.first_name} {i.last_name} ({i.role === 'DOCTOR' ? 'Dr.' : 'Therapist'})
                </label>
              );
            })}
            {instructors.filter(i => (i.user_id || i.id) !== form.consultant_id).length === 0 && (
              <span style={{ fontSize: 12, color: "#94a3b8" }}>No other active specialists available.</span>
            )}
          </div>
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Accommodations">
          <input name="accommodations" value={form.accommodations} onChange={onChange} style={inputStyle} placeholder="e.g. Lakefront Cottage" />
        </FormField>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Services (comma-separated)">
          <input name="services" value={form.services} onChange={onChange} style={inputStyle} placeholder="e.g. Yoga, Massage, Meditation" />
        </FormField>
        <FormField label="Languages (comma-separated)">
          <input name="languages" value={form.languages} onChange={onChange} style={inputStyle} placeholder="e.g. English, Hindi, German" />
        </FormField>
      </div>

      <FormField label="Program Image">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
            onChange={async (e) => { if (e.target.files[0]) { const b64 = await fileToBase64(e.target.files[0]); onChange({ target: { name: "image_base64", value: b64 } }); onChange({ target: { name: "image_url", value: "" } }); } e.target.value = ''; }}
            id={mode + "ProgImage"} />
          <button type="button" className="vedic-btn-cancel" style={{ padding: "6px 12px", fontSize: 12 }}
            onClick={() => document.getElementById(mode + "ProgImage")?.click()}>
            Browse Image
          </button>
          <button type="button" className="vedic-btn-cancel" style={{ padding: "6px 12px", fontSize: 12, borderColor: '#CDA751', color: '#CDA751' }}
            onClick={onSearchPexels}>
            Stock Image
          </button>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>or URL:</span>
          <input name="image_url" value={form.image_url} onChange={onChange} style={{ ...inputStyle, flex: 1 }} placeholder="https://..." />
        </div>
        {(form.image_base64 || form.image_url) && (
          <div style={{ marginTop: 8, width: 100, height: 70, borderRadius: 6, overflow: "hidden" }}>
            <img src={getImageUrl(form.image_base64 || form.image_url)} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        )}
      </FormField>
    </div>
  );
}

// ─── Editable Table Components ──────────────────────────────────────────
function EditableText({ value, onSave, placeholder = "" }) {
  const [val, setVal] = useState(value || "");
  
  useEffect(() => {
    setVal(value || "");
  }, [value]);

  return (
    <input 
      type="text" 
      value={val} 
      placeholder={placeholder}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        if (val !== (value || "")) {
          onSave(val);
        }
      }}
      style={{
        border: "1px solid transparent",
        background: "transparent",
        fontSize: "13px",
        padding: "4px 6px",
        width: "100%",
        borderRadius: "4px",
        outline: "none",
        color: "#2d3748",
        transition: "all 0.2s"
      }}
      onFocus={e => {
        e.target.style.border = "1px solid #CDA751";
        e.target.style.background = "#fff";
      }}
      onBlurCapture={e => {
        e.target.style.border = "1px solid transparent";
        e.target.style.background = "transparent";
      }}
    />
  );
}

function EditableDate({ value, onSave }) {
  const formatDateForInput = (val) => {
    if (!val) return "";
    return val.split("T")[0];
  };

  const [val, setVal] = useState(formatDateForInput(value));

  useEffect(() => {
    setVal(formatDateForInput(value));
  }, [value]);

  return (
    <input 
      type="date" 
      value={val} 
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        const original = formatDateForInput(value);
        if (val !== original) {
          onSave(val || null);
        }
      }}
      style={{
        border: "1px solid transparent",
        background: "transparent",
        fontSize: "13px",
        padding: "4px 6px",
        width: "120px",
        borderRadius: "4px",
        outline: "none",
        color: "#2d3748",
        transition: "all 0.2s"
      }}
      onFocus={e => {
        e.target.style.border = "1px solid #CDA751";
        e.target.style.background = "#fff";
      }}
      onBlurCapture={e => {
        e.target.style.border = "1px solid transparent";
        e.target.style.background = "transparent";
      }}
    />
  );
}

function EditablePaymentStatus({ value, onSave }) {
  const [val, setVal] = useState(value || "PENDING");

  useEffect(() => {
    setVal(value || "PENDING");
  }, [value]);

  const getPaymentStyles = (status) => {
    if (!status) return { bg: "rgba(239,68,68,0.12)", color: "#dc2626" };
    switch (status.toUpperCase()) {
      case 'PAID':
        return { bg: "rgba(34,197,94,0.12)", color: "#16a34a" };
      case 'PARTIALLY_PAID':
        return { bg: "rgba(205,167,81,0.12)", color: "#CDA751" };
      case 'PENDING':
      default:
        return { bg: "rgba(239,68,68,0.12)", color: "#dc2626" };
    }
  };

  const styles = getPaymentStyles(val);

  return (
    <select 
      value={val} 
      onChange={e => {
        const newVal = e.target.value;
        setVal(newVal);
        onSave(newVal);
      }}
      style={{
        padding: "4px 8px",
        borderRadius: "12px",
        border: "none",
        fontSize: "11px",
        fontWeight: "700",
        outline: "none",
        cursor: "pointer",
        background: styles.bg,
        color: styles.color,
        textTransform: "uppercase",
        width: "auto"
      }}
    >
      <option value="PENDING">Pending</option>
      <option value="PAID">Paid</option>
      <option value="PARTIALLY_PAID">Partially Paid</option>
    </select>
  );
}

function EditableStatus({ value, onSave }) {
  const [val, setVal] = useState(value || "REGISTERED");

  useEffect(() => {
    setVal(value || "REGISTERED");
  }, [value]);

  const styles = getAttendeeStatusStyles(val);

  return (
    <select 
      value={val} 
      onChange={e => {
        const newVal = e.target.value;
        setVal(newVal);
        onSave(newVal);
      }}
      style={{
        padding: "4px 8px",
        borderRadius: "12px",
        border: "none",
        fontSize: "11px",
        fontWeight: "700",
        outline: "none",
        cursor: "pointer",
        background: styles.bg,
        color: styles.color,
        textTransform: "uppercase",
        width: "auto"
      }}
    >
      <option value="REGISTERED">Registered</option>
      <option value="CONFIRMED">Confirmed</option>
      <option value="CHECKED_IN">Checked In</option>
      <option value="ATTENDED">Attended</option>
      <option value="ABSENT">Absent</option>
      <option value="CANCELLED">Cancelled</option>
    </select>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function VedicLifePrograms() {
  const { allocateStaff, triggerAlert, triggerConfirm } = useAllocations();
  const [programs, setPrograms] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState(null); // 'add' or 'edit'

  const handleSelectStockImage = (url) => {
    if (mediaTarget === 'add') {
      setAddForm(prev => ({ ...prev, image_url: url, image_base64: "" }));
    } else if (mediaTarget === 'edit') {
      setEditForm(prev => ({ ...prev, image_url: url, image_base64: "" }));
    }
    setMediaModalOpen(false);
  };
  const [dataLoading, setDataLoading] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [durationFilter, setDurationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Detail view
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Add modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (showCreateModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCreateModal]);

  // Attendee list state
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState("ALL");
  const [attendeePaymentFilter, setAttendeePaymentFilter] = useState("ALL");
  const [showManualEnroll, setShowManualEnroll] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  const [manualEnrollForm, setManualEnrollForm] = useState({ name: "", email: "", phone: "", accommodationType: "", paymentStatus: "PENDING", checkInDate: "", checkOutDate: "", status: "CONFIRMED" });
  const [manualEnrollSaving, setManualEnrollSaving] = useState(false);
  const [manualEnrollError, setManualEnrollError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const currentUser = useMemo(() => getUser(), []);
  const isAdmin = !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "CO_ADMIN";

  // ─── Fetch instructors ──────────────────────────────────────────────────
  const fetchInstructors = async () => {
    try {
      const res = await apiFetch("/api/teams/users?page=1&limit=100");
      if (res.success && res.users) {
        setInstructors(res.users.filter(u => (u.role === 'DOCTOR' || u.role === 'THERAPIST') && u.availability_status !== "On Leave"));
      } else {
        setInstructors(DUMMY_STAFF.filter(u => u.availability_status !== "On Leave"));
      }
    } catch { setInstructors(DUMMY_STAFF.filter(u => u.availability_status !== "On Leave")); }
  };

  useEffect(() => { fetchInstructors(); }, []);

  // ─── Fetch programs ─────────────────────────────────────────────────────
  const fetchPrograms = async () => {
    try {
      setDataLoading(true);
      const res = await apiFetch("/api/vedic-programs");
      if (res.success) setPrograms(res.programs || []);
      else throw new Error("API failed");
    } catch (err) {
      console.error("fetchPrograms error:", err);
      triggerAlert(err.message || "Failed to load programs.", false);
    } finally { setDataLoading(false); }
  };

  useEffect(() => { fetchPrograms(); }, []);

  // Auto-refresh status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { if (programs.length > 0) setPrograms(prev => [...prev]); }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: programs.length,
    ongoing: programs.filter(p => getProgramStatus(p) === "ongoing").length,
    upcoming: programs.filter(p => getProgramStatus(p) === "upcoming").length,
    completed: programs.filter(p => getProgramStatus(p) === "completed").length,
    totalEnrolled: programs.reduce((s, p) => s + (p.enrolled || 0), 0),
    revenue: programs.reduce((s, p) => s + ((p.enrolled || 0) * (p.price || 0)), 0),
  }), [programs]);

  // ─── Filters ────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    programs.filter(p => {
      const status = getProgramStatus(p);
      const matchType = typeFilter === "ALL" || p.type === typeFilter;
      const matchDuration = durationFilter === "ALL" || p.duration === durationFilter;
      const matchStatus = statusFilter === "ALL" || status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch = !search ||
        (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.consultant_name || p.consultant || "").toLowerCase().includes(search.toLowerCase());
      return matchType && matchDuration && matchStatus && matchSearch;
    }), [programs, typeFilter, durationFilter, statusFilter, search]);

  // ─── Open detail view ───────────────────────────────────────────────────
  const handleSelectProgram = (program) => {
    setSelectedProgram({ ...program });
    setIsEditing(false);
    setActiveDetailTab("info");
  };

  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => {
      const matchSearch = !attendeeSearch ||
        (a.name || "").toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        (a.email || "").toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        (a.phone || "").toLowerCase().includes(attendeeSearch.toLowerCase());
      
      const matchStatus = attendeeStatusFilter === "ALL" || (a.status || "").toUpperCase() === attendeeStatusFilter.toUpperCase();
      const matchPayment = attendeePaymentFilter === "ALL" || (a.payment_status || "PENDING").toUpperCase() === attendeePaymentFilter.toUpperCase();

      return matchSearch && matchStatus && matchPayment;
    });
  }, [attendees, attendeeSearch, attendeeStatusFilter, attendeePaymentFilter]);

  const fetchAttendees = async (programId) => {
    try {
      setAttendeesLoading(true);
      setAttendeesError("");
      const res = await apiFetch(`/api/vedic-programs/${programId}/attendees`);
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
    if (selectedProgram && activeDetailTab === "attendees") {
      fetchAttendees(selectedProgram.id);
    }
  }, [selectedProgram?.id, activeDetailTab]);

  const handleManualEnroll = async () => {
    setManualEnrollError("");
    const programStatus = selectedProgram._status || getProgramStatus(selectedProgram);
    if (programStatus === "ongoing" || programStatus === "completed" || programStatus === "Cancelled") {
      setManualEnrollError("Enrollment is closed for this program.");
      return;
    }

    if (!manualEnrollForm.name || !manualEnrollForm.name.trim()) {
      setManualEnrollError("Name is required.");
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(manualEnrollForm.name.trim())) {
      setManualEnrollError("Name must contain alphabets and spaces only.");
      return;
    }
    if (manualEnrollForm.name.trim().length < 2) {
      setManualEnrollError("Name must be at least 2 characters.");
      return;
    }

    if (!manualEnrollForm.email || !manualEnrollForm.email.trim()) {
      setManualEnrollError("Email is required.");
      return;
    }
    const emailLower = manualEnrollForm.email.trim().toLowerCase();
    if (!emailLower.endsWith(".com") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      setManualEnrollError("Valid email format ending with .com is required.");
      return;
    }

    if (!manualEnrollForm.phone || !manualEnrollForm.phone.trim()) {
      setManualEnrollError("Phone number is required.");
      return;
    }
    if (!/^\d{10}$/.test(manualEnrollForm.phone.trim())) {
      setManualEnrollError("Phone number must be exactly 10 digits and numeric only.");
      return;
    }

    if (manualEnrollForm.accommodationType && manualEnrollForm.accommodationType.trim()) {
      if (!/^[A-Za-z\s0-9-]+$/.test(manualEnrollForm.accommodationType.trim())) {
        setManualEnrollError("Accommodation type must be text only.");
        return;
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (manualEnrollForm.checkInDate && manualEnrollForm.checkInDate < todayStr) {
      setManualEnrollError("Check-in date cannot be in the past.");
      return;
    }
    if (manualEnrollForm.checkOutDate && manualEnrollForm.checkOutDate < todayStr) {
      setManualEnrollError("Check-out date cannot be in the past.");
      return;
    }

    if (manualEnrollForm.checkInDate && manualEnrollForm.checkOutDate) {
      if (manualEnrollForm.checkOutDate < manualEnrollForm.checkInDate) {
        setManualEnrollError("Check-out date must be on or after check-in date.");
        return;
      }
    }

    try {
      setManualEnrollSaving(true);
      const res = await apiFetch(`/api/vedic-programs/attendees`, {
        method: "POST",
        body: JSON.stringify({
          ...manualEnrollForm,
          programId: selectedProgram.id
        })
      });
      if (res.success) {
        triggerAlert("User enrolled successfully!", true);
        setManualEnrollForm({ name: "", email: "", phone: "", accommodationType: "", paymentStatus: "PENDING", checkInDate: "", checkOutDate: "", status: "CONFIRMED" });
        setPhoneError("");
        setShowManualEnroll(false);
        await fetchPrograms();
        setSelectedProgram(prev => prev ? ({ ...prev, enrolled: (prev.enrolled || 0) + 1 }) : null);
        await fetchAttendees(selectedProgram.id);
      } else {
        throw new Error(res.message || "Enrollment failed.");
      }
    } catch (err) {
      setManualEnrollError(err.message || "Failed to enroll user.");
    } finally {
      setManualEnrollSaving(false);
    }
  };

  const handleDeleteAttendee = async (attendeeId) => {
    const confirmed = await triggerConfirm("Are you sure you want to remove this attendee?");
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/vedic-programs/attendees/${attendeeId}`, {
        method: "DELETE"
      });
      if (res.success) {
        triggerAlert("Attendee removed successfully!", true);
        setAttendees(res.attendees || []);
        await fetchPrograms();
        setSelectedProgram(prev => prev ? ({ ...prev, enrolled: Math.max(0, (prev.enrolled || 0) - 1) }) : null);
      } else {
        throw new Error(res.message || "Failed to delete attendee.");
      }
    } catch (err) {
      triggerAlert(err.message || "Error deleting attendee.", false);
    }
  };

  const handleUpdateAttendeeField = async (attendeeId, field, value) => {
    try {
      const isStatus = field === 'status';
      const endpoint = isStatus 
        ? `/api/vedic-programs/attendees/${attendeeId}/status`
        : `/api/vedic-programs/attendees/${attendeeId}`;
      const res = await apiFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value })
      });
      if (res.success) {
        setAttendees(prev => prev.map(a => a.id === attendeeId ? { ...a, ...res.attendee } : a));
        if (selectedProgram) {
          await fetchAttendees(selectedProgram.id);
        }
      } else {
        throw new Error(res.message || "Failed to update attendee.");
      }
    } catch (err) {
      triggerAlert(err.message || "Error updating attendee details.", false);
    }
  };

  const handleMarkAttendance = async (attendeeId, status) => {
    await handleUpdateAttendeeField(attendeeId, 'status', status);
  };

  const handleCheckinAttendee = async (attendeeId) => {
    try {
      const res = await apiFetch(`/api/vedic-programs/attendees/${attendeeId}/checkin`, {
        method: "PATCH"
      });
      if (res.success) {
        triggerAlert("Attendee checked in successfully!", true);
        setAttendees(prev => prev.map(a => a.id === attendeeId ? { ...a, status: "CHECKED_IN", checked_in_at: new Date().toISOString() } : a));
        if (selectedProgram) {
          await fetchAttendees(selectedProgram.id);
        }
      } else {
        throw new Error(res.message || "Failed to check in attendee.");
      }
    } catch (err) {
      triggerAlert(err.message || "Error checking in attendee.", false);
    }
  };

  const handleCancelProgram = async () => {
    const confirmed = await triggerConfirm("Are you sure you want to cancel this program? All attendees and staff will be notified via email.");
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/vedic-programs/${selectedProgram.id}/cancel`, {
        method: "PATCH"
      });
      if (res.success) {
        triggerAlert("Program cancelled successfully.", true);
        await fetchPrograms();
        setSelectedProgram(prev => ({ ...prev, status: "Cancelled", _status: "Cancelled" }));
      } else {
        throw new Error(res.message || "Failed to cancel program.");
      }
    } catch (err) {
      triggerAlert(err.message || "Error cancelling program.", false);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    const url = `${API_BASE}/api/vedic-programs/${selectedProgram.id}/attendees/export?token=${token}`;
    window.open(url, "_blank");
  };

  const handleDeleteProgram = async () => {
    const confirmed = await triggerConfirm("Are you sure you want to delete this program? This action cannot be undone.");
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/vedic-programs/${selectedProgram.id}`, {
        method: "DELETE"
      });
      if (res.success) {
        triggerAlert("Program deleted successfully!", true);
        setSelectedProgram(null);
        await fetchPrograms();
      } else {
        throw new Error(res.message || "Failed to delete program.");
      }
    } catch (err) {
      triggerAlert(err.message || "Error deleting program.", false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedProgram(null);
    setIsEditing(false);
  };

  // ─── Start editing ──────────────────────────────────────────────────────
  const handleStartEdit = () => {
    const p = selectedProgram;
    setEditForm({
      title: p.title || "", type: p.type || "Retreat", description: p.description || "",
      duration: p.duration || "7-days", startDate: p.startDate || "", endDate: p.endDate || "",
      capacity: p.capacity || 20, price: p.price || "",
      accommodations: p.accommodations || "",
      consultant_id: p.lead_consultant_id || p.consultant_id || "", consultant_name: p.consultant_name || p.consultant || "",
      assigned_staff_ids: p.assigned_staff_ids || [],
      services: p.services ? (Array.isArray(p.services) ? p.services.join(", ") : p.services) : "",
      languages: p.languages ? (Array.isArray(p.languages) ? p.languages.join(", ") : p.languages) : "",
      image_url: p.image_url || p.image || "", image_base64: p.image_base64 || "",
      registrationDeadline: p.registrationDeadline || "",
    });
    setEditError("");
    setIsEditing(true);
  };

  // ─── Save edit ──────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    setEditError("");
    const todayStr = new Date().toISOString().split('T')[0];

    if (!editForm.title.trim()) { setEditError("Title is required"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!editForm.startDate) { setEditError("Start date is required"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!editForm.endDate) { setEditError("End date is required"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (editForm.startDate < todayStr) { setEditError("Start date must be today or in the future"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (editForm.endDate < editForm.startDate) { setEditError("End date must be on or after start date"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (editForm.price === "" || Number(editForm.price) < 0) { setEditError("Price must be greater than or equal to 0"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!editForm.capacity || Number(editForm.capacity) < 1) { setEditError("Capacity must be at least 1"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (Number(editForm.capacity) < (selectedProgram.enrolled || 0)) { setEditError(`Capacity cannot be less than the number of enrolled attendees (${selectedProgram.enrolled || 0})`); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!editForm.consultant_id) { setEditError("Please select a lead consultant"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (editForm.assigned_staff_ids && editForm.assigned_staff_ids.length > 9) { setEditError("Maximum 9 specialists can be assigned."); triggerAlert("Validation failed. Please check inputs.", false); return; }

    if (editForm.registrationDeadline) {
      if (editForm.registrationDeadline < todayStr) { setEditError("Registration deadline must be today or in the future"); triggerAlert("Validation failed. Please check inputs.", false); return; }
      if (editForm.registrationDeadline > editForm.startDate) { setEditError("Registration deadline must be on or before start date"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    }

    try {
      setEditSaving(true);
      const body = {
        title: editForm.title.trim(), type: editForm.type,
        description: editForm.description.trim(), duration: editForm.duration,
        startDate: editForm.startDate, endDate: editForm.endDate,
        capacity: Number(editForm.capacity), price: Number(editForm.price),
        accommodations: editForm.accommodations,
        consultant_id: editForm.consultant_id,
        lead_consultant_id: editForm.consultant_id,
        consultant: editForm.consultant_name,
        services: editForm.services ? editForm.services.split(",").map(s => s.trim()) : [],
        languages: editForm.languages ? editForm.languages.split(",").map(l => l.trim()) : [],
        image_url: editForm.image_base64 || editForm.image_url || null,
        registrationDeadline: editForm.registrationDeadline || null,
        assigned_staff_ids: editForm.assigned_staff_ids || [],
      };

      await apiFetch("/api/vedic-programs/" + selectedProgram.id, { method: "PATCH", body: JSON.stringify(body) });
      await fetchPrograms();
      setSelectedProgram(prev => ({ 
        ...prev, 
        ...editForm, 
        lead_consultant_id: editForm.consultant_id, 
        assigned_staff_ids: editForm.assigned_staff_ids, 
        _status: getProgramStatus({ ...prev, ...editForm }) 
      }));
      setIsEditing(false);
      triggerAlert("Program updated successfully!", true);
    } catch (err) {
      setEditError(err.message || "Failed to update program");
    } finally { setEditSaving(false); }
  };

  // ─── Create Program ─────────────────────────────────────────────────────
  const handleCreateProgram = async () => {
    setAddError("");
    const todayStr = new Date().toISOString().split('T')[0];

    if (!addForm.title.trim()) { setAddError("Title is required"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!addForm.startDate) { setAddError("Start date is required"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!addForm.endDate) { setAddError("End date is required"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (addForm.startDate < todayStr) { setAddError("Start date must be today or in the future"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (addForm.endDate < addForm.startDate) { setAddError("End date must be on or after start date"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (addForm.price === "" || Number(addForm.price) < 0) { setAddError("Price must be greater than or equal to 0"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!addForm.capacity || Number(addForm.capacity) < 1) { setAddError("Capacity must be at least 1"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (!addForm.consultant_id) { setAddError("Please select a lead consultant"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    if (addForm.assigned_staff_ids && addForm.assigned_staff_ids.length > 9) { setAddError("Maximum 9 specialists can be assigned."); triggerAlert("Validation failed. Please check inputs.", false); return; }

    if (addForm.registrationDeadline) {
      if (addForm.registrationDeadline < todayStr) { setAddError("Registration deadline must be today or in the future"); triggerAlert("Validation failed. Please check inputs.", false); return; }
      if (addForm.registrationDeadline > addForm.startDate) { setAddError("Registration deadline must be on or before start date"); triggerAlert("Validation failed. Please check inputs.", false); return; }
    }

    try {
      setAddSaving(true);
      const body = {
        title: addForm.title.trim(), type: addForm.type,
        description: addForm.description.trim(), duration: addForm.duration,
        startDate: addForm.startDate, endDate: addForm.endDate,
        capacity: Number(addForm.capacity), price: Number(addForm.price),
        accommodations: addForm.accommodations,
        consultant_id: addForm.consultant_id,
        lead_consultant_id: addForm.consultant_id,
        consultant: addForm.consultant_name,
        services: addForm.services ? addForm.services.split(",").map(s => s.trim()) : [],
        languages: addForm.languages ? addForm.languages.split(",").map(l => l.trim()) : [],
        image_url: addForm.image_base64 || addForm.image_url || null,
        enrolled: 0,
        assigned_staff_ids: addForm.assigned_staff_ids || [],
      };

      const res = await apiFetch("/api/vedic-programs", { method: "POST", body: JSON.stringify(body) });
      if (res.success) {
        if (addForm.consultant_id) {
          const inst = instructors.find(i => i.user_id === addForm.consultant_id || i.id === addForm.consultant_id);
          if (inst) {
            allocateStaff(inst, { id: res.program?.id || Date.now(), title: addForm.title, startDate: addForm.startDate, date: addForm.startDate, endDate: addForm.endDate }, "vedic_program");
          }
        }
        await fetchPrograms();
        setShowCreateModal(false);
        setAddForm(BLANK_FORM);
        triggerAlert("Program created successfully!", true);
      }
    } catch (err) {
      setAddError(err.message || "Failed to create program");
    } finally { setAddSaving(false); }
  };

  // ─── Allocate staff (from detail tab) ───────────────────────────────────
  const handleAllocateInstructor = async () => {
    if (!selectedProgram) return;
    if (!selectedProgram.consultant_id) { triggerAlert("Please assign a consultant first", false); return; }

    try {
      await apiFetch("/api/vedic-programs/" + selectedProgram.id + "/staff", {
        method: "PATCH",
        body: JSON.stringify({ assigned_staff_ids: selectedProgram.assigned_staff_ids || [] })
      });
      const inst = instructors.find(i => i.user_id === selectedProgram.consultant_id || i.id === selectedProgram.consultant_id);
      if (inst) {
        allocateStaff(inst, { id: selectedProgram.id, title: selectedProgram.title, startDate: selectedProgram.startDate, date: selectedProgram.startDate, endDate: selectedProgram.endDate }, "vedic_program");
      }
      triggerAlert("Instructors allocated and notified via email!", true);
    } catch (err) {
      triggerAlert(err.message || "Failed to allocate instructors", false);
    }
  };

  // ─── Render detail view ─────────────────────────────────────────────────
  const renderDetailView = () => {
    if (!selectedProgram) return null;
    const p = selectedProgram;
    const status = p._status || getProgramStatus(p);
    const st = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
    const displayImage = p.image || p.image_url || p.image_base64;

    const leadConsultant = instructors.find(i => i.user_id === p.consultant_id || i.id === p.consultant_id);
    const specialists = (p.assigned_staff_ids || []).map(id => instructors.find(i => i.user_id === id || i.id === id)).filter(Boolean);

    return (
      <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "65vh" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#2d3748", margin: "0 0 4px 0" }}>{p.title}</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <span style={{ background: st.color, color: "white", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{st.label}</span>
          <span style={{ background: PROGRAM_COLORS[p.type]?.color || "#CDA751", color: "white", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{p.type}</span>
        </div>

        <p style={{ fontSize: 13, color: "#7b8a9a", margin: "0 0 4px 0" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7b8a9a" strokeWidth="2" style={{ marginRight: 4, verticalAlign: "middle" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          Lead Consultant: {p.consultant_name || p.consultant || "Not assigned"}
        </p>

        {/* Tabs Bar */}
        <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid #e2e8f0", marginBottom: "20px", marginTop: "10px" }}>
          <button 
            onClick={() => setActiveDetailTab("info")}
            style={{ 
              background: "none", 
              border: "none", 
              borderBottom: activeDetailTab === "info" ? "3px solid #CDA751" : "3px solid transparent", 
              padding: "10px 4px", 
              fontSize: "14px", 
              fontWeight: 600, 
              color: activeDetailTab === "info" ? "#0F172A" : "#64748B", 
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Program Info
          </button>
          <button 
            onClick={() => setActiveDetailTab("staff")}
            style={{ 
              background: "none", 
              border: "none", 
              borderBottom: activeDetailTab === "staff" ? "3px solid #CDA751" : "3px solid transparent", 
              padding: "10px 4px", 
              fontSize: "14px", 
              fontWeight: 600, 
              color: activeDetailTab === "staff" ? "#0F172A" : "#64748B", 
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Assigned Staff
          </button>
          {isAdmin && (
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
              Attendees ({p.enrolled || 0})
            </button>
          )}
        </div>

        {activeDetailTab === "info" && (
          <>
            {displayImage && (
              <div style={{ marginBottom: 14, borderRadius: 8, overflow: "hidden" }}>
                <img src={getImageUrl(displayImage)} alt={p.title} style={{ width: "100%", maxHeight: 280, objectFit: "cover" }}
                  onError={(e) => { e.target.style.display = "none"; }} />
              </div>
            )}

            <p style={{ fontSize: 14, color: "#4a5568", lineHeight: 1.7, margin: "0 0 16px 0" }}>{p.description}</p>

            <div style={{ background: "#f8f9fb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: "#2d3748" }}>Program Details</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>Start Date</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{p.startDate ? new Date(p.startDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "N/A"}</span></div>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>End Date</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{p.endDate ? new Date(p.endDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : "N/A"}</span></div>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>Duration</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{p.duration}</span></div>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>Price</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>₹{(p.price || 0).toLocaleString("en-IN")}</span></div>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>Capacity</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{p.enrolled || 0} / {p.capacity} enrolled</span></div>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>Accommodation</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{p.accommodations || "Self-arranged"}</span></div>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>Services</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{p.services ? (Array.isArray(p.services) ? p.services.join(", ") : p.services) : "General Wellness"}</span></div>
                <div><span style={{ fontSize: 12, color: "#a0aec0" }}>Languages</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: "#2d3748" }}>{p.languages ? (Array.isArray(p.languages) ? p.languages.join(", ") : p.languages) : "English"}</span></div>
              </div>
            </div>

            <div className="vedic-modal-actions" style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}>
              {status !== "Cancelled" && status !== "completed" ? (
                <>
                  {status === "upcoming" && <button className="vedic-btn-cancel" style={{ flex: 1 }} onClick={handleStartEdit}>Edit Program</button>}
                  <button className="vedic-btn-allocate" style={{ flex: 1.5 }} onClick={handleAllocateInstructor}>
                    {p.consultant_id ? "Re-allocate Instructor" : "Allocate Consultant"}
                  </button>
                  <button className="vedic-btn-cancel" style={{ flex: 1, borderColor: "#e74c3c", color: "#e74c3c" }} onClick={handleCancelProgram}>
                    Cancel Program
                  </button>
                  {status === "upcoming" && (
                    <button className="vedic-btn-cancel" style={{ flex: 1, borderColor: "#e74c3c", color: "#e74c3c", background: "#fdf2f2" }} onClick={handleDeleteProgram}>
                      Delete Program
                    </button>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 13, color: "#718096", fontStyle: "italic" }}>
                  This program is completed or cancelled and cannot be edited, cancelled, or allocated.
                </span>
              )}
            </div>
          </>
        )}

        {activeDetailTab === "staff" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 700, color: "#2d3748", borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>Lead Consultant</h4>
              {leadConsultant ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8f9fb", padding: 12, borderRadius: 8, borderLeft: "4px solid #CDA751" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#CDA751", color: "white", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                    {leadConsultant.first_name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2d3748" }}>{leadConsultant.first_name} {leadConsultant.last_name}</div>
                    <div style={{ fontSize: 11, color: "#7b8a9a" }}>{leadConsultant.role} • {leadConsultant.specialization || "Ayurveda"}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#7b8a9a", fontStyle: "italic" }}>No Lead Consultant assigned.</div>
              )}
            </div>

            <div>
              <h4 style={{ margin: "10px 0 10px 0", fontSize: 14, fontWeight: 700, color: "#2d3748", borderBottom: "1px solid #e2e8f0", paddingBottom: 6 }}>Specialists ({specialists.length})</h4>
              {specialists.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {specialists.map(s => (
                    <div key={s.user_id || s.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8f9fb", padding: 12, borderRadius: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e2e8f0", color: "#475569", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                        {s.first_name[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#2d3748" }}>{s.first_name} {s.last_name}</div>
                        <div style={{ fontSize: 11, color: "#7b8a9a" }}>{s.role} • {s.specialization || "Therapist"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#7b8a9a", fontStyle: "italic" }}>No specialists assigned yet.</div>
              )}
            </div>
          </div>
        )}

        {activeDetailTab === "attendees" && isAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header controls for Attendees */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", flex: 1, minWidth: 300 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", background: "white", flex: 1, minWidth: 180 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input 
                    type="text" 
                    placeholder="Search attendee..." 
                    value={attendeeSearch} 
                    onChange={e => setAttendeeSearch(e.target.value)} 
                    style={{ border: "none", outline: "none", fontSize: 13, width: "100%", background: "transparent" }}
                  />
                </div>
                <select 
                  value={attendeeStatusFilter} 
                  onChange={e => setAttendeeStatusFilter(e.target.value)}
                  style={{ 
                    padding: "7px 12px", 
                    borderRadius: 8, 
                    border: "1px solid #e2e8f0", 
                    fontSize: 13, 
                    outline: "none", 
                    background: "white",
                    color: "#4a5568",
                    cursor: "pointer"
                  }}
                >
                  <option value="ALL">Status: All</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="ATTENDED">Attended</option>
                  <option value="ABSENT">Absent</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <select 
                  value={attendeePaymentFilter} 
                  onChange={e => setAttendeePaymentFilter(e.target.value)}
                  style={{ 
                    padding: "7px 12px", 
                    borderRadius: 8, 
                    border: "1px solid #e2e8f0", 
                    fontSize: 13, 
                    outline: "none", 
                    background: "white",
                    color: "#4a5568",
                    cursor: "pointer"
                  }}
                >
                  <option value="ALL">Payment: All</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={handleExportCSV} 
                  className="vedic-btn-cancel" 
                  style={{ padding: "8px 12px", fontSize: 12 }}
                >
                  Export CSV
                </button>
                {status === "upcoming" ? (
                  <button 
                    onClick={() => {
                      setShowManualEnroll(!showManualEnroll);
                      setPhoneError("");
                      setManualEnrollForm({ name: "", email: "", phone: "", accommodation_type: "", payment_status: "Pending", checkin_date: "", checkout_date: "" });
                    }} 
                    className="vedic-btn-allocate" 
                    style={{ padding: "8px 12px", fontSize: 12 }}
                  >
                    {showManualEnroll ? "Close Form" : "+ Enroll User"}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "#e74c3c", fontWeight: 600 }}>Enrollment Closed</span>
                )}
              </div>
            </div>

            {/* Manual Enrollment Form */}
            {showManualEnroll && (
              <div style={{ background: "#f8f9fb", borderRadius: 8, padding: 16, border: "1px solid rgba(205,167,81,0.2)" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: "#2d3748" }}>Enroll User Manually</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <FormField label="Full Name">
                    <input 
                      type="text" 
                      placeholder="John Doe" 
                      value={manualEnrollForm.name} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, name: e.target.value }))}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Email Address">
                    <input 
                      type="email" 
                      placeholder="john@example.com" 
                      value={manualEnrollForm.email} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, email: e.target.value }))}
                      style={inputStyle}
                    />
                  </FormField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <FormField label="Phone Number (Optional)">
                    <input 
                      type="text" 
                      placeholder="9876543210" 
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
                      style={inputStyle}
                    />
                    {phoneError && (
                      <span className="phone-validation-error" style={{ color: "#e74c3c", fontSize: "12px", fontWeight: "600", marginTop: "4px", display: "block" }}>
                        {phoneError}
                      </span>
                    )}
                  </FormField>
                  <FormField label="Accommodation Type (Optional)">
                    <input 
                      type="text" 
                      placeholder="e.g. Deluxe Room" 
                      value={manualEnrollForm.accommodationType || ""} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, accommodationType: e.target.value }))}
                      style={inputStyle}
                    />
                  </FormField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <FormField label="Payment Status">
                    <select 
                      value={manualEnrollForm.paymentStatus} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, paymentStatus: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIALLY_PAID">Partially Paid</option>
                    </select>
                  </FormField>
                  <FormField label="Check-In Date (Optional)">
                    <input 
                      type="date" 
                      value={manualEnrollForm.checkInDate || ""} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, checkInDate: e.target.value }))}
                      style={inputStyle}
                    />
                  </FormField>
                  <FormField label="Check-Out Date (Optional)">
                    <input 
                      type="date" 
                      value={manualEnrollForm.checkOutDate || ""} 
                      onChange={e => setManualEnrollForm(p => ({ ...p, checkOutDate: e.target.value }))}
                      style={inputStyle}
                    />
                  </FormField>
                </div>
                {manualEnrollError && <div style={{ color: "#e74c3c", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{manualEnrollError}</div>}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="vedic-btn-cancel" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => { setShowManualEnroll(false); setPhoneError(""); setManualEnrollForm({ name: "", email: "", phone: "", accommodationType: "", paymentStatus: "PENDING", checkInDate: "", checkOutDate: "", status: "CONFIRMED" }); }}>Cancel</button>
                  <button className="vedic-btn-allocate" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleManualEnroll} disabled={manualEnrollSaving || !!phoneError}>
                    {manualEnrollSaving ? "Enrolling..." : "Submit Enrollment"}
                  </button>
                </div>
              </div>
            )}

            {/* Attendees Table */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "white", overflowX: "auto" }}>
              {attendeesLoading ? (
                <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Loading attendees...</div>
              ) : attendeesError ? (
                <div style={{ padding: 30, textAlign: "center", color: "#e74c3c" }}>{attendeesError}</div>
              ) : filteredAttendees.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                  {attendeeSearch ? "No attendees match your search." : "No users enrolled in this program yet."}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "900px" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fb", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Name</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Email</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Phone</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Accommodation</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Payment Status</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Check-In</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Check-Out</th>
                      <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map(a => {
                      const statusStyles = getAttendeeStatusStyles(a.status);
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid #f1f3f7" }}>
                          <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#2d3748" }}>{a.name}</td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: "#4a5568" }}>{a.email}</td>
                          <td style={{ padding: "10px 16px", fontSize: 13, color: "#4a5568" }}>{a.phone || "-"}</td>
                          <td style={{ padding: "10px 16px" }}>
                            {(() => {
                              const styles = getAttendeeStatusStyles(a.status);
                              return (
                                <span style={{
                                  padding: "4px 10px",
                                  borderRadius: "12px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  background: styles.bg,
                                  color: styles.color,
                                  textTransform: "uppercase",
                                  display: "inline-block"
                                }}>
                                  {(a.status || 'REGISTERED').replace('_', ' ')}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: "6px 12px", width: "150px" }}>
                            <EditableText 
                              value={a.accommodation_type} 
                              placeholder="Add Accommodation..."
                              onSave={val => handleUpdateAttendeeField(a.id, 'accommodation_type', val)} 
                            />
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <EditablePaymentStatus 
                              value={a.payment_status} 
                              onSave={val => handleUpdateAttendeeField(a.id, 'payment_status', val)} 
                            />
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <EditableDate 
                              value={a.check_in_date} 
                              onSave={val => handleUpdateAttendeeField(a.id, 'check_in_date', val)} 
                            />
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <EditableDate 
                              value={a.check_out_date} 
                              onSave={val => handleUpdateAttendeeField(a.id, 'check_out_date', val)} 
                            />
                          </td>
                          <td style={{ position: "relative", padding: "10px 16px" }}>
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <img src={ActionIcon} className="action-icon" alt="Actions" style={{ cursor: "pointer", width: "14px", height: "14px", opacity: 0.8 }}
                                onClick={(e) => { e.stopPropagation(); setOpenActionMenu(openActionMenu === a.id ? null : a.id); }} />
                              {openActionMenu === a.id && (
                                <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 1000, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "150px", overflow: "hidden", textAlign: "left" }}>
                                  {[
                                    { label: "Registered", value: "REGISTERED" },
                                    { label: "Confirmed", value: "CONFIRMED" },
                                    { label: "Checked In", value: "CHECKED_IN" },
                                    { label: "Attended", value: "ATTENDED" },
                                    { label: "Absent", value: "ABSENT" },
                                    { label: "Cancelled", value: "CANCELLED" }
                                  ].map(opt => (
                                    <div key={opt.value} onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenu(null);
                                      if (opt.value === 'CHECKED_IN') {
                                        handleCheckinAttendee(a.id);
                                      } else {
                                        handleUpdateAttendeeField(a.id, 'status', opt.value);
                                      }
                                    }}
                                      style={{ padding: "8px 16px", cursor: "pointer", fontSize: "13px", color: (a.status || '').toUpperCase() === opt.value ? "#CDA751" : "#4a5568", fontWeight: (a.status || '').toUpperCase() === opt.value ? "700" : "500", display: "flex", alignItems: "center", gap: "8px" }}
                                      onMouseEnter={e => e.currentTarget.style.background = "#fcf8ed"}
                                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                      {opt.label}
                                    </div>
                                  ))}
                                  <div style={{ borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />
                                  <div onClick={(e) => { e.stopPropagation(); setOpenActionMenu(null); handleDeleteAttendee(a.id); }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "13px", color: "#e74c3c", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#fdf2f2"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    Delete
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render edit form ───────────────────────────────────────────────────
  const renderEditForm = () => (
    <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "65vh" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2d3748", margin: "0 0 16px 0" }}>Edit Program</h2>
      <ProgramForm form={editForm} onChange={(e) => setEditForm(p => ({ ...p, [e.target.name]: e.target.value }))} instructors={instructors} mode="edit" onSearchPexels={() => { setMediaTarget('edit'); setMediaModalOpen(true); }} />
      {editError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600, marginTop: 8 }}>{editError}</div>}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button className="vedic-btn-cancel" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
        <button className="vedic-btn-allocate" style={{ flex: 2 }} onClick={handleSaveEdit} disabled={editSaving}>
          {editSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="vedic-container">

      {/* ── HEADER (hide in detail view) ── */}
      {!selectedProgram && (
        <>
          <div className="vedic-header">
            <div className="vedic-title">
              <h1>Vedic Life Programs</h1>
              <p>Manage international programs, retreats, and consultation offerings</p>
            </div>
            {isAdmin && (
              <button className="vedic-add-btn" onClick={() => { setAddForm(BLANK_FORM); setAddError(""); setShowCreateModal(true); }}>
                + Create Package
              </button>
            )}
          </div>

          <section className="vedic-stats-row">
            <div className="vedic-stat-card">
              <div className="vedic-stat-value">{stats.total}</div>
              <div className="vedic-stat-label">Total Programs</div>
            </div>
            <div className="vedic-stat-card" style={stats.ongoing > 0 ? { borderLeft: "4px solid #2ecc71" } : undefined}>
              <div className="vedic-stat-value" style={{ color: stats.ongoing > 0 ? "#2ecc71" : "#2d3748" }}>{stats.ongoing}</div>
              <div className="vedic-stat-label">Ongoing</div>
            </div>
            <div className="vedic-stat-card">
              <div className="vedic-stat-value">{stats.upcoming}</div>
              <div className="vedic-stat-label">Upcoming</div>
            </div>
            <div className="vedic-stat-card">
              <div className="vedic-stat-value">{stats.completed}</div>
              <div className="vedic-stat-label">Completed</div>
            </div>
          </section>

          <div className="vedic-controls">
            <div className="vedic-search-box">
              <img src={SearchIcon} alt="search" />
              <input type="text" placeholder="Search programs..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="vedic-filters">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="vedic-select">
                <option value="ALL">Type: All</option>
                <option value="Retreat">Retreat</option>
                <option value="Treatment">Treatment</option>
                <option value="Consultation">Consultation</option>
                <option value="Accommodation">Accommodation</option>
              </select>
              <select value={durationFilter} onChange={(e) => setDurationFilter(e.target.value)} className="vedic-select">
                <option value="ALL">Duration: All</option>
                <option value="7-days">7 days</option>
                <option value="14-days">14 days</option>
                <option value="30-days">30 days</option>
                <option value="custom">Custom</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="vedic-select">
                <option value="ALL">Status: All</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Renewal</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {dataLoading ? (
            <div className="vedic-loading">Loading programs...</div>
          ) : filtered.length === 0 ? (
            <div className="vedic-empty"><p className="vedic-empty-text">No programs found</p><p className="vedic-empty-subtext">Try adjusting your filters</p></div>
          ) : (
            <div className="vedic-grid">
              {filtered.map((program) => <ProgramCard key={program.id} program={program} onClick={handleSelectProgram} />)}
            </div>
          )}


        </>
      )}

      {/* ── DETAIL / EDIT VIEW ── */}
      {selectedProgram && (
        <div className="vedic-detail-container" style={{ animation: "wsFadeIn 0.3s ease", background: "white", borderRadius: 12, border: "1px solid rgba(205,167,81,0.2)", overflow: "hidden" }}>
          <button onClick={handleCloseDetail} style={{ background: "none", border: "none", fontSize: 14, color: "#CDA751", fontWeight: 600, cursor: "pointer", padding: "16px 28px 0", display: "flex", alignItems: "center", gap: 6 }}>
            ← Back to Programs
          </button>
          {!isEditing ? renderDetailView() : renderEditForm()}
        </div>
      )}

      {/* ── CREATE DRAWER ── */}
      <div className={`drawer-overlay ${showCreateModal ? "open" : ""}`} onClick={() => setShowCreateModal(false)} style={{ zIndex: 1000 }} />
      <div className={`drawer-panel ${showCreateModal ? "open" : ""}`} style={{ zIndex: 1001, width: "450px", right: showCreateModal ? 0 : "-490px" }}>
        <div className="drawer-header">
          <div className="drawer-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8, color: "#CDA751" }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Create New Vedic Program
          </div>
          <button className="drawer-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
        </div>
        <div className="drawer-body">
          <ProgramForm form={addForm} onChange={(e) => setAddForm(p => ({ ...p, [e.target.name]: e.target.value }))} instructors={instructors} mode="add" onSearchPexels={() => { setMediaTarget('add'); setMediaModalOpen(true); }} />
          {addError && <div style={{ color: "#e74c3c", fontSize: 13, fontWeight: 600, marginTop: 12 }}>{addError}</div>}
        </div>
        <div className="drawer-footer">
          <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
          <button className="btn-save" onClick={handleCreateProgram} disabled={addSaving} style={{ opacity: addSaving ? 0.6 : 1 }}>
            {addSaving ? "Creating..." : "Create Program"}
          </button>
        </div>
      </div>

      <MediaPickerModal 
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={handleSelectStockImage}
        allowVideos={false}
        title="Select Pexels Image"
        page_type="vedic_packages"
        category={(mediaTarget === 'add' ? addForm : editForm)?.type || 'Ayurveda'}
        subcategory="All"
        defaultQuery={(() => {
          const form = mediaTarget === 'add' ? addForm : editForm;
          const title = (form.title || '').toLowerCase();
          const desc = (form.description || '').toLowerCase();
          if (title.includes('ayurveda') || desc.includes('ayurveda') || title.includes('panchakarma')) return 'Ayurveda';
          if (title.includes('yoga') || desc.includes('yoga') || title.includes('meditation')) return 'Yoga';
          if (title.includes('wellness') || desc.includes('wellness')) return 'Wellness';
          if (title.includes('holistic') || desc.includes('holistic') || title.includes('lifestyle')) return 'Holistic Lifestyle';
          return 'Ayurveda';
        })()}
        suggestions={['Ayurveda', 'Yoga', 'Wellness', 'Holistic Lifestyle']}
      />
    </div>
  );
}