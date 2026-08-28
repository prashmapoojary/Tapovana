import React, { useMemo, useState, useEffect } from 'react';
import './MyAssignments.css';
import '../Workshops/Workshops.css';
import { useAllocations } from '../utils/AllocationContext';
import { getUser } from '../utils/session';
import { apiFetch } from '../api/http';
import { formatDisplayTime } from '../utils/dateFormatters';

import AnimatedNumber from '../utils/AnimatedNumber';

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

const formatCleanDate = (dateVal) => {
  if (!dateVal) return '-';
  try {
    const dateStr = String(dateVal).split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return String(dateVal).split('T')[0];
  }
};

function AssignmentCard({ a, onClick }) {
  const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.active;

  if (a.status === 'removed') return null;

  return (
    <div 
      className="ws-card" 
      onClick={() => onClick(a)}
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        padding: "20px",
        border: "1px solid #E2E8F0",
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
      }}
    >
      {/* 1. Header Badges: Type & Record ID (First) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#CDA751", textTransform: "uppercase", letterSpacing: "0.6px", background: "rgba(205,167,81,0.1)", padding: "4px 10px", borderRadius: "12px" }}>
          {a.displayRecordId || (a.type === 'service' ? 'Service Booking' : a.type === 'workshop' ? 'Workshop' : 'Vedic Life Package')}
        </span>
        <div style={{
          background: st.color || "#CDA751",
          color: "white",
          fontWeight: 700,
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "11px",
          letterSpacing: "0.4px"
        }}>
          {st.label}
        </div>
      </div>

      {/* 2. Session Title (Second) */}
      <h3 style={{ margin: "0 0 12px 0", color: "#1A202C", fontSize: "17px", fontWeight: 700, lineHeight: 1.3 }}>
        {a.sessionTitle}
      </h3>

      {/* 3. Customer / Participant (Third) */}
      <div style={{ marginBottom: "14px", background: "#F8FAFC", padding: "10px 14px", borderRadius: "8px", border: "1px solid #EDF2F7" }}>
        <p style={{ margin: "0 0 2px 0", color: "#718096", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>
          Customer / Participant
        </p>
        <p style={{ margin: 0, color: "#2D3748", fontSize: "14px", fontWeight: 600 }}>
          {a.customerName || "Assigned Customer"}
        </p>
      </div>

      {/* 4. Schedule & Time Info (Fourth) */}
      <div style={{ display: "flex", gap: "24px", borderTop: "1px solid #EDF2F7", paddingTop: "12px" }}>
        <div>
          <p style={{ margin: "0 0 2px 0", color: "#718096", fontSize: "11px", fontWeight: 600 }}>Date</p>
          <p style={{ margin: 0, color: "#1A202C", fontSize: "13px", fontWeight: 700 }}>
            {formatCleanDate(a.startDate)}
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 2px 0", color: "#718096", fontSize: "11px", fontWeight: 600 }}>Time</p>
          <p style={{ margin: 0, color: "#1A202C", fontSize: "13px", fontWeight: 700 }}>
            {formatDisplayTime(a.bookingTime || a.time) || 'Flexible'}
          </p>
        </div>
        <div>
          <p style={{ margin: "0 0 2px 0", color: "#718096", fontSize: "11px", fontWeight: 600 }}>Duration</p>
          <p style={{ margin: 0, color: "#1A202C", fontSize: "13px", fontWeight: 700 }}>
            {a.duration || a.duration_minutes || 60} mins
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────
function AssignmentDetailModal({ assignment, onClose }) {
  if (!assignment) return null;

  return (
    <div className="blog-editor-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="blog-editor-modal" style={{ maxWidth: "520px", padding: "24px", borderRadius: "14px" }}>
        {/* Header (First) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px solid #EDF2F7", paddingBottom: "14px" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#CDA751", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {assignment.type === 'service' ? 'Service Booking' : assignment.type === 'workshop' ? 'Workshop' : 'Vedic Life Program'}
            </span>
            <h2 style={{ margin: "4px 0 0 0", fontSize: "18px", fontWeight: "700", color: "#1A202C" }}>{assignment.sessionTitle}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: "24px", cursor: "pointer", color: "#A0AEC0", lineHeight: 1 }}>×</button>
        </div>

        {/* 1. Schedule Box (Date, Time, Duration) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", background: "#FCF8EF", padding: "14px", borderRadius: "10px", border: "1px solid rgba(205,167,81,0.3)", textAlign: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600 }}>Date</div>
            <div style={{ fontWeight: "700", color: "#1A202C", fontSize: "14px" }}>{formatCleanDate(assignment.startDate)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600 }}>Time</div>
            <div style={{ fontWeight: "700", color: "#1A202C", fontSize: "14px" }}>{formatDisplayTime(assignment.bookingTime || assignment.time) || 'Flexible'}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#718096", fontWeight: 600 }}>Duration</div>
            <div style={{ fontWeight: "700", color: "#1A202C", fontSize: "14px" }}>{assignment.duration || 60} mins</div>
          </div>
        </div>

        {/* 2. Customer / Participant Details */}
        <div style={{ background: "#F8FAFC", padding: "16px", borderRadius: "10px", border: "1px solid #E2E8F0", marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#475569", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
            Customer / Participant Details
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", color: "#2D3748" }}>
            <div><strong>Customer Name:</strong><br />{assignment.customerName || "Assigned Customer"}</div>
            <div><strong>Record ID:</strong><br />{assignment.displayRecordId || assignment.sessionId}</div>
            {assignment.customerEmail && <div><strong>Email:</strong><br />{assignment.customerEmail}</div>}
            <div><strong>Status:</strong><br /><span style={{ color: "#CDA751", fontWeight: 700 }}>{assignment.status?.toUpperCase()}</span></div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "#CDA751", color: "#FFF", border: "none", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MyAssignments() {
  const loggedInUser = useMemo(() => getUser(), []);
  const { allocations: contextAllocations } = useAllocations();

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [staffInfo, setStaffInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [backendAssignments, setBackendAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const normalizedRole = (loggedInUser?.role || "").toUpperCase().replace(/[\s_-]+/g, "");
  const isStaffUser = normalizedRole === 'DOCTOR' || normalizedRole === 'THERAPIST';

  // Determine active staff ID with reliable fallbacks
  const activeStaffId = useMemo(() => {
    if (selectedStaffId) return selectedStaffId;
    return loggedInUser?.user_id || loggedInUser?.id || loggedInUser?.email || '';
  }, [loggedInUser, selectedStaffId]);

  // ─── 1. Fetch Staff List (run once to populate dropdown) ───
  useEffect(() => {
    let isMounted = true;
    const fetchStaff = async () => {
      try {
        const res = await apiFetch('/api/teams/users?page=1&limit=100');
        if (isMounted && res.success && res.users) {
          const list = res.users.filter(u => {
            const r = (u.role || '').toUpperCase().replace(/[\s_-]+/g, "");
            return r === 'DOCTOR' || r === 'THERAPIST' || r === 'SUPERADMIN' || r === 'COADMIN' || r === 'ADMIN';
          });
          setStaffList(list);
          if (list.length > 0 && !selectedStaffId) {
            const currentMatch = list.find(u => 
              (u.email && loggedInUser?.email && u.email.toLowerCase() === loggedInUser.email.toLowerCase()) ||
              (u.id && (u.id === loggedInUser?.id || u.id === loggedInUser?.user_id))
            );
            setSelectedStaffId(currentMatch ? (currentMatch.user_id || currentMatch.id) : (loggedInUser?.id || list[0].user_id || list[0].id || ''));
          }
        }
      } catch (err) {
        console.error("Failed to load staff list:", err.message);
      }
    };
    fetchStaff();
    return () => { isMounted = false; };
  }, [loggedInUser]);

  // ─── 2. Fetch Assignments for activeStaffId ───
  useEffect(() => {
    let isMounted = true;
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        const targetId = activeStaffId || loggedInUser?.id || loggedInUser?.user_id || loggedInUser?.email || '';
        const endpoint = `/api/services/my/assignments?staff_id=${encodeURIComponent(targetId)}`;

        const data = await apiFetch(endpoint);
        if (isMounted) {
          if (data.success && data.assignments) {
            setBackendAssignments(data.assignments);
          }
          if (data.staff) {
            setStaffInfo(data.staff);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch assignments:", err);
          setError(err.message || "Failed to load assignments.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAssignments();
    return () => { isMounted = false; };
  }, [activeStaffId, loggedInUser]);

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

  // Merge backend + context allocations strictly matching activeStaffId
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

    const contextAllocMap = new Map(fromContext.map(a => [a.sessionId, a]));

    const merged = [...fromContext];
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

  // Filtered assignments
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
        (a.sessionId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.displayRecordId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [allAssignments, filterType, filterStatus, searchQuery]);

  const currentViewingName = useMemo(() => {
    if (staffInfo) {
      return `${staffInfo.name} (${staffInfo.staffCode || 'STAFF'})`;
    }
    if (isStaffUser) {
      return `${loggedInUser?.first_name || ''} ${loggedInUser?.last_name || ''}`.trim();
    }
    const currentStaffObj = staffList.find(s => s.user_id === activeStaffId || s.id === activeStaffId);
    return currentStaffObj ? `${currentStaffObj.first_name || ''} ${currentStaffObj.last_name || ''}`.trim() : 'Specialist';
  }, [staffInfo, isStaffUser, loggedInUser, activeStaffId, staffList]);

  return (
    <div className="my-assignments-container">

      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}

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

      {/* Staff Information Banner */}
      {staffInfo && (
        <div style={{ background: "#fff", border: "1px solid rgba(205,167,81,0.3)", borderRadius: "10px", padding: "16px 20px", marginBottom: "24px", display: "flex", gap: "24px", alignItems: "center", boxShadow: "0 2px 10px rgba(205,167,81,0.05)" }}>
          <div style={{ background: "#cda751", color: "#fff", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "18px" }}>
            {staffInfo.name ? staffInfo.name[0].toUpperCase() : 'S'}
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", fontSize: "14px", color: "#2d3748" }}>
            <div><span style={{ color: "#718096", fontSize: "12px", display: "block" }}>Staff Name</span><strong>{staffInfo.name}</strong></div>
            <div><span style={{ color: "#718096", fontSize: "12px", display: "block" }}>Staff ID</span><strong style={{ color: "#cda751" }}>{staffInfo.staffCode}</strong></div>
            <div><span style={{ color: "#718096", fontSize: "12px", display: "block" }}>Role</span><strong>{staffInfo.role}</strong></div>
            <div><span style={{ color: "#718096", fontSize: "12px", display: "block" }}>Email</span><strong>{staffInfo.email || 'N/A'}</strong></div>
          </div>
        </div>
      )}

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
            placeholder="Search by session title, customer, or ID..."
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

      {/* Loading & Errors */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading assignments...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px', background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '8px', color: '#C53030' }}>
          <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0 0 8px 0' }}>{error}</p>
        </div>
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
                        onClick={setSelectedAssignment}
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
                        onClick={setSelectedAssignment}
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
                        onClick={setSelectedAssignment}
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
