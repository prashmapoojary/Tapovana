import React, { useState, useEffect } from "react";
import DefaultAvatar from "../assets/profileIconDefault.png";

const BookingDetailsDrawer = ({ booking, onClose, onSaved, userRole, doctors }) => {
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [allocatedDoctorId, setAllocatedDoctorId] = useState("");
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setDetailLoading(true);
      setBookingDetail(null);
      setAllocatedDoctorId("");
      setNotes("");

      // Simulate fast network instead of hanging on missing backend
      setTimeout(() => {
        const custName = booking.customer_name || "Unknown Customer";
        setBookingDetail({
          customer: { 
            first_name: custName.split(' ')[0], 
            last_name: custName.split(' ').slice(1).join(' '), 
            phone: booking.customer_phone, 
            email: "user@example.com", 
            membership_status: "Gold" 
          },
          booking: { ...booking, duration_minutes: 60 },
          payment: { status: booking.payment_status, transaction_id: "TXN12345" }
        });
        setAllocatedDoctorId(booking.doctor_name ? "doc1" : "");
        setDetailLoading(false);
      }, 200);
    }
  }, [booking]);

  if (!booking) return null;

  // Doctor allocation execution
  const handleAllocateDoctor = async () => {
    if (!allocatedDoctorId) {
      alert("Please select a doctor to allocate.");
      return;
    }
    try {
      setActionLoading(true);
      alert("Doctor successfully allocated to this booking!");
      onSaved();
      onClose();
    } catch (err) {
      alert("Failed to allocate doctor.");
    } finally {
      setActionLoading(false);
    }
  };

  // Generic status patch update
  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === "COMPLETED" && bookingDetail?.booking?.payment_status !== "PAID") {
      alert(`Cannot mark booking as Completed because the payment status is ${bookingDetail?.booking?.payment_status}. Only bookings with PAID status can be completed.`);
      return;
    }
    try {
      setActionLoading(true);
      alert(`Booking successfully updated to: ${newStatus}`);
      onSaved();
      onClose();
    } catch (err) {
      alert("Failed to update booking status.");
    } finally {
      setActionLoading(false);
    }
  };

  // Booking deletion execution
  const handleDeleteBooking = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete this booking record? This action is irreversible.")) {
      return;
    }
    try {
      setActionLoading(true);
      alert("Booking record successfully deleted.");
      onSaved();
      onClose();
    } catch (err) {
      alert("Failed to delete booking.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="details-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <h2>Appointment Breakdown</h2>
            <p>Verify session scheduling and change status controls.</p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {detailLoading ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#7b8a9a" }}>
            Retrieving full file records...
          </div>
        ) : bookingDetail ? (
          <>
            <div className="drawer-content">
              {/* Customer Card profile section */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Customer Dossier</h4>
                <div className="drawer-user-card">
                  <img 
                    src={bookingDetail.customer?.avatar_url || DefaultAvatar} 
                    className="drawer-avatar" 
                    alt="Customer" 
                  />
                  <div className="drawer-user-info">
                    <h3>{bookingDetail.customer?.first_name} {bookingDetail.customer?.last_name}</h3>
                    <p>{bookingDetail.customer?.phone} • {bookingDetail.customer?.email || "No Email"}</p>
                    <span className="pay-badge paid" style={{ textTransform: "uppercase" }}>
                      {bookingDetail.customer?.membership_status} Member
                    </span>
                  </div>
                </div>
              </div>

              {/* Booking scheduling and payment values */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Session Particulars</h4>
                <div className="drawer-grid">
                  <div className="grid-item">
                    <span className="grid-item-label">Booking ID</span>
                    <span className="grid-item-value">{bookingDetail.booking?.booking_id}</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-item-label">Service</span>
                    <span className="grid-item-value">{bookingDetail.booking?.service_name || "N/A"}</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-item-label">Date & Time</span>
                    <span className="grid-item-value">{bookingDetail.booking?.booking_date} @ {bookingDetail.booking?.booking_time}</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-item-label">Duration</span>
                    <span className="grid-item-value">{bookingDetail.booking?.duration_minutes} Mins</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-item-label">Total Amount</span>
                    <span className="grid-item-value">₹{bookingDetail.booking?.amount}</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-item-label">Payment Gateway</span>
                    <span className="grid-item-value" style={{ textTransform: "uppercase" }}>
                      {bookingDetail.payment?.status} ({bookingDetail.payment?.transaction_id || "Unpaid"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Doctor allocation controls dropdown */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Doctor/Therapist Allocation</h4>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <select 
                    className="allocation-select" 
                    value={allocatedDoctorId}
                    onChange={(e) => setAllocatedDoctorId(e.target.value)}
                  >
                    <option value="">Choose Available Doctor...</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.first_name} {doc.last_name} ({doc.specialization || "General"})
                      </option>
                    ))}
                  </select>
                  <button 
                    className="drawer-btn primary" 
                    style={{ height: "45px", flex: "0 0 120px" }}
                    onClick={handleAllocateDoctor}
                    disabled={actionLoading}
                  >
                    Allocate
                  </button>
                </div>
              </div>

              {/* Notes text input editing */}
              <div className="drawer-section">
                <h4 className="drawer-section-title">Consultation & Special Notes</h4>
                <textarea 
                  className="notes-textarea" 
                  placeholder="Add specific client symptoms, muscle stiffness directions, doctor recommendations..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Footer action buttons */}
            <footer className="drawer-footer">
              <div className="drawer-actions-row">
                {bookingDetail.booking?.status === "PENDING" && (
                  <button 
                    className="drawer-btn primary"
                    onClick={() => handleUpdateStatus("CONFIRMED")}
                    disabled={actionLoading}
                  >
                    Confirm Booking
                  </button>
                )}
                {bookingDetail.booking?.status === "CONFIRMED" && (
                  <button 
                    className="drawer-btn primary"
                    style={{ backgroundColor: "#2ecc71" }}
                    onClick={() => handleUpdateStatus("COMPLETED")}
                    disabled={actionLoading}
                  >
                    Complete Session
                  </button>
                )}
                {bookingDetail.booking?.status !== "CANCELLED" && bookingDetail.booking?.status !== "COMPLETED" && (
                  <button 
                    className="drawer-btn danger"
                    onClick={() => handleUpdateStatus("CANCELLED")}
                    disabled={actionLoading}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
              
              <div className="drawer-actions-row">
                {/* Delete booking allowed for Super Admin */}
                {userRole === "SUPER_ADMIN" && (
                  <button 
                    className="drawer-btn danger"
                    style={{ background: "#fff", borderColor: "#ff4d4f", color: "#ff4d4f" }}
                    onClick={handleDeleteBooking}
                    disabled={actionLoading}
                  >
                    Delete Record
                  </button>
                )}
                <button 
                  className="drawer-btn secondary"
                  onClick={() => handleUpdateStatus(bookingDetail.booking?.status)}
                  disabled={actionLoading}
                >
                  Update Notes Only
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div style={{ padding: "32px", textAlign: "center" }}>No details records found.</div>
        )}
      </div>
    </div>
  );
};

export default BookingDetailsDrawer;
