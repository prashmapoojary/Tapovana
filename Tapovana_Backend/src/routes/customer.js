const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getCustomers, createCustomer, updateCustomer, archiveCustomer, syncCustomers, deleteCustomer, getCustomerBookings } = require('../controllers/customerController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const superAdminOnly = [authenticate, requireRole('SUPER_ADMIN')];

// GET /api/customer and /api/customers
router.get('/', authenticate, getCustomers);

// POST /api/customer/sync or GET /api/customer/sync - Trigger sync from mobile API
router.post('/sync', authenticate, syncCustomers);
router.get('/sync', authenticate, syncCustomers);

// GET /api/customer/:id/bookings - Fetch customer booking history
router.get('/:id/bookings', authenticate, getCustomerBookings);
router.get('/:id/booking', authenticate, getCustomerBookings);

// POST /api/customer - Create new profile
router.post('/', authenticate, createCustomer);

// PUT /api/customer/:id - Update profile
router.put('/:id', authenticate, updateCustomer);

// DELETE /api/customer/:id - Delete profile
router.delete('/:id', authenticate, deleteCustomer);

// PATCH /api/customer/:id/archive - Archive profile
router.patch('/:id/archive', superAdminOnly, archiveCustomer);

module.exports = router;
