const router = require('express').Router();
const { getReviews, updateReviewStatus, deleteReview } = require('../controllers/reviewsController');

router.get('/', getReviews);
router.patch('/:id/status', updateReviewStatus);
router.delete('/:id', deleteReview);

module.exports = router;
