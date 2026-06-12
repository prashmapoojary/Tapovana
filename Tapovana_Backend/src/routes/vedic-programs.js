const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllVedicPrograms,
    createVedicProgram,
    updateVedicProgram,
    updateVedicProgramStaff,
    enrollUserInVedicProgram,
    getVedicProgramAttendees,
    updateVedicAttendeeAttendance,
    deleteVedicProgramAttendee,
    exportVedicProgramAttendees
} = require('../controllers/vedicProgramsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

router.get('/', getAllVedicPrograms);
router.post('/', ...adminOnly, createVedicProgram);
router.patch('/:id', ...adminOnly, updateVedicProgram);
router.patch('/:id/staff', ...adminOnly, updateVedicProgramStaff);

// Attendee Management (Admin Side)
router.post('/:id/enroll', ...adminOnly, enrollUserInVedicProgram);
router.get('/:id/attendees', ...adminOnly, getVedicProgramAttendees);
router.patch('/:id/attendees/:attendeeId', ...adminOnly, updateVedicAttendeeAttendance);
router.delete('/:id/attendees/:attendeeId', ...adminOnly, deleteVedicProgramAttendee);
router.get('/:id/attendees/export', ...adminOnly, exportVedicProgramAttendees);

module.exports = router;
