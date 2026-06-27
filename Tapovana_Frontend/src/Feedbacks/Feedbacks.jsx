import React, { useState, useMemo, useEffect } from 'react';
import './Feedbacks.css';
import ActionIcon from '../assets/Button.svg';

// Initial dummy feedbacks
const INITIAL_FEEDBACKS = [
  {
    id: 1,
    userName: 'John Doe',
    email: 'john@example.com',
    moduleType: 'Blog',
    title: 'Mindfulness in Daily Life',
    feedbackContent: 'Great insights, very useful.',
    rating: 4,
    dateSubmitted: '2026-06-15',
    status: 'Pending'
  },
  {
    id: 2,
    userName: 'Sarah Lee',
    email: 'sarah@example.com',
    moduleType: 'Workshop',
    title: 'Breathing Techniques',
    feedbackContent: 'Instructor was clear and helpful.',
    rating: 5,
    dateSubmitted: '2026-06-16',
    status: 'Reviewed'
  },
  {
    id: 3,
    userName: 'Raj Kumar',
    email: 'raj@example.com',
    moduleType: 'Service',
    title: 'Ayurvedic Consultation',
    feedbackContent: 'Doctor explained everything well.',
    rating: 4,
    dateSubmitted: '2026-06-17',
    status: 'Pending'
  },
  {
    id: 4,
    userName: 'Anita Rao',
    email: 'anita@example.com',
    moduleType: 'Vedic Life',
    title: 'Rejuvenation Retreat',
    feedbackContent: 'Loved the holistic approach.',
    rating: 5,
    dateSubmitted: '2026-06-18',
    status: 'Archived'
  }
];

