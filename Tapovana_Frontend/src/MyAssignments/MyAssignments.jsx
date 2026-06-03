import React, { useMemo, useState, useEffect } from 'react';
import './MyAssignments.css';
import { useAllocations } from '../utils/AllocationContext';
import { getUser } from '../utils/session';
import { apiFetch } from '../api/http';

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
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// Prepopulated beautiful mock assignments for demonstration
const FALLBACK_ASSIGNMENTS = [
  {
    id: "alloc-mock-1",
    type: "workshop",
    staffId: "user-doctor-1",
    staffName: "Dr. Ananya Rao",
    staffRole: "DOCTOR",
    sessionTitle: "Advanced Chakra Balancing & Sound Resonance Therapy",
    sessionId: "WS-001",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    status: "active",
    createdAt: "2026-05-28T09:00:00Z"
  },
  {
    id: "alloc-mock-2",
    type: "vedic_program",
    staffId: "user-doctor-1",
    staffName: "Dr. Ananya Rao",
    staffRole: "DOCTOR",
    sessionTitle: "Panchakarma Deep Cleansing & Rejuvenation Retreat",
    sessionId: "VP-001",
    startDate: "2026-06-12",
    endDate: "2026-06-20",
    status: "active",
    createdAt: "2026-05-29T10:30:00Z"
  },
  {
    id: "alloc-mock-3",
    type: "service",
    staffId: "user-therapist-1",
    staffName: "Arjun Das",
    staffRole: "THERAPIST",
    sessionTitle: "Traditional Abhyanga Warm Herbal Oil Therapy",
    sessionId: "SRV-003",
    startDate: "2026-06-02",
    endDate: "2026-06-02",
    status: "active",
    createdAt: "2026-05-30T14:15:00Z"
  },
  {
    id: "alloc-mock-4",
    type: "workshop",
    staffId: "user-therapist-1",
    staffName: "Arjun Das",
    staffRole: "THERAPIST",
    sessionTitle: "Vedic Pranayama and Breathing Mechanics Workshop",
    sessionId: "WS-004",
    startDate: "2026-05-20",
    endDate: "2026-05-22",
    status: "expired",
    createdAt: "2026-05-18T08:00:00Z"
  }
];

