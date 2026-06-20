import React, { useState, useEffect, useCallback } from "react";
import "./Certificates.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Certificates() {
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({ total: 0, uniqueWorkshops: 0 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Custom Alert Notification
  const [alert, setAlert] = useState({ show: false, message: "", isSuccess: true });
  const triggerAlert = (message, isSuccess = true) => {
    setAlert({ show: true, message, isSuccess });
    setTimeout(() => setAlert({ show: false, message: "", isSuccess: true }), 4000);
  };

  const getHeaders = () => {
    const token = sessionStorage.getItem("access_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  // Fetch certificates list
  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/certificates?search=${encodeURIComponent(search)}&page=${page}&limit=15`,
        { headers: getHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setCertificates(data.certificates || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
        }
      } else {
        triggerAlert(data.message || "Failed to load certificates.", false);
      }
    } catch (err) {
      console.error("Error fetching certificates:", err);
      triggerAlert("Network error fetching certificates.", false);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/certificates/stats`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (data.success && data.stats) {
        setStats({
          total: data.stats.total || 0,
          uniqueWorkshops: data.stats.uniqueWorkshops || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCertificates();
    }, 4000 / 10); // 400ms debounce
    return () => clearTimeout(delayDebounce);
  }, [search, page, fetchCertificates]);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // Action: Resend Certificate Email
  const handleResendEmail = async (certificateId) => {
    setActionLoadingId({ id: certificateId, type: "resend" });
    try {
      const response = await fetch(`${API_BASE}/api/certificates/resend/${certificateId}`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert("Certificate email resent successfully!");
      } else {
        triggerAlert(data.message || "Failed to resend email.", false);
      }
    } catch (err) {
      console.error("Resend error:", err);
      triggerAlert("Network error resending email.", false);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Regenerate Certificates for a Workshop
  const handleRegenerate = async (workshopId) => {
    setActionLoadingId({ id: workshopId, type: "regenerate" });
    try {
      const response = await fetch(`${API_BASE}/api/certificates/generate/${workshopId}`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        triggerAlert(data.message || "Certificates regenerated successfully.");
        fetchCertificates();
        fetchStats();
      } else {
        triggerAlert(data.message || "Failed to regenerate certificates.", false);
      }
    } catch (err) {
      console.error("Regenerate error:", err);
      triggerAlert("Network error regenerating certificates.", false);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Direct PDF Download trigger
  const handleDownload = (certificateId) => {
    // Open direct download link in a hidden iframe to force download instead of changing page
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = `${API_BASE}/api/certificates/download/${certificateId}`;
    document.body.appendChild(iframe);
    setTimeout(() => document.body.removeChild(iframe), 2000);
    triggerAlert("Starting certificate download...");
  };

  return (
    <div className="certs-container">
      {/* Alert Notification banner */}
      {alert.show && (
        <div className={`certs-alert ${alert.isSuccess ? "alert-success" : "alert-error"}`}>
          <div className="alert-content">
            <span className="alert-icon">{alert.isSuccess ? "✓" : "✗"}</span>
            <span className="alert-message">{alert.message}</span>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="certs-header-section">
        <div>
          <h1 className="certs-title">Certificates Management</h1>
          <p className="certs-subtitle">View, download, and manage workshop completion certifications</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="certs-stats-grid">
        <div className="certs-stat-card">
          <div className="stat-icon-wrapper gold-theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Generated</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="certs-stat-card">
          <div className="stat-icon-wrapper green-theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-label">Workshops Certified</span>
            <span className="stat-value">{stats.uniqueWorkshops}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="certs-controls-card">
        <div className="certs-search-wrapper">
          <svg className="certs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="certs-search-input"
            placeholder="Search by participant name, workshop name, or certificate ID..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Main List Table */}
      <div className="certs-table-card">
        {loading && certificates.length === 0 ? (
          <div className="certs-loading-state">
            <div className="certs-spinner"></div>
            <p>Loading certificates list...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="certs-empty-state">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <h3>No certificates found</h3>
            <p>Try refining your search query or verify if workshops have been marked as Completed.</p>
          </div>
        ) : (
          <div className="certs-table-wrapper">
            <table className="certs-table">
              <thead>
                <tr>
                  <th>Certificate ID</th>
                  <th>Participant</th>
                  <th>Workshop</th>
                  <th>Issued Date</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => {
                  const isResending = actionLoadingId?.id === cert.certificate_id && actionLoadingId?.type === "resend";
                  const isRegenerating = actionLoadingId?.id === cert.workshop_id && actionLoadingId?.type === "regenerate";
                  const formattedDate = new Date(cert.generated_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <tr key={cert.id}>
                      <td className="cert-id-cell">{cert.certificate_id}</td>
                      <td>
                        <div className="cert-user-info">
                          <span className="user-name">{cert.participant_name}</span>
                          <span className="user-email">{cert.participant_email}</span>
                        </div>
                      </td>
                      <td className="cert-workshop-cell">{cert.workshop_name}</td>
                      <td>{formattedDate}</td>
                      <td>
                        <div className="cert-actions">
                          <button
                            className="cert-btn btn-download"
                            title="Download Certificate"
                            onClick={() => handleDownload(cert.certificate_id)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </button>
                          
                          <button
                            className="cert-btn btn-resend"
                            title="Resend Certificate Email"
                            onClick={() => handleResendEmail(cert.certificate_id)}
                            disabled={isResending}
                          >
                            {isResending ? (
                              <div className="small-spinner"></div>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                              </svg>
                            )}
                            Resend Email
                          </button>

                          <button
                            className="cert-btn btn-regenerate"
                            title="Regenerate Certificate PDF"
                            onClick={() => handleRegenerate(cert.workshop_id)}
                            disabled={isRegenerating}
                          >
                            {isRegenerating ? (
                              <div className="small-spinner"></div>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                              </svg>
                            )}
                            Regenerate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="certs-pagination">
          <button
            className="pagination-btn"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
