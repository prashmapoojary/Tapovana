const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
    requestPasswordResetOtp,
    verifyPasswordResetOtpAndSetPassword,
    changePassword,
} = require('../controllers/passwordController');

// Public routes for OTP-based password resets
router.post('/forgot/request', requestPasswordResetOtp);
router.post('/forgot/verify', verifyPasswordResetOtpAndSetPassword);

// Protected route — must be logged in
// Used from the dashboard set-password page
router.post('/change', authenticate, changePassword);

module.exports = router;