function MyAssignments() {
  const loggedInUser = useMemo(() => getUser(), []);
  const { getStaffAllocations, allocations: contextAllocations, completeAllocation } = useAllocations();
  
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [completedMockIds, setCompletedMockIds] = useState(new Set());
  const [validationError, setValidationError] = useState(null); // { id, message }

  const isStaffUser = loggedInUser?.role === 'DOCTOR' || loggedInUser?.role === 'THERAPIST';

  // Determine current active staff target ID
  const activeStaffId = useMemo(() => {
    if (isStaffUser) {
      return loggedInUser?.user_id || loggedInUser?.id || '';
    }
    return selectedStaffId;
  }, [isStaffUser, loggedInUser, selectedStaffId]);

  // Fetch doctors and therapists list if current user is Admin
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

  // Combine context-based and mock allocations
  const activeAssignments = useMemo(() => {
    // 1. Get allocations from the single source of truth context
    const fromContext = contextAllocations.map(a => {
      const endDate = new Date(a.endDate);
      const now = new Date();
      return {
        ...a,
        status: a.status === "expired" ? "expired" : (endDate < now ? "expired" : "active")
      };
    });

    // 2. Map fallbacks to match correct doctor/therapist ID dynamically for presentation
    const adjustedFallbacks = FALLBACK_ASSIGNMENTS.map(a => {
      const isCompleted = completedMockIds.has(a.id);
      const status = isCompleted ? "expired" : a.status;
      if (isStaffUser) {
        return {
          ...a,
          staffId: loggedInUser?.user_id || loggedInUser?.id || '',
          staffName: `${loggedInUser?.first_name || ''} ${loggedInUser?.last_name || ''}`.trim(),
          staffRole: loggedInUser?.role || 'DOCTOR',
          status
        };
      } else {
        // Map to whichever staff admin is currently viewing
        const currentStaffObj = staffList.find(s => s.user_id === activeStaffId || s.id === activeStaffId);
        return {
          ...a,
          staffId: activeStaffId,
          staffName: currentStaffObj ? `${currentStaffObj.first_name || ''} ${currentStaffObj.last_name || ''}`.trim() : a.staffName,
          staffRole: currentStaffObj ? currentStaffObj.role : a.staffRole,
          status
        };
      }
    });

    // Merge both, prioritize context
    const merged = [...fromContext, ...adjustedFallbacks];

    // Filter to only match the currently inspected staffId
    return merged.filter(a => a.staffId === activeStaffId);
  }, [contextAllocations, activeStaffId, isStaffUser, loggedInUser, staffList, completedMockIds]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = activeAssignments.length;
    const active = activeAssignments.filter(a => a.status === 'active').length;
    const expired = total - active;
    return { total, active, expired };
  }, [activeAssignments]);

  // Final filtered list for display
  const filteredAssignments = useMemo(() => {
    return activeAssignments.filter(a => {
      // Type Match
      const matchesType = filterType === 'all' || a.type === filterType;
      
      // Status Match
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus;

      // Search Query Match (Title or Session ID)
      const matchesQuery = !searchQuery || 
        a.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.sessionId || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesType && matchesStatus && matchesQuery;
    });
  }, [activeAssignments, filterType, filterStatus, searchQuery]);

  const handleMarkAsComplete = (id, endDate) => {
    // Validate: can only mark done AFTER the end date has passed
    const now = new Date();
    const end = new Date(endDate);
    // If endDate is a date-only string (YYYY-MM-DD), treat as end of that day
    if (endDate && endDate.length <= 10) {
      end.setHours(23, 59, 59, 999);
    }
    if (end > now) {
      const formattedEnd = end.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      setValidationError({ id, message: `You can mark this session as done only after the end date (${formattedEnd}).` });
      // Auto-dismiss after 5 seconds
      setTimeout(() => setValidationError(null), 5000);
      return;
    }

    setValidationError(null);
    if (id.startsWith('alloc-mock')) {
      setCompletedMockIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    } else {
      completeAllocation(id);
    }
  };

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
      
      {/* Header section */}
      <div className="ma-header">
        <div className="ma-header-title">
          <h1>{isStaffUser ? "My Allocations & Schedule" : "Staff Schedule & Assignments"}</h1>
          <p>
            {isStaffUser 
              ? `Real-time active session assignments and workshop scheduler for ${currentViewingName}.` 
              : "Review and inspect clinical and session assignments across all wellness doctors and therapists."}
          </p>
        </div>

        {/* Admin staff switcher */}
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

      {/* Dynamic In-App Notifications Banner */}
      {isStaffUser && stats.active > 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(205,167,81,0.1) 0%, rgba(205,167,81,0.15) 100%)",
          borderLeft: "4px solid #cda751",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 2px 8px rgba(205,167,81,0.05)"
        }}>
          <span style={{ fontSize: "24px" }}>🔔</span>
          <div>
            <div style={{ fontWeight: 700, color: "#1a202c", fontSize: "14px", marginBottom: "2px" }}>In-App Notifications</div>
            <div style={{ fontSize: "13px", color: "#4a5568" }}>
              You have <strong>{stats.active}</strong> active/upcoming session allocations waiting for participation. Mark them as completed when done!
            </div>
          </div>
        </div>
      )}

      {/* Stats counter panel */}
      <div className="ma-stats-grid">
        <div className="ma-stat-card">
          <div className="ma-stat-icon total">
            <TagIcon />
          </div>
          <div className="ma-stat-details">
            <span className="ma-stat-value">{stats.total}</span>
            <span className="ma-stat-label">Total Assigned Sessions</span>
          </div>
        </div>

        <div className="ma-stat-card">
          <div className="ma-stat-icon active">
            <CalendarIcon />
          </div>
          <div className="ma-stat-details">
            <span className="ma-stat-value">{stats.active}</span>
            <span className="ma-stat-label">Active / Upcoming Allocations</span>
          </div>
        </div>

        <div className="ma-stat-card">
          <div className="ma-stat-icon expired">
            <UserIcon />
          </div>
          <div className="ma-stat-details">
            <span className="ma-stat-value">{stats.expired}</span>
            <span className="ma-stat-label">Completed Sessions</span>
          </div>
        </div>
      </div>

      {/* Filter and search panel */}
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
          <select 
            className="ma-filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Allocation Types</option>
            <option value="workshop">Workshops</option>
            <option value="vedic_program">Vedic Programs</option>
            <option value="service">Services</option>
          </select>

          <select 
            className="ma-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active & Upcoming</option>
            <option value="expired">Completed</option>
          </select>
        </div>
      </div>

      {/* Grid of assignments */}
      {filteredAssignments.length === 0 ? (
        <div className="ma-empty-state">
          <div className="ma-empty-icon">
            <InfoIcon />
          </div>
          <h3>No Assignments Found</h3>
          <p>
            There are currently no active or completed assignments matching your selected filter criteria for this specialist.
          </p>
        </div>
      ) : (
        <div className="ma-grid">
          {filteredAssignments.map((a) => (
            <div key={a.id} className={`ma-card ${a.type}`}>
              <div className="ma-card-header">
                <span className={`ma-card-type-tag ${a.type}`}>
                  {a.type === 'vedic_program' ? 'Vedic Program' : a.type}
                </span>
                <span className={`ma-status-badge ${a.status}`}>
                  {a.status === 'active' ? 'Active / Scheduled' : 'Completed'}
                </span>
              </div>

              <div className="ma-card-body">
                <h3 className="ma-session-title">{a.sessionTitle}</h3>

                <div className="ma-details-list">
                  <div className="ma-detail-item">
                    <CalendarIcon />
                    <span className="ma-detail-label">Timeline:</span>
                    <span className="ma-detail-value">
                      {getFormatDate(a.startDate)} {a.endDate && a.endDate !== a.startDate ? ` - ${getFormatDate(a.endDate)}` : ''}
                    </span>
                  </div>

                  <div className="ma-detail-item">
                    <UserIcon />
                    <span className="ma-detail-label">Staff Specialist:</span>
                    <span className="ma-detail-value">{a.staffName} ({a.staffRole})</span>
                  </div>

                  <div className="ma-detail-item">
                    <TagIcon />
                    <span className="ma-detail-label">Session Code:</span>
                    <span className="ma-detail-value">{a.sessionId || a.id}</span>
                  </div>
                </div>
              </div>

              {/* Validation error for this specific card */}
              {validationError?.id === a.id && (
                <div style={{
                  background: "rgba(231,76,60,0.08)",
                  border: "1px solid rgba(231,76,60,0.3)",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  margin: "0 0 8px",
                  fontSize: "12px",
                  color: "#c0392b",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  lineHeight: "1.5"
                }}>
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>⏳</span>
                  <span>{validationError.message}</span>
                </div>
              )}
              <div className="ma-card-footer">
                <span className="ma-assigned-date">
                  Assigned on: {getFormatDate(a.createdAt)}
                </span>
                {a.status === 'active' && (() => {
                  const now = new Date();
                  const end = new Date(a.endDate);
                  if (a.endDate && a.endDate.length <= 10) end.setHours(23, 59, 59, 999);
                  const isPastEndDate = end <= now;
                  return (
                    <button
                      className={`ma-action-btn${isPastEndDate ? '' : ' disabled-btn'}`}
                      onClick={() => handleMarkAsComplete(a.id, a.endDate)}
                      title={isPastEndDate ? 'Mark this session as complete' : `Available after ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      style={!isPastEndDate ? {
                        background: "#a0aec0",
                        cursor: "not-allowed",
                        opacity: 0.65,
                      } : {}}
                    >
                      {isPastEndDate ? 'Mark as Done' : '⏳ Mark as Done'}
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default MyAssignments;
