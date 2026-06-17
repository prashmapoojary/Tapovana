import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/http';
import './CategoryMediaGallery.css';

export default function CategoryMediaGallery({ 
    page_type = 'services', 
    category = 'All', 
    subcategory = 'All', 
    allowVideos = false 
}) {
    const [mediaType, setMediaType] = useState('image'); // 'image' or 'video'
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeLightbox, setActiveLightbox] = useState(null); // Selected media object for overlay
    const [collapsed, setCollapsed] = useState(false);

    // Fetch media whenever category, subcategory, page_type or mediaType changes
    useEffect(() => {
        let isMounted = true;
        
        async function loadMedia() {
            setLoading(true);
            setError('');
            try {
                // Category cleanups for query string
                const cleanCat = category === 'All Services' || category === 'ALL' ? 'All' : category;
                const cleanSub = subcategory === 'ALL' ? 'All' : subcategory;

                const endpoint = `/api/media/unsplash?page_type=${encodeURIComponent(page_type)}&category=${encodeURIComponent(cleanCat)}&subcategory=${encodeURIComponent(cleanSub)}&media_type=${mediaType}`;
                
                const data = await apiFetch(endpoint);
                if (isMounted) {
                    if (data.success) {
                        setMediaItems(data.media || []);
                    } else {
                        throw new Error(data.message || 'Failed to fetch stock media');
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message || 'Could not load stock media.');
                    setMediaItems([]);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadMedia();

        return () => {
            isMounted = false;
        };
    }, [page_type, category, subcategory, mediaType]);

    // Reset mediaType toggle if videos are not allowed on this page
    useEffect(() => {
        if (!allowVideos) {
            setMediaType('image');
        }
    }, [allowVideos]);

    return (
        <div className={`cmg-gallery-section ${collapsed ? 'collapsed' : ''}`}>
            {/* Header */}
            <div className="cmg-header" onClick={() => setCollapsed(!collapsed)}>
                <div className="cmg-header-title">
                    <span className="cmg-glow-dot" />
                    <h3>✨ Stock Media Board ({page_type === 'blogs' ? 'Blogs' : page_type === 'vedic_packages' ? 'Packages' : page_type.charAt(0).toUpperCase() + page_type.slice(1)})</h3>
                    <span className="cmg-badge">{category} {subcategory !== 'All' ? `→ ${subcategory}` : ''}</span>
                </div>
                <div className="cmg-header-actions">
                    <button className="cmg-collapse-btn">
                        {collapsed ? '▼ Show Board' : '▲ Hide Board'}
                    </button>
                </div>
            </div>

            {/* Content Container */}
            {!collapsed && (
                <div className="cmg-body">
                    {/* Image / Video Selector (Only if allowed) */}
                    {allowVideos && (
                        <div className="cmg-tabs">
                            <button 
                                className={`cmg-tab-btn ${mediaType === 'image' ? 'active' : ''}`}
                                onClick={() => setMediaType('image')}
                            >
                                📷 Stock Images
                            </button>
                            <button 
                                className={`cmg-tab-btn ${mediaType === 'video' ? 'active' : ''}`}
                                onClick={() => setMediaType('video')}
                            >
                                🎥 Playable Videos
                            </button>
                        </div>
                    )}

                    {/* Loader */}
                    {loading && (
                        <div className="cmg-loading">
                            <div className="cmg-spinner" />
                            <p>Fetching stock media from database cache...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="cmg-error">
                            <p>⚠️ {error}</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && mediaItems.length === 0 && (
                        <div className="cmg-empty">
                            <p>No curated stock media found for this category.</p>
                        </div>
                    )}

                    {/* Grid */}
                    {!loading && !error && mediaItems.length > 0 && (
                        <div className="cmg-grid">
                            {mediaItems.slice(0, 8).map((item, index) => (
                                <div 
                                    key={item.id || index} 
                                    className="cmg-card"
                                    onClick={() => setActiveLightbox(item)}
                                >
                                    <div className="cmg-img-wrapper">
                                        <img 
                                            src={item.media_type === 'video' ? (item.thumbnail_url || item.url) : item.url} 
                                            alt={item.description} 
                                            className="cmg-img"
                                            loading="lazy"
                                        />
                                        {item.media_type === 'video' && (
                                            <div className="cmg-play-icon">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                                    <polygon points="5 3 19 12 5 21" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="cmg-card-overlay">
                                            <p className="cmg-desc" title={item.description}>{item.description || 'Stock Media'}</p>
                                            <span className="cmg-author">by {item.author || 'Contributor'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox / Media Player Overlay Modal */}
            {activeLightbox && (
                <div className="cmg-lightbox-overlay" onClick={() => setActiveLightbox(null)}>
                    <div className="cmg-lightbox-card" onClick={e => e.stopPropagation()}>
                        <button className="cmg-lightbox-close" onClick={() => setActiveLightbox(null)}>
                            ✕
                        </button>
                        <div className="cmg-lightbox-body">
                            {activeLightbox.media_type === 'video' ? (
                                <video 
                                    src={activeLightbox.url} 
                                    controls 
                                    autoPlay 
                                    className="cmg-lightbox-video"
                                    poster={activeLightbox.thumbnail_url}
                                />
                            ) : (
                                <img 
                                    src={activeLightbox.url} 
                                    alt={activeLightbox.description} 
                                    className="cmg-lightbox-img"
                                />
                            )}
                        </div>
                        <div className="cmg-lightbox-footer">
                            <h4>{activeLightbox.description || 'Curated Stock Media'}</h4>
                            <p>Source: {activeLightbox.media_type === 'video' ? 'Pexels' : 'Unsplash'} · Photographer: <strong>{activeLightbox.author || 'Unknown'}</strong></p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
