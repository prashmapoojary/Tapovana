const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllVedicPrograms,
    createVedicProgram,
    updateVedicProgram,
    updateVedicProgramStaff
} = require('../controllers/vedicProgramsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

router.get('/', getAllVedicPrograms);
router.post('/', ...adminOnly, createVedicProgram);
router.patch('/:id', ...adminOnly, updateVedicProgram);
router.patch('/:id/staff', ...adminOnly, updateVedicProgramStaff);

module.exports = router;
