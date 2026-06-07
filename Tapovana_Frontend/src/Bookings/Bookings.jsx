import React, { useState, useEffect, useMemo } from "react";
import "./Bookings.css";
import { apiFetch } from "../api/http";
import { getUser } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";
import SearchIcon from "../assets/searchIcon.svg";
import ActionIcon from "../assets/Button.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import DefaultAvatar from "../assets/profileIconDefault.png";

const DUMMY_BOOKINGS = [
  { id: "1", booking_id: "BK-1001", customer_name: "Rahul Sharma", customer_phone: "+91 9876543210", service_name: "Ayurvedic Massage", doctor_name: "Dr. Kavitha", booking_date: "2026-06-15", booking_time: "10:00 AM", amount: "2500", payment_status: "PAID", status: "CONFIRMED" },
  { id: "2", booking_id: "BK-1002", customer_name: "Priya Desai", customer_phone: "+91 8765432109", service_name: "Yoga Therapy", doctor_name: "Dr. Rekha", booking_date: "2026-06-16", booking_time: "07:00 AM", amount: "1200", payment_status: "PENDING", status: "PENDING" },
  { id: "3", booking_id: "BK-1003", customer_name: "Vikram Singh", customer_phone: "+91 7654321098", service_name: "Panchakarma", doctor_name: "", booking_date: "2026-06-18", booking_time: "09:00 AM", amount: "5000", payment_status: "PAID", status: "CONFIRMED" },
  { id: "4", booking_id: "BK-1004", customer_name: "Anita Nair", customer_phone: "+91 6543210987", service_name: "Meditation Session", doctor_name: "Dr. Arjun", booking_date: "2026-06-15", booking_time: "05:00 PM", amount: "800", payment_status: "PAID", status: "COMPLETED" },
  { id: "5", booking_id: "BK-1005", customer_name: "Sanjay Kumar", customer_phone: "+91 5432109876", service_name: "Acupuncture", doctor_name: "Dr. Ramesh", booking_date: "2026-06-20", booking_time: "11:00 AM", amount: "1500", payment_status: "FAILED", status: "CANCELLED" },
  { id: "6", booking_id: "BK-1006", customer_name: "Sneha Reddy", customer_phone: "+91 9988776655", service_name: "Facial", doctor_name: "Dr. Kavitha", booking_date: "2026-06-25", booking_time: "02:00 PM", amount: "2000", payment_status: "PAID", status: "PENDING" }
];

const DUMMY_DOCTORS = [
  { id: "doc1", first_name: "Kavitha", last_name: "Rao", specialization: "Ayurveda" },
  { id: "doc2", first_name: "Rekha", last_name: "Menon", specialization: "Yoga" },
  { id: "doc3", first_name: "Arjun", last_name: "Nair", specialization: "Meditation" }
];

