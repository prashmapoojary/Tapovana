import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/http';
import './MediaPickerModal.css';

const placeholderImages = [
    "https://images.pexels.com/photos/3822689/pexels-photo-3822689.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/3823039/pexels-photo-3823039.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/3758042/pexels-photo-3758042.jpeg?auto=compress&cs=tinysrgb&w=800"
];

export default function MediaPickerModal({ 
    isOpen, 
    onClose, 
    onSelect, 
    allowVideos = false, 
    title = "Select Media", 
    defaultQuery = "wellness",
    page_type = "services",
    category = "All",
    subcategory = "All",
    suggestions = ['Yoga', 'Meditation', 'Ayurveda', 'Massage', 'Nutrition', 'Wellness', 'Spa']
}) {
    const [searchType, setSearchType] = useState('image'); // 'image' or 'video'
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null); // { url, type }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    // File upload state for fallback
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Visibility rule check: only workshops can search videos
    const isWorkshop = page_type === 'workshop' || page_type === 'workshops';
    const canSearchVideos = allowVideos && isWorkshop;

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setSelectedItem(null);
            setError('');
            setUploadError('');
            setQuery(defaultQuery || 'wellness');
            setSearchType('image');
            handleSearch(defaultQuery || 'wellness', 'image');
        }
    }, [isOpen, page_type, category, subcategory]);

    // Handle stock search from backend (Pexels)
    const handleSearch = async (searchQuery = query, type = searchType) => {
        const q = searchQuery.trim() || 'wellness';
        setLoading(true);
        setError('');
        setSelectedItem(null);
        setSearchType(type);

        try {
            const endpoint = `/api/media/search?query=${encodeURIComponent(q)}&type=${type}&category=${encodeURIComponent(page_type)}`;
            const res = await apiFetch(endpoint);
            if (res.success) {
                const items = type === 'image' ? (res.images || []) : (res.videos || []);
                setResults(items);
            } else {
                throw new Error(res.message || "Failed to fetch stock media from Pexels.");
            }
        } catch (err) {
            console.error("[Media Search Error]", err.message);
            setError(err.message || "Error searching media.");
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Save selected media to database
    const handleSaveSelection = async () => {
        if (!selectedItem) return;
        setSaving(true);
        try {
            const res = await apiFetch('/api/media/save', {
                method: 'POST',
                body: JSON.stringify({
                    url: selectedItem.url,
                    type: selectedItem.type,
                    category: page_type
                })
            });
            if (res.success && res.media) {
                onSelect(res.media.url);
                onClose();
            } else {
                throw new Error(res.message || "Failed to save selection to database.");
            }
        } catch (err) {
            console.error("[Media Save Error]", err.message);
            alert("Error saving selection: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Local file upload fallback (when search returns 0 results)
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const isImg = file.type.startsWith('image/');
        const isVid = file.type.startsWith('video/');

        if (!isImg && !isVid) {
            setUploadError("Only images and videos are supported.");
            return;
        }

        if (isVid && !isWorkshop) {
            setUploadError("Videos are only allowed for workshops.");
            return;
        }

        setUploading(true);
        setUploadError('');

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await apiFetch('/api/media/upload', {
                    method: 'POST',
                    body: JSON.stringify({
                        fileData: reader.result,
                        category: page_type
                    })
                });
                if (res.success && res.media) {
                    onSelect(res.media.url);
                    onClose();
                } else {
                    throw new Error(res.message || "Upload failed.");
                }
            } catch (err) {
                console.error("[Upload Error]", err.message);
                setUploadError(err.message || "Failed to upload file.");
            } finally {
                setUploading(false);
            }
        };

        reader.onerror = () => {
            setUploadError("Failed to read file.");
            setUploading(false);
        };

        reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    return (
        <div className="mp-modal-overlay" onClick={onClose}>
            <div className="mp-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="mp-modal-header">
                    <h2>{title} ({page_type === 'blogs' ? 'Blogs' : isWorkshop ? 'Workshops' : page_type.charAt(0).toUpperCase() + page_type.slice(1)})</h2>
                    <button className="mp-close-btn" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar & Primary Actions */}
                <div className="mp-search-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <input 
                            type="text" 
                            placeholder="Search stock media (e.g. Yoga, Spa, Wellness)..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch(query, searchType)}
                            style={{ flex: 1 }}
                        />
                        <button 
                            type="button" 
                            className={`option-button ${searchType === 'image' ? 'active' : ''}`}
                            onClick={() => handleSearch(query, 'image')}
                            disabled={loading}
                        >
                            Search Images
                        </button>
                        {canSearchVideos && (
                            <button 
                                type="button" 
                                className={`option-button ${searchType === 'video' ? 'active' : ''}`}
                                onClick={() => handleSearch(query, 'video')}
                                disabled={loading}
                            >
                                Search Videos
                            </button>
                        )}
                    </div>

                    {/* Suggestions */}
                    <div className="mp-suggestions" style={{ padding: '4px 0 0', margin: 0 }}>
                        {suggestions.slice(0, 8).map(s => (
                            <button 
                                key={s} 
                                type="button" 
                                className="mp-suggestion-chip"
                                onClick={() => { setQuery(s); handleSearch(s, searchType); }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body Content */}
                <div className="mp-modal-body" style={{ position: 'relative' }}>
                    {loading && (
                        <div className="mp-loading-state">
                            <div className="mp-spinner" />
                            <p>Searching Pexels stock media...</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="mp-error-state">
                            <p>⚠️ {error}</p>
                            <button 
                                type="button" 
                                className="mp-retry-btn"
                                onClick={() => handleSearch(query, searchType)}
                                style={{
                                    marginTop: '16px',
                                    padding: '8px 16px',
                                    background: '#CDA751',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry Search
                            </button>
                        </div>
                    )}

                    {/* Results Grid */}
                    {!loading && !error && results.length > 0 && (
                        <div className="mp-media-grid">
                            {results.map((item, index) => {
                                const isSelected = selectedItem?.url === item.url;
                                return (
                                    <div 
                                        key={item.id || index} 
                                        className={`mp-media-item ${isSelected ? 'selected' : ''}`} 
                                        onClick={() => setSelectedItem({ url: item.url, type: searchType })}
                                        onDoubleClick={() => {
                                            setSelectedItem({ url: item.url, type: searchType });
                                            // Trigger immediate save
                                            setTimeout(handleSaveSelection, 50);
                                        }}
                                        style={{ 
                                            border: isSelected ? '3px solid #CDA751' : '1px solid rgba(205,167,81,0.2)',
                                            boxShadow: isSelected ? '0 0 12px rgba(205,167,81,0.4)' : 'none',
                                            transform: isSelected ? 'scale(1.02)' : 'none'
                                        }}
                                    >
                                        {searchType === 'image' ? (
                                            <img 
                                                src={item.url} 
                                                alt={item.description} 
                                                className="mp-media-img" 
                                                loading="lazy"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = placeholderImages[index % placeholderImages.length];
                                                }}
                                            />
                                        ) : (
                                            <div className="mp-video-preview-wrap">
                                                <img 
                                                    src={item.thumbnail_url || placeholderImages[index % placeholderImages.length]} 
                                                    alt={item.description} 
                                                    className="mp-media-img" 
                                                    loading="lazy" 
                                                />
                                                <div className="mp-play-overlay">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                        <polygon points="5 3 19 12 5 21" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mp-media-info">
                                            <p className="mp-media-desc" title={item.description}>
                                                {item.description || 'Pexels Media'}
                                            </p>
                                            <p className="mp-media-author">
                                                by {item.author || 'Pexels Creator'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Local Fallback Upload when 0 search results */}
                    {!loading && !error && results.length === 0 && (
                        <div className="mp-empty-state" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                            <div style={{ color: '#718096' }}>
                                <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px' }}>No stock media found on Pexels.</p>
                                <p style={{ fontSize: '13px', margin: 0 }}>Try adjusting your search terms or upload a file directly below.</p>
                            </div>

                            <div 
                                className="mp-upload-fallback-zone"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: '2px dashed #CDA751',
                                    borderRadius: '12px',
                                    padding: '30px 40px',
                                    background: '#fdfbf7',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    width: '100%',
                                    maxWidth: '400px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 6px rgba(205, 167, 81, 0.05)'
                                }}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    style={{ display: 'none' }} 
                                    accept={isWorkshop ? 'image/*,video/*' : 'image/*'}
                                    onChange={handleFileUpload}
                                />
                                <div style={{ fontSize: '32px' }}>📤</div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontWeight: '700', color: '#1a202c', margin: '0 0 4px', fontSize: '14px' }}>
                                        {uploading ? 'Uploading media...' : 'Click to Upload Local File'}
                                    </p>
                                    <p style={{ fontSize: '11px', color: '#718096', margin: 0 }}>
                                        Supports {isWorkshop ? 'Images & Videos' : 'Images Only'}
                                    </p>
                                </div>
                            </div>
                            {uploadError && <p style={{ color: '#e74c3c', fontSize: '13px', fontWeight: '600', margin: 0 }}>⚠️ {uploadError}</p>}
                        </div>
                    )}
                </div>

                {/* Footer Selection Controls */}
                <div 
                    style={{ 
                        padding: '16px 24px', 
                        borderTop: '1px solid #edf2f7', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: '#fdfbf7' 
                    }}
                >
                    <div style={{ fontSize: '13px', color: '#4a5568' }}>
                        {selectedItem ? (
                            <span>Selected: <strong style={{ color: '#CDA751' }}>{selectedItem.type === 'video' ? '🎥 Video' : '📷 Image'}</strong> (Double-click to quick-save)</span>
                        ) : (
                            <span>Select an item from Pexels or use upload fallback.</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: '#edf2f7',
                                color: '#4a5568',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSaveSelection}
                            disabled={!selectedItem || saving}
                            style={{
                                padding: '10px 24px',
                                background: '#CDA751',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '700',
                                cursor: !selectedItem || saving ? 'not-allowed' : 'pointer',
                                opacity: !selectedItem || saving ? 0.6 : 1
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Selected Media'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
