const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    updateServiceStaff,
    completeServiceAllocation,
    getServiceAllocations,
    getMyAssignments       // ← This was missing!
} = require('../controllers/servicesController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

// ─── My Assignments (must be BEFORE /:id routes) ─────────────────────────
router.get('/my/assignments', staffOrAdmin, getMyAssignments);

// ─── Read routes (public) ────────────────────────────────────────────────
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// ─── Admin-only CRUD ─────────────────────────────────────────────────────
router.post('/', ...adminOnly, createService);
router.patch('/:id', ...adminOnly, updateService);
router.delete('/:id', ...adminOnly, deleteService);

// ─── Staff allocation routes ─────────────────────────────────────────────
router.get('/:id/allocations', staffOrAdmin, getServiceAllocations);
router.patch('/:id/staff', ...adminOnly, updateServiceStaff);
router.patch('/:id/complete', staffOrAdmin, completeServiceAllocation);

module.exports = router;