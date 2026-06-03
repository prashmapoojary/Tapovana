require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const passwordRoutes = require('./routes/password');
const teamRoutes = require('./routes/team');

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());

// Allow all origins in development
app.use(cors({
    origin: (origin, callback) => {
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 120,
}));

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'tapovana-backend' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/admin', authRoutes);
app.use('/api/admin/password', passwordRoutes);
app.use('/api/admin/team', teamRoutes);
app.use('/api/teams', teamRoutes);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// Error handler
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

app.listen(PORT, () => {
    console.log(`\n🌿 Tapovana Backend running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
});