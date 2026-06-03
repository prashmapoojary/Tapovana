const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
    setPasswordViaToken,
    changePassword,
    validateResetToken,
} = require('../controllers/passwordController');

// Public routes — no login needed
// Used when new member clicks the link in their invite email
router.get('/validate-token', validateResetToken);
router.post('/set', setPasswordViaToken);

// Protected route — must be logged in
// Used from the dashboard set-password page
router.post('/change', authenticate, changePassword);

module.exports = router;