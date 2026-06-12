const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllBookings,
    getBookingById,
    updateBookingStatus,
    assignTherapist,
    syncFromRender,
    deleteBooking,
    sendBookingNotificationOnly
} = require('../controllers/bookingsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

// Read routes — public, no auth required
router.get('/', getAllBookings);
router.get('/:id', getBookingById);

// Admin-only actions
router.post('/:id/notify', ...adminOnly, sendBookingNotificationOnly);
router.patch('/:id/status', ...adminOnly, updateBookingStatus);
router.patch('/:id/therapist', ...adminOnly, assignTherapist);
router.delete('/:id', ...adminOnly, deleteBooking);

// Sync from Render API
router.post('/sync', ...adminOnly, syncFromRender);

module.exports = router;