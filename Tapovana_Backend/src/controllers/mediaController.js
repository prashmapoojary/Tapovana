const https = require('https');
const fs = require('fs');
const path = require('path');
const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Helper to normalize frontend categories to database categories
function normalizeCategory(category) {
    if (!category) return 'services';
    const c = category.trim().toLowerCase();
    if (c === 'service' || c === 'services') return 'services';
    if (c === 'vedic' || c === 'vediclife' || c === 'vedic_life' || c === 'vedic_packages' || c === 'packages' || c === 'package') return 'vedic';
    if (c === 'workshop' || c === 'workshops') return 'workshop';
    if (c === 'blog' || c === 'blogs') return 'blog';
    return 'services'; // fallback
}

// 1. Search Unsplash / Pexels Stock Media
const searchPexels = async (req, res) => {
    try {
        const queryStr = (req.query.query || 'wellness').trim().toLowerCase();
        const type = (req.query.type || 'image').trim().toLowerCase();
        const rawCategory = req.query.category || '';
        const category = normalizeCategory(rawCategory);

        // Visibility Rule: Videos only allowed for Workshops
        if (type === 'video' && category !== 'workshop') {
            return res.status(400).json({
                success: false,
                message: 'Videos are only allowed for workshops.'
            });
        }

        const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_KEY;
        const pexelsKey = process.env.PEXELS_KEY || process.env.PEXELS_API_KEY;

        // Try Unsplash API first if configured
        if (type === 'image' && unsplashKey) {
            const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(queryStr)}&per_page=30&client_id=${unsplashKey}`;
            https.get(url, { timeout: 6000 }, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => data += chunk);
                apiRes.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        const images = (result.results || []).map(img => ({
                            id: img.id,
                            url: img.urls.regular || img.urls.full,
                            thumbnail_url: img.urls.small || img.urls.thumb,
                            description: img.alt_description || img.description || 'Unsplash Photo',
                            author: img.user?.name || 'Unsplash Photographer',
                            source: 'unsplash',
                            type: 'image'
                        }));
                        return res.json({ success: true, images });
                    } catch (err) {
                        console.error('Unsplash parsing error:', err);
                    }
                });
            }).on('error', err => console.error('Unsplash connection error:', err));
        }

        if (!pexelsKey) {
            // Unsplash Curated Fallback Images
            const unsplashFallback = [
                { id: 'u1', url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80', thumbnail_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=300&q=80', description: 'Ayurveda Herbal Wellness', author: 'Unsplash', source: 'unsplash', type: 'image' },
                { id: 'u2', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80', thumbnail_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=300&q=80', description: 'Yoga & Meditation', author: 'Unsplash', source: 'unsplash', type: 'image' },
                { id: 'u3', url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80', thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=300&q=80', description: 'Ayurvedic Treatment & Spa', author: 'Unsplash', source: 'unsplash', type: 'image' },
                { id: 'u4', url: 'https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=800&q=80', thumbnail_url: 'https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=300&q=80', description: 'Healthy Herbal Tea & Spices', author: 'Unsplash', source: 'unsplash', type: 'image' },
                { id: 'u5', url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', thumbnail_url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=300&q=80', description: 'Healthy Organic Nutrition', author: 'Unsplash', source: 'unsplash', type: 'image' }
            ];
            return res.json({ success: true, images: unsplashFallback });
        }

        let url = '';
        if (type === 'video') {
            url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(queryStr)}&per_page=30`;
        } else {
            url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(queryStr)}&per_page=30`;
        }

        https.get(url, {
            headers: {
                'Authorization': pexelsKey
            },
            timeout: 6000
        }, (apiRes) => {
            let data = '';
            apiRes.on('data', (chunk) => data += chunk);
            apiRes.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    
                    if (type === 'video') {
                        const videos = (result.videos || []).map(vid => {
                            const sdFile = vid.video_files.find(vf => vf.quality === 'sd' || vf.link.includes('sd')) || vid.video_files[0];
                            return {
                                id: vid.id,
                                url: sdFile ? sdFile.link : null,
                                thumbnail_url: vid.image,
                                description: `Pexels Video by ${vid.user?.name || 'Creator'}`,
                                author: vid.user?.name || 'Pexels Author',
                                source: 'pexels',
                                type: 'video'
                            };
                        }).filter(v => v.url);
                        
                        return res.json({ success: true, videos });
                    } else {
                        const images = (result.photos || []).map(img => ({
                            id: img.id,
                            url: img.src.large,
                            thumbnail_url: img.src.medium,
                            description: img.alt || 'Pexels Photo',
                            author: img.photographer || 'Pexels Photographer',
                            source: 'pexels',
                            type: 'image'
                        }));
                        
                        return res.json({ success: true, images });
                    }
                } catch (err) {
                    console.error('Pexels response parsing error:', err);
                    return res.status(500).json({ success: false, message: 'Failed to parse Pexels response.' });
                }
            });
        }).on('error', (err) => {
            console.error('Pexels API connection error:', err);
            return res.status(500).json({ success: false, message: 'Failed to connect to Pexels API.' });
        });

    } catch (err) {
        console.error('searchPexels error:', err);
        return res.status(500).json({ success: false, message: 'Server error during stock search.' });
    }
};

// 2. Save Selected Media to Database
const saveMedia = async (req, res) => {
    try {
        const { url, type, category } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required.' });
        }
        if (!type || !['image', 'video'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing media type.' });
        }

        const normalizedCategory = normalizeCategory(category);

        // Visibility check when saving
        if (type === 'video' && normalizedCategory !== 'workshop') {
            return res.status(400).json({ success: false, message: 'Videos are only allowed for workshops.' });
        }

        const result = await query(
            'INSERT INTO media_assets (source, url, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
            ['pexels', url, type, normalizedCategory]
        );

        return res.status(201).json({ success: true, media: result.rows[0] });
    } catch (err) {
        console.error('saveMedia error:', err);
        return res.status(500).json({ success: false, message: 'Server error while saving media.' });
    }
};

// 3. Local Upload Fallback
const uploadLocalMedia = async (req, res) => {
    try {
        const { fileData, category } = req.body;

        if (!fileData) {
            return res.status(400).json({ success: false, message: 'File data is required.' });
        }

        const normalizedCategory = normalizeCategory(category);

        // Parse base64 data
        const matches = fileData.match(/^data:([^;]+);base64,([\s\S]+)$/);
        if (!matches || matches.length !== 3) {
            // Check if already a URL
            if (/^https?:\/\//.test(fileData) || fileData.startsWith('/uploads/')) {
                const type = fileData.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image';
                
                if (type === 'video' && normalizedCategory !== 'workshop') {
                    return res.status(400).json({ success: false, message: 'Videos are only allowed for workshops.' });
                }

                const result = await query(
                    'INSERT INTO media_assets (source, url, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
                    ['local', fileData, type, normalizedCategory]
                );
                return res.status(201).json({ success: true, media: result.rows[0] });
            }
            return res.status(400).json({ success: false, message: 'Invalid file data format.' });
        }

        const mime = matches[1];
        const base64Content = matches[2];
        const isImage = mime.startsWith('image/');
        const isVideo = mime.startsWith('video/');

        if (!isImage && !isVideo) {
            return res.status(400).json({ success: false, message: 'Only image and video uploads are allowed.' });
        }

        const type = isVideo ? 'video' : 'image';

        // Enforce visibility rules
        if (type === 'video' && normalizedCategory !== 'workshop') {
            return res.status(400).json({ success: false, message: 'Videos are only allowed for workshops.' });
        }

        const extMap = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/svg+xml': '.svg',
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'video/ogg': '.ogg',
            'video/quicktime': '.mov'
        };
        const ext = extMap[mime] || (isImage ? '.png' : '.mp4');

        // Ensure uploads folder exists
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `${uuidv4()}${ext}`;
        const destPath = path.join(uploadsDir, filename);
        const buffer = Buffer.from(base64Content.replace(/\s/g, ''), 'base64');
        
        fs.writeFileSync(destPath, buffer);

        const localUrl = `/uploads/${filename}`;

        const result = await query(
            'INSERT INTO media_assets (source, url, type, category) VALUES ($1, $2, $3, $4) RETURNING *',
            ['local', localUrl, type, normalizedCategory]
        );

        return res.status(201).json({ success: true, media: result.rows[0] });

    } catch (err) {
        console.error('uploadLocalMedia error:', err);
        return res.status(500).json({ success: false, message: 'Server error during local file upload fallback.' });
    }
};

// 4. Get Saved Media by Category (Public)
const getSavedMedia = async (req, res) => {
    try {
        const rawCategory = req.params.category || '';
        const category = normalizeCategory(rawCategory);

        let result;
        if (category === 'workshop') {
            // Workshops show both images + videos
            result = await query(
                'SELECT * FROM media_assets WHERE category = $1 ORDER BY id DESC',
                [category]
            );
        } else {
            // Services, Vedic, Blog show only images
            result = await query(
                "SELECT * FROM media_assets WHERE category = $1 AND type = 'image' ORDER BY id DESC",
                [category]
            );
        }

        return res.json({ success: true, media: result.rows });
    } catch (err) {
        console.error('getSavedMedia error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching saved media.' });
    }
};

module.exports = {
    searchPexels,
    saveMedia,
    uploadLocalMedia,
    getSavedMedia
};
