const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { searchImages, searchVideos } = require('../controllers/mediaController');

// Secure endpoints - require login to query stock media
router.get('/search-images', authenticate, searchImages);
router.get('/search-videos', authenticate, searchVideos);

module.exports = router;
