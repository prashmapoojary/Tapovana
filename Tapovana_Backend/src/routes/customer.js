const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getCustomers, createCustomer, updateCustomer, archiveCustomer } = require('../controllers/customerController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const superAdminOnly = [authenticate, requireRole('SUPER_ADMIN')];

// GET /api/customer and /api/customers
router.get('/', authenticate, getCustomers);

// POST /api/customer - Create new profile
router.post('/', authenticate, createCustomer);

// PUT /api/customer/:id - Update profile
router.put('/:id', authenticate, updateCustomer);

// PATCH /api/customer/:id/archive - Archive profile
router.patch('/:id/archive', superAdminOnly, archiveCustomer);

module.exports = router;
