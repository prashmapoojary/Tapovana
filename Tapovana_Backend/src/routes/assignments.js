const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getMyAssignments, completeMyAssignment } = require('../controllers/assignmentsController');

router.get('/my', authenticate, getMyAssignments);
router.patch('/my/complete', authenticate, completeMyAssignment);

module.exports = router;