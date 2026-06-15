const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getHomeSummary } = require('../controllers/homeController');

// GET /api/home
router.get('/', authenticate, getHomeSummary);

module.exports = router;
