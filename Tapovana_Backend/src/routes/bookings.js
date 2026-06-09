const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllBookings,
    getBookingById,
    updateBookingStatus,
    assignTherapist,
    syncFromRender
} = require('../controllers/bookingsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

// Read routes
router.get('/', staffOrAdmin, getAllBookings);
router.get('/:id', staffOrAdmin, getBookingById);

// Admin-only actions
router.patch('/:id/status', ...adminOnly, updateBookingStatus);
router.patch('/:id/therapist', ...adminOnly, assignTherapist);

// Sync from Render API
router.post('/sync', ...adminOnly, syncFromRender);

module.exports = router;