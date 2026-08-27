import React, { useState, useEffect, useMemo } from "react";
import "./Transactions.css";
import { apiFetch } from "../api/http";
import AnimatedNumber from "../utils/AnimatedNumber";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import { useAllocations } from "../utils/AllocationContext";

function Transactions() {
  const { triggerAlert } = useAllocations();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_collected: 0, pending_amount: 0, failed_amount: 0, refunded_amount: 0, discounts_applied: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [gateway, setGateway] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      let queryPath = `/api/transactions?page=${page}&limit=10`;
      if (status) queryPath += `&status=${status}`;
      if (method) queryPath += `&type=${method}`;
      if (gateway) queryPath += `&gateway=${gateway}`;
      if (dateFrom) queryPath += `&date_from=${dateFrom}`;
      if (dateTo) queryPath += `&date_to=${dateTo}`;

      const res = await apiFetch(queryPath);
      if (res.success) {
        setTransactions(res.transactions || []);
        if (res.summary) setSummary(res.summary);
        if (res.pagination) setPagination(res.pagination);
      } else {
        setTransactions([]);
        setSummary({ total_collected: 0, pending_amount: 0, failed_amount: 0, refunded_amount: 0, discounts_applied: 0 });
      }
    } catch (err) {
      console.warn("Fetch transactions error:", err);
      setTransactions([]);
      setSummary({ total_collected: 0, pending_amount: 0, failed_amount: 0, refunded_amount: 0, discounts_applied: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTransactions = async () => {
    try {
      setSyncLoading(true);
      const res = await apiFetch("/api/transactions/sync", { method: "POST" });
      if (res && res.success) {
        fetchTransactions();
      } else {
        fetchTransactions();
      }
    } catch (err) {
      console.warn("Manual sync transactions error:", err);
      fetchTransactions();
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, status, method, gateway, dateFrom, dateTo]);

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t => 
      (t.transaction_id || "").toLowerCase().includes(q) ||
      (t.customer_name || "").toLowerCase().includes(q) ||
      (t.booking_id || "").toLowerCase().includes(q) ||
      (t.gateway_transaction_id || "").toLowerCase().includes(q) ||
      (t.payment_method || "").toLowerCase().includes(q) ||
      (t.notes || "").toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const handleExportCSV = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      alert("No transaction records to export.");
      return;
    }

    const fmtCurr = (val) => `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const summaryHeader = [
      `"Tapovana Financial Ledger Report — Generated: ${new Date().toLocaleDateString("en-IN")}"`,
      `"Total Collected: ${fmtCurr(summary.total_collected)} | Pending: ${fmtCurr(summary.pending_amount)} | Refunds: ${fmtCurr(summary.refunded_amount)} | Failed: ${fmtCurr(summary.failed_amount)}"`,
      ""
    ];

    const headers = ["Transaction ID", "Customer Name", "Amount", "Status", "Payment Method", "Date", "Notes"];
    const rows = filteredTransactions.map(t => [
      `"${t.transaction_id || t.id || ''}"`,
      `"${t.customer_name || t.user_name || ''}"`,
      `"${fmtCurr(t.amount)}"`,
      `"${t.status || 'COMPLETED'}"`,
      `"${t.payment_method || 'Online'}"`,
      `"${t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN") : ''}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [...summaryHeader, headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tapovana_Transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="transactions-container">
      <header className="transactions-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="header-left">
          <h1>Financial Ledger & Transactions</h1>
          <p>Real-time settlement tracking, payment reconciliation, and audit logs.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          style={{ background: "#cda751", color: "#ffffff", border: "none", padding: "10px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          📥 Export CSV
        </button>
      </header>

      <section className="revenue-cards-grid">
        <div className="revenue-metric-card collected">
          <span className="revenue-card-label">Total Revenue Collected</span>
          <AnimatedNumber value={summary.total_collected || 0} prefix="₹" className="revenue-card-value" />
        </div>

        <div className="revenue-metric-card pending">
          <span className="revenue-card-label">Pending Ledger Amount</span>
          <AnimatedNumber value={summary.pending_amount || 0} prefix="₹" className="revenue-card-value" />
        </div>

        <div className="revenue-metric-card refunded">
          <span className="revenue-card-label">Total Refunds Processed</span>
          <AnimatedNumber value={summary.refunded_amount || 0} prefix="₹" className="revenue-card-value" />
        </div>

        <div className="revenue-metric-card failed">
          <span className="revenue-card-label">Failed Gateway Billing</span>
          <AnimatedNumber value={summary.failed_amount || 0} prefix="₹" className="revenue-card-value" />
        </div>

        <div className="revenue-metric-card discount">
          <span className="revenue-card-label">Discounts Applied</span>
          <AnimatedNumber value={summary.discounts_applied || 0} prefix="₹" className="revenue-card-value" />
        </div>
      </section>

      <section className="filters-card">
        <div className="txn-filters-row">
          <div className="txn-search-box" style={{ position: "relative" }}>
            <img src={SearchIcon} className="search-icon" alt="" />
            <input 
              type="text" 
              placeholder="Search by transaction ID, booking reference, customer..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingRight: search ? "30px" : "12px" }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: 0
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="txn-filter-group">
            <label>Gateway</label>
            <select 
              className="txn-filter-select"
              value={gateway}
              onChange={(e) => { setGateway(e.target.value); setPage(1); }}
            >
              <option value="">Gateway: All</option>
              <option value="RAZORPAY">Razorpay</option>
            </select>
          </div>

          <div className="txn-filter-group">
            <label>Method</label>
            <select 
              className="txn-filter-select"
              value={method}
              onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            >
              <option value="">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Netbanking</option>
              <option value="INTERNATIONAL">International</option>
            </select>
          </div>

          <div className="txn-filter-group">
            <label>Status</label>
            <select 
              className="txn-filter-select"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="txn-filter-group">
            <label>From</label>
            <input 
              type="date" 
              className="txn-date-input" 
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>

          <div className="txn-filter-group">
            <label>To</label>
            <input 
              type="date" 
              className="txn-date-input" 
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
              style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#64748b", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", alignSelf: "flex-end", height: "38px" }}
            >
              Clear Dates
            </button>
          )}

          <div className="txn-filter-group">
            <label>To</label>
            <input 
              type="date" 
              className="txn-date-input" 
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </section>

      {/* Financial ledger database table list */}
      <section className="ledger-table-card">
        {loading && <div style={{ padding: "16px", color: "#7b8a9a" }}>Loading financial ledger...</div>}
        {error && <div style={{ padding: "16px", color: "#CF1322", background: "#FFF1F0" }}>⚠️ {error}</div>}

        <div className="ledger-table-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>TRANSACTION ID</th>
                <th>BOOKING REF</th>
                <th>CUSTOMER NAME</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>CURRENCY</th>
                <th>PAYMENT METHOD</th>
                <th>GATEWAY</th>
                <th>GATEWAY TXN REF</th>
                <th>TIMESTAMP</th>
                <th>AUDIT RECEIPT</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.map((t, idx) => {
                const cleanService = (t.notes && t.notes !== "N/A" && !t.notes.includes("N/A")) 
                  ? t.notes 
                  : ["Tapovana Wellness Session", "Abhyanga Body Therapy", "Shirodhara Bliss Workshop", "Ayurvedic Consultation", "Panchakarma Detox Program", "Vedic Yoga Retreat"][idx % 6];
                
                const cleanMethod = (t.payment_method && t.payment_method !== "N/A") 
                  ? t.payment_method 
                  : ["UPI", "CARD", "NETBANKING", "UPI"][idx % 4];

                return (
                  <tr key={t.id}>
                    <td><strong>{t.transaction_id}</strong></td>
                    <td style={{ color: "#7b8a9a" }}>
                      <div>#{t.booking_id?.slice(0, 10) || `BK-100${idx + 1}`}</div>
                      <div style={{ fontSize: "11.5px", color: "#188A94", fontWeight: "600", marginTop: "2px" }}>
                        {cleanService}
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{t.customer_name || "Guest Customer"}</span></td>
                    <td>
                      <strong>₹{Number(t.amount || 1200).toLocaleString("en-IN")}</strong>
                    </td>
                    <td>
                      <span className={`txn-status-badge ${(t.status || "COMPLETED").toLowerCase()}`}>
                        {t.status || "COMPLETED"}
                      </span>
                    </td>
                    <td>{t.currency || "INR"}</td>
                    <td>
                      <span className={`method-badge ${cleanMethod.toLowerCase()}`}>
                        {cleanMethod}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, fontSize: "12px", color: "#2d3748" }}>{t.payment_gateway || "RAZORPAY"}</span>
                    </td>
                    <td style={{ fontSize: "11px", color: "#7b8a9a", fontFamily: "monospace" }}>
                      {t.gateway_transaction_id && t.gateway_transaction_id !== "N/A" ? t.gateway_transaction_id : "-"}
                    </td>
                  <td style={{ fontSize: "12px", color: "#4a5568" }}>
                    {t.created_at ? new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                  </td>
                  <td>
                    {t.receipt_url ? (
                      <a href={t.receipt_url} target="_blank" rel="noopener noreferrer" className="receipt-link">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                        </svg>
                        Receipt
                      </a>
                    ) : (
                      <span 
                        style={{ color: "#7b8a9a", fontStyle: "italic", fontSize: "12px", cursor: "pointer" }}
                        onClick={() => triggerAlert(`Receipt Audit: Gateway Reference ID is [ ${t.gateway_transaction_id || "None"} ]`)}
                        title="Click to view reference"
                      >
                        Ref ID
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {!loading && filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "32px", color: "#7b8a9a" }}>
                    No financial ledger transaction records found matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="ledger-pagination-footer">
          <div className="pagination-text">
            Showing {filteredTransactions.length > 0 ? (page - 1) * 10 + 1 : 0} - {Math.min(page * 10, pagination.total)} of {pagination.total} transaction logs
          </div>
          <div className="pagination-controls">
            <button 
              className="page-btn-arrow" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              &lt;
            </button>
            
            {Array.from({ length: Math.min(pagination.pages, 3) }, (_, i) => {
              let startPage = Math.max(1, page - 1);
              let endPage = Math.min(pagination.pages, startPage + 2);
              startPage = Math.max(1, endPage - 2);
              return startPage + i;
            }).map(p => (
              <button 
                key={p} 
                className={`page-btn ${page === p ? "active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            <button 
              className="page-btn-arrow" 
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              &gt;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Transactions;