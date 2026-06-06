const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getTeam,
    getTeamMember,
    getTeamMemberAllocations,
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
} = require('../controllers/teamController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];

// ── Frontend routes MUST come before /:id routes ──────────────────────────────
router.patch('/profile', authenticate, updateSelfProfile);
router.get('/users', ...adminOnly, getTeamFrontend);
router.post('/users', ...adminOnly, addTeamMemberFrontend);
router.patch('/users/:id', ...adminOnly, updateTeamMemberFrontend);
router.patch('/users/:id/status', ...adminOnly, toggleStatusFrontend);
router.delete('/users/:id', ...adminOnly, deleteTeamMemberFrontend);

router.get('/users/:id/allocations', ...adminOnly, getTeamMemberAllocations);

// ── Postman testing routes ────────────────────────────────────────────────────
router.get('/', ...adminOnly, getTeam);
router.get('/roles', authenticate, getRoles);
router.post('/', ...adminOnly, addTeamMember);
router.put('/:id', ...adminOnly, updateTeamMember);
router.delete('/:id', ...adminOnly, deleteTeamMember);
router.post('/:id/resend-invite', ...adminOnly, resendInvite);
router.get('/:id', ...adminOnly, getTeamMember);

module.exports = router;