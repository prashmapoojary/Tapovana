import React, { createContext, useState, useEffect } from "react";
import { apiFetch } from "../api/http";

export const AllocationContext = createContext();

// Seeded dummy bookings — match the same data in Bookings.jsx
const SEED_BOOKINGS = [
  { id: "1", booking_id: "BK-1001", customer_name: "Rahul Sharma", customer_phone: "+91 9876543210", service_name: "Ayurvedic Massage", doctor_name: "Kavitha Rao", booking_date: "2026-06-15", booking_time: "10:00 AM", amount: "2500", payment_status: "PAID", status: "CONFIRMED" },
  { id: "2", booking_id: "BK-1002", customer_name: "Priya Desai", customer_phone: "+91 8765432109", service_name: "Yoga Therapy", doctor_name: "Rekha Menon", booking_date: "2026-06-16", booking_time: "07:00 AM", amount: "1200", payment_status: "PENDING", status: "PENDING" },
  { id: "3", booking_id: "BK-1003", customer_name: "Vikram Singh", customer_phone: "+91 7654321098", service_name: "Panchakarma", doctor_name: "", booking_date: "2026-06-18", booking_time: "09:00 AM", amount: "5000", payment_status: "PAID", status: "CONFIRMED" },
  { id: "4", booking_id: "BK-1004", customer_name: "Anita Nair", customer_phone: "+91 6543210987", service_name: "Meditation Session", doctor_name: "Arjun Nair", booking_date: "2026-06-15", booking_time: "05:00 PM", amount: "800", payment_status: "PAID", status: "COMPLETED" },
  { id: "5", booking_id: "BK-1005", customer_name: "Sanjay Kumar", customer_phone: "+91 5432109876", service_name: "Acupuncture", doctor_name: "", booking_date: "2026-06-20", booking_time: "11:00 AM", amount: "1500", payment_status: "FAILED", status: "CANCELLED" }
];

export const AllocationProvider = ({ children }) => {
  const [allocations, setAllocations] = useState([]);
  // Always seed with dummy data — Bookings.jsx will overwrite with real API data if available
  const [bookings, setBookings] = useState(SEED_BOOKINGS);
  const [staff, setStaff] = useState([]);

  // Fetch live bookings and staff from API, fall back to seeded data
  const refreshData = async () => {
    try {
      const resB = await apiFetch("/api/bookings?limit=100");
      if (resB.success && resB.bookings && resB.bookings.length > 0) {
        setBookings(resB.bookings);
      }
      // else: keep SEED_BOOKINGS as fallback
    } catch {
      // Keep seeded fallback
    }

    try {
      const resS = await apiFetch("/api/teams/users?limit=100");
      if (resS.success && resS.users) {
        setStaff(resS.users);
      }
    } catch {
      // Keep defaults
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <AllocationContext.Provider value={{ allocations, setAllocations, bookings, setBookings, staff, setStaff, refreshData }}>
      {children}
    </AllocationContext.Provider>
  );
};
