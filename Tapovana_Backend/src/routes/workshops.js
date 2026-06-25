const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllWorkshops,
    getWorkshopById,
    createWorkshop,
    updateWorkshop,
    deleteWorkshop,
    updateWorkshopStaff,
    completeWorkshopAllocation,
    enrollUserInWorkshop,
    getWorkshopAttendees,
    updateAttendeeAttendance,
    exportWorkshopAttendees,
    deleteWorkshopAttendee,
    uploadVideoChunk,
    streamWorkshopVideo
} = require('../controllers/workshopController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

// Read routes (public)
router.get('/', getAllWorkshops);
router.get('/certificates/download/:id', require('../controllers/certificatesController').downloadCertificatePdf);
router.get('/:id', getWorkshopById);

// Public User Enrollment (Mobile Side Simulation)
router.post('/enroll', enrollUserInWorkshop);
router.post('/:id/enroll', enrollUserInWorkshop);
router.get('/:id/video', streamWorkshopVideo);

// Admin CRUD
router.post('/', ...adminOnly, createWorkshop);
router.patch('/:id', ...adminOnly, updateWorkshop);
router.delete('/:id', ...adminOnly, deleteWorkshop);
router.post('/:id/video/chunk', ...adminOnly, uploadVideoChunk);

// Staff allocation
router.patch('/:id/staff', ...adminOnly, updateWorkshopStaff);
router.patch('/:id/complete', staffOrAdmin, completeWorkshopAllocation);

// Attendee Management (Admin Side)
router.get('/:id/attendees', ...adminOnly, getWorkshopAttendees);
router.patch('/:id/attendees/:attendeeId', ...adminOnly, updateAttendeeAttendance);
router.delete('/:id/attendees/:attendeeId', ...adminOnly, deleteWorkshopAttendee);
router.get('/:id/attendees/export', ...adminOnly, exportWorkshopAttendees);

module.exports = router;