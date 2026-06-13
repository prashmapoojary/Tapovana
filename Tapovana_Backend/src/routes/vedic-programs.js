const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllVedicPrograms,
    createVedicProgram,
    updateVedicProgram,
    getVedicProgramStaff,
    updateVedicProgramStaff,
    registerAttendee,
    enrollUserInVedicProgram,
    getVedicProgramAttendees,
    updateVedicAttendeeAttendance,
    checkinAttendee,
    cancelVedicProgram,
    deleteVedicProgramAttendee,
    exportVedicProgramAttendees,
    deleteVedicProgram
} = require('../controllers/vedicProgramsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

router.get('/', getAllVedicPrograms);
router.post('/', ...adminOnly, createVedicProgram);
router.patch('/:id', ...adminOnly, updateVedicProgram);

// Staff management
router.get('/:id/staff', ...adminOnly, getVedicProgramStaff);
router.post('/:id/staff', ...adminOnly, updateVedicProgramStaff);
router.patch('/:id/staff', ...adminOnly, updateVedicProgramStaff); // back-compat

// Cancel program
router.patch('/:id/cancel', ...adminOnly, cancelVedicProgram);

router.delete('/:id', ...adminOnly, deleteVedicProgram);

// Public Registration
router.post('/:id/register', registerAttendee);

// Attendee Management (Admin Side)
router.post('/:id/enroll', ...adminOnly, enrollUserInVedicProgram);
router.get('/:id/attendees', ...adminOnly, getVedicProgramAttendees);
router.patch('/:id/attendees/:attendeeId/checkin', ...adminOnly, checkinAttendee);
router.patch('/:id/attendees/:attendeeId', ...adminOnly, updateVedicAttendeeAttendance);
router.delete('/:id/attendees/:attendeeId', ...adminOnly, deleteVedicProgramAttendee);
router.get('/:id/attendees/export', ...adminOnly, exportVedicProgramAttendees);

module.exports = router;
