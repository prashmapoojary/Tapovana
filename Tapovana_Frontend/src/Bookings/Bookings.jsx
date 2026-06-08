import React, { useState, useEffect, useMemo } from "react";
import "./Bookings.css";
import { apiFetch } from "../api/http";
import { getUser } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";
import { getImageUrl } from "../utils/image";
import SearchIcon from "../assets/searchIcon.svg";
import ActionIcon from "../assets/Button.svg";
import DefaultAvatar from "../assets/profileIconDefault.png";

const API_URL = "/api/bookings";

function Bookings() {
  const { triggerAlert, triggerConfirm } = useAllocations();
  const userRole = useMemo(() => getUser()?.role, []);
  const canEdit = ["SUPER_ADMIN", "CO_ADMIN"].includes((userRole || "").toUpperCase());

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
  const [assignedStaffId, setAssignedStaffId] = useState(null);
  const [newNote, setNewNote] = useState("");

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

  // ─── Fetch services from backend ───
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await apiFetch("/api/services");
        if (res.success && res.services) {
          setServicesList(res.services);
        }
      } catch {
        // ignore
      }
    };
    fetchServices();
  }, []);

  // ─── Fetch bookings from local backend ───
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        let q = `${API_URL}?limit=50&page=${page}`;
        if (statusFilter) q += `&status=${statusFilter}`;
        if (dateFrom) q += `&date_from=${dateFrom}`;
        if (dateTo) q += `&date_to=${dateTo}`;
        
        const res = await apiFetch(q);
        if (res.success) {
          setBookings(res.bookings || []);
        } else {
          throw new Error(res.message || "Failed to load bookings");
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
    if (selectedBooking) {
      setNewStatus(selectedBooking.status || "PENDING");
      setAssignedStaffId(selectedBooking.therapist_id || null);
      setNewNote(selectedBooking.note || "");
    }
  }, [selectedBooking]);

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
    
    // Non-admins can only see CONFIRMED bookings
    if (!canEdit) {
      result = result.filter(b => b.status === 'CONFIRMED');
    }

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
    if (newStatus === selectedBooking.status && assignedStaffId === (selectedBooking.therapist_id || null) && newNote === (selectedBooking.note || "")) {
      triggerAlert("No changes to update.");
      return;
    }

    const contextName = selectedBooking.user_name || selectedBooking.service_name || "Guest";
    const dummyImage = "https://ui-avatars.com/api/?name=" + encodeURIComponent(contextName) + "&background=cda751&color=fff";

    const isConfirmed = newStatus === 'CONFIRMED';
    const msg = isConfirmed && assignedStaffId
      ? `Are you sure you want to change status to ${newStatus} and allocate staff?`
      : `Are you sure you want to change status of ${contextName} to ${newStatus}?`;

    const confirmed = await triggerConfirm(msg, dummyImage);

    if (confirmed) {
      try {
        const res = await apiFetch(`/api/bookings/${selectedBooking.id}/status`, {
          method: "PUT",
          body: JSON.stringify({
            status: newStatus,
            staff_id: isConfirmed ? assignedStaffId : undefined,
            note: newNote
          })
        });

        if (res.success) {
          // Update locally to reflect changes immediately
          const updatedBooking = res.booking || { ...selectedBooking, status: newStatus };
          setBookings(prev => prev.map(b =>
            b.id === selectedBooking.id ? updatedBooking : b
          ));
          setSelectedBooking(updatedBooking);
          
          if (isConfirmed && assignedStaffId) {
            triggerAlert(`Status changed to ${newStatus} and staff allocated successfully`, true);
          } else {
            triggerAlert(`Booking ${newStatus.toLowerCase()} successfully`, true);
          }
        } else {
          triggerAlert(res.message || "Failed to update booking status");
        }
      } catch (error) {
        triggerAlert("An error occurred while updating the booking");
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
                  <img 
                    src={(() => {
                      const matchedService = servicesList.find(s => s.name?.toLowerCase() === selectedBooking.service_name?.toLowerCase());
                      return matchedService?.image_url 
                        ? getImageUrl(matchedService.image_url, "https://via.placeholder.com/300x150?text=Service+Image") 
                        : "https://via.placeholder.com/300x150?text=Service+Image";
                    })()}
                    alt="Service" 
                    style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e3e7ed" }} 
                  />
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
                        const pass = match ? match[2] : selectedBooking.pass_details;
                        return (
                          <>
                            {amount}
                            {pass && <span style={{ marginLeft: "4px", color: "#64748b" }}>({pass})</span>}
                          </>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="bk-info-item">
                    <span className="bk-label">Staff</span>
                    <span className="bk-value">
                      {selectedBooking.therapist_name || "Not assigned"}
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
                  {newStatus === 'CONFIRMED' && (
                    <div className="bk-drawer-section">
                      <h4 className="bk-section-title">Staff Allocation</h4>
                      <div className="bk-cert-list" style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '12px' }}>
                        {staffList.length === 0 ? (
                          <span style={{ fontSize: 13, color: '#7b8a9a' }}>No doctors or therapists found.</span>
                        ) : (
                        staffList
                          .filter(staff => staff.role === "DOCTOR" || staff.role === "THERAPIST")
                          .map(staff => {
                            const staffId = staff.id || staff.user_id;
                            const API_BASE = "http://localhost:5000";
                            let photoUrl = staff.profile_photo_url;
                            if (photoUrl && /^[A-Za-z]:[/\\]/i.test(photoUrl)) photoUrl = "/uploads/" + photoUrl.replace(/\\/g, '/').split('/').pop();
                            
                            let finalAvatar = DefaultAvatar;
                            if (staff.profile_photo_source === "upload" && photoUrl) finalAvatar = `${API_BASE}${photoUrl}`;
                            else if (staff.profile_photo_source === "local" && photoUrl) finalAvatar = `/avatars/${photoUrl}`;
                            else if (staff.avatar_url) {
                              let avUrl = staff.avatar_url;
                              if (avUrl && /^[A-Za-z]:[/\\]/i.test(avUrl)) avUrl = "/uploads/" + avUrl.replace(/\\/g, '/').split('/').pop();
                              finalAvatar = avUrl.startsWith("http") || avUrl.startsWith("/") ? avUrl : `${API_BASE}${avUrl}`;
                            }

                            return (
                              <label key={staffId} className="bk-cert-row">
                                <input
                                  type="checkbox"
                                  checked={assignedStaffId === staffId}
                                  onChange={() => setAssignedStaffId(assignedStaffId === staffId ? null : staffId)}
                                  className="bk-checkbox-hidden"
                                />
                                <span className={`bk-custom-checkbox ${assignedStaffId === staffId ? 'checked' : ''}`}>
                                  {assignedStaffId === staffId && (
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="4 8 7 11 12 5" />
                                    </svg>
                                  )}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <img 
                                    src={finalAvatar}
                                    alt="" 
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = DefaultAvatar; }}
                                  />
                                  {`${staff.first_name || ''} ${staff.last_name || ''} (${staff.role === 'DOCTOR' ? 'Doctor' : 'Therapist'})`.trim()}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bk-drawer-section">
                    <h4 className="bk-section-title">Update Booking Status</h4>
                  <div className="bk-status-row">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="bk-status-select"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="COMPLETED" disabled={selectedBooking.status === 'PENDING'}>Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <button
                      className="bk-status-update-btn"
                      onClick={handleUpdateStatus}
                      disabled={newStatus === selectedBooking.status}
                    >
                      Update
                    </button>
                  </div>
                  </div>
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
                <th>DATE & TIME</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="bk-loading-cell">Loading bookings...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" className="bk-empty-cell">No bookings found.</td></tr>
              ) : (
                filtered.map((b) => {
                  const staffInfo = getStaffDisplay(b.therapist_name);
                  return (
                    <tr key={b.id} className="bk-table-row" onClick={() => setSelectedBooking(b)}>
                      <td><strong>#{b.id}</strong></td>
                      <td>
                        <div className="bk-cell-name">{b.user_name || "Guest User"}</div>
                      </td>
                      <td>{b.service_name || "N/A"}</td>
                      <td>
                        {staffInfo ? (
                          <span className={staffInfo.role === "DOCTOR" ? "bk-staff-dr" : "bk-staff-tr"}>
                            {b.therapist_name}
                          </span>
                        ) : (
                          <span className="bk-staff-pending">Pending</span>
                        )}
                      </td>
                      <td>
                        {staffInfo ? (
                          <span style={{color: '#64748b', fontWeight: 500, fontSize: '13px'}}>{staffInfo.role === "DOCTOR" ? "Doctor" : "Therapist"}</span>
                        ) : (
                          <span style={{color: '#cbd5e1', fontSize: '13px'}}>-</span>
                        )}
                      </td>
                      <td>
                        <div>{formatDate(b.booking_date)}</div>
                        <div className="bk-cell-time">{b.booking_time}</div>
                      </td>
                      <td>
                        {(() => {
                          const amountStr = b.total_amount || "₹0";
                          const match = amountStr.match(/^(.*?)\s*\((.*?)\)$/);
                          const amount = match ? match[1] : amountStr;
                          const pass = match ? match[2] : b.pass_details;
                          return (
                            <>
                              <strong>{amount}</strong>
                              {pass && (
                                <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                  ({pass})
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td>
                        <span className={"bk-status-badge " + (b.status || "PENDING").toLowerCase()}>
                          {b.status || "PENDING"}
                        </span>
                      </td>
                      <td onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}>
                        <img src={ActionIcon} alt="Actions" className="action-icon" />
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