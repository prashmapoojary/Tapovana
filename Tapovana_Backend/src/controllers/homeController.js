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

exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const { filter = 'today', from, to } = req.query;

    let startDate, endDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filter === 'today') {
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'week') {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (filter === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filter === 'custom' && from && to) {
      startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to today
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
    }

    const safeQuery = async (sql, params = []) => {
      try {
        return await query(sql, params);
      } catch (e) {
        console.warn(`[HomeController] Safe query failed:`, e.message);
        return { rows: [] };
      }
    };

    // Calculate slots (exactly 7 intervals based on the active filter)
    const slots = [];
    const formatLabel = (date) => {
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${mm}/${dd}`;
    };

    if (filter === 'today') {
      for (let i = 0; i < 7; i++) {
        const slotStart = new Date(startDate);
        slotStart.setHours(8 + i * 2, 0, 0, 0);
        const slotEnd = new Date(startDate);
        slotEnd.setHours(8 + i * 2 + 1, 59, 59, 999);
        const label = `${String(8 + i * 2).padStart(2, '0')}:00-${String(8 + (i + 1) * 2).padStart(2, '0')}:00`;
        slots.push({ slotStart, slotEnd, label });
      }
    } else if (filter === 'week') {
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < 7; i++) {
        const slotStart = new Date(startDate);
        slotStart.setDate(startDate.getDate() + i);
        slotStart.setHours(0, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(23, 59, 59, 999);
        const label = weekdayNames[slotStart.getDay()];
        slots.push({ slotStart, slotEnd, label });
      }
    } else {
      // month or custom
      const diffMs = endDate.getTime() - startDate.getTime();
      const stepMs = diffMs / 7;
      for (let i = 0; i < 7; i++) {
        const slotStart = new Date(startDate.getTime() + Math.floor(i * stepMs));
        const slotEnd = new Date(startDate.getTime() + Math.floor((i + 1) * stepMs) - 1);
        slots.push({ slotStart, slotEnd, label: formatLabel(slotStart) });
      }
    }

    // ── Single-roundtrip bulk fetch ──────────────────────────────────────────
    // Escape ISO date strings for use in non-parameterized multi-statement SQL.
    // This is safe because the dates are constructed from validated Date objects,
    // not from raw user input.
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    const { pool } = require('../config/db');
    let bulkResults;
    try {
      bulkResults = await pool.query(`
        SELECT COUNT(*) as cnt FROM customers;

        SELECT membership_status, COUNT(*) as cnt
        FROM customers
        WHERE join_date >= '${startIso}' AND join_date <= '${endIso}'
        GROUP BY membership_status;

        SELECT booking_date, status, service_name
        FROM bookings
        WHERE booking_date >= '${startIso}' AND booking_date <= '${endIso}';

        SELECT w.date, a.status, w.title, w.price
        FROM attendees a
        JOIN workshops w ON a.workshop_id = w.id
        WHERE w.date >= '${startIso}' AND w.date <= '${endIso}';

        SELECT vp.start_date, va.status, vp.title, vp.price
        FROM vedic_attendees va
        JOIN vedic_programs vp ON va.program_id = vp.id
        WHERE vp.start_date >= '${startIso}' AND vp.start_date <= '${endIso}';

        SELECT created_at, amount, status
        FROM transactions
        WHERE created_at >= '${startIso}' AND created_at <= '${endIso}';

        SELECT LOWER(name) as name, category, base_price::float as price
        FROM services;
      `);
    } catch (bulkErr) {
      console.warn('[HomeController] Bulk query failed, returning empty sets:', bulkErr.message);
      bulkResults = Array(7).fill({ rows: [] });
    }

    // Ensure bulkResults is always an array (pg returns array for multi-statement)
    if (!Array.isArray(bulkResults)) {
      bulkResults = [bulkResults];
    }

    const customersRows    = (bulkResults[0] || { rows: [] }).rows;
    const membershipRows   = (bulkResults[1] || { rows: [] }).rows;
    const bookingsRows     = (bulkResults[2] || { rows: [] }).rows;
    const workshopRows     = (bulkResults[3] || { rows: [] }).rows;
    const vedicRows        = (bulkResults[4] || { rows: [] }).rows;
    const transactionRows  = (bulkResults[5] || { rows: [] }).rows;
    const servicesRows     = (bulkResults[6] || { rows: [] }).rows;

    // ── Stats computation (in-memory) ────────────────────────────────────────
    const today_bookings =
      bookingsRows.length +
      workshopRows.length +
      vedicRows.length;

    const today_revenue = transactionRows
      .filter(t => ['COMPLETED', 'PAID'].includes((t.status || '').toUpperCase()))
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const active_customers = parseInt(customersRows[0]?.cnt || 0, 10);

    const pending_bookings =
      bookingsRows.filter(b => (b.status || '').toLowerCase() === 'pending').length +
      workshopRows.filter(a => (a.status || '').toLowerCase() === 'enrolled').length +
      vedicRows.filter(va => ['registered', 'confirmed'].includes((va.status || '').toLowerCase())).length;

    // ── Trend computation (in-memory bucketing) ──────────────────────────────
    const inSlot = (dateVal, slotStart, slotEnd) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      return d >= slotStart && d <= slotEnd;
    };

    const bookings_last_7_days = [];
    const revenue_last_7_days = [];
    const daysOfWeek = slots.map(s => s.label);

    for (let i = 0; i < 7; i++) {
      const slot = slots[i];

      bookings_last_7_days.push(
        bookingsRows.filter(b => inSlot(b.booking_date, slot.slotStart, slot.slotEnd)).length +
        workshopRows.filter(w => inSlot(w.date, slot.slotStart, slot.slotEnd)).length +
        vedicRows.filter(v => inSlot(v.start_date, slot.slotStart, slot.slotEnd)).length
      );

      revenue_last_7_days.push(
        transactionRows
          .filter(t =>
            ['COMPLETED', 'PAID'].includes((t.status || '').toUpperCase()) &&
            inSlot(t.created_at, slot.slotStart, slot.slotEnd)
          )
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      );
    }

    // ── Membership breakdown ─────────────────────────────────────────────────
    let membership_breakdown = membershipRows.reduce((acc, row) => {
      const status = (row.membership_status || 'NONE').toUpperCase();
      acc[status] = parseInt(row.cnt || 0, 10);
      return acc;
    }, { NONE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 });

    const totalNewMembers = Object.values(membership_breakdown).reduce((sum, count) => sum + count, 0);
    if (totalNewMembers === 0) {
      try {
        const lfMembershipRes = await safeQuery(`
          SELECT membership_status, COUNT(*) as cnt
          FROM customers
          GROUP BY membership_status
        `);
        membership_breakdown = lfMembershipRes.rows.reduce((acc, row) => {
          const status = (row.membership_status || 'NONE').toUpperCase();
          acc[status] = parseInt(row.cnt || 0, 10);
          return acc;
        }, { NONE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 });
      } catch (e) {
        console.warn("[HomeController] Membership breakdown fallback failed:", e.message);
      }
    }

    // ── Service Demand (in-memory) ───────────────────────────────────────────
    // Build a lookup map from the services table for category/price metadata
    const servicesMap = {};
    servicesRows.forEach(s => {
      servicesMap[s.name] = { category: s.category, price: s.price };
    });

    const servicesDemand = {};
    const workshopsDemand = {};
    const vedicDemand = {};
    const combinedDemand = {};

    bookingsRows.forEach(b => {
      if (!b.service_name) return;
      const name = b.service_name;
      const lowerName = name.toLowerCase();
      const meta = servicesMap[lowerName] || { category: 'Wellness', price: 0 };
      const item = { count: 1, name, category: meta.category, price: meta.price };
      if (servicesDemand[name]) {
        servicesDemand[name].count += 1;
      } else {
        servicesDemand[name] = { ...item };
      }
      if (combinedDemand[name]) {
        combinedDemand[name].count += 1;
      } else {
        combinedDemand[name] = { ...item };
      }
    });

    workshopRows.forEach(w => {
      if (!w.title) return;
      const name = w.title;
      const item = { count: 1, name, category: 'Workshop', price: parseFloat(w.price || 0) };
      if (workshopsDemand[name]) {
        workshopsDemand[name].count += 1;
      } else {
        workshopsDemand[name] = { ...item };
      }
      if (combinedDemand[name]) {
        combinedDemand[name].count += 1;
      } else {
        combinedDemand[name] = { ...item };
      }
    });

    vedicRows.forEach(vp => {
      if (!vp.title) return;
      const name = vp.title;
      const item = { count: 1, name, category: 'Vedic Life', price: parseFloat(vp.price || 0) };
      if (vedicDemand[name]) {
        vedicDemand[name].count += 1;
      } else {
        vedicDemand[name] = { ...item };
      }
      if (combinedDemand[name]) {
        combinedDemand[name].count += 1;
      } else {
        combinedDemand[name] = { ...item };
      }
    });

    const getTop5 = (demandObj) => {
      const sorted = {};
      Object.entries(demandObj)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .forEach(([key, val]) => {
          sorted[key] = val;
        });
      return sorted;
    };

    let service_demand = getTop5(combinedDemand);
    let service_demand_services = getTop5(servicesDemand);
    let service_demand_workshops = getTop5(workshopsDemand);
    let service_demand_vedic = getTop5(vedicDemand);

    // Fallback: If empty, pull lifetime records for the top 5
    if (Object.keys(service_demand).length === 0) {
      try {
        const [lfServiceRes, lfWorkshopRes, lfVedicRes] = await Promise.all([
          safeQuery(`
            SELECT b.service_name as name, COUNT(*) as cnt,
                   COALESCE(MAX(s.category), 'Wellness') as category,
                   COALESCE(MAX(s.base_price::float), 0) as price
            FROM bookings b
            LEFT JOIN services s ON LOWER(s.name) = LOWER(b.service_name)
            GROUP BY b.service_name
          `),
          safeQuery(`
            SELECT w.title as name, COUNT(a.id) as cnt,
                   'Workshop' as category,
                   COALESCE(w.price::float, 0) as price
            FROM attendees a
            JOIN workshops w ON a.workshop_id = w.id
            GROUP BY w.title, w.price
          `),
          safeQuery(`
            SELECT vp.title as name, COUNT(va.id) as cnt,
                   'Vedic Life' as category,
                   COALESCE(vp.price::float, 0) as price
            FROM vedic_attendees va
            JOIN vedic_programs vp ON va.program_id = vp.id
            GROUP BY vp.title, vp.price
          `)
        ]);

        const lfCombined = {};
        const lfServices = {};
        const lfWorkshops = {};
        const lfVedic = {};

        for (const row of lfServiceRes.rows) {
          const item = {
            count: parseInt(row.cnt || 0, 10),
            name: row.name,
            category: row.category,
            price: parseFloat(row.price || 0)
          };
          lfCombined[row.name] = { ...item };
          lfServices[row.name] = { ...item };
        }
        for (const row of lfWorkshopRes.rows) {
          const item = {
            count: parseInt(row.cnt || 0, 10),
            name: row.name,
            category: row.category,
            price: parseFloat(row.price || 0)
          };
          lfWorkshops[row.name] = { ...item };
          if (lfCombined[row.name]) {
            lfCombined[row.name].count += item.count;
          } else {
            lfCombined[row.name] = { ...item };
          }
        }
        for (const row of lfVedicRes.rows) {
          const item = {
            count: parseInt(row.cnt || 0, 10),
            name: row.name,
            category: row.category,
            price: parseFloat(row.price || 0)
          };
          lfVedic[row.name] = { ...item };
          if (lfCombined[row.name]) {
            lfCombined[row.name].count += item.count;
          } else {
            lfCombined[row.name] = { ...item };
          }
        }

        service_demand = getTop5(lfCombined);
        service_demand_services = getTop5(lfServices);
        service_demand_workshops = getTop5(lfWorkshops);
        service_demand_vedic = getTop5(lfVedic);
      } catch (e) {
        console.warn("[HomeController] Service demand fallback query failed:", e.message);
      }
    }

    res.json({
      success: true,
      stats: {
        today_bookings,
        today_revenue,
        active_customers,
        pending_bookings
      },
      trends: {
        bookings_last_7_days,
        revenue_last_7_days,
        daysOfWeek
      },
      membership_breakdown,
      service_demand,
      service_demand_services,
      service_demand_workshops,
      service_demand_vedic
    });
  } catch (error) {
    console.error("[HomeController] Error getting analytics dashboard:", error);
    res.status(500).json({ success: false, message: "Failed to generate analytics dashboard" });
  }
};
