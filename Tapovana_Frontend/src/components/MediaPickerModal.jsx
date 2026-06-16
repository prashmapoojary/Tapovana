import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/http';
import './MediaPickerModal.css';

export default function MediaPickerModal({ 
    isOpen, 
    onClose, 
    onSelect, 
    allowVideos = false, 
    title = "Select Media", 
    defaultQuery = "wellness",
    suggestions = ['Yoga', 'Meditation', 'Ayurveda', 'Massage', 'Nutrition', 'Nature', 'Wellness', 'Spa']
}) {
    const [searchType, setSearchType] = useState('image'); // 'image' or 'video'
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const q = defaultQuery && defaultQuery.trim() ? defaultQuery : 'wellness';
            setQuery(q);
            handleSearch(q, searchType);
        }
    }, [isOpen, searchType, defaultQuery]);

    const handleSearch = async (searchQuery = query, type = searchType) => {
        const q = searchQuery.trim() || 'wellness';
        setLoading(true);
        setError('');
        try {
            const endpoint = type === 'image' 
                ? `/api/media/search-images?query=${encodeURIComponent(q)}`
                : `/api/media/search-videos?query=${encodeURIComponent(q)}`;
            
            const res = await apiFetch(endpoint);
            if (res.success) {
                setResults(type === 'image' ? (res.images || []) : (res.videos || []));
            } else {
                throw new Error(res.message || "Failed to load results");
            }
        } catch (err) {
            setError(err.message || "Error searching media.");
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = (e) => {
        e.preventDefault();
        handleSearch();
    };

    if (!isOpen) return null;

    return (
        <div className="mp-modal-overlay" onClick={onClose}>
            <div className="mp-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="mp-modal-header">
                    <h2>{title}</h2>
                    <button className="mp-close-btn" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                {allowVideos && (
                    <div className="mp-modal-tabs">
                        <button 
                            className={`mp-tab-btn ${searchType === 'image' ? 'active' : ''}`}
                            onClick={() => { setSearchType('image'); setResults([]); }}
                        >
                            📷 Unsplash Images
                        </button>
                        <button 
                            className={`mp-tab-btn ${searchType === 'video' ? 'active' : ''}`}
                            onClick={() => { setSearchType('video'); setResults([]); }}
                        >
                            🎥 Stock Videos
                        </button>
                    </div>
                )}

                {/* Search Bar */}
                <form className="mp-search-form" onSubmit={onSubmit}>
                    <input 
                        type="text" 
                        placeholder={`Search ${searchType === 'image' ? 'Unsplash images' : 'stock videos'}... (e.g. Yoga, Spa)`}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {/* Suggestions */}
                <div className="mp-suggestions">
                    {suggestions.map(s => (
                        <button 
                            key={s} 
                            type="button" 
                            className="mp-suggestion-chip"
                            onClick={() => { setQuery(s); handleSearch(s); }}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="mp-modal-body">
                    {loading && (
                        <div className="mp-loading-state">
                            <div className="mp-spinner" />
                            <p>Loading curated stock media...</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="mp-error-state">
                            <p>⚠️ {error}</p>
                        </div>
                    )}

                    {!loading && !error && results.length === 0 && (
                        <div className="mp-empty-state">
                            <p>No results found. Try another search query.</p>
                        </div>
                    )}

                    {!loading && !error && results.length > 0 && (
                        <div className="mp-media-grid">
                            {results.map(item => (
                                <div 
                                    key={item.id} 
                                    className="mp-media-item" 
                                    onClick={() => onSelect(item.url)}
                                >
                                    {searchType === 'image' ? (
                                        <img src={item.url} alt={item.description} className="mp-media-img" loading="lazy" />
                                    ) : (
                                        <div className="mp-video-preview-wrap">
                                            <img src={item.image} alt={item.description} className="mp-media-img" loading="lazy" />
                                            <div className="mp-play-overlay">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                    <polygon points="5 3 19 12 5 21" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mp-media-info">
                                        <p className="mp-media-desc" title={item.description}>
                                            {item.description || 'Stock Media'}
                                        </p>
                                        <p className="mp-media-author">
                                            by {item.author || 'Stock Creator'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
