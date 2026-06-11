import React, { useMemo, useState, useEffect } from 'react';
import './MyAssignments.css';
import { useAllocations } from '../utils/AllocationContext';
import { getUser } from '../utils/session';
import { apiFetch } from '../api/http';
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
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

function MyAssignments() {
  const loggedInUser = useMemo(() => getUser(), []);
  const { allocations: contextAllocations, completeAllocation } = useAllocations();

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [validationError, setValidationError] = useState(null);
  const [backendAssignments, setBackendAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);

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
        const response = await fetch('https://tapoclg.onrender.com/api/membership');
        const data = await response.json();
        if (data.success && data.data) {
          setMemberships(data.data);
        } else if (Array.isArray(data)) {
          setMemberships(data);
        }
      } catch (err) {
        console.error("Failed to fetch memberships:", err);
      }
    };
    fetchMemberships();
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

  // Merge backend + context allocations
  const activeAssignments = useMemo(() => {
    const fromContext = contextAllocations
      .filter(a => a.staffId === activeStaffId && a.status !== 'removed')
      .map(a => ({
        ...a,
        status: a.status === 'expired' ? 'expired' : a.status === 'cancelled' ? 'cancelled' : 'active'
      }));

    const fromBackend = backendAssignments
      .filter(a => a.staffId === activeStaffId && a.status !== 'removed')
      .map(a => ({
        ...a,
        status: a.status === 'expired' ? 'expired' : a.status === 'cancelled' ? 'cancelled' : 'active'
      }));

    // Merge: deduplicate by sessionId
    const merged = [...fromContext];
    for (const b of fromBackend) {
      const exists = merged.find(m => m.sessionId === b.sessionId);
      if (!exists) {
        merged.push(b);
      }
    }

    return merged;
  }, [contextAllocations, backendAssignments, activeStaffId]);

  // Stats
  const stats = useMemo(() => {
    const active = activeAssignments.filter(a => a.status === 'active').length;
    const expired = activeAssignments.filter(a => a.status === 'expired').length;
    const total = active + expired;
    return { total, active, expired };
  }, [activeAssignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return activeAssignments.filter(a => {
      const matchesType = filterType === 'all' || a.type === filterType;
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchesQuery = !searchQuery ||
        a.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.sessionId || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [activeAssignments, filterType, filterStatus, searchQuery]);

  // ─── Handle Mark as Done ───
  const handleMarkAsComplete = async (id, sessionId, endDate, type) => {
    // Validate date
    const now = new Date();
    const end = endDate ? new Date(endDate) : now;
    if (endDate && endDate.length <= 10) {
      end.setHours(23, 59, 59, 999);
    }
    if (end > now) {
      const formattedEnd = end.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      setValidationError({ id, message: `You can mark this session as done only after the end date (${formattedEnd}).` });
      setTimeout(() => setValidationError(null), 5000);
      return;
    }

    setValidationError(null);

    try {
      if (type === 'service' && sessionId) {
        // Call backend API to remove staff from service
        await apiFetch(`/api/services/${sessionId}/complete`, {
          method: 'PATCH',
          body: JSON.stringify({ staff_id: activeStaffId })
        });
      }

      // Also update context
      completeAllocation(id);

      // Refresh from backend
      await refreshAssignments();

      alert("✅ Session marked as Done! You are now Available.");
    } catch (err) {
      alert("Error completing assignment: " + err.message);
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

      {/* Notification banner */}
      {isStaffUser && stats.active > 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(205,167,81,0.1) 0%, rgba(205,167,81,0.15) 100%)",
          borderLeft: "4px solid #cda751",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <span style={{ fontSize: "24px" }}>🔔</span>
          <div>
            <div style={{ fontWeight: 700, color: "#1a202c", fontSize: "14px", marginBottom: "2px" }}>In-App Notifications</div>
            <div style={{ fontSize: "13px", color: "#4a5568" }}>
              You have <strong>{stats.active}</strong> active session(s). Mark them as completed when done!
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="ma-stats-grid">
        <div className="ma-stat-card">
          <div className="ma-stat-icon total"><TagIcon /></div>
          <div className="ma-stat-details">
            <span className="ma-stat-value">{stats.total}</span>
            <span className="ma-stat-label">Total Assigned Sessions</span>
          </div>
        </div>
        <div className="ma-stat-card">
          <div className="ma-stat-icon active"><CalendarIcon /></div>
          <div className="ma-stat-details">
            <span className="ma-stat-value">{stats.active}</span>
            <span className="ma-stat-label">Active / Upcoming</span>
          </div>
        </div>
        <div className="ma-stat-card">
          <div className="ma-stat-icon expired"><UserIcon /></div>
          <div className="ma-stat-details">
            <span className="ma-stat-value">{stats.expired}</span>
            <span className="ma-stat-label">Completed</span>
          </div>
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
            <option value="cancelled">Cancelled</option>
            <option value="expired">Completed</option>
            <option value="removed">Removed</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Loading assignments...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="ma-empty-state">
          <div className="ma-empty-icon"><InfoIcon /></div>
          <h3>No Assignments Found</h3>
          <p>There are currently no active or completed assignments for this staff member.</p>
        </div>
      ) : (
        <div className="ma-grid">
          {filteredAssignments.map((a) => {
            // Find profile photo from memberships
            const member = memberships.find(m => {
              const fullName = `${m.name || m.first_name || ''} ${m.last_name || ''}`.trim().toLowerCase();
              return fullName.includes(a.staffName.toLowerCase()) || a.staffName.toLowerCase().includes(fullName);
            });
            const profilePhotoUrl = member?.profile_photo_url || null;
            const handleImageError = (e) => {
              e.target.onerror = null;
              e.target.src = DefaultAvatar;
            };

            return (
              <div key={a.id} className={`ma-card ${a.type}`}>
                <div className="ma-card-header">
                  <span className={`ma-card-type-tag ${a.type}`}>
                    {a.type === 'vedic_program' ? 'Vedic Program' : a.type}
                  </span>
                  <span className={`ma-status-badge ${a.status}`}>
                    {a.status === 'active' ? 'Active / Scheduled'
                      : a.status === 'cancelled' ? 'This service has been cancelled.'
                      : 'Completed'}
                  </span>
                </div>

                <div className="ma-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <img
                      src={profilePhotoUrl || DefaultAvatar}
                      alt="Profile"
                      onError={handleImageError}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                    />
                    <h3 className="ma-session-title" style={{ margin: 0 }}>{a.sessionTitle}</h3>
                  </div>
                  <div className="ma-details-list">
                    <div className="ma-detail-item">
                      <CalendarIcon />
                      <span className="ma-detail-label">Timeline:</span>
                      <span className="ma-detail-value">
                        {getFormatDate(a.startDate)}
                        {a.type === 'service' && a.bookingTime ? ` at ${a.bookingTime}` : ''}
                        {a.endDate && a.endDate !== a.startDate ? ` - ${getFormatDate(a.endDate)}` : ''}
                      </span>
                    </div>
                    <div className="ma-detail-item">
                      <UserIcon />
                      <span className="ma-detail-label">Staff:</span>
                      <span className="ma-detail-value">{a.staffName} ({a.staffRole})</span>
                    </div>
                    <div className="ma-detail-item">
                      <TagIcon />
                      <span className="ma-detail-label">Code:</span>
                      <span className="ma-detail-value">{a.sessionId || a.id}</span>
                    </div>
                  </div>
                  {a.status === 'cancelled' && (
                    <div className="ma-cancelled-message">
                      This service has been cancelled.
                    </div>
                  )}
                </div>

                {validationError?.id === a.id && (
                  <div style={{
                    background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.3)",
                    borderRadius: "6px", padding: "10px 14px", margin: "0 0 8px",
                    fontSize: "12px", color: "#c0392b", display: "flex", gap: "8px"
                  }}>
                    <span>⏳</span><span>{validationError.message}</span>
                  </div>
                )}

                <div className="ma-card-footer">
                  <span className="ma-assigned-date">Assigned: {getFormatDate(a.createdAt)}</span>
                  {a.status === 'active' && a.type !== 'service' && (
                    <button
                      className="ma-action-btn"
                      onClick={() => handleMarkAsComplete(a.id, a.sessionId, a.endDate, a.type)}
                    >
                      Mark as Done
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyAssignments;