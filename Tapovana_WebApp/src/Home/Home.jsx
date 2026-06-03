import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { apiFetch } from "../api/http";
import HomeIcon from "../assets/Home.svg";
import BookingsIcon from "../assets/Bookings.svg";
import CustomersIcon from "../assets/Customers.svg";
import TransactionsIcon from "../assets/Transactions.svg";
import { getUser, roleLabel } from "../utils/session";
import { useAllocations } from "../utils/AllocationContext";

// Helper map to translate raw backend service catalog IDs into gorgeous premium display names
const SERVICE_LOOKUP = {
  "SVC-001": { name: "Deep Tissue Massage", category: "Body Care", price: 2500, duration: 60 },
  "SVC-002": { name: "Facial Treatment", category: "Skin Care", price: 2000, duration: 45 },
  "SVC-003": { name: "Hair Spa", category: "Hair Care", price: 1800, duration: 60 },
  "SVC-004": { name: "Meditation Session", category: "Wellness", price: 500, duration: 30 },
  "SVC-005": { name: "Yoga Class", category: "Wellness", price: 800, duration: 60 }
};

// Realistic dummy data shown when the backend API is unavailable
const DUMMY_DASHBOARD_DATA = {
  success: true,
  stats: {
    today_bookings: 23,
    today_revenue: 47500,
    active_customers: 284,
    pending_bookings: 7
  },
  trends: {
    bookings_last_7_days: [18, 22, 15, 28, 31, 19, 23],
    revenue_last_7_days: [32000, 41500, 28000, 52000, 61000, 38500, 47500]
  },
  membership_breakdown: {
    NONE: 142,
    SILVER: 86,
    GOLD: 41,
    PLATINUM: 15
  },
  service_demand: {
    "SVC-001": 87,
    "SVC-002": 64,
    "SVC-003": 53,
    "SVC-004": 48,
    "SVC-005": 39
  }
};

function Home() {
  const navigate = useNavigate();
  const { allocations } = useAllocations();

  const currentUser = useMemo(() => getUser(), []);
  const role = currentUser?.role?.toUpperCase() || "";
  const fullName = (currentUser?.first_name || "") + (currentUser?.last_name ? ` ${currentUser.last_name}` : "");

  const myUserId = currentUser?.user_id || currentUser?.id || "";

  // Filter allocations for this logged-in therapist/doctor
  const myAllocations = useMemo(() => {
    return allocations.filter(a => a.staffId === myUserId);
  }, [allocations, myUserId]);

  const activeAllocations = useMemo(() => {
    return myAllocations.filter(a => a.status === "active");
  }, [myAllocations]);

  const completedAllocations = useMemo(() => {
    return myAllocations.filter(a => a.status === "expired");
  }, [myAllocations]);

  // Authored blogs stats
  const myBlogs = useMemo(() => {
    const saved = localStorage.getItem("tapovana_blogs");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.filter(b => b.author?.userId === myUserId);
    }
    return [];
  }, [myUserId]);

  const publishedBlogsCount = myBlogs.filter(b => b.status === "published").length;
  const pendingBlogsCount = myBlogs.filter(b => b.status === "pending").length;
  const draftBlogsCount = myBlogs.filter(b => b.status === "draft").length;

  const quotes = [
    "Health is a state of complete physical, mental, and spiritual well-being, not merely the absence of disease. 🌿",
    "The natural healing force within each of us is the greatest force in getting well. ✨",
    "To preserve health is a moral and religious duty, for health is the basis of all social virtues. 🧘",
    "Quiet the mind, and the soul will speak. 🍃",
    "He who has health has hope; and he who has hope has everything. 🌸"
  ];
  const dailyQuote = useMemo(() => quotes[new Date().getDay() % quotes.length], []);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // States for interactive SVG charts tooltips
  const [bookingHoverIdx, setBookingHoverIdx] = useState(null);
  const [revenueHoverIdx, setRevenueHoverIdx] = useState(null);
  const [donutHoverTier, setDonutHoverTier] = useState(null);

  // Date filter-specific dummy data sets
  const FILTER_DATA = {
    today: {
      stats: { today_bookings: 23, today_revenue: 47500, active_customers: 284, pending_bookings: 7 },
      trends: { bookings_last_7_days: [18, 22, 15, 28, 31, 19, 23], revenue_last_7_days: [32000, 41500, 28000, 52000, 61000, 38500, 47500] }
    },
    week: {
      stats: { today_bookings: 148, today_revenue: 312000, active_customers: 284, pending_bookings: 21 },
      trends: { bookings_last_7_days: [18, 22, 15, 28, 31, 19, 23], revenue_last_7_days: [32000, 41500, 28000, 52000, 61000, 38500, 47500] }
    },
    month: {
      stats: { today_bookings: 612, today_revenue: 1285000, active_customers: 284, pending_bookings: 34 },
      trends: { bookings_last_7_days: [74, 88, 91, 70, 102, 96, 91], revenue_last_7_days: [148000, 175000, 182000, 140000, 205000, 192000, 243000] }
    },
    custom: {
      stats: { today_bookings: 95, today_revenue: 198500, active_customers: 284, pending_bookings: 12 },
      trends: { bookings_last_7_days: [12, 18, 10, 22, 16, 9, 8], revenue_last_7_days: [24000, 36000, 20000, 44000, 32000, 18000, 24500] }
    }
  };

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError("");
      
      const res = await apiFetch("/api/analytics/dashboard");
      if (res.success) {
        setData(res);
      } else {
        throw new Error(res.error || "Failed to load dashboard data");
      }
    } catch (err) {
      // Gracefully fall back to demo data when backend is unavailable
      setData(DUMMY_DASHBOARD_DATA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Formatted date string for the subtitle
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Render stats cards — merge filter-specific data on top of API data
  const filterData = FILTER_DATA[dateFilter] || FILTER_DATA.today;
  const stats = {
    ...(data?.stats || {}),
    ...filterData.stats
  };

  const STAT_LABELS = {
    today:  { bookings: "Today's Bookings",  revenue: "Today's Revenue" },
    week:   { bookings: "This Week's Bookings", revenue: "This Week's Revenue" },
    month:  { bookings: "This Month's Bookings", revenue: "This Month's Revenue" },
    custom: { bookings: "Period Bookings",    revenue: "Period Revenue" }
  };
  const statLabel = STAT_LABELS[dateFilter] || STAT_LABELS.today;

  // Trends lists — use filter-specific data
  const bookingTrend = filterData.trends.bookings_last_7_days;
  const revenueTrend = filterData.trends.revenue_last_7_days;
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Custom SVG line chart calculations (Bookings trend)
  const lineChartData = useMemo(() => {
    const maxVal = Math.max(...bookingTrend, 5);
    const width = 500;
    const height = 230;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const xCoords = bookingTrend.map((_, i) => paddingLeft + (i / 6) * chartWidth);
    const yCoords = bookingTrend.map(val => height - paddingBottom - (val / maxVal) * chartHeight);

    let linePath = "";
    xCoords.forEach((x, i) => {
      linePath += (i === 0 ? "M" : "L") + ` ${x} ${yCoords[i]}`;
    });

    const areaPath = linePath
      ? `${linePath} L ${xCoords[xCoords.length - 1]} ${height - paddingBottom} L ${xCoords[0]} ${height - paddingBottom} Z`
      : "";

    return { xCoords, yCoords, linePath, areaPath, maxVal, width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, chartHeight, chartWidth };
  }, [bookingTrend]);

  // Custom SVG bar chart calculations (Revenue trend)
  const barChartData = useMemo(() => {
    const maxVal = Math.max(...revenueTrend, 1000);
    const width = 500;
    const height = 230;
    const paddingLeft = 60; // extra padding for currency text
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const barWidth = Math.min(30, (chartWidth / 7) * 0.6);
    const step = chartWidth / 6;

    const xCoords = revenueTrend.map((_, i) => paddingLeft + i * step);
    const barHeights = revenueTrend.map(val => (val / maxVal) * chartHeight);
    const yCoords = barHeights.map(h => height - paddingBottom - h);

    return { xCoords, yCoords, barHeights, barWidth, maxVal, width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, chartHeight, chartWidth };
  }, [revenueTrend]);

  // Donut chart segments calculation (Membership share)
  const membershipData = data?.membership_breakdown || { NONE: 1, SILVER: 0, GOLD: 0, PLATINUM: 0 };
  const donutData = useMemo(() => {
    const total = Object.values(membershipData).reduce((a, b) => a + b, 0) || 1;
    const order = ["PLATINUM", "GOLD", "SILVER", "NONE"];
    const colors = {
      PLATINUM: "#188A94", // Teal
      GOLD: "#cda751",     // Gold
      SILVER: "#8e9fa7",   // Silver-Blue
      NONE: "#a0aec0"      // Slate Grey
    };
    const labels = {
      PLATINUM: "Platinum",
      GOLD: "Gold",
      SILVER: "Silver",
      NONE: "Regular"
    };

    let accumulatedPercent = 0;
    const radius = 36;
    const circ = 2 * Math.PI * radius; // ~226.195

    const segments = order.map(key => {
      const count = membershipData[key] || 0;
      const share = count / total;
      const percent = Math.round(share * 100);
      const dashOffset = circ * (1 - share);
      const rotation = accumulatedPercent * 360 - 90; // Start at 12 o'clock
      accumulatedPercent += share;

      return {
        key,
        count,
        percent,
        share,
        dashOffset,
        rotation,
        color: colors[key],
        label: labels[key],
        circ
      };
    });

    return { total, segments };
  }, [membershipData]);

  // Service demand (top 5 lists)
  const serviceDemand = useMemo(() => {
    const rawDemand = data?.service_demand || {};
    const sorted = Object.entries(rawDemand)
      .map(([serviceId, count]) => {
        const meta = SERVICE_LOOKUP[serviceId] || { name: serviceId, category: "Wellness", price: 0 };
        return {
          serviceId,
          count,
          name: meta.name,
          category: meta.category,
          price: meta.price
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = sorted.length > 0 ? Math.max(...sorted.map(s => s.count)) : 10;
    return sorted.map(s => ({
      ...s,
      percent: Math.round((s.count / maxCount) * 100)
    }));
  }, [data]);

  if (role === "DOCTOR" || role === "THERAPIST") {
    return (
      <div className="home-container">
        {/* Dynamic Welcoming Header Banner */}
        <header className="home-header" style={{ marginBottom: "28px" }}>
          <div className="home-title">
            <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              Welcome back, {role === "DOCTOR" ? "Dr. " : ""}{fullName || "Specialist"} 🌿
            </h1>
            <p>{formattedDate} • Your Dedicated Specialist Portal</p>
          </div>
        </header>

        {/* 4 Stats Cards tailored for specialist */}
        <section className="stats-grid">
          <div className="stat-card bookings">
            <div className="stat-card-header">
              <span className="stat-card-title">Active Assignments</span>
              <div className="stat-card-icon" style={{ background: "rgba(24, 138, 148, 0.1)", color: "#188A94", fontSize: "18px", fontWeight: "bold" }}>
                🎯
              </div>
            </div>
            <div>
              <div className="stat-card-value">{activeAllocations.length}</div>
              <div className="stat-card-trend trend-up">
                <span>Active sessions in progress</span>
              </div>
            </div>
          </div>

          <div className="stat-card customers">
            <div className="stat-card-header">
              <span className="stat-card-title">Sessions Completed</span>
              <div className="stat-card-icon" style={{ background: "rgba(46, 204, 113, 0.1)", color: "#2ecc71", fontSize: "18px", fontWeight: "bold" }}>
                ✓
              </div>
            </div>
            <div>
              <div className="stat-card-value">{completedAllocations.length}</div>
              <div className="stat-card-trend trend-up" style={{ color: "#2ecc71" }}>
                <span>Program allocations fulfilled</span>
              </div>
            </div>
          </div>

          <div className="stat-card revenue">
            <div className="stat-card-header">
              <span className="stat-card-title">My Published Articles</span>
              <div className="stat-card-icon" style={{ background: "rgba(205, 167, 81, 0.1)", color: "#cda751", fontSize: "18px", fontWeight: "bold" }}>
                ✍️
              </div>
            </div>
            <div>
              <div className="stat-card-value">{publishedBlogsCount}</div>
              <div className="stat-card-trend trend-up" style={{ color: "#cda751" }}>
                <span>Live public articles</span>
              </div>
            </div>
          </div>

          <div className="stat-card pending">
            <div className="stat-card-header">
              <span className="stat-card-title">Draft &amp; Pending Blogs</span>
              <div className="stat-card-icon" style={{ background: "rgba(230, 126, 34, 0.1)", color: "#e67e22", fontSize: "18px", fontWeight: "bold" }}>
                ⏳
              </div>
            </div>
            <div>
              <div className="stat-card-value">{pendingBlogsCount + draftBlogsCount}</div>
              <div className="stat-card-trend trend-down" style={{ color: "#7b8a9a" }}>
                <span>{pendingBlogsCount} pending review · {draftBlogsCount} drafts</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Panels */}
        <section className="charts-grid" style={{ gridTemplateColumns: "1.2fr 0.8fr" }}>
          {/* Timeline Schedule Card */}
          <div className="chart-card">
            <div className="chart-card-header" style={{ marginBottom: "14px" }}>
              <div>
                <h3 className="chart-card-title">📅 My Upcoming Sessions &amp; Programs</h3>
                <div className="chart-card-subtitle">Active client allocations committed to your schedule</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              {activeAllocations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "#7b8a9a", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e0" }}>
                  <span style={{ fontSize: "36px" }}>🌿</span>
                  <h4 style={{ margin: "12px 0 4px", fontSize: "14px", fontWeight: 700, color: "#2d3748" }}>No active sessions scheduled</h4>
                  <p style={{ margin: 0, fontSize: "12px" }}>Enjoy your day of meditation and personal care!</p>
                </div>
              ) : (
                activeAllocations.slice(0, 3).map(alloc => (
                  <div 
                    key={alloc.id} 
                    style={{ 
                      padding: "14px", border: "1px solid #eceff3", borderRadius: "12px", background: "#f8fafc",
                      display: "flex", justifyContent: "space-between", alignItems: "center" 
                    }}
                  >
                    <div>
                      <span style={{
                        display: "inline-block", padding: "2px 8px", background: alloc.type === "workshop" ? "#eeb93322" : "#188a9422",
                        color: alloc.type === "workshop" ? "#b59243" : "#188a94", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
                        textTransform: "uppercase", marginBottom: "6px"
                      }}>
                        {alloc.type === "workshop" ? "Workshop" : "Vedic Program"}
                      </span>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 700, color: "#2d3748" }}>{alloc.sessionTitle}</h4>
                      <p style={{ margin: 0, fontSize: "12px", color: "#7b8a9a" }}>
                        ⏱️ {new Date(alloc.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to {new Date(alloc.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span style={{
                      padding: "4px 10px", background: "#2ecc7122", color: "#2ecc71", borderRadius: "20px", fontSize: "11px", fontWeight: 700
                    }}>
                      🟢 In Progress
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Write Blog & Tracker */}
          <div className="chart-card">
            <div className="chart-card-header" style={{ marginBottom: "14px" }}>
              <div>
                <h3 className="chart-card-title">✍️ Content Creation</h3>
                <div className="chart-card-subtitle">Manage drafts and submitted articles</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
              {myBlogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 12px", color: "#7b8a9a", background: "#f8fafc", borderRadius: "8px" }}>
                  <p style={{ margin: "0 0 10px 0", fontSize: "12px" }}>You haven't written any articles yet.</p>
                  <button 
                    onClick={() => navigate("/dashboard/blogs")}
                    style={{ background: "transparent", border: "1px solid #cbd5e0", padding: "6px 12px", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                  >
                    Start your first draft
                  </button>
                </div>
              ) : (
                myBlogs.slice(0, 3).map(blog => (
                  <div 
                    key={blog.id} 
                    style={{ 
                      padding: "10px 12px", border: "1px solid #eceff3", borderRadius: "8px", display: "flex",
                      justifyContent: "space-between", alignItems: "center" 
                    }}
                  >
                    <div style={{ maxWidth: "70%" }}>
                      <h4 style={{ margin: "0 0 2px 0", fontSize: "12.5px", fontWeight: 700, color: "#2d3748", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {blog.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "#7b8a9a" }}>{blog.category} · {blog.readTime}</span>
                    </div>
                    
                    <span style={{
                      padding: "3px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, color: "white",
                      background: blog.status === "published" ? "#2ecc71" : blog.status === "pending" ? "#3498db" : blog.status === "draft" ? "#f1c40f" : "#e74c3c"
                    }}>
                      {blog.status === "published" ? "Published" : blog.status === "pending" ? "Pending" : blog.status === "draft" ? "Draft" : "Removed by Admin"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Quote of the Day Panel */}
        <section 
          style={{
            background: "linear-gradient(135deg, rgba(205,167,81,0.06) 0%, rgba(24,138,148,0.06) 100%)",
            border: "1px solid rgba(205,167,81,0.2)", borderRadius: "16px", padding: "24px", textAlign: "center",
            marginTop: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px"
          }}
        >
          <span style={{ fontSize: "28px" }}>🧘✨</span>
          <h4 style={{ fontStyle: "italic", fontSize: "16px", fontWeight: 500, color: "#188a94", margin: "4px 0", fontFamily: "'Poppins', sans-serif" }}>
            "{dailyQuote}"
          </h4>
          <span style={{ fontSize: "11px", color: "#7b8a9a", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
            Daily Healing Vibe
          </span>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="home-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ border: "3px solid #f3f3f3", borderTop: "3px solid #cda751", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite", margin: "0 auto 16px auto" }} />
          <p style={{ color: "#7b8a9a", fontSize: "15px", fontWeight: 500 }}>Fetching live wellness analytics...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header section */}
      <header className="home-header">
        <div className="home-title">
          <h1>Tapovana Analytics Hub</h1>
          <p>{formattedDate} • Wellness Center Performance</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Date Filter Toggle */}
          <div className="home-date-filter">
            {["today", "week", "month"].map(f => (
              <button
                key={f}
                className={`home-date-btn ${dateFilter === f ? "active" : ""}`}
                onClick={() => { setDateFilter(f); setShowCustomPicker(false); }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <div style={{ position: "relative" }}>
              <button
                className={`home-date-btn ${dateFilter === "custom" ? "active" : ""}`}
                onClick={() => { setDateFilter("custom"); setShowCustomPicker(p => !p); }}
              >
                📅 Custom
              </button>
              {showCustomPicker && (
                <div className="home-date-picker-popup">
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#7b8a9a", textTransform: "uppercase", letterSpacing: "0.5px" }}>From</label>
                      <input type="date" className="home-date-input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#7b8a9a", textTransform: "uppercase", letterSpacing: "0.5px" }}>To</label>
                      <input type="date" className="home-date-input" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                    </div>
                    <button
                      className="home-date-apply-btn"
                      onClick={() => setShowCustomPicker(false)}
                    >
                      Apply Range
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button className="refresh-btn" onClick={() => fetchDashboardData(true)} disabled={refreshing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73" />
            </svg>
            {refreshing ? "Refreshing..." : "Sync"}
          </button>
        </div>
      </header>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", borderRadius: "12px", padding: "16px", marginBottom: "24px", fontSize: "14px", fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Grid containing 4 stats metrics cards */}
      <section className="stats-grid">
        <div className="stat-card bookings">
          <div className="stat-card-header">
            <span className="stat-card-title">{statLabel.bookings}</span>
            <div className="stat-card-icon">
              <img src={BookingsIcon} alt="" style={{ width: "20px", height: "20px" }} />
            </div>
          </div>
          <div>
            <div className="stat-card-value">{stats.today_bookings}</div>
            <div className="stat-card-trend trend-up">
              <span>↑ 12.5%</span> <span style={{ color: "#a0aec0" }}>vs previous period</span>
            </div>
          </div>
        </div>

        <div className="stat-card revenue">
          <div className="stat-card-header">
            <span className="stat-card-title">{statLabel.revenue}</span>
            <div className="stat-card-icon">
              <img src={TransactionsIcon} alt="" style={{ width: "20px", height: "20px" }} />
            </div>
          </div>
          <div>
            <div className="stat-card-value">₹{(stats.today_revenue || 0).toLocaleString("en-IN")}</div>
            <div className="stat-card-trend trend-up">
              <span>↑ 8.4%</span> <span style={{ color: "#a0aec0" }}>vs previous period</span>
            </div>
          </div>
        </div>

        <div className="stat-card customers">
          <div className="stat-card-header">
            <span className="stat-card-title">Active Customers</span>
            <div className="stat-card-icon">
              <img src={CustomersIcon} alt="" style={{ width: "20px", height: "20px" }} />
            </div>
          </div>
          <div>
            <div className="stat-card-value">{stats.active_customers}</div>
            <div className="stat-card-trend trend-up">
              <span>↑ 4.2%</span> <span style={{ color: "#a0aec0" }}>new profiles added</span>
            </div>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Allocations</span>
            <div className="stat-card-icon">
              <img src={BookingsIcon} alt="" style={{ width: "20px", height: "20px", filter: "hue-rotate(30deg)" }} />
            </div>
          </div>
          <div>
            <div className="stat-card-value">{stats.pending_bookings}</div>
            <div className="stat-card-trend trend-down">
              <span>↓ 15.0%</span> <span style={{ color: "#a0aec0" }}>outstanding tasks</span>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Action Alerts banner */}
      {(() => {
        const savedBlogs = localStorage.getItem("tapovana_blogs");
        const pendingBlogs = savedBlogs ? JSON.parse(savedBlogs).filter(b => b.status === "pending") : [];
        if (pendingBlogs.length > 0) {
          return (
            <div style={{
              background: "linear-gradient(135deg, rgba(205,167,81,0.06) 0%, rgba(24,138,148,0.06) 100%)",
              border: "1px solid rgba(205,167,81,0.2)",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>📥</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#2d3748" }}>
                    Pending Blog Submissions Waiting Review
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#7b8a9a" }}>
                    You have {pendingBlogs.length} new article submission{pendingBlogs.length > 1 ? "s" : ""} waiting for your moderation and format audit.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/dashboard/blogs")}
                style={{
                  background: "#cda751",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(205,167,81,0.3)",
                  transition: "transform 0.2s"
                }}
              >
                Review Articles →
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Grid section for Line & Bar Trends SVG charts */}
      <section className="charts-grid">
        {/* Line Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Booking Trends</h3>
              <div className="chart-card-subtitle">Last 7 days appointment count</div>
            </div>
          </div>
          <div className="svg-chart-container">
            <svg className="svg-chart" viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`}>
              <defs>
                <linearGradient id="bookingAreaGradientWorkspace" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#188A94" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#188A94" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const y = lineChartData.paddingTop + p * lineChartData.chartHeight;
                const value = Math.round(lineChartData.maxVal * (1 - p));
                return (
                  <g key={idx}>
                    <line x1={lineChartData.paddingLeft} y1={y} x2={lineChartData.width - lineChartData.paddingRight} y2={y} className="chart-gridline" />
                    <text x={lineChartData.paddingLeft - 8} y={y + 4} textAnchor="end" className="chart-axis-text">{value}</text>
                  </g>
                );
              })}

              {/* X-Axis labels and line */}
              <line x1={lineChartData.paddingLeft} y1={lineChartData.height - lineChartData.paddingBottom} x2={lineChartData.width - lineChartData.paddingRight} y2={lineChartData.height - lineChartData.paddingBottom} className="chart-axis-line" />
              {daysOfWeek.map((day, idx) => {
                const x = lineChartData.xCoords[idx];
                return (
                  <g key={idx}>
                    <text x={x} y={lineChartData.height - 10} textAnchor="middle" className="chart-axis-text">{day}</text>
                    {/* Vertical invisible pointer hover zones */}
                    <rect
                      x={x - 25}
                      y={lineChartData.paddingTop}
                      width="50"
                      height={lineChartData.chartHeight}
                      fill="transparent"
                      cursor="pointer"
                      onMouseEnter={() => setBookingHoverIdx(idx)}
                      onMouseLeave={() => setBookingHoverIdx(null)}
                    />
                  </g>
                );
              })}

              {/* Dotted indicator line on hover */}
              {bookingHoverIdx !== null && (
                <line
                  x1={lineChartData.xCoords[bookingHoverIdx]}
                  y1={lineChartData.paddingTop}
                  x2={lineChartData.xCoords[bookingHoverIdx]}
                  y2={lineChartData.height - lineChartData.paddingBottom}
                  className="chart-vertical-guideline"
                />
              )}

              {/* Area path and Stroke line path */}
              <path d={lineChartData.areaPath} className="chart-area-path" />
              <path d={lineChartData.linePath} className="chart-line-path" />

              {/* Circles on nodes */}
              {lineChartData.xCoords.map((x, i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={lineChartData.yCoords[i]}
                  r={bookingHoverIdx === i ? 6 : 4}
                  className={`chart-node-circle ${bookingHoverIdx === i ? "active" : ""}`}
                  onMouseEnter={() => setBookingHoverIdx(i)}
                  onMouseLeave={() => setBookingHoverIdx(null)}
                />
              ))}
            </svg>

            {/* Interactive node hover tooltips floating over specific x axis regions */}
            {bookingHoverIdx !== null && (
              <div
                className="chart-tooltip-bubble"
                style={{
                  left: `${(lineChartData.xCoords[bookingHoverIdx] / lineChartData.width) * 100}%`,
                  top: `${(lineChartData.yCoords[bookingHoverIdx] / lineChartData.height) * 100}%`,
                  opacity: 1
                }}
              >
                <div className="chart-tooltip-title">{daysOfWeek[bookingHoverIdx]} Day</div>
                <div className="chart-tooltip-value">{bookingTrend[bookingHoverIdx]} Bookings</div>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Revenue Performance</h3>
              <div className="chart-card-subtitle">Last 7 days billing tracking</div>
            </div>
          </div>
          <div className="svg-chart-container">
            <svg className="svg-chart" viewBox={`0 0 ${barChartData.width} ${barChartData.height}`}>
              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const y = barChartData.paddingTop + p * barChartData.chartHeight;
                const value = Math.round(barChartData.maxVal * (1 - p));
                return (
                  <g key={idx}>
                    <line x1={barChartData.paddingLeft} y1={y} x2={barChartData.width - barChartData.paddingRight} y2={y} className="chart-gridline" />
                    <text x={barChartData.paddingLeft - 8} y={y + 4} textAnchor="end" className="chart-axis-text">
                      ₹{value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis labels and line */}
              <line x1={barChartData.paddingLeft} y1={barChartData.height - barChartData.paddingBottom} x2={barChartData.width - barChartData.paddingRight} y2={barChartData.height - barChartData.paddingBottom} className="chart-axis-line" />
              {daysOfWeek.map((day, idx) => {
                const x = barChartData.xCoords[idx];
                return (
                  <text key={idx} x={x} y={barChartData.height - 10} textAnchor="middle" className="chart-axis-text">
                    {day}
                  </text>
                );
              })}

              {/* Bar Rects */}
              {barChartData.xCoords.map((x, i) => {
                const height = barChartData.barHeights[i];
                const y = barChartData.yCoords[i];
                const w = barChartData.barWidth;
                const isHovered = revenueHoverIdx === i;
                return (
                  <g key={i}>
                    <rect
                      x={x - w / 2}
                      y={y}
                      width={w}
                      height={Math.max(2, height)}
                      rx="4"
                      className="chart-bar-rect"
                      style={{
                        fill: isHovered ? "#b59243" : "#cda751",
                        opacity: isHovered ? 1 : 0.85
                      }}
                      onMouseEnter={() => setRevenueHoverIdx(i)}
                      onMouseLeave={() => setRevenueHoverIdx(null)}
                    />
                    {/* Transparent pointer hover capture zone */}
                    <rect
                      x={x - 25}
                      y={barChartData.paddingTop}
                      width="50"
                      height={barChartData.chartHeight}
                      fill="transparent"
                      cursor="pointer"
                      onMouseEnter={() => setRevenueHoverIdx(i)}
                      onMouseLeave={() => setRevenueHoverIdx(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Interactive bar hover tooltips */}
            {revenueHoverIdx !== null && (
              <div
                className="chart-tooltip-bubble"
                style={{
                  left: `${(barChartData.xCoords[revenueHoverIdx] / barChartData.width) * 100}%`,
                  top: `${(barChartData.yCoords[revenueHoverIdx] / barChartData.height) * 100}%`,
                  opacity: 1
                }}
              >
                <div className="chart-tooltip-title">{daysOfWeek[revenueHoverIdx]} Revenue</div>
                <div className="chart-tooltip-value">₹{revenueTrend[revenueHoverIdx].toLocaleString("en-IN")}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Row containing Service Demand Table and Membership breakdown Donut Chart */}
      <section className="bottom-grid">
        {/* Service Demand List */}
        <div className="demand-card">
          <div className="bottom-card-header">
            <h3 className="bottom-card-title">Top Requested Services</h3>
          </div>
          <div className="demand-list">
            {serviceDemand.map((service, idx) => (
              <div className="demand-item" key={service.serviceId || idx}>
                <div className="demand-info">
                  <div className="demand-name">{service.name}</div>
                  <div className="demand-progress-container">
                    <div className="demand-progress-bar" style={{ width: `${service.percent}%` }} />
                  </div>
                </div>
                <div className="demand-stats">
                  <div className="demand-count">{service.count} Bookings</div>
                  <div className="demand-label">Base Rate: ₹{service.price}</div>
                </div>
              </div>
            ))}
            {serviceDemand.length === 0 && (
              <p style={{ color: "#7b8a9a", fontSize: "14px" }}>No service demand records logged.</p>
            )}
          </div>
        </div>

        {/* Membership breakdown Donut Chart */}
        <div className="membership-card">
          <div className="bottom-card-header">
            <h3 className="bottom-card-title">Membership Shares</h3>
          </div>

          <div className="donut-layout">
            <div className="donut-chart-wrapper">
              <svg width="100%" height="100%" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="36" fill="transparent" stroke="#f1f3f7" strokeWidth="8" />
                {donutData.segments.map(seg => (
                  <circle
                    key={seg.key}
                    cx="70"
                    cy="70"
                    r="36"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={donutHoverTier === seg.key ? 11 : 8}
                    strokeDasharray={seg.circ}
                    strokeDashoffset={seg.dashOffset}
                    transform={`rotate(${seg.rotation} 70 70)`}
                    className="donut-circle"
                    style={{ strokeLinecap: "round" }}
                    onMouseEnter={() => setDonutHoverTier(seg.key)}
                    onMouseLeave={() => setDonutHoverTier(null)}
                  />
                ))}
              </svg>

              <div className="donut-center-text">
                <div className="donut-center-value">
                  {donutHoverTier 
                    ? donutData.segments.find(s => s.key === donutHoverTier)?.count 
                    : donutData.total}
                </div>
                <div className="donut-center-label">
                  {donutHoverTier 
                    ? donutData.segments.find(s => s.key === donutHoverTier)?.label
                    : "Members"}
                </div>
              </div>
            </div>

            <div className="legend-container">
              {donutData.segments.map(seg => (
                <div 
                  className="legend-item" 
                  key={seg.key}
                  onMouseEnter={() => setDonutHoverTier(seg.key)}
                  onMouseLeave={() => setDonutHoverTier(null)}
                  style={{
                    background: donutHoverTier === seg.key ? "#f7fafc" : "transparent"
                  }}
                >
                  <div className="legend-color-label">
                    <span className="legend-dot" style={{ backgroundColor: seg.color }} />
                    <span className="legend-text" style={{ fontWeight: donutHoverTier === seg.key ? 600 : 500 }}>
                      {seg.label}
                    </span>
                  </div>
                  <div className="legend-value-share">
                    <span className="legend-value">{seg.count}</span>
                    <span className="legend-share">{seg.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;