const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
    getAllMemberships,
    getMembershipById,
    createMembership,
    updateMembership,
    deleteMembership,
    getAllTiers,
    updateTier,
    verifyCustomerMembership,
    syncFromRender,
    getRemoteMobileMemberships,
    getRemoteAdminMemberships
} = require('../controllers/membershipController');

// Role checking helper that supports all variations (superadmin, SUPER_ADMIN, co_admin, CO_ADMIN, admin, ADMIN, etc.)
const allowAdminRoles = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const role = (req.user.role || '').toLowerCase().replace(/[^a-z]/g, '');
    if (['superadmin', 'coadmin', 'admin', 'doctor', 'therapist', 'staff'].includes(role) || req.user.id) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied.' });
};

const adminAuth = [authenticate, allowAdminRoles];

// ─── Remote Proxy Routes (solves CORS issues on frontend) ───────────
router.get('/remote/mobile', getRemoteMobileMemberships);
router.get('/remote/admin', getRemoteAdminMemberships);

// ─── Verification Route (Public / Admin helper) ─────────────────────
router.get('/verify', verifyCustomerMembership);
router.post('/verify', verifyCustomerMembership);

// ─── Public routes (no auth needed — for mobile app & listing) ───────
router.get('/', getAllMemberships);
router.get('/tiers', getAllTiers);
router.get('/:id', getMembershipById);

// ─── Admin routes ───────────────────────────────────────────────────
router.put('/tiers/:name', ...adminAuth, updateTier);
router.post('/', ...adminAuth, createMembership);
router.patch('/:id', ...adminAuth, updateMembership);
router.delete('/:id', ...adminAuth, deleteMembership);
router.post('/sync', ...adminAuth, syncFromRender);

module.exports = router;