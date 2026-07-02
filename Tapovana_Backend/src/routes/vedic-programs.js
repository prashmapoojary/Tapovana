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
    deleteVedicProgram,
    getVedicProgramImage,
    getVedicPackageMembers,
    updateVedicPackageMember,
    deleteVedicPackageMember
} = require('../controllers/vedicProgramsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

router.get('/', getAllVedicPrograms);
router.get('/:id/image', getVedicProgramImage);
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
router.post('/attendees', ...adminOnly, enrollUserInVedicProgram);
router.patch('/attendees/:id/status', ...adminOnly, updateVedicAttendeeAttendance);
router.patch('/attendees/:id/checkin', ...adminOnly, checkinAttendee);
router.patch('/attendees/:id', ...adminOnly, updateVedicAttendeeAttendance);
router.delete('/attendees/:id', ...adminOnly, deleteVedicProgramAttendee);

router.post('/enroll', ...adminOnly, enrollUserInVedicProgram);
router.post('/:id/enroll', ...adminOnly, enrollUserInVedicProgram);
router.get('/:id/attendees', ...adminOnly, getVedicProgramAttendees);
router.patch('/:id/attendees/:attendeeId/checkin', ...adminOnly, checkinAttendee);
router.patch('/:id/attendees/:attendeeId', ...adminOnly, updateVedicAttendeeAttendance);
router.delete('/:id/attendees/:attendeeId', ...adminOnly, deleteVedicProgramAttendee);
router.get('/:id/attendees/export', ...adminOnly, exportVedicProgramAttendees);

// Mobile Registrations (Vedic Package Members)
router.get('/packages/members', ...adminOnly, getVedicPackageMembers);
router.get('/:id/packages/members', ...adminOnly, getVedicPackageMembers);
router.patch('/packages/members/:id', ...adminOnly, updateVedicPackageMember);
router.delete('/packages/members/:id', ...adminOnly, deleteVedicPackageMember);

module.exports = router;
