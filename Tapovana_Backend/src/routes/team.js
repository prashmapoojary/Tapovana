const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getTeam,
    getTeamMember,
    getTeamMemberAllocations,
    getAllAllocations,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resendInvite,
    getRoles,
    getTeamFrontend,
    addTeamMemberFrontend,
    updateTeamMemberFrontend,
    toggleStatusFrontend,
    deleteTeamMemberFrontend,
    updateSelfProfile,
    updateAllocationStatus,
    getPublicSpecialists,
    getPublicTeam,
} = require('../controllers/teamController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];

// ── Public routes for listing team members ───────────────────────────────────
router.get('/public/specialists', getPublicSpecialists);
router.get('/public/users', getPublicTeam);

// ── Frontend routes MUST come before /:id routes ──────────────────────────────
router.patch('/profile', authenticate, updateSelfProfile);
// Allocation-status sync — any authenticated user (DOCTOR/THERAPIST need this)
router.patch('/users/:id/allocation', authenticate, updateAllocationStatus);
router.get('/users', ...adminOnly, getTeamFrontend);
router.post('/users', ...adminOnly, addTeamMemberFrontend);
router.patch('/users/:id', ...adminOnly, updateTeamMemberFrontend);
router.patch('/users/:id/status', ...adminOnly, toggleStatusFrontend);
router.delete('/users/:id', ...adminOnly, deleteTeamMemberFrontend);

router.get('/users/:id/allocations', ...adminOnly, getTeamMemberAllocations);
router.get('/allocations/all', authenticate, getAllAllocations);

// ── Postman testing routes ────────────────────────────────────────────────────
router.get('/', ...adminOnly, getTeam);
router.get('/roles', authenticate, getRoles);
router.post('/', ...adminOnly, addTeamMember);
router.put('/:id', ...adminOnly, updateTeamMember);
router.delete('/:id', ...adminOnly, deleteTeamMember);
router.post('/:id/resend-invite', ...adminOnly, resendInvite);
router.get('/:id', ...adminOnly, getTeamMember);

module.exports = router;