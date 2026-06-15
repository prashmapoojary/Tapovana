const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getTransactions, createTransaction } = require('../controllers/transactionController');

// GET /api/transaction and /api/transactions
router.get('/', authenticate, getTransactions);

// POST /api/transaction - Log transaction record
router.post('/', authenticate, createTransaction);

module.exports = router;
