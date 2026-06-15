const DUMMY_CUSTOMERS = [
  { id: "1", customer_id: "CUST-001", first_name: "Rahul", last_name: "Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", status: "ACTIVE", membership_status: "GOLD", total_bookings: 12, total_spent: 24500, join_date: "2024-01-15", last_activity: "2026-06-01", admin_notes: "Prefers evening slots" },
  { id: "2", customer_id: "CUST-002", first_name: "Priya", last_name: "Desai", email: "priya.d@example.com", phone: "+91 87654 32109", status: "ACTIVE", membership_status: "NONE", total_bookings: 2, total_spent: 3500, join_date: "2024-05-20", last_activity: "2026-05-22", admin_notes: "" },
  { id: "3", customer_id: "CUST-003", first_name: "Vikram", last_name: "Singh", email: "vikram.s@example.com", phone: "+91 76543 21098", status: "INACTIVE", membership_status: "PLATINUM", total_bookings: 45, total_spent: 89000, join_date: "2023-05-10", last_activity: "2026-04-10", admin_notes: "VIP Client. Always books premium packages." },
  { id: "4", customer_id: "CUST-004", first_name: "Anita", last_name: "Nair", email: "anita.n@example.com", phone: "+91 65432 10987", status: "ACTIVE", membership_status: "SILVER", total_bookings: 8, total_spent: 12000, join_date: "2024-02-22", last_activity: "2026-06-05", admin_notes: "Allergic to sesame oil." },
  { id: "5", customer_id: "CUST-005", first_name: "Sanjay", last_name: "Kumar", email: "sanjay.k@example.com", phone: "+91 54321 09876", status: "ARCHIVED", membership_status: "NONE", total_bookings: 1, total_spent: 1500, join_date: "2023-01-01", last_activity: "2023-01-15", admin_notes: "Duplicate account. Archived on request." },
];

const getCustomersList = async () => {
  try {
    const res = await globalThis.fetch("https://tapoclg.onrender.com/api/customer");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.customers)) {
        return data.customers;
      }
    }
  } catch (err) {
    console.warn("[CustomerController] External API fetch failed, using fallback:", err.message);
  }
  return DUMMY_CUSTOMERS;
};

exports.getCustomers = async (req, res) => {
  try {
    const customersList = await getCustomersList();
    res.json({
      success: true,
      customers: customersList
    });
  } catch (error) {
    console.error("[CustomerController] Error getting customers:", error);
    res.status(500).json({ success: false, message: "Failed to load customers" });
  }
};

// Expose internal getter for Home Page aggregation
exports.getCustomersInternal = getCustomersList;
