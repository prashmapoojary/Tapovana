import React, { useMemo, useState, useEffect } from 'react';
import './MyAssignments.css';
import '../Workshops/Workshops.css';
import { useAllocations } from '../utils/AllocationContext';
import { getUser } from '../utils/session';
import { apiFetch } from '../api/http';

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

function AssignmentCard({ a }) {
  let categoryLabel = '';
  if (a.type === 'service') {
    categoryLabel = 'Service';
  } else if (a.type === 'workshop') {
    categoryLabel = 'Workshop';
  } else if (a.type === 'vedic_program') {
    categoryLabel = 'Vedic Program';
  }
  const cat = CATEGORY_COLORS[categoryLabel] || CATEGORY_COLORS["Service"];
  const st = STATUS_CONFIG[a.status] || STATUS_CONFIG.active;

  const getFormatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch {
      return dateStr;
    }
  };

  // If status is removed, don't render the card at all!
  if (a.status === 'removed') return null;

  return (
    <div className="ws-card" style={{
      background: "#F9F9F9",
      borderRadius: "8px",
      padding: "20px",
      border: "1px solid #CDA751"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, color: "#1E1E1E", fontSize: "16px", fontWeight: 600 }}>{a.sessionTitle}</h3>
        <div style={{
          background: "#CDA751",
          color: "white",
          fontWeight: 600,
          padding: "4px 12px",
          borderRadius: "4px",
          fontSize: "12px"
        }}>
          {st.label}
        </div>
      </div>
      
      <div style={{ marginBottom: "16px" }}>
        <p style={{ margin: 0, color: "#555555", fontSize: "14px", marginBottom: "4px" }}>
          {a.type === 'service' ? 'Assigned Staff' : a.type === 'workshop' ? 'Instructor' : 'Lead Consultant'}: {a.staffName}
        </p>
        <p style={{ margin: 0, color: "#1E1E1E", fontSize: "14px", fontWeight: 500 }}>
          Role: {a.staffRole}
        </p>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <p style={{ margin: 0, color: "#555555", fontSize: "14px", marginBottom: "4px" }}>Date</p>
            <p style={{ margin: 0, color: "#1E1E1E", fontSize: "14px", fontWeight: 500 }}>
              {getFormatDate(a.startDate)}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <p style={{ margin: 0, color: "#555555", fontSize: "14px", marginBottom: "4px" }}>Time</p>
            <p style={{ margin: 0, color: "#1E1E1E", fontSize: "14px", fontWeight: 500 }}>
              {a.bookingTime || a.time || ''}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <p style={{ margin: 0, color: "#555555", fontSize: "14px", marginBottom: "4px" }}>Duration</p>
            <p style={{ margin: 0, color: "#1E1E1E", fontSize: "14px", fontWeight: 500 }}>
              {a.duration || a.duration_minutes || 30} mins
            </p>
          </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [backendAssignments, setBackendAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

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
