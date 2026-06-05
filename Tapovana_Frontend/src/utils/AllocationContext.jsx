import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiFetch } from "../api/http";

const AllocationContext = createContext();

/**
 * Allocation Structure:
 * {
 *   [allocationId]: {
 *     id: string,
 *     type: "workshop" | "vedic_program" | "service",
 *     staffId: string,
 *     staffName: string,
 *     staffRole: "DOCTOR" | "THERAPIST",
 *     sessionTitle: string,
 *     sessionId: string,
 *     startDate: string (ISO),
 *     endDate: string (ISO),
 *     status: "active" | "expired",
 *     createdAt: string,
 *   }
 * }
 */

export const AllocationProvider = ({ children }) => {
  const [allocations, setAllocations] = useState([]);
  const [emailNotifications, setEmailNotifications] = useState([]);
  const [customDialog, setCustomDialog] = useState(null); // { type: "alert" | "confirm", message: string, isCritical?: boolean, onConfirm: () => void, onCancel?: () => void }

  const triggerAlert = useCallback((msg, isSuccess = false) => {
    return new Promise((resolve) => {
      setCustomDialog({
        type: "alert",
        message: msg,
        isSuccess,
        onConfirm: () => {
          setCustomDialog(null);
          resolve(true);
        }
      });
    });
  }, []);

  const triggerConfirm = useCallback((msg, isCritical = false) => {
    return new Promise((resolve) => {
      setCustomDialog({
        type: "confirm",
        message: msg,
        isCritical,
        onConfirm: () => {
          setCustomDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setCustomDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  /**
   * Allocate staff to a session (workshop or vedic program)
   */
  const allocateStaff = useCallback((staff, session, sessionType) => {
    const allocationId = `alloc-${Date.now()}`;
    const now = new Date();

    // ── Validation 1: Cannot allocate to a session whose end date has already passed ──
    const sessionEndDate = new Date(session.endDate || session.end_date || session.date);
    if (session.endDate && session.endDate.length <= 10) {
      sessionEndDate.setHours(23, 59, 59, 999);
    }
    if (sessionEndDate < now) {
      triggerAlert(`Cannot allocate staff: This ${sessionType === "workshop" ? "workshop" : "program"} has already ended (${sessionEndDate.toLocaleDateString()}).`);
      return null;
    }

    const staffId = staff.user_id || staff.id;
    const sessionStart = new Date(session.startDate || session.date || session.start_date);
    const sessionEnd = sessionEndDate;

    // ── Validation 2: Date-conflict check — same staff, overlapping dates ──
    const hasConflict = allocations.some((a) => {
      if (a.staffId !== staffId || a.status === "expired") return false;
      const existingStart = new Date(a.startDate);
      const existingEnd = new Date(a.endDate);
      if (a.endDate && a.endDate.length <= 10) existingEnd.setHours(23, 59, 59, 999);
      // Overlap: new session starts before existing ends AND new session ends after existing starts
      return sessionStart <= existingEnd && sessionEnd >= existingStart;
    });

    if (hasConflict) {
      const conflicting = allocations.find((a) => {
        if (a.staffId !== staffId || a.status === "expired") return false;
        const existingStart = new Date(a.startDate);
        const existingEnd = new Date(a.endDate);
        if (a.endDate && a.endDate.length <= 10) existingEnd.setHours(23, 59, 59, 999);
        return sessionStart <= existingEnd && sessionEnd >= existingStart;
      });
      triggerAlert(`Schedule conflict! ${staff.first_name} ${staff.last_name} is already allocated to "${conflicting?.sessionTitle}" during the overlapping dates (${new Date(conflicting.startDate).toLocaleDateString()} – ${new Date(conflicting.endDate).toLocaleDateString()}). Please choose a different staff member.`);
      return null;
    }

    const newAllocation = {
      id: allocationId,
      type: sessionType, // "workshop" or "vedic_program"
      staffId,
      staffName: `${staff.first_name || ""} ${staff.last_name || ""}`.trim(),
      staffRole: staff.role,
      sessionTitle: session.title,
      sessionId: session.id || session.session_id,
      startDate: session.startDate || session.date || session.start_date,
      endDate: session.endDate || session.end_date || session.date,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    setAllocations((prev) => [...prev, newAllocation]);

    // Sync to database
    apiFetch(`/api/teams/users/${staffId}`, {
      method: "PATCH",
      body: JSON.stringify({
        availability_status: "Allocated",
        allocation_details: {
          id: allocationId,
          type: sessionType,
          sessionTitle: session.title,
          sessionId: session.id || session.session_id,
          startDate: session.startDate || session.date || session.start_date,
          endDate: session.endDate || session.end_date || session.date,
        }
      })
    }).catch(err => console.error("Error syncing allocation to database:", err));

    // Simulate email notification
    simulateEmailNotification(staff, session, sessionType);

    return allocationId;
  }, [allocations, triggerAlert]);

  /**
   * Deallocate staff from a session
   */
  const deallocateStaff = useCallback((allocationId) => {
    const alloc = allocations.find((a) => a.id === allocationId);
    if (alloc) {
      apiFetch(`/api/teams/users/${alloc.staffId}`, {
        method: "PATCH",
        body: JSON.stringify({
          availability_status: "Available",
          allocation_details: null
        })
      }).catch(err => console.error("Error syncing deallocation to database:", err));
    }
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
  }, [allocations]);

  /**
   * Deallocate all staff from a session
   */
  const deallocateFromSession = useCallback((sessionId) => {
    const sessionAllocations = allocations.filter((a) => a.sessionId === sessionId);
    sessionAllocations.forEach((a) => {
      apiFetch(`/api/teams/users/${a.staffId}`, {
        method: "PATCH",
        body: JSON.stringify({
          availability_status: "Available",
          allocation_details: null
        })
      }).catch(err => console.error("Error syncing deallocation to database:", err));
    });
    setAllocations((prev) => prev.filter((a) => a.sessionId !== sessionId));
  }, [allocations]);

  /**
   * Get all allocated staff for a session
   */
  const getAllocatedStaffForSession = useCallback((sessionId) => {
    return allocations.filter(
      (a) => a.sessionId === sessionId && a.status === "active"
    );
  }, [allocations]);

  /**
   * Get all allocated staff IDs (for filtering)
   */
  const getAllocatedStaffIds = useCallback(() => {
    const now = new Date();
    return allocations
      .filter((a) => {
        const endDate = new Date(a.endDate);
        if (a.endDate && a.endDate.length <= 10) {
          endDate.setHours(23, 59, 59, 999);
        }
        return endDate > now && a.status === "active";
      })
      .map((a) => a.staffId);
  }, [allocations]);

  /**
   * Check if staff is allocated and active
   */
  const isStaffAllocated = useCallback((staffId) => {
    const now = new Date();
    return allocations.some((a) => {
      const endDate = new Date(a.endDate);
      if (a.endDate && a.endDate.length <= 10) {
        endDate.setHours(23, 59, 59, 999);
      }
      return (
        a.staffId === staffId &&
        a.status === "active" &&
        endDate > now
      );
    });
  }, [allocations]);

  /**
   * Get allocation details for a staff
   */
  const getStaffAllocations = useCallback((staffId) => {
    const now = new Date();
    return allocations.filter((a) => a.staffId === staffId).map((a) => {
      const endDate = new Date(a.endDate);
      return {
        ...a,
        status: endDate <= now ? "expired" : "active",
      };
    });
  }, [allocations]);

  /**
   * Clean up expired allocations (called periodically)
   */
  const cleanupExpiredAllocations = useCallback(() => {
    const now = new Date();
    setAllocations((prev) =>
      prev.map((a) => {
        const endDate = new Date(a.endDate);
        if (endDate <= now && a.status === "active") {
          apiFetch(`/api/teams/users/${a.staffId}`, {
            method: "PATCH",
            body: JSON.stringify({
              availability_status: "Available",
              allocation_details: null
            })
          }).catch(err => console.error("Error syncing expired allocation to database:", err));
          return { ...a, status: "expired" };
        }
        return a;
      })
    );
  }, []);

  /**
   * Simulate email notification (frontend only)
   */
  const simulateEmailNotification = useCallback((staff, session, sessionType) => {
    const notification = {
      id: `notif-${Date.now()}`,
      staffName: `${staff.first_name || ""} ${staff.last_name || ""}`.trim(),
      staffEmail: staff.email || "staff@tapovana.com",
      programName: session.title,
      programType: sessionType === "workshop" ? "Workshop" : sessionType === "service" ? "Service" : "Vedic Life Program",
      allocationStartDate: session.date || session.start_date,
      allocationEndDate: session.endDate || session.end_date || session.date,
      status: "sent",
      sentAt: new Date().toISOString(),
      content: {
        subject: `Allocation Confirmation: ${session.title}`,
        body: `
Dear ${staff.first_name},

You have been allocated to the following ${sessionType === "workshop" ? "workshop" : sessionType === "service" ? "service" : "Vedic Life Program"}:

Program: ${session.title}
Start Date: ${new Date(session.startDate || session.date || session.start_date).toLocaleDateString()}
End Date: ${new Date(session.endDate || session.end_date || session.date).toLocaleDateString()}

Please ensure you are available during this period. If you have any conflicts, please notify the admin immediately.

Best regards,
Tapovana Admin Team
        `,
      },
    };

    setEmailNotifications((prev) => [...prev, notification]);
    console.log("📧 Email Notification Sent:", notification);
  }, []);

  /**
   * Get all email notifications
   */
  const getEmailNotifications = useCallback(() => {
    return emailNotifications;
  }, [emailNotifications]);

  /**
   * Clear old notifications
   */
  const clearOldNotifications = useCallback((daysOld = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    setEmailNotifications((prev) =>
      prev.filter((n) => new Date(n.sentAt) > cutoffDate)
    );
  }, []);

  /**
   * Mark an allocation as complete (expired)
   */
  const completeAllocation = useCallback((allocationId) => {
    const alloc = allocations.find((a) => a.id === allocationId);
    if (alloc) {
      apiFetch(`/api/teams/users/${alloc.staffId}`, {
        method: "PATCH",
        body: JSON.stringify({
          availability_status: "Available",
          allocation_details: null
        })
      }).catch(err => console.error("Error syncing completed allocation to database:", err));
    }
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id === allocationId) {
          return { ...a, status: "expired" };
        }
        return a;
      })
    );
  }, [allocations]);

  // ── Auto-cleanup: mark expired allocations on mount ──
  useEffect(() => {
    cleanupExpiredAllocations();
    // Re-run every 5 minutes to keep statuses fresh
    const interval = setInterval(cleanupExpiredAllocations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupExpiredAllocations]);

  const value = {
    allocations,
    emailNotifications,
    allocateStaff,
    deallocateStaff,
    deallocateFromSession,
    getAllocatedStaffForSession,
    getAllocatedStaffIds,
    isStaffAllocated,
    getStaffAllocations,
    cleanupExpiredAllocations,
    getEmailNotifications,
    clearOldNotifications,
    completeAllocation,
    triggerAlert,
    triggerConfirm,
  };

  return (
    <AllocationContext.Provider value={value}>
      {children}
      {customDialog && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "wsFadeIn 0.2s ease"
        }}>
          <div style={{
            background: "#FFFFFF",
            border: `2px solid ${customDialog.isCritical ? "#EF4444" : "#CDA751"}`,
            borderRadius: "16px",
            width: "440px",
            maxWidth: "90vw",
            padding: "24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <h3 style={{
              margin: 0,
              fontSize: "18px",
              color: "#1e293b",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              display: "flex",
              alignItems: "center"
            }}>
              {customDialog.isSuccess && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {customDialog.isCritical ? "Confirm Action" : "Alert"}
            </h3>
            <p style={{
              margin: 0,
              fontSize: "14px",
              color: "#334155",
              lineHeight: "1.6",
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 500
            }}>
              {customDialog.message}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              {customDialog.type === "confirm" && (
                <button
                  style={{
                    padding: "8px 24px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: "#e2e8f0",
                    color: "#334155",
                    border: "none",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.target.style.background = "#cbd5e1"}
                  onMouseOut={(e) => e.target.style.background = "#e2e8f0"}
                  onClick={customDialog.onCancel}
                >
                  Cancel
                </button>
              )}
              <button 
                style={{ 
                  padding: "8px 24px", 
                  fontSize: "13px", 
                  fontWeight: 600,
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: "#CDA751",
                  color: "white",
                  border: "none",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#b8903f"}
                onMouseOut={(e) => e.target.style.background = "#CDA751"}
                onClick={customDialog.onConfirm}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </AllocationContext.Provider>
  );
};

/**
 * Hook to use allocation context
 */
export const useAllocations = () => {
  const context = useContext(AllocationContext);
  if (!context) {
    throw new Error("useAllocations must be used within AllocationProvider");
  }
  return context;
};

export default AllocationContext;
