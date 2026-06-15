const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getCustomers } = require('../controllers/customerController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];

// GET /api/customer and /api/customers
router.get('/', authenticate, getCustomers);

module.exports = router;
