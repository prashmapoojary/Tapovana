const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
    requestPasswordResetOtp,
    verifyPasswordResetOtpAndSetPassword,
    changePassword,
    requestForceChangeOtp,
    verifyForceChangeOtpAndSetPassword
} = require('../controllers/passwordController');

// Public routes for OTP-based password resets
router.post('/forgot/request', requestPasswordResetOtp);
router.post('/forgot/verify', verifyPasswordResetOtpAndSetPassword);

// Protected route — must be logged in
// Used from the dashboard set-password page
router.post('/change', authenticate, changePassword);

// Protected routes for Force Change Password OTP flow
router.post('/force-change/request-otp', authenticate, requestForceChangeOtp);
router.post('/force-change/verify', authenticate, verifyForceChangeOtpAndSetPassword);

module.exports = router;