const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllWorkshops,
    getWorkshopById,
    createWorkshop,
    updateWorkshop,
    deleteWorkshop,
    updateWorkshopStaff,
    completeWorkshopAllocation
} = require('../controllers/workshopController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

// Read routes (public)
router.get('/', getAllWorkshops);
router.get('/:id', getWorkshopById);

// Admin CRUD
router.post('/', ...adminOnly, createWorkshop);
router.patch('/:id', ...adminOnly, updateWorkshop);
router.delete('/:id', ...adminOnly, deleteWorkshop);

// Staff allocation
router.patch('/:id/staff', ...adminOnly, updateWorkshopStaff);
router.patch('/:id/complete', staffOrAdmin, completeWorkshopAllocation);

module.exports = router;