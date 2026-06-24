const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllCertificates,
    getCertificateStats,
    generateCertificatesForWorkshop,
    getCertificateDetails,
    getPublicCertificateDetails,
    downloadCertificatePdf,
    resendCertificateEmail
} = require('../controllers/certificatesController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];

// Public endpoints
router.get('/download/:certificateId', downloadCertificatePdf);
router.get('/public/:certificateId', getPublicCertificateDetails);

// Protected endpoints
router.get('/stats', ...adminOnly, getCertificateStats);
router.get('/', ...adminOnly, getAllCertificates);
router.post('/generate/:workshopId', ...adminOnly, generateCertificatesForWorkshop);
router.get('/:certificateId', authenticate, getCertificateDetails);
router.post('/resend/:certificateId', ...adminOnly, resendCertificateEmail);

module.exports = router;