export default function Feedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  
  // Filter states
  const [moduleFilter, setModuleFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  
  // Notification toast state
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [toastTimeoutId, setToastTimeoutId] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch('https://tapovana.onrender.com/api/reviews', {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (data.success && Array.isArray(data.reviews)) {
          const mappedFeedbacks = data.reviews.map(item => {
            // Normalize moduleType capitalization
            let modType = item.module_type || 'Blog';
            if (modType.toLowerCase() === 'vedic life' || modType.toLowerCase() === 'vediclife') {
              modType = 'Vedic Life';
            } else {
              modType = modType.charAt(0).toUpperCase() + modType.slice(1).toLowerCase();
            }

            return {
              id: item.id,
              userName: item.username || 'Anonymous',
              email: item.email || 'N/A',
              moduleType: modType,
              title: item.title || 'N/A',
              feedbackContent: item.feedback || '',
              rating: item.rating || 5,
              dateSubmitted: item.date ? item.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
              status: item.status || 'Pending'
            };
          });
          setFeedbacks(mappedFeedbacks);
        } else {
          setFeedbacks(INITIAL_FEEDBACKS);
        }
      } catch (err) {
        console.error('Error fetching feedbacks, using INITIAL_FEEDBACKS fallback:', err);
        setFeedbacks(INITIAL_FEEDBACKS);
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    // Override page-content overflow-y so layout fits page height and scrolls inside table
    const parentPageContent = document.querySelector('.page-content');
    if (parentPageContent) {
      parentPageContent.style.overflowY = 'hidden';
      parentPageContent.style.height = '100%';
      parentPageContent.style.display = 'flex';
      parentPageContent.style.flexDirection = 'column';
    }

    const handleCloseActionMenu = () => setOpenActionMenu(null);
    document.addEventListener('click', handleCloseActionMenu);

    return () => {
      if (parentPageContent) {
        parentPageContent.style.overflowY = '';
        parentPageContent.style.height = '';
        parentPageContent.style.display = '';
        parentPageContent.style.flexDirection = '';
      }
      document.removeEventListener('click', handleCloseActionMenu);
    };
  }, []);

  // Helper to trigger plain-text gold notifications
  const showToast = (message) => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
    }
    setToast({ visible: true, message });
    const id = setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3500);
    setToastTimeoutId(id);
  };

  // Status Badge Class mapper
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'fb-status-badge fb-status-pending';
      case 'reviewed': return 'fb-status-badge fb-status-reviewed';
      case 'archived': return 'fb-status-badge fb-status-archived';
      default: return 'fb-status-badge';
    }
  };

  // Convert number to stars
  const renderStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  // Actions
  const handleView = (feedback) => {
    setSelectedFeedback(feedback);
  };

  const handleArchive = (id) => {
    setFeedbacks(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'Archived' };
      }
      return item;
    }));
    
    // Update active modal status if it matches
    if (selectedFeedback && selectedFeedback.id === id) {
      setSelectedFeedback(prev => ({ ...prev, status: 'Archived' }));
    }

    showToast('Feedback moved to archived list.');
  };

  const handleMarkReviewed = (id) => {
    setFeedbacks(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'Reviewed' };
      }
      return item;
    }));

    // Update active modal status if it matches
    if (selectedFeedback && selectedFeedback.id === id) {
      setSelectedFeedback(prev => ({ ...prev, status: 'Reviewed' }));
    }

    showToast('Feedback marked as Reviewed.');
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete feedback from ${name}?`)) {
      setFeedbacks(prev => prev.filter(item => item.id !== id));
      if (selectedFeedback && selectedFeedback.id === id) {
        setSelectedFeedback(null);
      }
      showToast('Feedback permanently deleted.');
    }
  };

  // Filter & Search Logic
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(item => {
      // 1. Module Type filter
      if (moduleFilter !== 'All') {
        const itemModule = item.moduleType.toLowerCase().replace(/\s+/g, '');
        const targetModule = moduleFilter.toLowerCase().replace(/\s+/g, '');
        if (itemModule !== targetModule) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'All' && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // 3. Date range filter
      if (dateFrom && item.dateSubmitted < dateFrom) {
        return false;
      }
      if (dateTo && item.dateSubmitted > dateTo) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesUser = item.userName.toLowerCase().includes(query);
        const matchesEmail = item.email.toLowerCase().includes(query);
        const matchesContent = item.feedbackContent.toLowerCase().includes(query);
        const matchesTitle = item.title.toLowerCase().includes(query);
        
        if (!matchesUser && !matchesEmail && !matchesContent && !matchesTitle) {
          return false;
        }
      }

      return true;
    });
  }, [feedbacks, moduleFilter, statusFilter, dateFrom, dateTo, searchQuery]);

  return (
    <div className="fb-catalog">
      
      {/* Toast Notification */}
      {toast.visible && (
        <div className="fb-notification-toast">
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sticky top section: hero + filters */}
      <div className="fb-top">

        {/* Page Hero - matches Service page hero */}
        <div className="fb-hero-section">
          <div className="fb-hero-left">
            <h1>Feedbacks</h1>
            <p>Manage feedback for Blogs, Workshops, Services, and Vedic Life Programs</p>
          </div>
        </div>

        {/* Filters bar - single row like Services page */}
        <div className="fb-filters-section">
          <div className="fb-filters-inner">
            <div className="fb-controls-group">

              {/* Status tabs */}
              <div className="fb-tabs-group">
                {['All', 'Pending', 'Reviewed', 'Archived'].map(status => (
                  <button
                    key={status}
                    className={`fb-tab-btn ${statusFilter === status ? 'active' : ''}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="fb-filter-divider" />

              {/* Module dropdown */}
              <select
                className="fb-filter-select"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="All">All Modules</option>
                <option value="Blog">Blogs</option>
                <option value="Workshop">Workshops</option>
                <option value="Service">Services</option>
                <option value="Vedic Life">Vedic Life</option>
              </select>

              {/* Date From */}
              <input
                type="date"
                className="fb-filter-date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="From Date"
              />

              {/* Date To */}
              <input
                type="date"
                className="fb-filter-date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="To Date"
              />

              <div className="fb-filter-divider" />

              {/* Search */}
              <div className="fb-search-container">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable table area */}
      <div className="fb-table-scroll-area">
        <div className="fb-table-container">
          <table className="fb-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email</th>
                <th>Module Type</th>
                <th>Title</th>
                <th>Feedback</th>
                <th>Rating</th>
                <th>Date</th>

                <th className="th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#cda751', fontWeight: 600 }}>
                    Loading feedbacks...
                  </td>
                </tr>
              ) : filteredFeedbacks.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                    No feedbacks found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFeedbacks.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.userName}</td>
                    <td>{item.email}</td>
                    <td>
                      <span className="fb-module-tag">{item.moduleType}</span>
                    </td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.feedbackContent}
                    </td>
                    <td>
                      <span className="fb-rating-stars">{renderStars(item.rating)}</span>
                    </td>
                    <td>{item.dateSubmitted}</td>

                    <td className="td-actions" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img
                          src={ActionIcon}
                          className="action-icon"
                          alt="Actions"
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenu(openActionMenu === item.id ? null : item.id);
                          }}
                        />
                        {openActionMenu === item.id && (
                          <div style={{
                            position: "absolute",
                            right: 0,
                            top: "100%",
                            zIndex: 1000,
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            minWidth: "140px",
                            overflow: "hidden",
                            textAlign: "left"
                          }}>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(item);
                                setOpenActionMenu(null);
                              }}
                              style={{
                                padding: "10px 16px",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: "#2d3748",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              View
                            </div>
                            {item.status !== 'Archived' && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchive(item.id);
                                  setOpenActionMenu(null);
                                }}
                                style={{
                                  padding: "10px 16px",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  color: "#2d3748",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px"
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f7fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                Archive
                              </div>
                            )}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenu(null);
                                handleDelete(item.id, item.userName);
                              }}
                              style={{
                                padding: "10px 16px",
                                cursor: "pointer",
                                fontSize: "14px",
                                color: "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                              Delete
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback Detail View Modal */}
      {selectedFeedback && (
        <div className="fb-modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="fb-modal-header">
              <h2>Feedback Details</h2>
              <button className="fb-modal-close-btn" onClick={() => setSelectedFeedback(null)}>
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="fb-modal-body">
              
              <div className="fb-modal-grid">
                
                <div className="fb-modal-field">
                  <span className="fb-modal-label">User Name</span>
                  <span className="fb-modal-value">{selectedFeedback.userName}</span>
                </div>

                <div className="fb-modal-field">
                  <span className="fb-modal-label">Email Address</span>
                  <span className="fb-modal-value">{selectedFeedback.email}</span>
                </div>

                <div className="fb-modal-field">
                  <span className="fb-modal-label">Module Type</span>
                  <span className="fb-modal-value">{selectedFeedback.moduleType}</span>
                </div>

                <div className="fb-modal-field">
                  <span className="fb-modal-label">Related Title</span>
                  <span className="fb-modal-value">{selectedFeedback.title}</span>
                </div>

                <div className="fb-modal-field">
                  <span className="fb-modal-label">Rating</span>
                  <span className="fb-rating-stars" style={{ fontSize: '18px' }}>
                    {renderStars(selectedFeedback.rating)}
                  </span>
                </div>

                <div className="fb-modal-field">
                  <span className="fb-modal-label">Date Submitted</span>
                  <span className="fb-modal-value">{selectedFeedback.dateSubmitted}</span>
                </div>

                <div className="fb-modal-field" style={{ gridColumn: 'span 2' }}>
                  <span className="fb-modal-label">Current Status</span>
                  <div>
                    <span className={getStatusClass(selectedFeedback.status)}>
                      {selectedFeedback.status}
                    </span>
                  </div>
                </div>

              </div>

              {/* Feedback Content Text Area */}
              <div className="fb-modal-field">
                <span className="fb-modal-label">Feedback Content</span>
                <div className="fb-modal-text-area">
                  {selectedFeedback.feedbackContent}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="fb-modal-footer">
              <button 
                className="fb-btn-modal-secondary" 
                onClick={() => setSelectedFeedback(null)}
              >
                Close
              </button>
              
              {selectedFeedback.status === 'Pending' && (
                <button 
                  className="fb-btn-modal-action" 
                  onClick={() => handleMarkReviewed(selectedFeedback.id)}
                >
                  Mark as Reviewed
                </button>
              )}

              {selectedFeedback.status !== 'Archived' && (
                <button
                  className="fb-btn-modal-archive"
                  onClick={() => handleArchive(selectedFeedback.id)}
                >
                  Archive Feedback
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
