const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getAllBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    submitBlog,
    approveBlog,
    rejectBlog,
    archiveBlog,
    restoreBlog,
    trackBlogView,
    toggleBlogLike,
    toggleBlogBookmark,
    addBlogComment,
    moderateComment,
    uploadBlogImage
} = require('../controllers/blogsController');

const adminOnly = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN')];
const staffOrAdmin = [authenticate, requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST')];

// Optional auth middleware — attaches user if token present, doesn't block if absent
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    try {
        // Reuse the full authenticate middleware but catch 401s
        await new Promise((resolve, reject) => {
            authenticate(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    } catch {
        // If auth fails, just continue without user
    }
    next();
};

// Public / Optional auth routes
router.get('/', optionalAuth, getAllBlogs);
router.get('/:id', optionalAuth, getBlogById);
router.post('/:id/view', optionalAuth, trackBlogView);
router.post('/:id/comments', optionalAuth, addBlogComment);

// Authenticated staff/admin routes
router.post('/', ...staffOrAdmin, createBlog);
router.patch('/:id', ...staffOrAdmin, updateBlog);
router.delete('/:id', ...staffOrAdmin, deleteBlog);
router.post('/:id/submit', ...staffOrAdmin, submitBlog);
router.post('/:id/like', authenticate, toggleBlogLike);
router.post('/:id/bookmark', authenticate, toggleBlogBookmark);

// Admin only routes
router.post('/:id/approve', ...adminOnly, approveBlog);
router.post('/:id/reject', ...adminOnly, rejectBlog);
router.post('/:id/archive', ...adminOnly, archiveBlog);
router.post('/:id/restore', ...adminOnly, restoreBlog);
router.patch('/:id/comments/:commentId', ...adminOnly, moderateComment);

module.exports = router;
