const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getTransactions } = require('../controllers/transactionController');

// GET /api/transaction and /api/transactions
router.get('/', authenticate, getTransactions);

module.exports = router;