function Bookings() {
  const { triggerAlert, triggerConfirm } = useAllocations();
  const userRole = useMemo(() => getUser()?.role, []);
  const canEdit = ["SUPER_ADMIN", "CO_ADMIN"].includes((userRole || "").toUpperCase());

  const [bookings, setBookings] = useState(DUMMY_BOOKINGS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [doctors] = useState(DUMMY_DOCTORS);

  // Drawer state — same pattern as Team.jsx
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [allocatedDoctorId, setAllocatedDoctorId] = useState("");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch from API, fall back to dummy data
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let q = `/api/bookings?page=${page}&limit=10`;
        if (statusFilter) q += `&status=${statusFilter}`;
        if (dateFrom) q += `&date_from=${dateFrom}`;
        if (dateTo) q += `&date_to=${dateTo}`;
        const res = await apiFetch(q);
        if (res.success) setBookings(res.bookings || []);
        else setBookings(DUMMY_BOOKINGS);
      } catch {
        setBookings(DUMMY_BOOKINGS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, statusFilter, dateFrom, dateTo]);

  // When a booking is selected, pre-fill form state
  useEffect(() => {
    if (selectedBooking) {
      setAllocatedDoctorId(selectedBooking.doctor_name ? "doc1" : "");
      setNotes("");
    }
  }, [selectedBooking]);

  const filtered = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(b =>
      (b.booking_id || "").toLowerCase().includes(q) ||
      (b.customer_name || "").toLowerCase().includes(q) ||
      (b.customer_phone || "").toLowerCase().includes(q) ||
      (b.service_name || "").toLowerCase().includes(q)
    );
  }, [bookings, search]);

  const handleUpdateStatus = (newStatus) => {
    if (newStatus === "COMPLETED") {
      if (selectedBooking.payment_status !== "PAID") {
        triggerAlert(`Cannot mark booking as Completed because the payment status is ${selectedBooking.payment_status}. Only bookings with PAID status can be completed.`);
        return;
      }
      // Cannot mark as Completed before booking date/time has passed
      const bookingDateTime = new Date(`${selectedBooking.booking_date} ${selectedBooking.booking_time}`);
      if (!isNaN(bookingDateTime.getTime()) && bookingDateTime > new Date()) {
        triggerAlert("Cannot mark booking as Completed before the scheduled date and time has passed.");
        return;
      }
    }

    if (newStatus === "CONFIRMED" && !selectedBooking.doctor_name && !allocatedDoctorId) {
      triggerAlert("Must allocate a doctor/therapist before confirming a booking.");
      return;
    }

    setActionLoading(true);
    setTimeout(() => {
      let docName = selectedBooking.doctor_name;
      if (newStatus === "CONFIRMED" && allocatedDoctorId) {
        const doc = doctors.find(d => d.id === allocatedDoctorId);
        if (doc) docName = `Dr. ${doc.first_name} ${doc.last_name}`;
      }

      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: newStatus, doctor_name: docName } : b));
      setSelectedBooking(prev => ({ ...prev, status: newStatus, doctor_name: docName }));
      setActionLoading(false);
      triggerAlert(`Booking successfully updated to: ${newStatus}`, true);
    }, 300);
  };

  const handleAllocateDoctorLocal = () => {
    if (!allocatedDoctorId) return;
    const doc = doctors.find(d => d.id === allocatedDoctorId);
    if (!doc) return;
    const docName = `Dr. ${doc.first_name} ${doc.last_name}`;

    setActionLoading(true);
    setTimeout(() => {
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, doctor_name: docName } : b));
      setSelectedBooking(prev => ({ ...prev, doctor_name: docName }));
      triggerAlert(`Successfully allocated ${docName}!`, true);
      setActionLoading(false);
    }, 300);
  };

  const handleDateFromChange = (val) => {
    setDateFrom(val);
    if (dateTo && val && new Date(dateTo) < new Date(val)) {
      setDateTo("");
      triggerAlert('"To" date cannot be before "From" date.');
    }
    setPage(1);
  };

  const handleDateToChange = (val) => {
    if (dateFrom && val && new Date(val) < new Date(dateFrom)) {
      triggerAlert('"To" date cannot be before "From" date.');
      return;
    }
    setDateTo(val);
    setPage(1);
  };

  const handleExportCSV = () => {
    const headers = ["Booking ID", "Customer", "Phone", "Service", "Doctor", "Date", "Time", "Status", "Amount", "Payment"];
    const rows = filtered.map(b => [b.booking_id, b.customer_name, b.customer_phone, b.service_name, b.doctor_name || "Unallocated", b.booking_date, b.booking_time, b.status, b.amount, b.payment_status]);
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Bookings_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="bookings-container">

      {/* ── Drawer — exact same pattern as Team.jsx ── */}
      {selectedBooking && (
        <div
          className="bk-drawer-overlay"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bk-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bk-drawer-header">
              <div>
                <h2>Appointment Details</h2>
                <p>{selectedBooking.booking_id} · {selectedBooking.service_name}</p>
              </div>
              <button className="bk-close-btn" onClick={() => setSelectedBooking(null)}>×</button>
            </div>

            {/* Body */}
            <div className="bk-drawer-body">

              {/* Customer */}
              <div className="bk-drawer-section">
                <h4 className="bk-section-title">Customer</h4>
                <div className="bk-profile-card">
                  <img src={DefaultAvatar} className="bk-avatar" alt="" />
                  <div>
                    <div className="bk-name">{selectedBooking.customer_name}</div>
                    <div className="bk-sub">{selectedBooking.customer_phone}</div>
                    <span className="pay-badge paid">Gold Member</span>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="bk-drawer-section">
                <h4 className="bk-section-title">Session Particulars</h4>
                <div className="bk-info-grid">
                  <div className="bk-info-item"><span className="bk-label">Booking ID</span><span className="bk-value">{selectedBooking.booking_id}</span></div>
                  <div className="bk-info-item"><span className="bk-label">Service</span><span className="bk-value">{selectedBooking.service_name}</span></div>
                  <div className="bk-info-item"><span className="bk-label">Date</span><span className="bk-value">{selectedBooking.booking_date}</span></div>
                  <div className="bk-info-item"><span className="bk-label">Time</span><span className="bk-value">{selectedBooking.booking_time}</span></div>
                  <div className="bk-info-item"><span className="bk-label">Amount</span><span className="bk-value">₹{selectedBooking.amount}</span></div>
                  <div className="bk-info-item">
                    <span className="bk-label">Payment</span>
                    <span className={`pay-badge ${(selectedBooking.payment_status || "PENDING").toLowerCase()}`}>{selectedBooking.payment_status}</span>
                  </div>
                </div>
              </div>

              {/* Doctor / Therapist Assignment — visible to everyone, but editable only by admins */}
              <div className="bk-drawer-section">
                <h4 className="bk-section-title">Assign Doctor / Therapist</h4>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select
                    value={allocatedDoctorId}
                    onChange={(e) => canEdit && setAllocatedDoctorId(e.target.value)}
                    disabled={!canEdit}
                    style={{
                      flex: 1,
                      height: 42,
                      border: "1px solid #e3e7ed",
                      borderRadius: 8,
                      padding: "0 12px",
                      fontSize: 14,
                      outline: "none",
                      background: !canEdit ? "#f5f5f5" : "#fff",
                      cursor: !canEdit ? "default" : "text"
                    }}
                  >
                    <option value="">Choose Doctor...</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.first_name} {d.last_name} ({d.specialization})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAllocateDoctorLocal}
                    disabled={!canEdit || !allocatedDoctorId || actionLoading}
                    style={{
                      padding: "0 20px",
                      height: 42,
                      background: canEdit ? "#cda751" : "#e0e0e0",
                      color: canEdit ? "white" : "#888",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: !canEdit ? "not-allowed" : "pointer"
                    }}
                  >
                    Allocate
                  </button>
                </div>
              </div>

              {/* Notes — read-only for non-admins */}
              <div className="bk-drawer-section">
                <h4 className="bk-section-title">Consultation Notes</h4>
                <textarea
                  value={notes}
                  onChange={(e) => canEdit && setNotes(e.target.value)}
                  readOnly={!canEdit}
                  placeholder={!canEdit ? "No notes added." : "Add notes about this session..."}
                  style={{
                    width: "100%",
                    height: 80,
                    border: "1px solid #e3e7ed",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                    background: !canEdit ? "#f5f5f5" : "#fff",
                    cursor: !canEdit ? "default" : "text"
                  }}
                />
              </div>
            </div>

            {/* Footer Actions — only Close button for non-admins */}
            <div className="bk-drawer-footer">
              {canEdit && selectedBooking.status === "PENDING" && (
                <button className="bk-btn-primary" disabled={actionLoading} onClick={() => handleUpdateStatus("CONFIRMED")}>Confirm Booking</button>
              )}
              {canEdit && selectedBooking.status === "CONFIRMED" && (
                <button className="bk-btn-green" disabled={actionLoading} onClick={() => handleUpdateStatus("COMPLETED")}>Complete Session</button>
              )}
              {canEdit && selectedBooking.status !== "CANCELLED" && selectedBooking.status !== "COMPLETED" && (
                <button className="bk-btn-danger" disabled={actionLoading} onClick={() => handleUpdateStatus("CANCELLED")}>Cancel Booking</button>
              )}
              <button className="bk-btn-secondary" onClick={() => setSelectedBooking(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bookings-header">
        <div className="bookings-title">
          <h1>Booking &amp; Appointments</h1>
          <p>Manage bookings, allocate therapists, and monitor session statuses.</p>
        </div>
        <button className="svc-gold-btn" onClick={handleExportCSV}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export CSV
        </button>
      </header>

      {/* Filters */}
      <section className="filters-card">
        <div className="bookings-filters">
          <div className="bk-search-box">
            <img src={SearchIcon} className="bk-search-icon" alt="" />
            <input
              type="text"
              placeholder="Search by name, phone, service or booking ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="bk-filter-dropdown">
            <select className="bk-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Status: All</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <img src={DropdownIcon} className="bk-dropdown-icon" alt="" />
          </div>
          <div className="bk-date-wrapper">
            <label>From</label>
            <input type="date" className="bk-date-input" value={dateFrom} onChange={(e) => handleDateFromChange(e.target.value)} />
          </div>
          <div className="bk-date-wrapper">
            <label>To</label>
            <input type="date" className="bk-date-input" value={dateTo} onChange={(e) => handleDateToChange(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="bookings-table-card">
        {loading && <div style={{ padding: 16, color: "#7b8a9a" }}>Loading...</div>}

        <div className="bookings-table-scroll">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>BOOKING ID</th>
                <th>CUSTOMER</th>
                <th>SERVICE</th>
                <th>DOCTOR</th>
                <th>DATE &amp; TIME</th>
                <th>AMOUNT</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} style={{ cursor: "pointer" }} onClick={() => setSelectedBooking(b)}>
                  <td><strong>{b.booking_id}</strong></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                    <div style={{ fontSize: 11, color: "#7b8a9a" }}>{b.customer_phone}</div>
                  </td>
                  <td>{b.service_name}</td>
                  <td>
                    {b.doctor_name
                      ? <span style={{ color: "#188A94", fontWeight: 500 }}>{b.doctor_name}</span>
                      : <span style={{ color: "#e67e22", fontStyle: "italic" }}>Pending</span>
                    }
                  </td>
                  <td>
                    <div>{b.booking_date}</div>
                    <div style={{ fontSize: 11, color: "#7b8a9a" }}>{b.booking_time}</div>
                  </td>
                  <td><strong>₹{b.amount}</strong></td>
                  <td>
                    <span className={`pay-badge ${(b.payment_status || "PENDING").toLowerCase()}`}>{b.payment_status}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${(b.status || "PENDING").toLowerCase()}`}>{b.status}</span>
                  </td>
                  <td onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}>
                    <img src={ActionIcon} alt="Actions" className="action-icon" />
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: 32, color: "#7b8a9a" }}>No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="booking-pagination-footer">
          <div>Showing {filtered.length} bookings</div>
          <div className="pagination-controls">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt;</button>
            <button className={`page-btn ${page === 1 ? "active" : ""}`} onClick={() => setPage(1)}>1</button>
            <button className="page-btn" onClick={() => setPage(p => p + 1)}>&gt;</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Bookings;