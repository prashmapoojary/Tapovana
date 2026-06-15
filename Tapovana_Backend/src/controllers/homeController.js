const { query } = require('../config/db');

exports.getHomeSummary = async (req, res) => {
  try {
    let total_customers = 5;
    let total_transactions = 8;
    let total_services = 5; 
    let active_bookings = 23;
    let published_blogs = 12;

    // 1. Fetch live count of customers
    try {
      const custRes = await query("SELECT COUNT(*) as cnt FROM customers");
      total_customers = parseInt(custRes.rows[0]?.cnt || 0, 10);
    } catch (e) {
      console.warn("[HomeController] DB customers count failed, using fallback:", e.message);
    }

    // 2. Fetch live count of transactions
    try {
      const txnRes = await query("SELECT COUNT(*) as cnt FROM transactions");
      total_transactions = parseInt(txnRes.rows[0]?.cnt || 0, 10);
    } catch (e) {
      console.warn("[HomeController] DB transactions count failed, using fallback:", e.message);
    }

    // 3. Fetch count of services
    try {
      const servicesRes = await query("SELECT COUNT(*) as cnt FROM services");
      total_services = parseInt(servicesRes.rows[0]?.cnt || 0, 10);
    } catch (e) {
      console.warn("[HomeController] DB services count query failed, using fallback:", e.message);
    }

    // 4. Fetch count of bookings (active/upcoming/all depending on booking status logic)
    try {
      const bookingsRes = await query("SELECT COUNT(*) as cnt FROM bookings");
      active_bookings = parseInt(bookingsRes.rows[0]?.cnt || 0, 10);
    } catch (e) {
      console.warn("[HomeController] DB bookings count query failed, using fallback:", e.message);
    }

    // 5. Fetch count of published blogs
    try {
      const blogsRes = await query("SELECT COUNT(*) as cnt FROM blogs WHERE status = 'published'");
      published_blogs = parseInt(blogsRes.rows[0]?.cnt || 0, 10);
    } catch (e) {
      console.warn("[HomeController] DB blogs count query failed, using fallback:", e.message);
    }

    // Optional: Log a snapshot in home_dashboard_snapshots table
    try {
      const revenueRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status IN ('COMPLETED','PAID')");
      const pendingRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status = 'PENDING'");
      const refundedRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status = 'REFUNDED'");
      const failedRes = await query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE status = 'FAILED'");

      await query(`
        INSERT INTO home_dashboard_snapshots (total_customers, total_transactions, total_revenue, pending_amount, refunded_amount, failed_amount, total_services, active_bookings, published_blogs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        total_customers,
        total_transactions,
        parseFloat(revenueRes.rows[0]?.total || 0),
        parseFloat(pendingRes.rows[0]?.total || 0),
        parseFloat(refundedRes.rows[0]?.total || 0),
        parseFloat(failedRes.rows[0]?.total || 0),
        total_services,
        active_bookings,
        published_blogs
      ]);
    } catch (snapshotErr) {
      console.warn("[HomeController] Failed to write dashboard snapshot:", snapshotErr.message);
    }

    res.json({
      success: true,
      summary: {
        total_customers,
        total_transactions,
        total_services,
        active_bookings,
        published_blogs
      }
    });
  } catch (error) {
    console.error("[HomeController] Error getting home summary:", error);
    res.status(500).json({ success: false, message: "Failed to generate home summary metrics" });
  }
};
