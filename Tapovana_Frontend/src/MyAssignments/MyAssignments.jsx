import React, { useMemo, useState, useEffect } from 'react';
import './MyAssignments.css';
import { useAllocations } from '../utils/AllocationContext';
import { getUser } from '../utils/session';
import { apiFetch } from '../api/http';
import { getImageUrl } from '../utils/image';
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
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [workshops, setWorkshops] = useState([]);

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
        const res = await apiFetch("https://tapoclg.onrender.com/api/membership");
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

  // Merge backend + context allocations - prioritize context!
  const allAssignments = useMemo(() => {
    const fromContext = contextAllocations
      .filter(a => a.staffId === activeStaffId)
      .map(a => ({
        ...a,
        status: a.status === 'expired' ? 'expired' : a.status === 'cancelled' ? 'cancelled' : a.status === 'removed' ? 'removed' : 'active'
      }));

    const fromBackend = backendAssignments
      .filter(a => a.staffId === activeStaffId)
      .map(a => ({
        ...a,
        status: a.status === 'expired' ? 'expired' : a.status === 'cancelled' ? 'cancelled' : a.status === 'removed' ? 'removed' : 'active'
      }));

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
    const active = allAssignments.filter(a => a.status === 'active').length;
    const expired = allAssignments.filter(a => a.status === 'expired').length;
    const total = active + expired;
    return { total, active, expired };
  }, [allAssignments]);

  // Filtered assignments (exclude removed ones entirely)
  const filteredAssignments = useMemo(() => {
    return allAssignments.filter(a => {
      if (a.status === 'removed') return false;
      const matchesType = filterType === 'all' || a.type === filterType;
      const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
      const matchesQuery = !searchQuery ||
        a.sessionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.sessionId || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesStatus && matchesQuery;
    });
  }, [allAssignments, filterType, filterStatus, searchQuery]);

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
        await apiFetch(`/api/services/${sessionId}/complete`, {
          method: 'PATCH',
          body: JSON.stringify({ staff_id: activeStaffId })
        });
      }

      completeAllocation(id);
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

  // ─── Render Assignment Card (inside component scope) ───
  const renderAssignmentCard = (a) => {
    // Find image based on type
    let imageUrl = DefaultAvatar;
    if (a.type === 'service') {
      const serviceName = a.sessionTitle.split(' - ')[0];
      const service = services.find(s => (s.name || '').toLowerCase() === serviceName.toLowerCase());
      if (service) {
        imageUrl = getImageUrl(service.image_url, 'https://placehold.co/150?text=No+Image');
      }
    } else if (a.type === 'workshop' || a.type === 'vedic_program') {
      const workshop = workshops.find(w => (w.title || '').toLowerCase() === a.sessionTitle.toLowerCase());
      if (workshop) {
        imageUrl = getImageUrl(workshop.image_url || workshop.image, 'https://placehold.co/150?text=No+Image');
      }
    }
    
    // Find staff profile photo (for non-service)
    const staffMember = staffList.find(s => 
      (s.user_id === a.staffId || s.id === a.staffId) || 
      `${s.first_name || ''} ${s.last_name || ''}`.trim().toLowerCase() === a.staffName.toLowerCase()
    ) || (isStaffUser ? loggedInUser : null);
    const staffProfileUrl = staffMember?.profile_photo_url || staffMember?.profile_pic || null;
    
    const handleImageError = (e) => {
      e.target.onerror = null;
      e.target.src = DefaultAvatar;
    };

    // If status is removed, don't render the card at all!
    if (a.status === 'removed') return null;

    return (
      <div key={a.id} className={`ma-card ${a.type}`}>
        <div className="ma-card-header">
          <span className={`ma-card-type-tag ${a.type}`}>
            {a.type === 'vedic_program' ? 'Vedic Program' : a.type}
          </span>
          <span className={`ma-status-badge ${a.status}`}>
            {a.status === 'active' ? 'Active / Scheduled' 
              : a.status === 'cancelled' ? 'Cancelled' 
              : a.status === 'removed' ? 'Deallocated' 
              : 'Completed'}
          </span>
        </div>

        <div className="ma-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            {/* Cover image (for service/workshop/vedic program) */}
            <img
              src={imageUrl}
              alt={a.type === 'service' ? 'Service' : 'Workshop'}
              onError={handleImageError}
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: a.type === 'service' || a.type === 'workshop' || a.type === 'vedic_program' ? '8px' : '50%', 
                objectFit: 'cover', 
                border: '2px solid #e2e8f0' 
              }}
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
            fontSize: "11px", color: "#c0392b", display: "flex", gap: "8px"
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
  };

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
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#475569", color: "white" }}>Total</div>
          </div>
          <span className="ma-stat-value">{stats.total}</span>
          <span className="ma-stat-label">Total Assigned Sessions</span>
        </div>
        <div className="ma-stat-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#cda751", color: "white" }}>Active</div>
          </div>
          <span className="ma-stat-value" style={{ color: "#cda751" }}>{stats.active}</span>
          <span className="ma-stat-label">Active / Upcoming</span>
        </div>
        <div className="ma-stat-card">
          <div className="mem-tier-card-top">
            <div className="mem-tier-badge" style={{ background: "#8e9fa7", color: "white" }}>Completed</div>
          </div>
          <span className="ma-stat-value" style={{ color: "#8e9fa7" }}>{stats.expired}</span>
          <span className="ma-stat-label">Completed</span>
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
                  <div className="ma-grid">
                    {servicesAssignments.map((a) => renderAssignmentCard(a)).filter(Boolean)}
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
                  <div className="ma-grid">
                    {workshopsAssignments.map((a) => renderAssignmentCard(a)).filter(Boolean)}
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
                  <div className="ma-grid">
                    {vedicProgramsAssignments.map((a) => renderAssignmentCard(a)).filter(Boolean)}
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
