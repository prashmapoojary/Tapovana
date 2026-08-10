const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getTransactions, createTransaction, syncTransactions } = require('../controllers/transactionController');

// GET /api/transaction and /api/transactions
router.get('/', authenticate, getTransactions);

// POST /api/transaction/sync or GET /api/transaction/sync - Trigger sync from mobile API
router.post('/sync', authenticate, syncTransactions);
router.get('/sync', authenticate, syncTransactions);

// POST /api/transaction - Log transaction record
router.post('/', authenticate, createTransaction);

module.exports = router;
