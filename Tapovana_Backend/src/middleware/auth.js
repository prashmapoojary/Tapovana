const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
require('dotenv').config();

const authenticate = async (req, res, next) => {
    let authHeader = req.headers.authorization;

    if (!authHeader && req.query.token) {
        authHeader = `Bearer ${req.query.token}`;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        console.error('JWT verification error:', err.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    try {
        const result = await query(
            'SELECT tm.id, tm.email, tm.first_name, tm.last_name, tm.status, tm.role_id, r.name AS role, r.access FROM team_members tm JOIN roles r ON r.id = tm.role_id WHERE tm.id = $1',
            [decoded.sub]
        );

        if (!result.rows.length) {
            return res.status(401).json({ success: false, message: 'Account not found.' });
        }

        // Allow pending status for force password change flow
        // Block only inactive accounts
        if (result.rows[0].status === 'inactive') {
            return res.status(401).json({ success: false, message: 'Account is inactive.' });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        console.error('Database query error in auth middleware:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
};

module.exports = { authenticate, requireRole };