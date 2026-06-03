const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { loginPassword, verifyOtp } = require('../controllers/authController');

// Limit login attempts — max 10 tries per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

// These match exactly what your frontend already calls
router.post('/login/password', loginLimiter, loginPassword);
router.post('/login/otp/verify', loginLimiter, verifyOtp);

module.exports = router;