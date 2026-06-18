import React, { useState, useMemo } from 'react';
import './Feedbacks.css';

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
  const [feedbacks, setFeedbacks] = useState(INITIAL_FEEDBACKS);
  
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
      case 'pending': return 'status-badge pending';
      case 'reviewed': return 'status-badge reviewed';
      case 'archived': return 'status-badge archived';
      default: return 'status-badge';
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

  // CSV Export Helper
  const handleExportCSV = () => {
    if (filteredFeedbacks.length === 0) {
      showToast('No feedbacks available to export.');
      return;
    }

    const headers = ['User Name', 'Email', 'Module Type', 'Title', 'Feedback Content', 'Rating', 'Date Submitted', 'Status'];
    const rows = filteredFeedbacks.map(item => [
      item.userName,
      item.email,
      item.moduleType,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.feedbackContent.replace(/"/g, '""')}"`,
      item.rating,
      item.dateSubmitted,
      item.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tapovana_Feedbacks_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Feedbacks exported to CSV successfully.');
  };

  return (
    <div className="feedbacks-page">
      
      {/* Toast Notification */}
      {toast.visible && (
        <div className="feedbacks-notification-toast">
          <span>🔔</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="feedbacks-header">
        <div className="feedbacks-header-left">
          <h1>Feedbacks</h1>
          <p>Manage feedback for Blogs, Workshops, Services, and Vedic Life Programs</p>
        </div>
        <div className="feedbacks-header-right">
          <button className="feedbacks-btn-export" onClick={handleExportCSV}>
            📥 Export to CSV
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="feedbacks-filters-card">
        
        {/* Module Selection */}
        <div className="feedbacks-filter-group">
          <label className="feedbacks-filter-label">Select Module</label>
          <select 
            className="feedbacks-select" 
            value={moduleFilter} 
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="All">All Modules</option>
            <option value="Blog">Blogs</option>
            <option value="Workshop">Workshops</option>
            <option value="Service">Services</option>
            <option value="Vedic Life">Vedic Life Programs</option>
          </select>
        </div>

        {/* Date From */}
        <div className="feedbacks-filter-group">
          <label className="feedbacks-filter-label">From Date</label>
          <input 
            type="date" 
            className="feedbacks-input" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        {/* Date To */}
        <div className="feedbacks-filter-group">
          <label className="feedbacks-filter-label">To Date</label>
          <input 
            type="date" 
            className="feedbacks-input" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {/* Status */}
        <div className="feedbacks-filter-group">
          <label className="feedbacks-filter-label">Status</label>
          <select 
            className="feedbacks-select" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="feedbacks-filter-group">
          <label className="feedbacks-filter-label">Search Keyword / User</label>
          <input 
            type="text" 
            placeholder="Search by name, email..." 
            className="feedbacks-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

      </div>

      {/* Feedbacks Table */}
      <div className="feedbacks-table-wrapper">
        <table className="feedbacks-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>Module Type</th>
              <th>Title</th>
              <th>Feedback</th>
              <th>Rating</th>
              <th>Date Submitted</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#718096' }}>
                  No feedbacks found matching the filter criteria.
                </td>
              </tr>
            ) : (
              filteredFeedbacks.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.userName}</td>
                  <td>{item.email}</td>
                  <td>
                    <span style={{ 
                      fontSize: '12px', 
                      background: '#edf2f7', 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontWeight: 600, 
                      color: '#4a5568' 
                    }}>
                      {item.moduleType}
                    </span>
                  </td>
                  <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </td>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.feedbackContent}
                  </td>
                  <td>
                    <span className="rating-stars">{renderStars(item.rating)}</span>
                  </td>
                  <td>{item.dateSubmitted}</td>
                  <td>
                    <span className={getStatusClass(item.status)}>{item.status}</span>
                  </td>
                  <td>
                    <div className="feedbacks-actions-cell" style={{ justifyContent: 'center' }}>
                      <button className="feedbacks-btn-view" onClick={() => handleView(item)}>
                        View
                      </button>
                      {item.status !== 'Archived' && (
                        <button className="feedbacks-btn-archive" onClick={() => handleArchive(item.id)}>
                          Archive
                        </button>
                      )}
                      <button className="feedbacks-btn-delete" onClick={() => handleDelete(item.id, item.userName)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Feedback Detail View Modal */}
      {selectedFeedback && (
        <div className="feedbacks-modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div className="feedbacks-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="feedbacks-modal-header">
              <h2>Feedback Details</h2>
              <button className="feedbacks-modal-close-btn" onClick={() => setSelectedFeedback(null)}>
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="feedbacks-modal-body">
              
              <div className="feedbacks-modal-grid">
                
                <div className="feedbacks-modal-field">
                  <span className="feedbacks-modal-label">User Name</span>
                  <span className="feedbacks-modal-value">{selectedFeedback.userName}</span>
                </div>

                <div className="feedbacks-modal-field">
                  <span className="feedbacks-modal-label">Email Address</span>
                  <span className="feedbacks-modal-value">{selectedFeedback.email}</span>
                </div>

                <div className="feedbacks-modal-field">
                  <span className="feedbacks-modal-label">Module Type</span>
                  <span className="feedbacks-modal-value">{selectedFeedback.moduleType}</span>
                </div>

                <div className="feedbacks-modal-field">
                  <span className="feedbacks-modal-label">Related Title</span>
                  <span className="feedbacks-modal-value">{selectedFeedback.title}</span>
                </div>

                <div className="feedbacks-modal-field">
                  <span className="feedbacks-modal-label">Rating</span>
                  <span className="rating-stars" style={{ fontSize: '18px' }}>
                    {renderStars(selectedFeedback.rating)}
                  </span>
                </div>

                <div className="feedbacks-modal-field">
                  <span className="feedbacks-modal-label">Date Submitted</span>
                  <span className="feedbacks-modal-value">{selectedFeedback.dateSubmitted}</span>
                </div>

                <div className="feedbacks-modal-field" style={{ gridColumn: 'span 2' }}>
                  <span className="feedbacks-modal-label">Current Status</span>
                  <div>
                    <span className={getStatusClass(selectedFeedback.status)}>
                      {selectedFeedback.status}
                    </span>
                  </div>
                </div>

              </div>

              {/* Feedback Content Text Area */}
              <div className="feedbacks-modal-field">
                <span className="feedbacks-modal-label">Feedback Content</span>
                <div className="feedbacks-modal-text-area">
                  {selectedFeedback.feedbackContent}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="feedbacks-modal-footer">
              <button 
                className="feedbacks-btn-modal-secondary" 
                onClick={() => setSelectedFeedback(null)}
              >
                Close
              </button>
              
              {selectedFeedback.status === 'Pending' && (
                <button 
                  className="feedbacks-btn-modal-action" 
                  onClick={() => handleMarkReviewed(selectedFeedback.id)}
                >
                  Mark as Reviewed
                </button>
              )}

              {selectedFeedback.status !== 'Archived' && (
                <button 
                  className="feedbacks-btn-archive"
                  style={{ padding: '10px 18px', fontSize: '14px' }}
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
