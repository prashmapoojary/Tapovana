import React, { useState, useEffect } from 'react';
import './Services.css';
import { apiFetch } from '../api/http';
import { getImageUrl } from '../utils/image';
import { useAllocations } from '../utils/AllocationContext';
import EditService from './EditService';
import AddService from './AddService';

const subCategoriesMap = {
  'Body Care': ['Massages', 'Facials', 'Scrubs', 'Hydrotherapy'],
  'Skin Care': ['Facials', 'Detain Treatment', 'Bleach', 'Waxing'],
  'Hair Care': ['Haircut', 'Styling', 'Hair Spa'],
  'Nail Care': ['Manicure', 'Pedicure', 'Nail Art'],
  'Styling & Make over': ['Makeup', 'Bridal Makeover', 'Hair Styling']
};

const tabs = ['All Services', 'Body Care', 'Skin Care', 'Nail Care', 'Hair Care', 'Styling & Make over'];
const categories = ['All', 'Body Care', 'Skin Care', 'Nail Care', 'Hair Care', 'Styling & Make over'];

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

function Services() {
  const { triggerAlert, triggerConfirm } = useAllocations();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('All Services');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);

  // ── Refs for click-outside behavior ──
  const categoryRef = React.useRef(null);
  const subCategoryRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (subCategoryRef.current && !subCategoryRef.current.contains(event.target)) {
        setIsSubDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Edit Service navigation state ──
  const [editingService, setEditingService] = useState(null);
  const [addingService, setAddingService] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []); // Fetch once on mount

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/services');
      let backendServices = [];
      if (data.success) {
        backendServices = data.services || [];
      }
      const drafts = JSON.parse(localStorage.getItem('tapovana_service_drafts') || '[]');
      setServices([...drafts, ...backendServices]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setIsDropdownOpen(false);
    setSelectedSubCategory('All');
    setCurrentPage(1);
  };

  const handleSubCategorySelect = (subCategory) => {
    setSelectedSubCategory(subCategory);
    setIsSubDropdownOpen(false);
    setCurrentPage(1);
  };

  const getStatusClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'status-active';
      case 'DRAFT': return 'status-draft';
      case 'LIMITED': return 'status-limited';
      case 'ARCHIVED': return 'status-limited'; // Using same style as limited for now
      default: return '';
    }
  };

  const handleDelete = async (service) => {
    const { id, name: serviceName, image_url } = service;
    const imageUrl = getImageUrl(image_url, 'https://placehold.co/150?text=No+Image');

    try {
      const bookingsData = await apiFetch('/api/bookings?limit=100');
      if (bookingsData.success && bookingsData.bookings) {
        const hasActiveBookings = bookingsData.bookings.some(b =>
          b.service_name === serviceName && (b.status === 'PENDING' || b.status === 'CONFIRMED')
        );
        if (hasActiveBookings) {
          triggerAlert(`Cannot delete service "${serviceName}" because it has active bookings.`);
          return;
        }
      }
    } catch (err) {
      console.warn("Could not check bookings:", err);
    }

    const isDraft = typeof id === 'string' && id.startsWith('draft_');

    const confirmed = await triggerConfirm(
      `Are you sure you want to delete this service\n"${serviceName}"?`,
      imageUrl
    );
    
    if (confirmed) {
      try {
        if (isDraft) {
          const drafts = JSON.parse(localStorage.getItem('tapovana_service_drafts') || '[]');
          localStorage.setItem('tapovana_service_drafts', JSON.stringify(drafts.filter(d => d.id !== id)));
          fetchServices();
          triggerAlert(`${serviceName} deleted successfully`, true);
        } else {
          const res = await apiFetch(`/api/services/${id}`, { method: 'DELETE' });
          if (res.success || res.message) {
            fetchServices();
            triggerAlert(`${serviceName} deleted successfully`, true);
          } else {
            fetchServices();
          }
        }
      } catch (err) {
        triggerAlert("Failed to delete service: " + err.message);
      }
    }
  };

  const availableSubCategories = selectedCategory !== 'All' ? ['All', ...(subCategoriesMap[selectedCategory] || [])] : ['All'];

  // Client-side filtering for category/subcategory and search query
  const filteredServices = services.filter(service => {
    const tabMatch = activeTab === 'All Services' || service.category === activeTab;
    const dropdownMatch = selectedCategory === 'All' || service.category === selectedCategory;
    const subDropdownMatch = selectedSubCategory === 'All' || service.subcategory === selectedSubCategory;
    
    const searchMatch = !searchQuery || 
      (service.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.service_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.id || '').toString().toLowerCase().includes(searchQuery.toLowerCase());
    
    return tabMatch && dropdownMatch && subDropdownMatch && searchMatch;
  });

  const itemsPerPage = 10;
  const totalItems = filteredServices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ── If editing, render EditService page instead ──
  if (addingService) { return <AddService onBack={() => { setAddingService(false); fetchServices(); }} /> }
  if (editingService !== null) {
    return (
      <EditService
        service={editingService}
        onBack={() => setEditingService(null)}
      />
    );
  }

  return (
    <div className="services-catalog">

      {/* ── Sticky top: hero + filters ── */}
      <div className="services-top">

        {/* 1. Hero */}
        <div className="hero-section">
          <div className="hero-left">
            <h1>Service Catalog</h1>
            <p>Manage, categorize, and update your wellness and beauty offerings.</p>
          </div>
          <div className="hero-right">
            <button className="add-service-btn" onClick={() => setAddingService(true)}>+ Add New Service</button>
          </div>
        </div>

        {/* 2. Filters & Controls */}
        <div className="filters-section">
          <div className="filters-inner">
            <div className="tabs-group">
              {tabs.map(tab => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => handleTabClick(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="filter-divider"></div>
            <div className="controls-group">
              <div className="category-dropdown" ref={categoryRef} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <FilterIcon />
                <span>Category: {selectedCategory}</span>
                <ChevronDownIcon />
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    {categories.map(cat => (
                      <div
                        key={cat}
                        className="dropdown-item"
                        onClick={(e) => { e.stopPropagation(); handleCategorySelect(cat); }}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="category-dropdown" ref={subCategoryRef} onClick={() => setIsSubDropdownOpen(!isSubDropdownOpen)}>
                <FilterIcon />
                <span>Sub Category: {selectedSubCategory}</span>
                <ChevronDownIcon />
                {isSubDropdownOpen && (
                  <div className="dropdown-menu">
                    {availableSubCategories.map(subCat => (
                      <div
                        key={subCat}
                        className="dropdown-item"
                        onClick={(e) => { e.stopPropagation(); handleSubCategorySelect(subCat); }}
                      >
                        {subCat}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="search-container">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search service name or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>{/* end .services-top */}

      {/* ── Scrollable middle: table ── */}
      <div className="table-scroll-area">
        <div className="table-container">
          <table className="services-table">
            <thead>
              <tr>
                <th>SERVICE NAME</th>
                <th>CATEGORY</th>
                <th>SUB-CATEGORY</th>
                <th>DURATION</th>
                <th>PRICE</th>
                <th>STATUS</th>
                <th className="th-actions">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading services...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'red' }}>Error: {error}</td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', fontFamily: '"Manrope", sans-serif', color: '#64748B', padding: '24px' }}>
                    No services found.
                  </td>
                </tr>
              ) : (
                paginatedServices.map((service, idx) => (
                  <tr key={`${service.id}-${idx}`}>
                    <td>
                      <div className="service-name-cell">
                        <img 
                          src={getImageUrl(service.image_url, 'https://placehold.co/150?text=No+Image')} 
                          alt={service.name} 
                          className="service-thumbnail" 
                          onError={(e) => { 
                            if (e.target.src !== 'https://placehold.co/150?text=Error') {
                              e.target.src = 'https://placehold.co/150?text=Error'; 
                            }
                          }} 
                        />
                        <div className="service-info">
                          <span className="service-title">{service.name}</span>
                          <span className="service-id">ID: {service.service_id || service.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{service.category}</td>
                    <td>{service.subcategory}</td>
                    <td>{service.duration_minutes} min</td>
                    <td className="price-cell">₹{service.base_price}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(service.status)}`}>
                        {service.status ? (service.status.charAt(0).toUpperCase() + service.status.slice(1).toLowerCase()) : 'Active'}
                      </span>
                    </td>
                    <td className="td-actions">
                      <div className="actions-cell">
                        {/* ── Edit button: opens EditService page ── */}
                        <button
                          className="action-btn"
                          title="Edit"
                          onClick={() => setEditingService(service)}
                        >
                          <EditIcon />
                        </button>
                        <button className="action-btn" title="Delete" onClick={() => handleDelete(service)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>{/* end .table-scroll-area */}

      {/* ── Sticky bottom: pagination ── */}
      <div className="pagination-container">
        <div className="pagination-text">
          Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} services
        </div>
        <div className="pagination-controls">
          <button
            className="page-btn-arrow"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >&lt;</button>
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`page-btn-num ${currentPage === page ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >{page}</button>
          ))}
          <button
            className="page-btn-arrow"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >&gt;</button>
        </div>
      </div>

    </div>
  );
}

export default Services;