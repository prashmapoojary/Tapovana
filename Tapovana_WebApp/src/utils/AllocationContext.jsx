import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

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
      alert(`Cannot allocate staff: This ${sessionType === "workshop" ? "workshop" : "program"} has already ended (${sessionEndDate.toLocaleDateString()}).`);
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
      alert(`Schedule conflict! ${staff.first_name} ${staff.last_name} is already allocated to "${conflicting?.sessionTitle}" during the overlapping dates (${new Date(conflicting.startDate).toLocaleDateString()} – ${new Date(conflicting.endDate).toLocaleDateString()}). Please choose a different staff member.`);
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

    // Simulate email notification
    simulateEmailNotification(staff, session, sessionType);

    return allocationId;
  }, [allocations]);

  /**
   * Deallocate staff from a session
   */
  const deallocateStaff = useCallback((allocationId) => {
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
  }, []);

  /**
   * Deallocate all staff from a session
   */
  const deallocateFromSession = useCallback((sessionId) => {
    setAllocations((prev) => prev.filter((a) => a.sessionId !== sessionId));
  }, []);

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
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id === allocationId) {
          return { ...a, status: "expired" };
        }
        return a;
      })
    );
  }, []);

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
  };

  return (
    <AllocationContext.Provider value={value}>
      {children}
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
