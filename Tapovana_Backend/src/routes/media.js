const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { searchPexels, saveMedia, uploadLocalMedia, getSavedMedia } = require('../controllers/mediaController');

// Search stock media from Pexels (requires authentication)
router.get('/search', authenticate, searchPexels);

// Save selected media to database (requires authentication)
router.post('/save', authenticate, saveMedia);

// Local upload fallback (requires authentication)
router.post('/upload', authenticate, uploadLocalMedia);

// Retrieve saved media by category (public endpoint)
router.get('/:category', getSavedMedia);

module.exports = router;
