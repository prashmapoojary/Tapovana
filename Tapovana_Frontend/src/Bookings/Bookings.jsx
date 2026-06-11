import React, { useState, useEffect, useMemo } from "react";
import "./Bookings.css";
import { apiFetch } from "../api/http";
import { getUser, getToken } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";
import { getImageUrl } from "../utils/image";
import SearchIcon from "../assets/searchIcon.svg";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIconDefault.png";

// Local backend base URL — service images are served from here
const LOCAL_API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Resolve a service image_url fetched from the local backend.
 * - Absolute http(s) URLs → used as-is.
 * - Windows absolute paths (C:\...) → extract filename, prefix with LOCAL_API_BASE/uploads/
 * - Relative paths (/uploads/...) → prefix with LOCAL_API_BASE
 * - Null/empty → return null (caller shows placeholder)
 */
function getServiceImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http") || imageUrl.startsWith("data:")) return imageUrl;
  // Windows absolute path stored in DB
  if (/^[A-Za-z]:[/\\]/i.test(imageUrl)) {
    const filename = imageUrl.replace(/\\/g, "/").split("/").pop();
    return `${LOCAL_API_BASE}/uploads/${filename}`;
  }
  // Relative path like /uploads/image.jpg
  const sep = imageUrl.startsWith("/") ? "" : "/";
  return `${LOCAL_API_BASE}${sep}${imageUrl}`;
}


