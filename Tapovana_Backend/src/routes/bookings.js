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

const doctorOnly = [authenticate, requireRole('DOCTOR')];
const adminOrDoctor = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR')];

// Read routes — public, no auth required
router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.post('/', createBooking);

// Doctor-only actions (staff allocation & booking confirmation)
router.post('/:id/notify', ...doctorOnly, sendBookingNotificationOnly);
router.patch('/:id/status', ...doctorOnly, updateBookingStatus);
router.patch('/:id/therapist', ...doctorOnly, assignTherapist);

// Admin & Doctor deletion & sync
router.delete('/:id', ...adminOrDoctor, deleteBooking);
router.post('/sync', ...adminOrDoctor, syncFromRender);

module.exports = router;