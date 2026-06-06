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
    getMyAssignments
} = require('../controllers/servicesController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

// ─── My Assignments ─────────────────────────────────────────────────────
router.get('/my/assignments', authenticate, getMyAssignments);

// ─── Read routes ────────────────────────────────────────────────────────
router.get('/', staffOrAdmin, getAllServices);
router.get('/:id', staffOrAdmin, getServiceById);

// ─── Admin-only CRUD ────────────────────────────────────────────────────
router.post('/', ...adminOnly, createService);
router.patch('/:id', ...adminOnly, updateService);
router.delete('/:id', ...adminOnly, deleteService);

// ─── Staff allocation routes ────────────────────────────────────────────
router.get('/:id/allocations', staffOrAdmin, getServiceAllocations);
router.patch('/:id/staff', ...adminOnly, updateServiceStaff);
router.patch('/:id/complete', staffOrAdmin, completeServiceAllocation);  // ← Changed!

module.exports = router;