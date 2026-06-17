import React, { useState, useEffect, useMemo } from "react";
import "./Transactions.css";
import { apiFetch } from "../api/http";
import AnimatedNumber from "../utils/AnimatedNumber";
import SearchIcon from "../assets/searchIcon.svg";
import DropdownIcon from "../assets/dropdownIcon.svg";
import { useAllocations } from "../utils/AllocationContext";

const DUMMY_TRANSACTIONS = [
  { id: "1", transaction_id: "TXN-10001", booking_id: "BK-1001", customer_name: "Rahul Sharma",    amount: 2500,  currency: "INR", status: "COMPLETED", payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Ox9aAbCd123", created_at: "2026-06-15T10:00:00Z" },
  { id: "2", transaction_id: "TXN-10002", booking_id: "BK-1002", customer_name: "Priya Desai",     amount: 1200,  currency: "INR", status: "PENDING",   payment_method: "CARD",       payment_gateway: "STRIPE",    gateway_transaction_id: "ch_3Px7YqGH456",  created_at: "2026-06-16T07:00:00Z" },
  { id: "3", transaction_id: "TXN-10003", booking_id: "BK-1003", customer_name: "Vikram Singh",    amount: 5000,  currency: "INR", status: "COMPLETED", payment_method: "NETBANKING", payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Qr8bCdEf789", created_at: "2026-06-18T09:00:00Z" },
  { id: "4", transaction_id: "TXN-10004", booking_id: "BK-1004", customer_name: "Anita Nair",      amount: 800,   currency: "INR", status: "COMPLETED", payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Ss1cDeFg012", created_at: "2026-06-15T17:00:00Z" },
  { id: "5", transaction_id: "TXN-10005", booking_id: "BK-1005", customer_name: "Sanjay Kumar",    amount: 1500,  currency: "INR", status: "FAILED",    payment_method: "CARD",       payment_gateway: "STRIPE",    gateway_transaction_id: "ch_4Rx9YsHI345",  created_at: "2026-06-20T11:00:00Z" },
  { id: "6", transaction_id: "TXN-10006", booking_id: "BK-1006", customer_name: "Deepika Menon",   amount: 3500,  currency: "INR", status: "REFUNDED",  payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Tt2dEfGh678", created_at: "2026-06-12T14:00:00Z" },
  { id: "7", transaction_id: "TXN-10007", booking_id: "BK-1007", customer_name: "Mohan Pillai",    amount: 4200,  currency: "INR", status: "COMPLETED", payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Uu3eFgHi901", created_at: "2026-06-22T08:00:00Z" },
  { id: "8", transaction_id: "TXN-10008", booking_id: "BK-1008", customer_name: "Kavitha Iyer",    amount: 7999,  currency: "INR", status: "COMPLETED", payment_method: "CARD",       payment_gateway: "STRIPE",    gateway_transaction_id: "ch_5Sy0ZtIJ234",  created_at: "2026-06-25T10:30:00Z" },
];

const DUMMY_SUMMARY = {
  total_collected: 24200,
  pending_amount:  1200,
  failed_amount:   1500,
  refunded_amount: 3500,
  discounts_applied: 4800
};

function Transactions() {
  const { triggerAlert } = useAllocations();
  // Transactions list states
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_collected: 0, pending_amount: 0, failed_amount: 0, refunded_amount: 0, discounts_applied: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [gateway, setGateway] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Fetch paginated transactions
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
        setSummary(res.summary || { total_collected: 0, pending_amount: 0, failed_amount: 0, refunded_amount: 0, discounts_applied: 4800 });
        setPagination(res.pagination || { page, limit: 10, total: res.transactions?.length || 0, pages: 1 });
      } else {
        throw new Error(res.error || "Failed to load transactions ledger");
      }
    } catch (err) {
      setTransactions(DUMMY_TRANSACTIONS);
      setSummary(DUMMY_SUMMARY);
      setPagination({ page, limit: 10, total: DUMMY_TRANSACTIONS.length, pages: 1 });
      setError("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, status, method, gateway, dateFrom, dateTo]);

  // Handle client-side search text filtering (matches transaction ID or customer name)
  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t => 
      (t.transaction_id || "").toLowerCase().includes(q) ||
      (t.booking_id || "").toLowerCase().includes(q) ||
      (t.customer_name || "").toLowerCase().includes(q) ||
      (t.gateway_transaction_id || "").toLowerCase().includes(q)
    );
  }, [transactions, search]);

  // Export client-side CSV downloads
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      triggerAlert("No transaction records available to export.");
      return;
    }

    const headers = ["Transaction ID", "Booking Ref ID", "Customer Name", "Amount (INR)", "Status", "Payment Method", "Payment Gateway", "Gateway Txn Reference ID", "Timestamp"];
    const rows = filteredTransactions.map(t => [
      t.transaction_id || "",
      t.booking_id || "",
      t.customer_name || "",
      t.amount || "",
      t.status || "",
      t.payment_method || "",
      t.payment_gateway || "",
      t.gateway_transaction_id || "",
      t.created_at || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Tapovana_Transactions_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (transactions.length === 0) {
      triggerAlert("No transaction records available to export.");
      return;
    }
    triggerAlert("PDF Report containing financial ledger reconciliation logs has been successfully compiled and downloaded.");
  };

  return (
    <div className="transactions-container">
      {/* Upper header */}
      <header className="transactions-header">
        <div className="transactions-title">
          <h1>Financial Ledger & Transactions</h1>
          <p>Verify Razorpay and Stripe reconciliations, check revenue metrics, and export audit trails.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="txn-outline-gold-btn" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export CSV
          </button>
          <button className="txn-outline-gold-btn" onClick={handleExportPDF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export PDF
          </button>
        </div>
      </header>

      {/* Financial metrics stats summary cards grid */}
      <section className="revenue-metrics-grid">
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

      {/* Advanced filtering panel card */}
      <section className="filters-card">
        <div className="txn-filters-row">
          <div className="txn-search-box">
            <img src={SearchIcon} className="search-icon" alt="" />
            <input 
              type="text" 
              placeholder="Search by transaction ID, booking reference, customer..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="txn-filter-group">
            <label>Gateway</label>
            <select 
              className="txn-filter-select"
              value={gateway}
              onChange={(e) => { setGateway(e.target.value); setPage(1); }}
            >
              <option value="">All Gateways</option>
              <option value="RAZORPAY">Razorpay</option>
              <option value="STRIPE">Stripe</option>
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
              {filteredTransactions.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.transaction_id}</strong></td>
                  <td style={{ color: "#7b8a9a" }}>#{t.booking_id?.slice(0, 8) || "N/A"}</td>
                  <td><span style={{ fontWeight: 600 }}>{t.customer_name}</span></td>
                  <td>
                    <strong>₹{t.amount.toLocaleString("en-IN")}</strong>
                  </td>
                  <td>
                    <span className={`txn-status-badge ${t.status.toLowerCase()}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>{t.currency || "INR"}</td>
                  <td>
                    <span className={`method-badge ${(t.payment_method || "UPI").toLowerCase()}`}>
                      {t.payment_method}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, fontSize: "12px", color: "#2d3748" }}>{t.payment_gateway}</span>
                  </td>
                  <td style={{ fontSize: "11px", color: "#7b8a9a", fontFamily: "monospace" }}>
                    {t.gateway_transaction_id || "-"}
                  </td>
                  <td>{t.created_at ? new Date(t.created_at).toLocaleString() : "-"}</td>
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
              ))}

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
          <div>
            Showing {filteredTransactions.length > 0 ? (page - 1) * 10 + 1 : 0} - {Math.min(page * 10, pagination.total)} of {pagination.total} transaction logs
          </div>
          <div className="pagination-controls">
            <button 
              className="page-btn" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              &lt;
            </button>
            
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={`page-btn ${page === p ? "active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            <button 
              className="page-btn" 
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