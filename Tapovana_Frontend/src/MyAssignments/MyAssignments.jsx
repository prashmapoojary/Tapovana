import React, { useMemo, useState, useEffect } from 'react';
import './MyAssignments.css';
import '../Workshops/Workshops.css';
import { useAllocations } from '../utils/AllocationContext';
import { getUser } from '../utils/session';
import { apiFetch } from '../api/http';
import { getImageUrl } from '../utils/image';

import AnimatedNumber from '../utils/AnimatedNumber';
import DefaultAvatar from '../assets/profileIconDefault.png';

// Icons
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const TagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CATEGORY_COLORS = {
  "Service": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Workshop": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  "Vedic Program": { color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
};

const STATUS_CONFIG = {
  Upcoming: { label: "Upcoming", color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  Live: { label: "🔴 LIVE", color: "#e74c3c", bg: "rgba(231,76,60,0.15)" },
  active: { label: "Active", color: "#CDA751", bg: "rgba(205,167,81,0.1)" },
  pending: { label: "Pending", color: "#f39c12", bg: "rgba(243,156,18,0.1)" },
  expired: { label: "Completed", color: "#a0aec0", bg: "rgba(160,174,192,0.1)" },
  cancelled: { label: "Cancelled", color: "#e74c3c", bg: "rgba(231,76,60,0.1)" },
};

function AssignmentCard({ a, services, workshops, vedicPrograms, onComplete, onDelete }) {
  // Get cover image
  let imageUrl = null;
  if (a.type === 'service') {
    if (a.service_image_name) {
      imageUrl = a.service_image_name;
    } else {
      const serviceName = a.sessionTitle.split(' - ')[0];
      const service = services.find(s => (s.name || '').toLowerCase() === serviceName.toLowerCase());
      if (service) {
        imageUrl = service.image_url || service.image;
      }
    }
  } else if (a.type === 'workshop') {
    if (a.workshop_image_name) {
      imageUrl = a.workshop_image_name;
    } else {
      const workshop = workshops.find(w => (w.title || '').toLowerCase() === a.sessionTitle.toLowerCase());
      if (workshop) {
        imageUrl = workshop.image_url || workshop.image || workshop.image_base64;
      }
    }
  } else if (a.type === 'vedic_program') {
    if (a.vediclife_image_name) {
      imageUrl = a.vediclife_image_name;
    } else {
      const vedicProgram = vedicPrograms.find(p => (p.title || '').toLowerCase() === a.sessionTitle.toLowerCase());
      if (vedicProgram) {
        imageUrl = vedicProgram.image_url || vedicProgram.image || vedicProgram.image_base64;
      }
    }
  }

  const [imgFailed, setImgFailed] = useState(!imageUrl);
  const displayImageUrl = getImageUrl(imageUrl, '');

  const getFormatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch {
      return dateStr;
    }
  };

  const getStaffLabel = () => {
    if (a.type === 'service') return `${a.staffName} (${a.staffRole})`;
    if (a.type === 'workshop') return a.staffName;
    if (a.type === 'vedic_program') return a.staffName;
    return a.staffName;
  };

  // If status is removed, don't render the card at all!
  if (a.status === 'removed') return null;

  return (
    <div className="ws-card" style={{
      background: "#F9F9F9",
      borderRadius: "12px",
      padding: "0",
      overflow: "hidden",
      border: "1px solid #CDA751"
    }}>
      {!imgFailed && displayImageUrl ? (
        <div style={{
          width: "100%",
          height: "140px",
          overflow: "hidden"
        }}>
          <img
            src={displayImageUrl}
            alt={a.sessionTitle}
            onError={() => setImgFailed(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </div>
      ) : (
        <div style={{
          width: "100%",
          height: "140px",
          background: "linear-gradient(135deg, rgba(205, 167, 81, 0.15), rgba(205, 167, 81, 0.05))"
        }} />
      )}
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
          {a.type === 'service' && (
            <div style={{
              background: "#CDA751",
              color: "white",
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: "20px",
              textTransform: "uppercase",
              fontSize: "11px"
            }}>
              Service
            </div>
          )}
          <div style={{
            background: "#CDA751",
            color: "white",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "16px",
            fontSize: "12px"
          }}>
            {(a.status === 'Live' || a.status === 'Upcoming') ? 'Pending' : (a.status === 'expired' ? 'Completed' : a.status}
          </div>
        </div>
        <h3 style={{
          margin: "0 0 8px 0",
          color: "#1E1E1E",
          fontSize: "18px",
          fontWeight: "700"
        }}>
          {a.sessionTitle}
        </h3>
        <div style={{
          color: "#555555",
          fontSize: "13px",
          marginBottom: "6px"
        }}>
          {a.type === 'service' ? 'Assigned Staff: ' : a.type === 'workshop' ? 'Instructor: ' : 'Lead Consultant: '}
          {getStaffLabel()}
        </div>
        <div style={{
          color: "#555555",
          fontSize: "13px",
          marginBottom: "4px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <div>
            {getFormatDate(a.startDate)} {a.bookingTime || a.time || ''}
          </div>
          <span>•</span>
          <div>
            {a.duration || a.duration_minutes || 30} mins
          </div>
        </div>
        <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            style={{
              flex: 1,
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "600",
              background: "white",
              color: "#CDA751",
              border: "1px solid #CDA751",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#FFF8E6";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
            }}
          >
            View
          </button>
          {(a.status === 'active' || a.status === 'Upcoming' || a.status === 'Live') && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(a); }}
              style={{
                flex: 1,
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                background: "#CDA751",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#b59243";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#CDA751";
              }}
            >
              Mark Complete
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(a); }}
            style={{
              flex: 1,
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "600",
              background: "white",
              color: "#e74c3c",
              border: "1px solid #e74c3c",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out"
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#fdf2f2";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MyAssignments() {
  const loggedInUser = useMemo(() => getUser(), []);
  const { allocations: contextAllocations, completeAllocation, triggerAlert, triggerConfirm } = useAllocations();

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [backendAssignments, setBackendAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [vedicPrograms, setVedicPrograms] = useState([]);

  const isStaffUser = loggedInUser?.role === 'DOCTOR' || loggedInUser?.role === 'THERAPIST';

  // ─── Fetch real assignments from backend API ───
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/api/services/my/assignments');
        if (data.success && data.assignments) {
          setBackendAssignments(data.assignments);
        }
      } catch (err) {
        console.error("Failed to fetch assignments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  // ─── Fetch membership data for profile photos ───
  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const response = await fetch("https://tapoclg.onrender.com/api/membership");
        if (response.ok) {
          const res = await response.json();
          if (res && (res.success || Array.isArray(res))) {
            const rawList = res.memberships || res.data || (Array.isArray(res) ? res : []);
            const mappedMembers = rawList.map((m) => ({
              id: m.id || m.user_id,
              name: m.name || m.customer_name,
              email: m.email || m.customer_email,
              profile_photo_url: m.profile_photo_url || m.profile_pic || null
            }));
            setMemberships(mappedMembers);
          }
        }
      } catch (err) {
        console.error("Failed to fetch memberships:", err);
      }
    };
    fetchMemberships();
  }, []);

  // ─── Fetch bookings data for customer info ───
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await apiFetch('/api/bookings');
        if (res.success) {
          setBookings(res.bookings || []);
        }
      } catch (err) {
        console.error('Failed to fetch bookings:', err);
      }
    };
    fetchBookings();
  }, []);

  // ─── Fetch services data for service images ───
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiFetch("/api/services");
        if (res.success) {
          setServices(res.services || []);
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
      }
    };
    fetchServices();
  }, []);

  // ─── Fetch workshops data for workshop images ───
  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const res = await apiFetch("/api/workshops");
        if (res.success) {
          setWorkshops(res.workshops || []);
        }
      } catch (err) {
        console.error("Failed to fetch workshops:", err);
      }
    };
    fetchWorkshops();
  }, []);

  // ─── Fetch vedic programs data for vedic program images ───
  useEffect(() => {
    const fetchVedicPrograms = async () => {
      try {
        const res = await apiFetch("/api/vedic-programs");
        if (res.success) {
          setVedicPrograms(res.programs || []);
        }
      } catch (err) {
        console.error("Failed to fetch vedic programs:", err);
      }
    };
    fetchVedicPrograms();
  }, []);

  // ─── Refresh assignments after marking complete ───
  const refreshAssignments = async () => {
    try {
      const data = await apiFetch('/api/services/my/assignments');
      if (data.success && data.assignments) {
        setBackendAssignments(data.assignments);
      }
    } catch (err) {
      console.error("Failed to refresh assignments:", err);
    }
  };

  // ─── Complete Assignment ───
  const handleComplete = async (assignment) => {
    const confirmed = await triggerConfirm(`Are you sure you want to mark "${assignment.sessionTitle}" as complete?`);
    if (!confirmed) return;

    try {
      await completeAllocation(assignment.sessionId);
      await refreshAssignments();
      await triggerAlert("Assignment completed successfully!", true);
    } catch (err) {
      console.error("Failed to complete assignment:", err);
      await triggerAlert("Failed to complete assignment.");
    }
  };

  // ─── Delete Assignment ───
  const handleDelete = async (assignment) => {
    const confirmed = await triggerConfirm(`Are you sure you want to delete "${assignment.sessionTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      // TODO: Add backend delete endpoint if available
      // await apiFetch(`/api/allocations/${assignment.id}`, { method: 'DELETE' });
      await refreshAssignments();
      await triggerAlert("Assignment deleted successfully!", true);
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      await triggerAlert("Failed to delete assignment.");
    }
  };

  // Determine active staff ID
  const activeStaffId = useMemo(() => {
    if (isStaffUser) {
      return loggedInUser?.user_id || loggedInUser?.id || '';
    }
    return selectedStaffId;
  }, [isStaffUser, loggedInUser, selectedStaffId]);

  // Fetch staff list for admin view
  useEffect(() => {
    if (!isStaffUser) {
      const fetchStaff = async () => {
        try {
          const res = await apiFetch('/api/teams/users?page=1&limit=100');
          if (res.success && res.users) {
            const list = res.users.filter(u => u.role === 'DOCTOR' || u.role === 'THERAPIST');
            setStaffList(list);
            if (list.length > 0) {
              setSelectedStaffId(list[0].user_id || list[0].id || '');
            }
          }
        } catch (err) {
          console.error("Failed to load staff list:", err);
        }
      };
      fetchStaff();
    }
  }, [isStaffUser]);

  const getAssignmentEndTime = (a) => {
    if (!a.startDate) return null;
    
    let dateStr = a.startDate;
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      dateStr = dateStr.split('T')[0];
    }
    
    let hour = 0;
    let minute = 0;
    
    const timeVal = a.bookingTime || a.time;
    if (timeVal) {
      const timeStr = String(timeVal).trim();
      const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        const m = parseInt(ampmMatch[2], 10);
        const p = ampmMatch[3].toUpperCase();
        if (p === 'PM' && h !== 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        hour = h;
        minute = m;
      } else {
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          hour = parseInt(parts[0], 10) || 0;
          minute = parseInt(parts[1], 10) || 0;
        }
      }
    } else {
      hour = 23;
      minute = 59;
    }

    let [year, month, day] = dateStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      } else {
        return null;
      }
    }

    const startDateTime = new Date(year, month - 1, day, hour, minute, 0, 0);
    const durationMins = parseInt(a.duration || a.duration_minutes || 0, 10);
    const addedMinutes = durationMins > 0 ? (durationMins + 30) : 30;
    return new Date(startDateTime.getTime() + addedMinutes * 60 * 1000);
  };

  // Merge backend + context allocations - prioritize context!
  const allAssignments = useMemo(() => {
    const now = new Date();
    const mapAssignment = (a) => {
      const sLower = String(a.status || "").toLowerCase();
      let mappedStatus = 'active';
      if (sLower === 'expired' || sLower === 'completed') mappedStatus = 'expired';
      else if (sLower === 'cancelled') mappedStatus = 'cancelled';
      else if (sLower === 'removed') mappedStatus = 'removed';
      else if (sLower === 'pending') mappedStatus = 'pending';
      else if (sLower === 'upcoming') mappedStatus = 'Upcoming';
      else if (sLower === 'live') mappedStatus = 'Live';

      // Automatically treat as expired if time + 30 minutes has passed
      if (mappedStatus === 'active' || mappedStatus === 'Upcoming' || mappedStatus === 'Live') {
        const endTime = getAssignmentEndTime(a);
        if (endTime && now > endTime) {
          mappedStatus = 'expired';
        }
      }

      return {
        ...a,
        status: mappedStatus
      };
    };

    const fromContext = contextAllocations
      .filter(a => a.staffId === activeStaffId)
      .map(mapAssignment);

    const fromBackend = backendAssignments
      .filter(a => a.staffId === activeStaffId)
      .map(mapAssignment);

    // Create a map of sessionId to context allocation for quick lookup!
    const contextAllocMap = new Map(fromContext.map(a => [a.sessionId, a]));

    const merged = [];
    
    // Add all context allocations first!
    merged.push(...fromContext);

    // Now check backend allocations: if no context allocation for sessionId, add it!
    for (const b of fromBackend) {
      if (!contextAllocMap.has(b.sessionId)) {
        merged.push(b);
      }
    }

    return merged.filter(a => a.status !== 'removed');
  }, [contextAllocations, backendAssignments, activeStaffId]);

  // Stats
  const stats = useMemo(() => {
    const active = allAssignments.filter(a => a.status === 'active' || a.status === 'Upcoming' || a.status === 'Live').length;
    const pending = allAssignments.filter(a => a.status === 'pending').length;
    const expired = allAssignments.filter(a => a.status === 'expired').length;
    const total = active + pending + expired;
    return { total, active, pending, expired };
  }, [allAssignments]);

  // Filtered assignments (exclude removed ones entirely)
  const filteredAssignments = useMemo(() => {
    return allAssignments.filter(a => {
      if (a.status === 'removed') return false;
      const matchesType = filterType === 'all' || a.type === filterType;
      
      let matchesStatus = false;
      if (filterStatus === 'all') {
        matchesStatus = true;
      } else if (filterStatus === 'active') {
        matchesStatus = a.status === 'active' || a.status === 'Upcoming' || a.status === 'Live';
      } else {
        matchesStatus = a.status === filterStatus;
      }
      
      const matchesQuery = !searchQuery ||
        a.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.sessionId || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [allAssignments, filterType, filterStatus, searchQuery]);



  const getFormatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch {
      return dateStr;
    }
  };

  const currentViewingName = useMemo(() => {
    if (isStaffUser) {
      return `${loggedInUser?.first_name || ''} ${loggedInUser?.last_name || ''}`.trim();
    }
    const currentStaffObj = staffList.find(s => s.user_id === activeStaffId || s.id === activeStaffId);
    return currentStaffObj ? `${currentStaffObj.first_name || ''} ${currentStaffObj.last_name || ''}`.trim() : 'Specialist';
  }, [isStaffUser, loggedInUser, activeStaffId, staffList]);

  return (
    <div className="my-assignments-container">

      {/* Header */}
      <div className="ma-header">
        <div className="ma-header-title">
          <h1>{isStaffUser ? "My Allocations & Schedule" : "Staff Schedule & Assignments"}</h1>
          <p>
            {isStaffUser
              ? `Real-time session assignments for ${currentViewingName}.`
              : "Review assignments across all wellness doctors and therapists."}
          </p>
        </div>

        {!isStaffUser && staffList.length > 0 && (
          <div className="ma-staff-selector">
            <label htmlFor="staff-select">Viewing Schedule For:</label>
            <select
              id="staff-select"
              className="ma-select"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              {staffList.map(s => (
                <option key={s.user_id || s.id} value={s.user_id || s.id}>
                  {`${s.first_name || ''} ${s.last_name || ''} (${s.role === 'DOCTOR' ? 'Dr.' : 'Therapist'})`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="ma-stats-grid">
        <div className="ma-stat-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#475569", color: "white" }}>Total</div>
          </div>
          <span className="ma-stat-label">Total Assigned Sessions</span>
          <AnimatedNumber value={stats.total} className="ma-stat-value" />
        </div>
        <div className="ma-stat-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#cda751", color: "white" }}>Active</div>
          </div>
          <span className="ma-stat-label">Active / Upcoming</span>
          <AnimatedNumber value={stats.active} className="ma-stat-value" style={{ color: "#cda751" }} />
        </div>
        <div className="ma-stat-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#8e9fa7", color: "white" }}>Completed</div>
          </div>
          <span className="ma-stat-label">Completed</span>
          <AnimatedNumber value={stats.expired} className="ma-stat-value" style={{ color: "#8e9fa7" }} />
        </div>
      </div>

      {/* Filters */}
      <div className="ma-controls">
        <div className="ma-search-wrapper">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by session title or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ma-filter-group">
          <select className="ma-filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="service">Services</option>
            <option value="workshop">Workshops</option>
            <option value="vedic_program">Vedic Programs</option>
          </select>
          <select className="ma-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending Confirmation</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Completed</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading assignments...</div>
      ) : (
        <>
          {/* Services Section */}
          {(() => {
            const servicesAssignments = filteredAssignments.filter(a => a.type === 'service');
            if (servicesAssignments.length > 0) {
              return (
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>Services</h2>
                  <div className="ws-grid">
                    {servicesAssignments.map((a) => (
                      <AssignmentCard
                        key={a.id}
                        a={a}
                        services={services}
                        workshops={workshops}
                        vedicPrograms={vedicPrograms}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Workshops Section */}
          {(() => {
            const workshopsAssignments = filteredAssignments.filter(a => a.type === 'workshop');
            if (workshopsAssignments.length > 0) {
              return (
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>Workshops</h2>
                  <div className="ws-grid">
                    {workshopsAssignments.map((a) => (
                      <AssignmentCard
                        key={a.id}
                        a={a}
                        services={services}
                        workshops={workshops}
                        vedicPrograms={vedicPrograms}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Vedic Programs Section */}
          {(() => {
            const vedicProgramsAssignments = filteredAssignments.filter(a => a.type === 'vedic_program');
            if (vedicProgramsAssignments.length > 0) {
              return (
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>Vedic Life Package</h2>
                  <div className="ws-grid">
                    {vedicProgramsAssignments.map((a) => (
                      <AssignmentCard
                        key={a.id}
                        a={a}
                        services={services}
                        workshops={workshops}
                        vedicPrograms={vedicPrograms}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Empty State */}
          {filteredAssignments.length === 0 && (
            <div className="ma-empty-state">
              <div className="ma-empty-icon"><InfoIcon /></div>
              <h3>No Assignments Found</h3>
              <p>There are currently no active or completed assignments for this staff member.</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default MyAssignments;
