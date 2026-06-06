const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
    setPasswordViaToken,
    changePassword,
    validateResetToken,
    forgotPassword,
    resetPassword,
} = require('../controllers/passwordController');

// Public routes — no login needed
router.get('/validate-token', validateResetToken);
router.post('/set', setPasswordViaToken);
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);

// Protected route — must be logged in
router.post('/change', authenticate, changePassword);

module.exports = router;