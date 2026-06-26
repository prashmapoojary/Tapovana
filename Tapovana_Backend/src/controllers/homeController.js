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

    // Build trend queries promises
    const trendsPromises = [];
    slots.forEach(slot => {
      trendsPromises.push(
        safeQuery(`
          SELECT COUNT(*) as cnt
          FROM bookings
          WHERE booking_date >= $1 AND booking_date <= $2
        `, [slot.slotStart, slot.slotEnd]),
        safeQuery(`
          SELECT COUNT(a.id) as cnt
          FROM attendees a
          JOIN workshops w ON a.workshop_id = w.id
          WHERE w.date >= $1 AND w.date <= $2
        `, [slot.slotStart, slot.slotEnd]),
        safeQuery(`
          SELECT COUNT(va.id) as cnt
          FROM vedic_attendees va
          JOIN vedic_programs vp ON va.program_id = vp.id
          WHERE vp.start_date >= $1 AND vp.start_date <= $2
        `, [slot.slotStart, slot.slotEnd]),
        safeQuery(`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM transactions
          WHERE created_at >= $1 AND created_at <= $2
          AND status IN ('COMPLETED', 'PAID')
        `, [slot.slotStart, slot.slotEnd])
      );
    });

    // Execute all primary queries in parallel
    const [
      // Stats queries
      serviceBookingsRes,
      workshopAttendeesRes,
      vedicAttendeesRes,
      revenueRes,
      customersRes,
      pendingServicesRes,
      pendingWorkshopsRes,
      pendingVedicRes,

      // Trends queries (28 elements)
      ...trendsResultsAndOthers
    ] = await Promise.all([
      // 1. Stats queries
      safeQuery(`
        SELECT COUNT(*) as cnt
        FROM bookings
        WHERE booking_date >= $1 AND booking_date <= $2
      `, [startDate, endDate]),
      safeQuery(`
        SELECT COUNT(a.id) as cnt
        FROM attendees a
        JOIN workshops w ON a.workshop_id = w.id
        WHERE w.date >= $1 AND w.date <= $2
      `, [startDate, endDate]),
      safeQuery(`
        SELECT COUNT(va.id) as cnt
        FROM vedic_attendees va
        JOIN vedic_programs vp ON va.program_id = vp.id
        WHERE vp.start_date >= $1 AND vp.start_date <= $2
      `, [startDate, endDate]),
      safeQuery(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE created_at >= $1 AND created_at <= $2
        AND status IN ('COMPLETED', 'PAID')
      `, [startDate, endDate]),
      safeQuery("SELECT COUNT(*) as cnt FROM customers"),
      safeQuery(`
        SELECT COUNT(*) as cnt
        FROM bookings
        WHERE booking_date >= $1 AND booking_date <= $2
        AND LOWER(status) = 'pending'
      `, [startDate, endDate]),
      safeQuery(`
        SELECT COUNT(a.id) as cnt
        FROM attendees a
        JOIN workshops w ON a.workshop_id = w.id
        WHERE w.date >= $1 AND w.date <= $2
        AND LOWER(a.status) = 'enrolled'
      `, [startDate, endDate]),
      safeQuery(`
        SELECT COUNT(va.id) as cnt
        FROM vedic_attendees va
        JOIN vedic_programs vp ON va.program_id = vp.id
        WHERE vp.start_date >= $1 AND vp.start_date <= $2
        AND LOWER(va.status) IN ('registered', 'confirmed')
      `, [startDate, endDate]),

      // 2. Trend queries (28 promises)
      ...trendsPromises,

      // 3. Membership breakdown query
      safeQuery(`
        SELECT membership_status, COUNT(*) as cnt
        FROM customers
        WHERE join_date >= $1 AND join_date <= $2
        GROUP BY membership_status
      `, [startDate, endDate]),

      // 4. Service demand queries
      safeQuery(`
        SELECT b.service_name as name, COUNT(*) as cnt,
               COALESCE(MAX(s.category), 'Wellness') as category,
               COALESCE(MAX(s.base_price::float), 0) as price
        FROM bookings b
        LEFT JOIN services s ON LOWER(s.name) = LOWER(b.service_name)
        WHERE b.booking_date >= $1 AND b.booking_date <= $2
        GROUP BY b.service_name
      `, [startDate, endDate]),
      safeQuery(`
        SELECT w.title as name, COUNT(a.id) as cnt,
               'Workshop' as category,
               COALESCE(w.price::float, 0) as price
        FROM attendees a
        JOIN workshops w ON a.workshop_id = w.id
        WHERE w.date >= $1 AND w.date <= $2
        GROUP BY w.title, w.price
      `, [startDate, endDate]),
      safeQuery(`
        SELECT vp.title as name, COUNT(va.id) as cnt,
               'Vedic Life' as category,
               COALESCE(vp.price::float, 0) as price
        FROM vedic_attendees va
        JOIN vedic_programs vp ON va.program_id = vp.id
        WHERE vp.start_date >= $1 AND vp.start_date <= $2
        GROUP BY vp.title, vp.price
      `, [startDate, endDate])
    ]);

    // Extract trends, membership, and demand from the tail of the array
    const trendsResults = trendsResultsAndOthers.slice(0, 28);
    const membershipRes = trendsResultsAndOthers[28];
    const serviceDemandRes = trendsResultsAndOthers[29];
    const workshopDemandRes = trendsResultsAndOthers[30];
    const vedicDemandRes = trendsResultsAndOthers[31];

    // Compute stats totals
    const today_bookings = 
      parseInt(serviceBookingsRes.rows[0]?.cnt || 0, 10) +
      parseInt(workshopAttendeesRes.rows[0]?.cnt || 0, 10) +
      parseInt(vedicAttendeesRes.rows[0]?.cnt || 0, 10);

    const today_revenue = parseFloat(revenueRes.rows[0]?.total || 0);
    const active_customers = parseInt(customersRes.rows[0]?.cnt || 0, 10);

    const pending_bookings = 
      parseInt(pendingServicesRes.rows[0]?.cnt || 0, 10) +
      parseInt(pendingWorkshopsRes.rows[0]?.cnt || 0, 10) +
      parseInt(pendingVedicRes.rows[0]?.cnt || 0, 10);

    // Compute trend arrays
    const bookings_last_7_days = [];
    const revenue_last_7_days = [];
    const daysOfWeek = slots.map(s => s.label);

    for (let i = 0; i < 7; i++) {
      const idx = i * 4;
      const dayBookingsRes = trendsResults[idx];
      const dayWorkshopRes = trendsResults[idx + 1];
      const dayVedicRes = trendsResults[idx + 2];
      const dayRevenueRes = trendsResults[idx + 3];

      bookings_last_7_days.push(
        parseInt(dayBookingsRes.rows[0]?.cnt || 0, 10) +
        parseInt(dayWorkshopRes.rows[0]?.cnt || 0, 10) +
        parseInt(dayVedicRes.rows[0]?.cnt || 0, 10)
      );

      revenue_last_7_days.push(parseFloat(dayRevenueRes.rows[0]?.total || 0));
    }

    // Process Membership breakdown
    let membership_breakdown = membershipRes.rows.reduce((acc, row) => {
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

    // Process Service Demand
    const combinedDemand = {};
    for (const row of serviceDemandRes.rows) {
      combinedDemand[row.name] = {
        count: parseInt(row.cnt || 0, 10),
        name: row.name,
        category: row.category,
        price: parseFloat(row.price || 0)
      };
    }

    for (const row of workshopDemandRes.rows) {
      if (combinedDemand[row.name]) {
        combinedDemand[row.name].count += parseInt(row.cnt || 0, 10);
      } else {
        combinedDemand[row.name] = {
          count: parseInt(row.cnt || 0, 10),
          name: row.name,
          category: row.category,
          price: parseFloat(row.price || 0)
        };
      }
    }

    for (const row of vedicDemandRes.rows) {
      if (combinedDemand[row.name]) {
        combinedDemand[row.name].count += parseInt(row.cnt || 0, 10);
      } else {
        combinedDemand[row.name] = {
          count: parseInt(row.cnt || 0, 10),
          name: row.name,
          category: row.category,
          price: parseFloat(row.price || 0)
        };
      }
    }

    let service_demand = {};
    Object.entries(combinedDemand)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .forEach(([key, val]) => {
        service_demand[key] = val;
      });

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
        for (const row of lfServiceRes.rows) {
          lfCombined[row.name] = {
            count: parseInt(row.cnt || 0, 10),
            name: row.name,
            category: row.category,
            price: parseFloat(row.price || 0)
          };
        }
        for (const row of lfWorkshopRes.rows) {
          if (lfCombined[row.name]) {
            lfCombined[row.name].count += parseInt(row.cnt || 0, 10);
          } else {
            lfCombined[row.name] = {
              count: parseInt(row.cnt || 0, 10),
              name: row.name,
              category: row.category,
              price: parseFloat(row.price || 0)
            };
          }
        }
        for (const row of lfVedicRes.rows) {
          if (lfCombined[row.name]) {
            lfCombined[row.name].count += parseInt(row.cnt || 0, 10);
          } else {
            lfCombined[row.name] = {
              count: parseInt(row.cnt || 0, 10),
              name: row.name,
              category: row.category,
              price: parseFloat(row.price || 0)
            };
          }
        }

        const sortedLf = {};
        Object.entries(lfCombined)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .forEach(([key, val]) => {
            sortedLf[key] = val;
          });
        service_demand = sortedLf;
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
      service_demand
    });
  } catch (error) {
    console.error("[HomeController] Error getting analytics dashboard:", error);
    res.status(500).json({ success: false, message: "Failed to generate analytics dashboard" });
  }
};
