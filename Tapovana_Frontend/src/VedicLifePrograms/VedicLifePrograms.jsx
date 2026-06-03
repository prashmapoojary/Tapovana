import React, { useState, useMemo, useEffect } from "react";
import "./VedicLifePrograms.css";
import { apiFetch } from "../api/http";
import { useAllocations } from "../utils/AllocationContext";
import { getUser } from "../utils/session";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import FilterIcon from "../assets/filterIcon.svg";
import { getImageUrl } from "../utils/image";

const PROGRAM_COLORS = {
  "Retreat": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Treatment": { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "Consultation": { color: "#2ecc71", bg: "rgba(46,204,113,0.1)" },
  "Accommodation": { color: "#e67e22", bg: "rgba(230,126,34,0.1)" },
};

const DURATION_COLORS = {
  "7-days": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "14-days": { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  "30-days": { color: "#2ecc71", bg: "rgba(46,204,113,0.1)" },
  "custom": { color: "#e67e22", bg: "rgba(230,126,34,0.1)" },
};

const DUMMY_PROGRAMS = [
  {
    id: "VP-001",
    title: "Ayurveda Wellness Retreat",
    type: "Retreat",
    description: "7-day comprehensive Ayurveda retreat with personalized consultations and treatments.",
    duration: "7-days",
    startDate: "2026-07-01",
    endDate: "2026-07-07",
    capacity: 30,
    enrolled: 24,
    price: 35000,
    accommodations: "3-star Resort",
    consultant: "Dr. Priya Krishnan",
    services: ["Consultation", "Massage", "Yoga", "Nutrition"],
    languages: ["English", "Hindi", "Malayalam"],
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-002",
    title: "International Ayurveda Treatment Program",
    type: "Treatment",
    description: "30-day specialized Ayurvedic treatment for chronic conditions with international support.",
    duration: "30-days",
    startDate: "2026-08-01",
    endDate: "2026-08-30",
    capacity: 20,
    enrolled: 12,
    price: 85000,
    accommodations: "4-star Hotel",
    consultant: "Dr. Kavitha Rao",
    services: ["Panchakarma", "Abhyanga", "Dietary Management"],
    languages: ["English", "Spanish", "French"],
    image: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-003",
    title: "Yoga & Meditation Immersion",
    type: "Retreat",
    description: "14-day intensive yoga and meditation program for international seekers.",
    duration: "14-days",
    startDate: "2026-06-15",
    endDate: "2026-06-28",
    capacity: 40,
    enrolled: 35,
    price: 28000,
    accommodations: "Ashram Accommodation",
    consultant: "Swami Anandamaya",
    services: ["Yoga", "Meditation", "Pranayama", "Philosophy"],
    languages: ["English", "Italian", "German"],
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-004",
    title: "Nutrition & Lifestyle Coaching",
    type: "Consultation",
    description: "Personalized nutrition and lifestyle consultation for international participants.",
    duration: "7-days",
    startDate: "2026-07-10",
    endDate: "2026-07-16",
    capacity: 25,
    enrolled: 18,
    price: 15000,
    accommodations: "Self-arranged",
    consultant: "Dr. Sanjay Bhat",
    services: ["Consultation", "Meal Planning", "Lifestyle Guidance"],
    languages: ["English", "Russian"],
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-005",
    title: "Holistic Health Transformation",
    type: "Retreat",
    description: "21-day comprehensive program combining Ayurveda, Yoga, and modern wellness.",
    duration: "custom",
    startDate: "2026-08-15",
    endDate: "2026-09-04",
    capacity: 35,
    enrolled: 28,
    price: 65000,
    accommodations: "5-star Resort & Spa",
    consultant: "Dr. Rekha Menon",
    services: ["Consultation", "Yoga", "Massage", "Nutrition", "Workshops"],
    languages: ["English", "Japanese", "Korean"],
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-006",
    title: "Detox & Rejuvenation Program",
    type: "Treatment",
    description: "Deep Panchakarma detox program with international guidance.",
    duration: "14-days",
    startDate: "2026-09-01",
    endDate: "2026-09-14",
    capacity: 15,
    enrolled: 10,
    price: 55000,
    accommodations: "Wellness Center",
    consultant: "Dr. Arjun Nair",
    services: ["Panchakarma", "Herbal Treatment", "Yoga"],
    languages: ["English", "Portuguese"],
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-007",
    title: "Panchakarma Detox Retreat",
    type: "Treatment",
    description: "Traditional 14-day Panchakarma detox to purify the body, mind, and spirit under expert medical supervision.",
    duration: "14-days",
    startDate: "2026-10-01",
    endDate: "2026-10-14",
    capacity: 18,
    enrolled: 8,
    price: 48000,
    accommodations: "Executive Suite",
    consultant: "Dr. Priya Krishnan",
    services: ["Panchakarma", "Nadi Pariksha", "Swedana", "Basti"],
    languages: ["English", "Hindi"],
    image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-008",
    title: "Ayurveda Stress Management",
    type: "Retreat",
    description: "A restorative 7-day program focused on lowering cortisol, clearing mental clutter, and restoring nervous system balance.",
    duration: "7-days",
    startDate: "2026-10-20",
    endDate: "2026-10-26",
    capacity: 22,
    enrolled: 15,
    price: 32000,
    accommodations: "Lakefront Villa",
    consultant: "Dr. Rekha Menon",
    services: ["Shirodhara", "Abhyanga", "Pranayama", "Sound Healing"],
    languages: ["English", "Sanskrit"],
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-009",
    title: "Immunity & Rejuvenation Program",
    type: "Consultation",
    description: "A tailored 30-day program using specialized Rasayana herbs, nutrition, and therapies to elevate natural body immunity.",
    duration: "30-days",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    capacity: 25,
    enrolled: 11,
    price: 72000,
    accommodations: "Garden View Cottage",
    consultant: "Dr. Kavitha Rao",
    services: ["Consultation", "Rasayana Therapy", "Dietary Plan", "Yoga"],
    languages: ["English", "German", "Hindi"],
    image: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-010",
    title: "Spine & Joint Care Program",
    type: "Treatment",
    description: "A specialized 14-day treatment addressing chronic back pain, joint stiffness, and posture correction using classical Ayurvedic oils and bastis.",
    duration: "14-days",
    startDate: "2026-12-01",
    endDate: "2026-12-14",
    capacity: 15,
    enrolled: 6,
    price: 42000,
    accommodations: "Premium Cottage",
    consultant: "Dr. Sanjay Bhat",
    services: ["Kati Basti", "Janu Basti", "Ayurvedic Massage", "Spine Care"],
    languages: ["English", "Hindi", "Kannada"],
    image: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-011",
    title: "Weight Management & Metabolism Boost",
    type: "Retreat",
    description: "30-day weight management program through customized dry powder massage, detoxification treatments, yogic kriyas, and custom diet plans.",
    duration: "30-days",
    startDate: "2026-12-15",
    endDate: "2027-01-14",
    capacity: 20,
    enrolled: 14,
    price: 68000,
    accommodations: "Standard Resort Room",
    consultant: "Dr. Rekha Menon",
    services: ["Udwarthanam", "Diet Control", "Yoga", "Detoxification"],
    languages: ["English", "Malayalam", "Tamil"],
    image: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "VP-012",
    title: "Corporate Wellness & Mindful Leadership",
    type: "Consultation",
    description: "7-day intensive corporate retreat focused on mindful leadership, stress response restructuring, and nervous system replenishment.",
    duration: "7-days",
    startDate: "2027-01-05",
    endDate: "2027-01-12",
    capacity: 30,
    enrolled: 22,
    price: 25000,
    accommodations: "Self-arranged",
    consultant: "Swami Anandamaya",
    services: ["Mindfulness Coaching", "Stress Relief", "Yoga", "Pranayama"],
    languages: ["English", "Hindi"],
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800",
  },
];

const DUMMY_STAFF = [
  { user_id: "DR001", first_name: "Dr. Priya", last_name: "Krishnan", role: "DOCTOR", specialization: "Ayurveda" },
  { user_id: "DR002", first_name: "Dr. Kavitha", last_name: "Rao", role: "DOCTOR", specialization: "Panchakarma" },
  { user_id: "DR003", first_name: "Dr. Rekha", last_name: "Menon", role: "DOCTOR", specialization: "Holistic Health" },
  { user_id: "TH001", first_name: "Swami", last_name: "Anandamaya", role: "THERAPIST", specialization: "Yoga & Meditation" },
  { user_id: "TH002", first_name: "Dr. Sanjay", last_name: "Bhat", role: "THERAPIST", specialization: "Nutrition" },
  { user_id: "TH003", first_name: "Dr. Arjun", last_name: "Nair", role: "THERAPIST", specialization: "Wellness Coaching" },
  { user_id: "TH004", first_name: "Guru", last_name: "Ramakrishnan", role: "THERAPIST", specialization: "Philosophy" },
];

function ProgramCard({ program, onClick }) {
  const typeColor = PROGRAM_COLORS[program.type] || PROGRAM_COLORS["Retreat"];
  const durationColor = DURATION_COLORS[program.duration] || DURATION_COLORS["custom"];
  const pct = Math.round((program.enrolled / program.capacity) * 100);
  const daysLeft = Math.ceil((new Date(program.startDate) - new Date()) / (1000 * 60 * 60 * 24));

  const [imgFailed, setImgFailed] = useState(!program.image);

  return (
    <div className="vedic-card" onClick={() => onClick(program)}>
      <div className="vedic-card-banner" style={{ overflow: "hidden", position: "relative" }}>
        {!imgFailed ? (
          <img 
            src={getImageUrl(program.image)} 
            alt={program.title} 
            className="vedic-card-banner-img" 
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
          <div className="vedic-card-banner-fallback" style={{
            background: `linear-gradient(135deg, ${typeColor.color}15, ${typeColor.color}35)`,
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
              {program.type === "Retreat" ? "🌴" : program.type === "Treatment" ? "💆" : program.type === "Consultation" ? "👨‍⚕️" : "🏨"}
            </span>
          </div>
        )}
        <div className="vedic-card-badges" style={{ zIndex: 2 }}>
          <div className="vedic-card-badge" style={{ background: "#ffffff", color: typeColor.color, border: `1px solid ${typeColor.color}`, fontWeight: 700 }}>
            {program.type}
          </div>
          <div className="vedic-card-badge" style={{ background: "#ffffff", color: durationColor.color, border: `1px solid ${durationColor.color}`, fontWeight: 700 }}>
            {program.duration}
          </div>
        </div>
      </div>

      <div className="vedic-card-body">
        <h3 className="vedic-card-title">{program.title}</h3>
        <p className="vedic-card-description">{program.description}</p>

        <div className="vedic-card-meta">
          <div className="vedic-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {new Date(program.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - {new Date(program.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </div>

          <div className="vedic-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Starts in {daysLeft > 0 ? `${daysLeft} days` : "Ongoing"}
          </div>

          <div className="vedic-card-meta-item">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {program.consultant}
          </div>

          <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginTop: "8px" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#e74c3c" : pct >= 80 ? "#e67e22" : typeColor.color }} />
          </div>
          <div style={{ fontSize: "12px", color: "#718096", display: "flex", justifyContent: "space-between" }}>
            <span>{program.enrolled}/{program.capacity} enrolled</span>
            <span style={{ color: pct >= 100 ? "#e74c3c" : typeColor.color, fontWeight: 700 }}>{pct}%</span>
          </div>
        </div>

        <div className="vedic-card-price">₹{program.price.toLocaleString("en-IN")}</div>
        <button className="vedic-card-btn" onClick={(e) => { e.stopPropagation(); onClick(program); }}>
          View & Allocate Staff
        </button>
      </div>
    </div>
  );
}

function AllocationModal({ program, staff, onClose, onAllocate, isAdmin, onEdit }) {
  const { allocateStaff, getAllocatedStaffIds } = useAllocations();
  const [selectedStaff, setSelectedStaff] = useState(new Set());
  const [allocating, setAllocating] = useState(false);
  const allocatedIds = getAllocatedStaffIds();

  const programEndDate = new Date(program.endDate || program.startDate);
  if (program.endDate && program.endDate.length <= 10) {
    programEndDate.setHours(23, 59, 59, 999);
  }
  const isCompleted = programEndDate < new Date();

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

  const handleAllocate = async () => {
    if (isCompleted) {
      alert("Cannot allocate staff: This program is already completed.");
      return;
    }
    if (selectedStaff.size === 0) {
      alert("Please select at least one staff member");
      return;
    }

    setAllocating(true);
    try {
      let successCount = 0;
      selectedStaff.forEach((staffId) => {
        const staffMember = staff.find((s) => (s.user_id || s.id) === staffId);
        if (staffMember) {
          const allocatedId = allocateStaff(staffMember, program, "vedic_program");
          if (allocatedId) successCount++;
        }
      });

      if (successCount > 0) {
        onAllocate(Array.from(selectedStaff));
      }
      setSelectedStaff(new Set());
      onClose();
    } catch (error) {
      alert("Error allocating staff: " + error.message);
    } finally {
      setAllocating(false);
    }
  };

  // Only show DOCTOR and THERAPIST, and fully exclude active allocations
  const availableStaff = staff.filter((s) => {
    const isDoctorOrTherapist = s.role === "DOCTOR" || s.role === "THERAPIST";
    const isAlreadyAllocated = allocatedIds.includes(s.user_id || s.id);
    return isDoctorOrTherapist && !isAlreadyAllocated;
  });

  return (
    <div className="vedic-modal-overlay" onClick={onClose}>
      <div className="vedic-modal" onClick={(e) => e.stopPropagation()}>
        {isCompleted && (
          <div style={{ background: "#fff5f5", borderBottom: "1px solid #fed7d7", padding: "12px 24px", color: "#c53030", fontSize: "13px", fontWeight: 600 }}>
            🔒 Allocation locked: This program has already ended and cannot have new staff allocated.
          </div>
        )}
        <div className="vedic-modal-header">
          <h2 className="vedic-modal-title">Allocate Staff to {program.title}</h2>
          <button className="vedic-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="vedic-modal-body">
          <div className="vedic-modal-section">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="vedic-modal-section-title">Program Details</div>
              {isAdmin && (
                <button
                  onClick={onEdit}
                  style={{
                    padding: "4px 10px",
                    background: "transparent",
                    border: "1px solid #cda751",
                    borderRadius: "6px",
                    color: "#cda751",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "Manrope, sans-serif"
                  }}
                >
                  ✏️ Edit details
                </button>
              )}
            </div>
            <div style={{ fontSize: "14px", color: "#4a5568", lineHeight: "1.6" }}>
              <div><strong>Start Date:</strong> {new Date(program.startDate).toLocaleDateString("en-IN")}</div>
              <div><strong>End Date:</strong> {new Date(program.endDate).toLocaleDateString("en-IN")}</div>
              <div><strong>Consultant:</strong> {program.consultant}</div>
              <div><strong>Services:</strong> {program.services.join(", ")}</div>
            </div>
          </div>

          <div className="vedic-modal-section">
            <div className="vedic-modal-section-title">Select Staff to Allocate (Only Available Staff Shown)</div>
            <div className="vedic-staff-list" style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto", padding: "4px" }}>
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
                      className="vedic-staff-item"
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
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
                      <span className="vedic-staff-name" style={{ fontWeight: isSelected ? 600 : 400, color: "#2d3748", fontSize: "14px" }}>
                        {s.first_name} {s.last_name}
                      </span>
                      <span className="vedic-staff-role" style={{ fontSize: "11px", color: "#cda751", fontWeight: 700, marginLeft: "auto", background: "rgba(205,167,81,0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        {s.role}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="vedic-modal-footer">
          <button className="vedic-btn-cancel" onClick={onClose} disabled={allocating}>
            Cancel
          </button>
          <button className="vedic-btn-allocate" onClick={handleAllocate} disabled={allocating || selectedStaff.size === 0}>
            {allocating ? "Allocating..." : `Allocate ${selectedStaff.size} Staff`}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePackageModal({ staff, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: "",
    type: "Retreat",
    description: "",
    duration: "7-days",
    startDate: "",
    endDate: "",
    capacity: 20,
    price: "",
    accommodations: "",
    consultant: "",
    services: "",
    languages: "",
  });
  const [image, setImage] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate || !formData.price || !formData.consultant) {
      alert("Please fill in all required fields (Title, Start Date, End Date, Price, and Consultant)");
      return;
    }

    // Start date cannot be in the past
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(formData.startDate);
    if (start < today) {
      alert("Start date cannot be set in the past for new programs.");
      return;
    }

    // End date must be after start date
    const end = new Date(formData.endDate);
    if (end < start) {
      alert("End date must be after start date.");
      return;
    }

    // Price must be > 0
    const priceVal = parseFloat(formData.price);
    if (isNaN(priceVal) || priceVal <= 0) {
      alert("Price must be greater than 0.");
      return;
    }

    // Capacity must be >= 1
    const capacityVal = parseInt(formData.capacity);
    if (isNaN(capacityVal) || capacityVal < 1) {
      alert("Capacity must be at least 1.");
      return;
    }

    const newProgram = {
      id: `VP-${Date.now()}`,
      title: formData.title,
      type: formData.type,
      description: formData.description,
      duration: formData.duration,
      startDate: formData.startDate,
      endDate: formData.endDate,
      capacity: capacityVal,
      enrolled: 0,
      price: priceVal,
      accommodations: formData.accommodations || "Self-arranged",
      consultant: formData.consultant,
      services: formData.services ? formData.services.split(",").map(s => s.trim()) : ["General Wellness"],
      languages: formData.languages ? formData.languages.split(",").map(l => l.trim()) : ["English"],
      image: image,
    };

    onCreate(newProgram);
    onClose();
  };

  const consultantsList = staff.filter(s => s.role === "DOCTOR" || s.role === "THERAPIST");

  return (
    <div className="vedic-modal-overlay" onClick={onClose}>
      <div className="vedic-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="vedic-modal-header">
          <h2 className="vedic-modal-title">✨ Create New Vedic Program Package</h2>
          <button className="vedic-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="vedic-modal-body" style={{ gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Program Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Ayurveda Detox & Yoga Retreat"
                required
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Program Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="vedic-form-select"
              >
                <option value="Retreat">Retreat</option>
                <option value="Treatment">Treatment</option>
                <option value="Consultation">Consultation</option>
                <option value="Accommodation">Accommodation</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a detailed summary of the program benefits and activities..."
              rows="3"
              className="vedic-form-textarea"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Duration</label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="vedic-form-select"
              >
                <option value="7-days">7 days</option>
                <option value="14-days">14 days</option>
                <option value="30-days">30 days</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Price (INR) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="Price in ₹"
                required
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Max Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="20"
                className="vedic-form-input"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="vedic-form-input"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Lead Consultant *</label>
              <select
                name="consultant"
                value={formData.consultant}
                onChange={handleChange}
                required
                className="vedic-form-select"
              >
                <option value="">Select Lead Consultant...</option>
                {consultantsList.map(s => (
                  <option key={s.user_id} value={`${s.first_name} ${s.last_name}`}>{s.first_name} {s.last_name} ({s.role})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Accommodations</label>
              <input
                type="text"
                name="accommodations"
                value={formData.accommodations}
                onChange={handleChange}
                placeholder="e.g., Lakefront Cottage"
                className="vedic-form-input"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Services Included (comma-separated)</label>
              <input
                type="text"
                name="services"
                value={formData.services}
                onChange={handleChange}
                placeholder="e.g., Yoga, Massage, Meditation"
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Languages Supported (comma-separated)</label>
              <input
                type="text"
                name="languages"
                value={formData.languages}
                onChange={handleChange}
                placeholder="e.g., English, Hindi, German"
                className="vedic-form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#404854", fontSize: "12px", marginBottom: "2px" }}>Package Cover Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="vedic-form-file-input"
            />
            {image && (
              <div style={{ marginTop: "10px" }}>
                <img src={image} alt="Preview" style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "4px", border: "1px solid #cbd5e0" }} />
              </div>
            )}
          </div>

          <div className="vedic-modal-footer" style={{ borderTop: "1px solid #E8E2D9", paddingTop: "12px", marginTop: "12px" }}>
            <button type="button" className="vedic-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="vedic-btn-allocate">
              Create Program
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditPackageModal({ program, staff, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: program.title || "",
    type: program.type || "Retreat",
    description: program.description || "",
    duration: program.duration || "7-days",
    startDate: program.startDate || "",
    endDate: program.endDate || "",
    capacity: program.capacity || 20,
    price: program.price || "",
    accommodations: program.accommodations || "",
    consultant: program.consultant || "",
    services: program.services ? program.services.join(", ") : "",
    languages: program.languages ? program.languages.join(", ") : "",
  });
  const [image, setImage] = useState(program.image || "");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate || !formData.price || !formData.consultant) {
      alert("Please fill in all required fields (Title, Start Date, End Date, Price, and Consultant)");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) {
      alert("End date must be after start date.");
      return;
    }

    const priceVal = parseFloat(formData.price);
    if (isNaN(priceVal) || priceVal <= 0) {
      alert("Price must be greater than 0.");
      return;
    }

    const capacityVal = parseInt(formData.capacity);
    if (isNaN(capacityVal) || capacityVal < 1) {
      alert("Capacity must be at least 1.");
      return;
    }

    const currentEnrolled = program.enrolled || 0;
    if (capacityVal < currentEnrolled) {
      alert(`Capacity cannot be less than current enrolment (${currentEnrolled} enrolled). Reduce enrolment first.`);
      return;
    }

    const updatedProgram = {
      ...program,
      title: formData.title,
      type: formData.type,
      description: formData.description,
      duration: formData.duration,
      startDate: formData.startDate,
      endDate: formData.endDate,
      capacity: capacityVal,
      price: priceVal,
      accommodations: formData.accommodations || "Self-arranged",
      consultant: formData.consultant,
      services: formData.services ? formData.services.split(",").map(s => s.trim()) : ["General Wellness"],
      languages: formData.languages ? formData.languages.split(",").map(l => l.trim()) : ["English"],
      image: image,
    };

    onSave(updatedProgram);
    onClose();
  };

  const consultantsList = staff.filter(s => s.role === "DOCTOR" || s.role === "THERAPIST");

  return (
    <div className="vedic-modal-overlay" onClick={onClose}>
      <div className="vedic-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="vedic-modal-header">
          <h2 className="vedic-modal-title">✏️ Edit Vedic Program Package</h2>
          <button className="vedic-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="vedic-modal-body" style={{ gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Program Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Program Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="vedic-form-select"
              >
                <option value="Retreat">Retreat</option>
                <option value="Treatment">Treatment</option>
                <option value="Consultation">Consultation</option>
                <option value="Accommodation">Accommodation</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="vedic-form-textarea"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Duration</label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="vedic-form-select"
              >
                <option value="7-days">7 days</option>
                <option value="14-days">14 days</option>
                <option value="30-days">30 days</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Price (INR) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Max Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="vedic-form-input"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>End Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="vedic-form-input"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Lead Consultant *</label>
              <select
                name="consultant"
                value={formData.consultant}
                onChange={handleChange}
                required
                className="vedic-form-select"
              >
                <option value="">Select Lead Consultant...</option>
                {consultantsList.map(s => (
                  <option key={s.user_id} value={`${s.first_name} ${s.last_name}`}>{s.first_name} {s.last_name} ({s.role})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Accommodations</label>
              <input
                type="text"
                name="accommodations"
                value={formData.accommodations}
                onChange={handleChange}
                className="vedic-form-input"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Services Included (comma-separated)</label>
              <input
                type="text"
                name="services"
                value={formData.services}
                onChange={handleChange}
                className="vedic-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Languages Supported (comma-separated)</label>
              <input
                type="text"
                name="languages"
                value={formData.languages}
                onChange={handleChange}
                className="vedic-form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: "#4a5568", fontSize: "13px" }}>Package Cover Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="vedic-form-file-input"
            />
            {image && (
              <div style={{ marginTop: "10px" }}>
                <img src={image} alt="Preview" style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "4px", border: "1px solid #cbd5e0" }} />
              </div>
            )}
          </div>

          <div className="vedic-modal-footer" style={{ borderTop: "1px solid #cbd5e0", paddingTop: "12px", marginTop: "12px" }}>
            <button type="button" className="vedic-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="vedic-btn-allocate">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VedicLifePrograms() {
  const [programs, setPrograms] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [durationFilter, setDurationFilter] = useState("ALL");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [staff, setStaff] = useState([]);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toast, setToast] = useState(null);
  const { getAllocatedStaffForSession } = useAllocations();

  const currentUser = useMemo(() => getUser(), []);
  const isAdmin = !currentUser || currentUser.role === "SUPER_ADMIN" || currentUser.role === "CO_ADMIN";

  const handleCreatePackage = (newProgram) => {
    setPrograms((prev) => [newProgram, ...prev]);
    setToast(`Created package "${newProgram.title}" successfully!`);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleEditPackage = (updatedProgram) => {
    setPrograms((prev) => prev.map((p) => (p.id === updatedProgram.id ? updatedProgram : p)));
    setToast(`Updated package "${updatedProgram.title}" successfully!`);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchStaff = async () => {
    try {
      const res = await apiFetch("/api/teams/users?page=1&limit=100");
      if (res.success && res.users) {
        setStaff(res.users);
      } else {
        setStaff(DUMMY_STAFF);
      }
    } catch {
      setStaff(DUMMY_STAFF);
    }
  };

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setDataLoading(true);
        const res = await apiFetch("/api/vedic-programs");
        if (res.success) {
          setPrograms(res.programs || []);
        } else {
          throw new Error("API returned failure");
        }
      } catch {
        setPrograms(DUMMY_PROGRAMS);
      } finally {
        setDataLoading(false);
      }
    };

    fetchPrograms();
    fetchStaff();
  }, []);

  const stats = useMemo(() => ({
    total: programs.length,
    activePrograms: programs.filter((p) => new Date(p.startDate) > new Date()).length,
    totalEnrolled: programs.reduce((s, p) => s + (p.enrolled || 0), 0),
    revenue: programs.reduce((s, p) => s + ((p.enrolled || 0) * (p.price || 0)), 0),
  }), [programs]);

  const filtered = useMemo(() =>
    programs.filter((p) => {
      const matchType = typeFilter === "ALL" || p.type === typeFilter;
      const matchDuration = durationFilter === "ALL" || p.duration === durationFilter;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      return matchType && matchDuration && matchSearch;
    }), [programs, typeFilter, durationFilter, search]);

  const handleSelectProgram = (program) => {
    setSelectedProgram(program);
    setShowAllocationModal(true);
  };

  const handleAllocateSuccess = (selectedIds) => {
    const names = selectedIds.map(id => {
      const s = staff.find(x => x.user_id === id);
      return s ? `${s.first_name} ${s.last_name}` : id;
    }).join(", ");
    setToast(`Allocated: ${names}. Simulated email confirmations sent!`);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const allocatedStaff = selectedProgram ? getAllocatedStaffForSession(selectedProgram.id) : [];

  return (
    <div className="vedic-container">
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

      <div className="vedic-header">
        <div className="vedic-title">
          <h1>🌍 Vedic Life Programs</h1>
          <p>Manage international programs, retreats, and consultation offerings</p>
        </div>
        {isAdmin && (
          <button 
            className="vedic-add-btn" 
            onClick={() => setShowCreateModal(true)}
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px",
              color: "white", border: "none", borderRadius: "6px",
              cursor: "pointer", fontSize: "14px", fontWeight: "600", transition: "all 0.3s ease" 
            }}
          >
            <span>+ Create Package</span>
          </button>
        )}
      </div>

      <div className="vedic-stats">
        <div className="vedic-stat-card">
          <div className="vedic-stat-icon" style={{ background: "rgba(205,167,81,0.1)", color: "#cda751" }}>
            📊
          </div>
          <div className="vedic-stat-content">
            <h3>Total Programs</h3>
            <p>{stats.total}</p>
          </div>
        </div>
        <div className="vedic-stat-card">
          <div className="vedic-stat-icon" style={{ background: "rgba(46,204,113,0.1)", color: "#2ecc71" }}>
            📅
          </div>
          <div className="vedic-stat-content">
            <h3>Active Programs</h3>
            <p>{stats.activePrograms}</p>
          </div>
        </div>
        <div className="vedic-stat-card">
          <div className="vedic-stat-icon" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>
            👥
          </div>
          <div className="vedic-stat-content">
            <h3>Total Enrolled</h3>
            <p>{stats.totalEnrolled}</p>
          </div>
        </div>
        <div className="vedic-stat-card">
          <div className="vedic-stat-icon" style={{ background: "rgba(230,126,34,0.1)", color: "#e67e22" }}>
            💰
          </div>
          <div className="vedic-stat-content">
            <h3>Revenue</h3>
            <p>₹{(stats.revenue / 100000).toFixed(1)}L</p>
          </div>
        </div>
      </div>

      <div className="vedic-controls">
        <div className="vedic-search-box">
          <img src={SearchIcon} alt="search" />
          <input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="vedic-filters">
          <div className="vedic-filter-dropdown" style={{ padding: 0 }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: "#2f2f2f", padding: "10px 32px 10px 16px",
                cursor: "pointer", appearance: "none"
              }}
            >
              <option value="ALL">Type: All</option>
              <option value="Retreat">Retreat</option>
              <option value="Treatment">Treatment</option>
              <option value="Consultation">Consultation</option>
              <option value="Accommodation">Accommodation</option>
            </select>
            <img src={DropdownIcon} alt="dropdown" style={{ pointerEvents: "none", marginLeft: "-24px", marginRight: "12px", width: "10px" }} />
          </div>

          <div className="vedic-filter-dropdown" style={{ padding: 0 }}>
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              style={{
                border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: "#2f2f2f", padding: "10px 32px 10px 16px",
                cursor: "pointer", appearance: "none"
              }}
            >
              <option value="ALL">Duration: All</option>
              <option value="7-days">7 days</option>
              <option value="14-days">14 days</option>
              <option value="30-days">30 days</option>
              <option value="custom">Custom</option>
            </select>
            <img src={DropdownIcon} alt="dropdown" style={{ pointerEvents: "none", marginLeft: "-24px", marginRight: "12px", width: "10px" }} />
          </div>

          <button className="vedic-filter-btn" style={{ background: "#e2e8f0", border: "none", borderRadius: "6px", padding: "10px", cursor: "pointer" }}>
            <img src={FilterIcon} alt="filter" />
          </button>
        </div>
      </div>

      {dataLoading ? (
        <div className="vedic-loading">Loading programs...</div>
      ) : filtered.length === 0 ? (
        <div className="vedic-empty">
          <div className="vedic-empty-icon">🌿</div>
          <p className="vedic-empty-text">No programs found</p>
          <p className="vedic-empty-subtext">Try adjusting your filters or search criteria</p>
        </div>
      ) : (
        <div className="vedic-grid">
          {filtered.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onClick={handleSelectProgram}
            />
          ))}
        </div>
      )}

      {showAllocationModal && selectedProgram && (
        <AllocationModal
          program={selectedProgram}
          staff={staff}
          onClose={() => {
            setShowAllocationModal(false);
            setSelectedProgram(null);
          }}
          onAllocate={handleAllocateSuccess}
          isAdmin={isAdmin}
          onEdit={() => {
            setShowAllocationModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      {showCreateModal && (
        <CreatePackageModal
          staff={staff}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePackage}
        />
      )}

      {showEditModal && selectedProgram && (
        <EditPackageModal
          program={selectedProgram}
          staff={staff}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProgram(null);
          }}
          onSave={handleEditPackage}
        />
      )}

      {allocatedStaff.length > 0 && (
        <div style={{ marginTop: "24px", padding: "16px", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 12px", color: "#1a202c", fontSize: "14px", fontWeight: 600 }}>Allocated Staff for {selectedProgram?.title || ""}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {allocatedStaff.map((alloc) => (
              <span key={alloc.id} style={{ background: "#cda75144", color: "#cda751", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 600 }}>
                {alloc.staffName} ({alloc.staffRole})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
