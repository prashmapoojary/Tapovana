import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../api/http";
import { getUser } from "./session";
import "./AllocationContext.css";

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
  const location = useLocation();
  const hasFetchedRef = useRef(false);
  const [allocations, setAllocations] = useState([]);
  const [emailNotifications, setEmailNotifications] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  // Custom Alert and Confirm Modal States
  const [alertState, setAlertState] = useState({ visible: false, message: "", isSuccess: false, resolve: null });
  const [confirmState, setConfirmState] = useState({ visible: false, message: "", imageUrl: null, resolve: null });

  const triggerAlert = useCallback((message, isSuccess = false) => {
    return new Promise((resolve) => {
      setAlertState({
        visible: true,
        message,
        isSuccess,
        resolve,
      });
    });
  }, []);

  const triggerConfirm = useCallback((message, imageUrl = null) => {
    return new Promise((resolve) => {
      setConfirmState({
        visible: true,
        message,
        imageUrl,
        resolve,
      });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    if (alertState.resolve) {
      alertState.resolve();
    }
    setAlertState({ visible: false, message: "", isSuccess: false, resolve: null });
  }, [alertState]);

  const handleConfirmAction = useCallback((choice) => {
    if (confirmState.resolve) {
      confirmState.resolve(choice);
    }
    setConfirmState({ visible: false, message: "", imageUrl: null, resolve: null });
  }, [confirmState]);

  // Fetch leaves from API
  const fetchLeaves = useCallback(async (staffId) => {
    return [];
  }, []);

  // Fetch conflicts from API (admin only)
  const fetchConflicts = useCallback(async () => {
    return [];
  }, []);

  // Mark leave via API
  const markLeave = useCallback(async (body) => {
    return { success: false };
  }, []);

  // Cancel/Delete leave via API
  const cancelLeave = useCallback(async (id, staffId) => {
    return false;
  }, []);

  // Fetch suggestions from API
  const getSuggestions = useCallback(async (params) => {
    return [];
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
    if (sessionType !== "service" && sessionEndDate < now) {
      triggerAlert(`Cannot allocate staff: This ${sessionType === "workshop" ? "workshop" : "program"} has already ended (${sessionEndDate.toLocaleDateString()}).`);
      return null;
    }

    const staffId = staff.user_id || staff.id;
    const sessionStart = new Date(session.startDate || session.date || session.start_date);
    const sessionEnd = sessionEndDate;

    // ── Validation 2: Date-conflict check — same staff, overlapping dates ──
    const hasConflict = sessionType !== "service" && allocations.some((a) => {
      if (a.staffId !== staffId || a.status === "expired" || a.type === "service") return false;
      const existingStart = new Date(a.startDate);
      const existingEnd = new Date(a.endDate);
      if (a.endDate && a.endDate.length <= 10) existingEnd.setHours(23, 59, 59, 999);
      // Overlap: new session starts before existing ends AND new session ends after existing starts
      return sessionStart <= existingEnd && sessionEnd >= existingStart;
    });

    if (hasConflict) {
      const conflicting = allocations.find((a) => {
        if (a.staffId !== staffId || a.status === "expired" || a.type === "service") return false;
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

    // Sync to database (use /allocation route — accessible to all authenticated users)
    apiFetch(`/api/teams/users/${staffId}/allocation`, {
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
      apiFetch(`/api/teams/users/${alloc.staffId}/allocation`, {
        method: "PATCH",
        body: JSON.stringify({
          availability_status: "Available",
          allocation_details: null
        })
      }).catch(err => console.error("Error syncing deallocation to database:", err));
    }
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id === allocationId) {
          return { ...a, status: "removed" };
        }
        return a;
      })
    );
  }, [allocations]);

  /**
   * Deallocate all staff from a session
   */
  const deallocateFromSession = useCallback((sessionId) => {
    const sessionAllocations = allocations.filter((a) => a.sessionId === sessionId);
    sessionAllocations.forEach((a) => {
      apiFetch(`/api/teams/users/${a.staffId}/allocation`, {
        method: "PATCH",
        body: JSON.stringify({
          availability_status: "Available",
          allocation_details: null
        })
      }).catch(err => console.error("Error syncing deallocation to database:", err));
    });
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.sessionId === sessionId) {
          return { ...a, status: "removed" };
        }
        return a;
      })
    );
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
        return (a.type === "service" || endDate > now) && a.status === "active";
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
        (a.type === "service" || endDate > now)
      );
    });
  }, [allocations]);

  /**
   * Get allocation details for a staff
   */
  const getStaffAllocations = useCallback((staffId) => {
    const now = new Date();
    return allocations.filter((a) => a.staffId === staffId).map((a) => {
      if (a.type === "service") return { ...a, status: "active" };
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
        if (a.type === "service") return a;
        const endDate = new Date(a.endDate);
        if (endDate <= now && a.status === "active") {
          apiFetch(`/api/teams/users/${a.staffId}/allocation`, {
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
      apiFetch(`/api/teams/users/${alloc.staffId}/allocation`, {
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

  // Fetch initial allocations from database on login/mount
  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      hasFetchedRef.current = false;
      return;
    }

    if (hasFetchedRef.current) return;

    const fetchAllAllocations = async () => {
      try {
        const data = await apiFetch("/api/teams/allocations/all");
        if (data.success && data.allocations) {
          setAllocations(data.allocations);
          hasFetchedRef.current = true;
        }
      } catch (err) {
        console.error("Error fetching all allocations:", err);
      }
    };
    const loadConflicts = async () => {
      setConflicts([]);
    };
    fetchAllAllocations();
    loadConflicts();
  }, [location.pathname]);

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
    leaves,
    conflicts,
    fetchLeaves,
    fetchConflicts,
    markLeave,
    cancelLeave,
    getSuggestions
  };

  return (
    <AllocationContext.Provider value={value}>
      {children}

      {/* Global Alert Modal */}
      {alertState.visible && (
        <div className="global-alert-overlay">
          <div className="global-alert-modal">
            <div className="global-alert-icon-container">
              {alertState.isSuccess ? (
                <div className="global-alert-success-icon">✓</div>
              ) : (
                <div className="global-alert-warning-icon">!</div>
              )}
            </div>
            <div className="global-alert-message" style={{ color: alertState.isSuccess ? "#2e7559" : "#e74c3c", fontWeight: 600 }}>{alertState.message}</div>
            <button className="global-alert-ok-btn" onClick={handleAlertClose}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      {confirmState.visible && (
        <div className="global-alert-overlay">
          <div className="global-alert-modal">
            <div className="global-alert-icon-container">
              {confirmState.imageUrl ? (
                <img src={confirmState.imageUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="global-alert-warning-icon">?</div>
              )}
            </div>
            <div className="global-alert-message">{confirmState.message}</div>
            <div className="global-confirm-actions">
              <button 
                className="global-confirm-cancel-btn" 
                onClick={() => handleConfirmAction(false)}
              >
                Cancel
              </button>
              <button 
                className="global-confirm-confirm-btn" 
                onClick={() => handleConfirmAction(true)}
              >
                Confirm
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
