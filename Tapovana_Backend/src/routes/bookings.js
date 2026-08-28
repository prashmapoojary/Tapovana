const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllBookings,
    getBookingById,
    updateBookingStatus,
    assignTherapist,
    syncFromRender,
    deleteBooking,
    sendBookingNotificationOnly,
    createBooking
} = require('../controllers/bookingsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'SUPER ADMIN', 'CO_ADMIN', 'CO ADMIN', 'ADMIN', 'DOCTOR')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'SUPER ADMIN', 'CO_ADMIN', 'CO ADMIN', 'ADMIN', 'DOCTOR', 'THERAPIST')];

// Read routes — accessible by all staff and admins
router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);

// CRUD & Allocation actions — Super Admin & Co-Admin ONLY
router.post('/:id/notify', ...adminOnly, sendBookingNotificationOnly);
router.patch('/:id/status', ...adminOnly, updateBookingStatus);
router.patch('/:id/therapist', ...adminOnly, assignTherapist);
router.delete('/:id', ...adminOnly, deleteBooking);
router.post('/sync', ...adminOnly, syncFromRender);

module.exports = router;