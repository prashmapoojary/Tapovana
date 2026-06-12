const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllMemberships,
    getMembershipById,
    createMembership,
    updateMembership,
    deleteMembership,
    getAllTiers,
    updateTier,
    syncFromRender
} = require('../controllers/membershipController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];

// ─── Public routes (no auth needed — for mobile app) ─────────────────
router.get('/', getAllMemberships);
router.get('/:id', getMembershipById);
router.get('/tiers', getAllTiers);

// ─── Admin-only routes ───────────────────────────────────────────────
router.put('/tiers/:name', ...adminOnly, updateTier);
router.post('/', ...adminOnly, createMembership);
router.patch('/:id', ...adminOnly, updateMembership);
router.delete('/:id', ...adminOnly, deleteMembership);
router.post('/sync', ...adminOnly, syncFromRender);

module.exports = router;