function Bookings() {
  const { triggerAlert, triggerConfirm, conflicts, fetchConflicts } = useAllocations();
  const userRole = useMemo(() => getUser()?.role, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const isBookingConflicted = (bookingId) => {
    return (conflicts || []).some(c => String(c.session_id) === String(bookingId));
  };
  const canEdit = ["SUPER_ADMIN", "CO_ADMIN", "DOCTOR"].includes((userRole || "").toUpperCase());

  const [bookings, setBookings] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Drawer state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [assignedStaffIds, setAssignedStaffIds] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState(null);

  // Ref to track which booking we've already pre-filled staff for
  // Prevents staffList async updates from overwriting the user's checkbox selections
  const staffPrefilledForRef = React.useRef(null);

  // ─── Fetch staff from backend ───
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await apiFetch("/api/teams/users?page=1&limit=100");
        if (res.success && res.users) {
          setStaffList(res.users);
        }
      } catch {
        // ignore
      }
    };
    fetchStaff();
  }, []);

  // ─── Fetch services from local backend (for image lookup by name) ───
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await apiFetch("/api/services");
        if (data.success && data.services) {
          setServicesList(data.services);
        }
      } catch {
        // ignore — image simply won't show if services can't be fetched
      }
    };
    fetchServices();
  }, []);

  // ─── Close action menu on click outside ───
  useEffect(() => {
    const handleClickOutside = () => setOpenActionMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ─── Fetch bookings from local backend ───
  useEffect(() => {
    const load = async () => {
      try {
        if (bookings.length === 0) setLoading(true);
        setError(null);
        let q = `/api/bookings?limit=50&page=${page}`;
        if (statusFilter) q += `&status=${statusFilter}`;
        if (dateFrom) q += `&date_from=${dateFrom}`;
        if (dateTo) q += `&date_to=${dateTo}`;

        const data = await apiFetch(q);
        if (data.success) {
          setBookings(data.bookings || []);
        } else {
          throw new Error(data.message || "Failed to load bookings");
        }
      } catch (err) {
        setError(err.message || "Error connecting to server");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, statusFilter, dateFrom, dateTo]);

  // ─── Pre-fill status and staff when booking selected ───
  useEffect(() => {
    if (!selectedBooking) {
      // Drawer closed — reset the ref so next open pre-fills fresh
      staffPrefilledForRef.current = null;
      return;
    }

    setNewStatus((selectedBooking.status || "PENDING").toUpperCase());
    setNewNote(selectedBooking.note || "");

    // Only pre-fill staff ONCE per booking open (skip if staffList updates later)
    if (staffPrefilledForRef.current === selectedBooking.id) return;
    // Wait until staffList has loaded before attempting to match names
    if (staffList.length === 0) return;

    staffPrefilledForRef.current = selectedBooking.id;

    // Pre-fill multi-staff: match names from therapist_name against staffList
    const loadAllocatedStaff = async () => {
      if ((selectedBooking.status || 'PENDING').toUpperCase() === 'CONFIRMED') {
        try {
          const nameList = (selectedBooking.therapist_name || '')
            .split(',')
            .map(n => n.trim().toLowerCase())
            .filter(Boolean);
          if (nameList.length > 0) {
            const matched = staffList
              .filter(s => {
                const full = `${s.first_name || ''} ${s.last_name || ''}`.trim().toLowerCase();
                return nameList.some(n => full.includes(n) || n.includes(full.split(' ')[0]));
              })
              .map(s => s.id || s.user_id);
            setAssignedStaffIds(matched);
          } else {
            setAssignedStaffIds([]);
          }
        } catch {
          setAssignedStaffIds([]);
        }
      } else {
        setAssignedStaffIds([]);
      }
    };
    loadAllocatedStaff();
  }, [selectedBooking, staffList]);

  // ─── Get staff display with role suffix ───
  const getStaffDisplay = (therapistName) => {
    if (!therapistName) return null;
    const nameParts = therapistName.toLowerCase().split(" ");
    const matchedStaff = staffList.find(s => {
      const fullName = (s.first_name + " " + s.last_name).toLowerCase();
      return fullName.includes(nameParts[0]) || fullName.includes(therapistName.toLowerCase());
    });

    if (matchedStaff) {
      const role = matchedStaff.role === "DOCTOR" ? "Dr" : "Tr";
      return { displayName: therapistName + " (" + role + ")", role: matchedStaff.role };
    }
    return { displayName: therapistName + " (Staff)", role: null };
  };

  // ─── Search filter ───
  const filtered = useMemo(() => {
    let result = bookings;



    if (!search) return result;
    const q = search.toLowerCase();
    return result.filter(b =>
      (b.user_name || "").toLowerCase().includes(q) ||
      (b.service_name || "").toLowerCase().includes(q) ||
      (b.therapist_name || "").toLowerCase().includes(q) ||
      String(b.id || "").includes(q)
    );
  }, [bookings, search, canEdit]);

  // ─── Format date ───
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
      });
    } catch { return dateStr; }
  };

  // ─── Handle status update ───
  const handleUpdateStatus = async () => {
    if (!selectedBooking) return;
    const currentStatus = (selectedBooking.status || "PENDING").toUpperCase();
    const staffIdsChanged = JSON.stringify(assignedStaffIds.slice().sort()) !==
      JSON.stringify((selectedBooking._allocatedStaffIds || []).slice().sort());
    if (newStatus === currentStatus && !staffIdsChanged && newNote === (selectedBooking.note || "")) {
      triggerAlert("No changes to update.");
      return;
    }

    if (currentStatus === 'COMPLETED' && newStatus === 'CANCELLED') {
      triggerAlert("Completed bookings cannot be cancelled.");
      return;
    }
    if (currentStatus === 'CANCELLED' && newStatus === 'COMPLETED') {
      triggerAlert("Cancelled bookings cannot be marked as completed.");
      return;
    }
    if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
      triggerAlert("Once a booking is Completed or Cancelled, the status is locked and cannot be changed further.");
      return;
    }
    if (newStatus === 'COMPLETED' && currentStatus === 'PENDING') {
      triggerAlert("You cannot mark a pending booking as completed.");
      return;
    }

    // Require at least one staff when confirming
    if (newStatus === 'CONFIRMED' && assignedStaffIds.length === 0) {
      triggerAlert("Please select at least one staff member to confirm the booking.");
      return;
    }

    const contextName = selectedBooking.user_name || selectedBooking.service_name || "Guest";
    const dummyImage = "https://ui-avatars.com/api/?name=" + encodeURIComponent(contextName) + "&background=cda751&color=fff";

    const isConfirmed = newStatus === 'CONFIRMED';
    const isFirstAllocation = isConfirmed && currentStatus !== 'CONFIRMED';
    const isReAllocation = isConfirmed && currentStatus === 'CONFIRMED' && staffIdsChanged;

    let msg;
    if (isFirstAllocation && assignedStaffIds.length > 0) {
      msg = "Are you sure you want to confirm this booking and allocate 1 staff member(s)?";
    } else if (isReAllocation) {
      msg = "Are you sure you want to re-allocate this booking and assign a new staff member? The previously allocated staff will be removed.";
    } else {
      msg = `Are you sure you want to change status of ${contextName} to ${newStatus}?`;
    }

    const confirmed = await triggerConfirm(msg, dummyImage);

    if (confirmed) {
      try {
        const body = {
          status: newStatus,
          note: newNote
        };
        // Always send staff_ids when status is CONFIRMED
        if (isConfirmed) {
          body.staff_ids = assignedStaffIds;
        }

        const res = await apiFetch(`/api/bookings/${selectedBooking.id}/status`, {
          method: "PATCH",
          body: JSON.stringify(body)
        });

        if (res.success) {
          const updatedBooking = res.booking || { ...selectedBooking, status: newStatus };
          // Store allocated staff ids for change detection on next open
          updatedBooking._allocatedStaffIds = isConfirmed ? assignedStaffIds : [];
          setBookings(prev => prev.map(b =>
            b.id === selectedBooking.id ? updatedBooking : b
          ));
          setSelectedBooking(updatedBooking);

          if (isConfirmed && assignedStaffIds.length > 0) {
            if (isReAllocation) {
              triggerAlert("Booking re-allocated. Previous staff removed, new staff assigned.", true);
            } else {
              triggerAlert("Booking confirmed and 1 staff member allocated successfully.", true);
            }
          } else {
            triggerAlert(`Booking ${newStatus.toLowerCase()} successfully`, true);
          }
        } else {
          triggerAlert(res.message || "Failed to update booking status");
        }
      } catch (error) {
        triggerAlert(error.message || "An error occurred while updating the booking");
      }
    }
  };

  return (
    <div className="bookings-container">
      {/* ── Drawer ── */}
      {selectedBooking && (
        <div className="bk-drawer-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="bk-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="bk-drawer-header">
              <div>
                <h2>Booking Details</h2>
              </div>
              <button className="bk-close-btn" onClick={() => setSelectedBooking(null)}>×</button>
            </div>

            <div className="bk-drawer-body">
              <div className="bk-drawer-section">
                <h4 className="bk-section-title">Customer</h4>
                <div className="bk-profile-card">
                  <img src={DefaultAvatar} className="bk-avatar" alt="" />
                  <div>
                    <div className="bk-name">{selectedBooking.user_name || "Guest User"}</div>
                  </div>
                </div>

                <div className="bk-service-card" style={{ marginTop: "24px" }}>
                  <div style={{ marginBottom: "12px", fontWeight: "700", color: "#1a202c", fontSize: "15px" }}>
                    Service Name: <span style={{ fontWeight: "500", color: "#4b5563" }}>{selectedBooking.service_name || "N/A"}</span>
                  </div>
                  {(() => {
                    const matchedService = servicesList.find(
                      s => (s.name || "").toLowerCase() === (selectedBooking.service_name || "").toLowerCase()
                    );
                    const resolvedUrl = matchedService ? getServiceImageUrl(matchedService.image_url) : null;
                    return resolvedUrl ? (
                      <img
                        src={resolvedUrl}
                        alt="Service"
                        style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e3e7ed" }}
                        onError={(e) => { e.target.onerror = null; e.target.style.display = "none"; }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "140px", borderRadius: "8px", border: "1px solid #e3e7ed", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0aec0", fontSize: "13px" }}>
                        No image available
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bk-drawer-section">
                <h4 className="bk-section-title">Session Particulars</h4>
                <div className="bk-info-grid">
                  <div className="bk-info-item">
                    <span className="bk-label">Booking ID</span>
                    <span className="bk-value">#{selectedBooking.id}</span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Service</span>
                    <span className="bk-value">{selectedBooking.service_name || "N/A"}</span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Date</span>
                    <span className="bk-value">{formatDate(selectedBooking.booking_date)}</span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Time</span>
                    <span className="bk-value">{selectedBooking.booking_time || "N/A"}</span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Amount</span>
                    <span className="bk-value">
                      {(() => {
                        const amountStr = selectedBooking.total_amount || "₹0";
                        const match = amountStr.match(/^(.*?)\s*\((.*?)\)$/);
                        const amount = match ? match[1] : amountStr;
                        return amount;
                      })()}
                    </span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Membership</span>
                    <span className="bk-value">
                      {(() => {
                        const amountStr = selectedBooking.total_amount || "₹0";
                        const match = amountStr.match(/^(.*?)\s*\((.*?)\)$/);
                        const pass = match ? match[2] : selectedBooking.pass_details;
                        if (!pass) return "Regular";
                        const lower = pass.toLowerCase();
                        if (lower.includes("gold")) return "Gold Pass";
                        if (lower.includes("diamond")) return "Diamond Pass";
                        if (lower.includes("silver")) return "Silver Pass";
                        return "Regular";
                      })()}
                    </span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Staff</span>
                    <span className="bk-value" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {selectedBooking.therapist_name
                        ? selectedBooking.therapist_name.split(',').map((name, i) => (
                          <span key={i}>{name.trim()}</span>
                        ))
                        : <span>Not assigned</span>}
                      {isBookingConflicted(selectedBooking.id) && (
                        <span style={{ color: "#e53e3e", fontSize: "12px", fontWeight: "600", marginTop: "2px" }}>
                          ⚠️ Staff on Leave
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Role</span>
                    <span className="bk-value">
                      {selectedBooking.therapist_name
                        ? (getStaffDisplay(selectedBooking.therapist_name)?.role === "DOCTOR" ? "Doctor" : "Therapist")
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin specific controls */}
              {canEdit ? (
                <>
                  <div className="bk-drawer-section">
                    <h4 className="bk-section-title">Update Booking Status</h4>
                    <div className="bk-status-row">
                      {(() => {
                        const cur = (selectedBooking.status || "PENDING").toUpperCase();

                        // ── Compute whether the 30-min buffer has passed (CONFIRMED only) ──
                        let completionAllowed = false;
                        let bufferLabel = '';
                        if (cur === 'CONFIRMED') {
                          const matchedSvc = servicesList.find(
                            s => (s.name || '').toLowerCase() === (selectedBooking.service_name || '').toLowerCase()
                          );
                          const durationMins = matchedSvc?.duration_minutes || 60;
                          const dateStr = selectedBooking.booking_date;
                          const timeStr = selectedBooking.booking_time || '00:00';
                          if (dateStr) {
                            const base = new Date(dateStr);
                            const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                            if (m) {
                              let h = parseInt(m[1], 10);
                              const min = parseInt(m[2], 10);
                              const ampm = m[3] ? m[3].toUpperCase() : null;
                              if (ampm === 'PM' && h < 12) h += 12;
                              if (ampm === 'AM' && h === 12) h = 0;
                              base.setHours(h, min, 0, 0);
                            }
                            const unlockAt = new Date(base.getTime() + (durationMins + 10) * 60000);
                            const now = new Date();
                            if (now >= unlockAt) {
                              completionAllowed = true;
                            } else {
                              const diffMins = Math.ceil((unlockAt - now) / 60000);
                              const hrs = Math.floor(diffMins / 60);
                              const mins = diffMins % 60;
                              bufferLabel = hrs > 0
                                ? `Available in ${hrs}h ${mins}m (end time + 10 min buffer)`
                                : `Available in ${mins} min (end time + 10 min buffer)`;
                            }
                          }
                        }

                        // ── Terminal states — no changes allowed ──
                        if (cur === 'COMPLETED' || cur === 'CANCELLED') {
                          return (
                            <div style={{
                              padding: '10px 14px',
                              background: cur === 'COMPLETED' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                              border: `1px solid ${cur === 'COMPLETED' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                              borderRadius: '8px',
                              fontSize: '13px',
                              color: cur === 'COMPLETED' ? '#16a34a' : '#dc2626',
                              fontWeight: 600
                            }}>
                              {cur === 'COMPLETED' ? '✅ Completed — no further changes allowed' : 'This service has been cancelled.'}
                            </div>
                          );
                        }

                        // ── PENDING state ──
                        if (cur === 'PENDING') {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="bk-status-select"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="CANCELLED">Cancelled</option>
                                <option value="COMPLETED" disabled={true}>Completed</option>
                              </select>
                              {newStatus === 'CANCELLED' && (
                                <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                                  This service has been cancelled.
                                </div>
                              )}
                            </div>
                          );
                        }

                        // ── CONFIRMED state ──
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value)}
                              className="bk-status-select"
                            >
                              <option value="CONFIRMED">Confirmed</option>
                              <option value="COMPLETED" disabled={!completionAllowed}>
                                Completed
                              </option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                            {newStatus === 'CANCELLED' && (
                              <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                                This service has been cancelled.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {newStatus === 'CONFIRMED' && (
                    <div className="bk-drawer-section">
                      <h4 className="bk-section-title">Staff Allocation</h4>
                      <div style={{ marginTop: '8px' }}>
                        {staffList.length === 0 ? (
                          <span style={{ fontSize: 13, color: '#7b8a9a' }}>No doctors or therapists found.</span>
                        ) : (
                          <select
                            value={assignedStaffIds[0] || ''}
                            onChange={(e) => {
                              const staffId = e.target.value;
                              setAssignedStaffIds(staffId ? [staffId] : []);
                            }}
                            className="bk-status-select"
                            style={{ width: '100%' }}
                          >
                            <option value="">-- Select Staff Member --</option>
                            {staffList
                              .filter(staff => (staff.role === "DOCTOR" || staff.role === "THERAPIST") && staff.availability_status !== "On Leave")
                              .map(staff => {
                                const staffId = staff.id || staff.user_id;
                                return (
                                  <option key={staffId} value={staffId}>
                                    {`${staff.first_name || ''} ${staff.last_name || ''} (${staff.role === 'DOCTOR' ? 'Doctor' : 'Therapist'})`.trim()}
                                  </option>
                                );
                              })}
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bk-drawer-section">
                  <h4 className="bk-section-title">Staff Allotted</h4>
                  <div className="bk-info-item">
                    <span className="bk-value" style={{ fontWeight: 600 }}>
                      {selectedBooking.therapist_name || "Not assigned"}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes Section before Footer */}
              <div className="bk-drawer-section">
                <h4 className="bk-section-title">Notes</h4>
                {canEdit ? (
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="bk-notes-textarea"
                    rows={4}
                    placeholder="Add an admin note here..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'Manrope, sans-serif', fontSize: '14px', resize: 'vertical' }}
                  />
                ) : (
                  <p className="bk-notes-text">{selectedBooking.note || "No notes available."}</p>
                )}
              </div>

            </div>

            <div className="bk-drawer-footer">
              <button className="bk-btn-gold" onClick={() => setSelectedBooking(null)}>Close</button>
              {canEdit && (
                <button className="bk-btn-gold" style={{ marginLeft: '12px' }} onClick={handleUpdateStatus}>Save Changes</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bookings-header">
        <div className="bookings-title">
          <h1>Booking & Appointments</h1>
          <p>View bookings from mobile app</p>
        </div>
      </header>

      {/* ── Filters ── */}
      <section className="bk-filters-card">
        <div className="bookings-filters">
          <div className="bk-search-box">
            <img src={SearchIcon} className="bk-search-icon" alt="" />
            <input
              type="text"
              placeholder="Search by name, service or staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bk-filter-select-wrap">
            <select className="bk-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Status: All</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="bk-date-wrap">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="bk-date-wrap">
            <label>To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="bk-error-banner">
          <span>{error}</span>
          <button className="bk-retry-btn" onClick={() => setPage(1)}>Retry</button>
        </div>
      )}

      {/* ── Table ── */}
      <section className="bookings-table-card">
        <div className="bookings-table-scroll">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>CUSTOMER</th>
                <th>SERVICE</th>
                <th>ASSIGNED STAFF</th>
                <th>ROLE</th>
                <th>DATE</th>
                <th>TIME</th>
                <th>AMOUNT</th>
                <th>MEMBERSHIP</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && bookings.length === 0 ? (
                <tr><td colSpan="11" className="bk-loading-cell">Loading bookings...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="11" className="bk-empty-cell">No bookings found.</td></tr>
              ) : (
                filtered.map((b) => {
                  const staffInfo = getStaffDisplay(b.therapist_name);
                  return (
                    <tr
                      key={b.id}
                      className={`bk-table-row ${isBookingConflicted(b.id) ? 'conflicted-row' : ''}`}
                      onClick={() => setSelectedBooking(b)}
                      style={isBookingConflicted(b.id) ? { backgroundColor: "rgba(100, 116, 139, 0.08)" } : undefined}
                    >
                      <td><strong>#{b.id}</strong></td>
                      <td>
                        <div className="bk-cell-name">{b.user_name || "Guest User"}</div>
                      </td>
                      <td>{b.service_name || "N/A"}</td>
                      <td>
                        {staffInfo ? (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {(b.therapist_name || '').split(',').map((name, i) => {
                                const info = getStaffDisplay(name.trim());
                                return (
                                  <span key={i} className={info?.role === "DOCTOR" ? "bk-staff-dr" : "bk-staff-tr"}>
                                    {name.trim()}
                                  </span>
                                );
                              })}
                            </div>
                            {isBookingConflicted(b.id) && (
                              <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "600", marginTop: "4px" }}>
                                ⚠️ Staff on Leave
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="bk-staff-pending">Pending</span>
                        )}
                      </td>
                      <td>
                        {staffInfo ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {(b.therapist_name || '').split(',').map((name, i) => {
                              const info = getStaffDisplay(name.trim());
                              return (
                                <span key={i} style={{ color: '#64748b', fontWeight: 500, fontSize: '13px' }}>
                                  {info?.role === "DOCTOR" ? "Doctor" : "Therapist"}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '13px' }}>-</span>
                        )}
                      </td>
                      <td>
                        {formatDate(b.booking_date)}
                      </td>
                      <td>
                        <div className="bk-cell-time">{b.booking_time}</div>
                      </td>
                      <td>
                        {(() => {
                          const amountStr = b.total_amount || "₹0";
                          const match = amountStr.match(/^(.*?)\s*\((.*?)\)$/);
                          const amount = match ? match[1] : amountStr;
                          return <strong>{amount}</strong>;
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const amountStr = b.total_amount || "₹0";
                          const match = amountStr.match(/^(.*?)\s*\((.*?)\)$/);
                          const pass = match ? match[2] : b.pass_details;
                          if (!pass) return <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold' }}>Regular</span>;
                          const lower = pass.toLowerCase();
                          let displayPass = "Regular";
                          if (lower.includes("gold")) { displayPass = "Gold Pass"; }
                          else if (lower.includes("diamond")) { displayPass = "Diamond Pass"; }
                          else if (lower.includes("silver")) { displayPass = "Silver Pass"; }

                          return (
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>
                              {displayPass}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <span className={"bk-status-badge " + (b.status || "PENDING").toLowerCase()}>
                          {b.status || "PENDING"}
                        </span>
                      </td>
                      <td style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <img
                            src={ActionIcon}
                            className="action-icon"
                            alt="Actions"
                            style={{ cursor: "pointer" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenu(openActionMenu === b.id ? null : b.id);
                            }}
                          />
                          {openActionMenu === b.id && (
                            <div style={{
                              position: "absolute",
                              right: 0,
                              top: "100%",
                              zIndex: 1000,
                              background: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              minWidth: "140px",
                              overflow: "hidden"
                            }}>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBooking(b);
                                  setOpenActionMenu(null);
                                }}
                                style={{
                                  padding: "10px 16px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  color: "#2d3748",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                View
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bk-pagination-footer">
          <div>Showing {filtered.length} booking{filtered.length !== 1 ? "s" : ""}</div>
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt;</button>
            <button className={"page-btn " + (page === 1 ? "active" : "")} onClick={() => setPage(1)}>1</button>
            <button className="page-btn" onClick={() => setPage(p => p + 1)}>&gt;</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Bookings;