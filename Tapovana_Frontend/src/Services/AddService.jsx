import React, { useRef, useState, useEffect } from 'react';
import './AddService.css';
import PricingAndDuration from '../assets/PricingAndDuration.png';
import { apiFetch } from '../api/http';
import { getImageUrl } from '../utils/image';
import { useAllocations } from '../utils/AllocationContext';
import DefaultAvatar from '../assets/profileIconDefault.png';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// ── Icons ──────────────────────────────────────────────────────────────────

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const InfoCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CDA751" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CDA751" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CDA751" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const GraduationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CDA751" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CameraPlusIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CDA751" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 5h-3.2l-1.8-2H9L7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="13" r="3.5" />
    <line x1="19" y1="9" x2="19" y2="13" />
    <line x1="17" y1="11" x2="21" y2="11" />
  </svg>
);

function AddService({ onBack }) {
  const { isStaffAllocated, allocateStaff, deallocateStaff, allocations, triggerAlert } = useAllocations();
  const [tempServiceId] = useState(() => `srv-${Date.now()}`);
  // General Info
  const [serviceName, setServiceName] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategory, setSubCategory] = useState('');
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [description, setDescription] = useState('');

  // Pricing & Duration
  const [basePrice, setBasePrice] = useState('');
  const [duration, setDuration] = useState('');

  // Benefits
  const [benefits, setBenefits] = useState([]);

  // Media & Gallery
  const [galleryImages, setGalleryImages] = useState([]);
  const fileInputRef = useRef(null);

  // Specialist Requirements
  const [certifications, setCertifications] = useState({
    'BAMS (Ayurveda)': false,
    'Certified Massage Therapist': false,
    'Kerala Therapy Certification': false,
  });
  const [experienceLevel, setExperienceLevel] = useState('');
  const [expOpen, setExpOpen] = useState(false);
  const [tools, setTools] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [newTool, setNewTool] = useState('');
  const toolInputRef = useRef(null);

  // Manual Staff Assignment
  const [availableStaff, setAvailableStaff] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await apiFetch(`/api/teams/users?page=1&limit=100&_t=${Date.now()}`);
        if (res.success && res.users) {
          const docsAndTherapists = res.users.filter(u => 
            (u.role === 'DOCTOR' || u.role === 'THERAPIST') && u.status === 'active'
          );
          setAvailableStaff(docsAndTherapists);
        }
      } catch (err) {
        console.error("Failed to fetch staff:", err);
      }
    };
    fetchStaff();
  }, []);

  const toggleStaff = (id) => {
    const isCurrentlyAssigned = assignedStaff.includes(id);
    if (isCurrentlyAssigned) {
      setAssignedStaff(prev => prev.filter(x => x !== id));
    } else {
      setAssignedStaff(prev => [...prev, id]);
    }
  };

  // ── Refs for click-outside behavior ──
  const categoryRef = useRef(null);
  const subCategoryRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setCategoryOpen(false);
      }
      if (subCategoryRef.current && !subCategoryRef.current.contains(event.target)) {
        setSubCategoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subCategoryMap = {
    'Body Care': ['Massages', 'Facials', 'Scrubs', 'Hydrotherapy'],
    'Skin Care': ['Facials', 'Detain Treatment', 'Bleach', 'Waxing'],
    'Hair Care': ['Haircut', 'Styling', 'Hair Spa'],
    'Nail Care': ['Manicure', 'Pedicure', 'Nail Art'],
    'Styling & Make over': ['Makeup', 'Bridal Makeover', 'Hair Styling']
  };

  const categoryOptions = ['Body Care', 'Skin Care', 'Nail Care', 'Hair Care', 'Styling & Make over'];
  const expOptions = ['Junior (0-2 Years)', 'Mid-Level (2-3 Years)', 'Senior (3-7 Years)', 'Expert (7+ Years)'];

  const handleSaveService = async (statusOverride = 'ACTIVE') => {
    if (!serviceName || !category || !subCategory || !basePrice || !duration) {
      triggerAlert("Please fill all required fields.");
      return;
    }

    if (serviceName.trim().length < 3) {
      triggerAlert("Service name must be at least 3 characters long.");
      return;
    }

    const parsedPrice = parseFloat(basePrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      triggerAlert("Service price must be a positive number greater than 0.");
      return;
    }

    const parsedDuration = parseInt(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      triggerAlert("Duration must be a positive number of minutes.");
      return;
    }

    if (statusOverride === 'ACTIVE') setIsSaving(true);
    else setIsDrafting(true);

    try {
      const selectedCerts = Object.entries(certifications)
        .filter(([_, checked]) => checked)
        .map(([name]) => name)
        .join('\n');

      // ★ The image is sent as base64 in image_url — backend handles saving it to disk
      const firstImage = galleryImages.length > 0 ? galleryImages[0] : null;

      const body = {
        name: serviceName,
        category: category,
        subcategory: subCategory,
        description: description,
        benefits: benefits.filter(b => b.trim()).join('\n'),
        tools: tools.join('\n'),
        base_price: parseFloat(basePrice),
        duration_minutes: parseInt(duration),
        required_certification: selectedCerts,
        experience_level: experienceLevel,
        assigned_staff_ids: assignedStaff,
        image_url: firstImage, // ← backend handles both base64 and URL
        status: statusOverride
      };

      const data = await apiFetch('/api/services', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      console.log('Create service response:', data);

      if (data.success) {
        triggerAlert("Service created successfully!", true);
        onBack();
      }
    } catch (err) {
      triggerAlert("Error creating service: " + err.message);
    } finally {
      setIsSaving(false);
      setIsDrafting(false);
    }
  };

  const handleCategoryChange = (opt) => {
    setCategory(opt);
    setCategoryOpen(false);
    setSubCategory('');
  };

  const availableSubCategories = category ? (subCategoryMap[category] || []) : [];

  const addBenefit = () => setBenefits([...benefits, '']);
  const updateBenefit = (i, val) => {
    const b = [...benefits]; b[i] = val; setBenefits(b);
  };
  const removeBenefit = (i) => setBenefits(benefits.filter((_, idx) => idx !== i));

  const toggleCert = (cert) => setCertifications(prev => ({ ...prev, [cert]: !prev[cert] }));

  const addTool = () => {
    if (newTool.trim() !== '') {
      setTools(prev => [...prev, newTool.trim()]);
      setNewTool('');
      setTimeout(() => toolInputRef.current?.focus(), 0);
    }
  };
  const removeTool = (i) => setTools(tools.filter((_, idx) => idx !== i));

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const valid = [];
    for (const f of files) {
      if (f.type !== 'image/jpeg' && f.type !== 'image/png' && f.type !== 'image/webp') {
        triggerAlert(`File ${f.name} has unsupported file type. Please upload only JPG, PNG or WEBP images.`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        triggerAlert(`File ${f.name} exceeds the 5MB size limit.`);
        continue;
      }
      valid.push(f);
    }

    if (valid.length === 0) { e.target.value = ''; return; }

    try {
      const dataUrls = await Promise.all(valid.map(fileToDataUrl));
      setGalleryImages(prev => {
        const canTake = 5 - prev.length;
        if (canTake <= 0) return prev;
        return [...prev, ...dataUrls.slice(0, canTake)];
      });
    } catch {
      // Ignore read errors silently
    }

    e.target.value = '';
  };

  const removeImage = (index) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="edit-service-page">
      <div className="es-sticky-top">
        {/* ── Nav breadcrumb ── */}
        <nav className="es-nav">
          <span className="es-nav-link" onClick={onBack}>Services</span>
          <span className="es-nav-chevron"><ChevronRightIcon /></span>
          <span className="es-nav-current">Add Service</span>
        </nav>

        {/* ── Page header ── */}
        <div className="es-header">
          <div className="es-header-left">
            <h1 className="es-title">Add Service</h1>
            <p className="es-subtitle">Add service details, pricing, and specialist requirements for the mobile app.</p>
          </div>
          <div className="es-header-actions">
            <button
              className="es-btn-discard"
              onClick={onBack}
              disabled={isSaving || isDrafting}
            >
              Cancel
            </button>
            <button
              className="es-btn-update"
              onClick={() => handleSaveService('ACTIVE')}
              disabled={isSaving || isDrafting}
            >
              {isSaving ? 'Saving...' : 'Save Service'}
            </button>
            <button
              className="es-btn-discard"
              onClick={() => handleSaveService('DRAFT')}
              disabled={isSaving || isDrafting}
            >
              {isDrafting ? 'Saving...' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </div>

      <div className="es-scroll-body">
        {/* ── Form body: 2-column grid ── */}
        <div className="es-body">
          {/* LEFT COLUMN */}
          <div className="es-col-left">
            {/* Section 1 — General Information */}
            <div className="es-card">
              <div className="es-section-header">
                <InfoCircleIcon />
                <h2>General Information</h2>
              </div>

              <div className="es-field">
                <label className="es-label">Service Name</label>
                <input
                  className="es-input"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="Enter service name"
                />
              </div>

              <div className="es-row-two">
                <div className="es-field">
                  <label className="es-label">Category</label>
                  <div className="es-select-wrap" ref={categoryRef} onClick={() => setCategoryOpen(!categoryOpen)}>
                    <div className="es-select-content">
                      <FilterIcon />
                      <span style={!category ? { color: '#94A3B8' } : undefined}>
                        {category || 'Select category'}
                      </span>
                    </div>
                    <ChevronDownIcon />
                    {categoryOpen && (
                      <div className="es-dropdown">
                        {categoryOptions.map(opt => (
                          <div
                            key={opt}
                            className="es-dropdown-item"
                            onClick={e => { e.stopPropagation(); handleCategoryChange(opt); }}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="es-field">
                  <label className="es-label">Sub Category</label>
                  <div className="es-select-wrap" ref={subCategoryRef} onClick={() => setSubCategoryOpen(!subCategoryOpen)}>
                    <div className="es-select-content">
                      <FilterIcon />
                      <span style={!subCategory ? { color: '#94A3B8' } : undefined}>
                        {subCategory || 'Select Sub Category'}
                      </span>
                    </div>
                    <ChevronDownIcon />
                    {subCategoryOpen && (
                      <div className="es-dropdown">
                        {availableSubCategories.length > 0 ? (
                          availableSubCategories.map(opt => (
                            <div
                              key={opt}
                              className="es-dropdown-item"
                              onClick={e => { e.stopPropagation(); setSubCategory(opt); setSubCategoryOpen(false); }}
                            >
                              {opt}
                            </div>
                          ))
                        ) : (
                          <div className="es-dropdown-item disabled">Select a category first</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="es-field">
                <label className="es-label">Detailed Description</label>
                <textarea
                  className="es-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Enter detailed description"
                />
              </div>
            </div>

            {/* Section 2 — Benefits & Highlights */}
            <div className="es-card">
              <div className="es-section-header">
                <SparkleIcon />
                <h2>Benefits &amp; Highlights</h2>
              </div>

              <div className="es-benefits-list">
                {benefits.map((b, i) => (
                  <div key={i} className="es-benefit-row">
                    <input
                      className="es-input"
                      value={b}
                      onChange={e => updateBenefit(i, e.target.value)}
                    />
                    <button className="es-icon-btn" onClick={() => removeBenefit(i)}><TrashIcon /></button>
                  </div>
                ))}
              </div>

              <button className="es-add-benefit-btn" onClick={addBenefit}>
                <PlusIcon /> Add New Benefit
              </button>
            </div>
          </div>{/* end col-left */}

          {/* RIGHT COLUMN */}
          <div className="es-col-right">
            <div className="es-card">
              <div className="es-section-header">
                <img src={PricingAndDuration} alt="Pricing" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                <h2>Pricing &amp; Duration</h2>
              </div>
              <div className="es-col-stack">
                <div className="es-field">
                  <label className="es-label">Base Price (₹)</label>
                  <div className="es-input-prefix-wrap">
                    <span className="es-prefix">₹</span>
                    <input
                      className="es-input es-input-prefixed"
                      type="number"
                      value={basePrice}
                      onChange={e => setBasePrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="es-field">
                  <label className="es-label">Duration (Minutes)</label>
                  <div className="es-input-suffix-wrap">
                    <input
                      className="es-input es-input-suffixed"
                      type="number"
                      value={duration}
                      onChange={e => setDuration(e.target.value)}
                      placeholder="0"
                    />
                    <span className="es-suffix">min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4 — Media & Gallery */}
            <div className="es-card">
              <div className="es-section-header">
                <ImageIcon />
                <h2>Media &amp; Gallery</h2>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                multiple
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />

              {/* Slots rendering */}
              <div className="es-media-grid">
                {galleryImages.map((src, idx) => (
                  <div key={idx} className="es-media-slot">
                    <img
                      src={getImageUrl(src, 'https://placehold.co/1200x800?text=No+Image')}
                      alt={`Gallery ${idx + 1}`}
                      className="es-media-img"
                      onError={(e) => {
                        if (e.target.src !== 'https://placehold.co/1200x800?text=Error') {
                          e.target.src = 'https://placehold.co/1200x800?text=Error';
                        }
                      }}
                    />
                    <div className="es-media-overlay" onClick={(e) => { e.stopPropagation(); removeImage(idx); }}>
                      <div className="es-delete-btn">
                        <TrashIcon />
                      </div>
                    </div>
                  </div>
                ))}
                {galleryImages.length < 5 && (
                  <div className="es-media-slot es-media-upload-slot" onClick={openFilePicker}>
                    <CameraPlusIcon />
                  </div>
                )}
              </div>
              <p className="es-img-hint">Recommended size: 1200x800px. JPG or PNG.</p>
            </div>
          </div>{/* end col-right */}
        </div>{/* end es-body */}

        {/* ── Section 5 — Specialist Requirements (full width) ── */}
        <div className="es-card es-card-full">
          <div className="es-section-header">
            <GraduationIcon />
            <h2>Specialist Requirements</h2>
          </div>

          <div className="es-specialist-grid">
            {/* Required Certification */}
            <div className="es-spec-col">
              <label className="es-spec-col-label">Required Certification</label>
              <div className="es-cert-list">
                {Object.entries(certifications).map(([cert, checked]) => (
                  <label key={cert} className="es-cert-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCert(cert)}
                      className="es-checkbox-hidden"
                    />
                    <span className={`es-custom-checkbox ${checked ? 'checked' : ''}`}>
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 8 7 11 12 5" />
                        </svg>
                      )}
                    </span>
                    <span>{cert}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="es-spec-divider" />

            {/* Manual Staff Assignment */}
            <div className="es-spec-col">
              <label className="es-spec-col-label">Assign Doctors &amp; Therapists</label>
              <div className="es-cert-list" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {availableStaff.length === 0 ? (
                  <span style={{ fontSize: 13, color: '#7b8a9a' }}>No doctors or therapists found.</span>
                ) : (
                  availableStaff
                    .filter(staff => !isStaffAllocated(staff.user_id) || assignedStaff.includes(staff.user_id))
                    .map(staff => (
                      <label key={staff.user_id} className="es-cert-row">
                        <input
                          type="checkbox"
                          checked={assignedStaff.includes(staff.user_id)}
                          onChange={() => toggleStaff(staff.user_id)}
                          className="es-checkbox-hidden"
                        />
                        <span className={`es-custom-checkbox ${assignedStaff.includes(staff.user_id) ? 'checked' : ''}`}>
                          {assignedStaff.includes(staff.user_id) && (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="4 8 7 11 12 5" />
                            </svg>
                          )}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img 
                            src={(() => {
                              let photoUrl = staff.profile_photo_url;
                              if (photoUrl && /^[A-Za-z]:[/\\]/i.test(photoUrl)) photoUrl = "/uploads/" + photoUrl.replace(/\\/g, '/').split('/').pop();
                              if (staff.profile_photo_source === "upload" && photoUrl) return `${API_BASE}${photoUrl}`;
                              if (staff.profile_photo_source === "local" && photoUrl) return `/avatars/${photoUrl}`;
                              if (staff.avatar_url) {
                                let avUrl = staff.avatar_url;
                                if (avUrl && /^[A-Za-z]:[/\\]/i.test(avUrl)) avUrl = "/uploads/" + avUrl.replace(/\\/g, '/').split('/').pop();
                                return avUrl.startsWith("http") || avUrl.startsWith("/") ? avUrl : `${API_BASE}${avUrl}`;
                              }
                              return DefaultAvatar;
                            })()}
                            alt="" 
                            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = DefaultAvatar; }}
                          />
                          {`${staff.first_name || ''} ${staff.last_name || ''} (${staff.role})`.trim()}
                        </span>
                      </label>
                    ))
                )}
              </div>
            </div>

            <div className="es-spec-divider" />

            {/* Experience Level */}
            <div className="es-spec-col">
              <label className="es-spec-col-label">Experience Level</label>
              <div className="es-select-wrap" onClick={() => setExpOpen(!expOpen)}>
                <span style={!experienceLevel ? { color: '#94A3B8' } : undefined}>
                  {experienceLevel || 'Select experience level'}
                </span>
                <ChevronDownIcon />
                {expOpen && (
                  <div className="es-dropdown">
                    {expOptions.map(opt => (
                      <div
                        key={opt}
                        className="es-dropdown-item"
                        onClick={e => { e.stopPropagation(); setExperienceLevel(opt); setExpOpen(false); }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="es-exp-note">
                <strong>Note:</strong> Specialists without this level of experience will be hidden from this service assignment list.
              </div>
            </div>

            <div className="es-spec-divider" />

            {/* Mandatory Tools */}
            <div className="es-spec-col">
              <label className="es-spec-col-label">Mandatory Tools</label>
              <div className="es-tools-list">
                {tools.map((tool, i) => (
                  <span key={i} className="es-tool-chip">
                    {tool}
                    <button className="es-chip-remove" onClick={() => removeTool(i)}><XIcon /></button>
                  </span>
                ))}
                <div className="es-add-tool-row">
                  <input
                    className="es-tool-input-plain"
                    placeholder="+ Add Tool"
                    value={newTool}
                    onChange={e => setNewTool(e.target.value)}
                    ref={toolInputRef}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTool();
                      }
                    }}
                    onBlur={addTool}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>{/* end es-scroll-body */}
    </div>
  );
}

export default AddService;