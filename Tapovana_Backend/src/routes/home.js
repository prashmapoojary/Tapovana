const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getHomeSummary, getAnalyticsDashboard } = require('../controllers/homeController');

// GET /api/home
router.get('/', authenticate, getHomeSummary);

// GET /api/home/analytics/dashboard and /api/analytics/dashboard
router.get('/analytics/dashboard', authenticate, getAnalyticsDashboard);
router.get('/analytics/dashboard', authenticate, getAnalyticsDashboard);

module.exports = router;
