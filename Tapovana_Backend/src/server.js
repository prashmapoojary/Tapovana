require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const passwordRoutes = require('./routes/password');
const teamRoutes = require('./routes/team');
const serviceRoutes = require("./routes/services");
const workshopRoutes = require("./routes/workshops");

const app = express();
const PORT = process.env.PORT || 5000;

// Security — relax crossOriginResourcePolicy so the frontend can load /uploads images
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS – allow both the configured FRONTEND_URL and localhost in dev
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // allow non-browser requests (Postman / curl) and whitelisted origins
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use("/api/services", serviceRoutes);
app.use("/api/workshops", workshopRoutes);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// Error handler
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});


const assignmentRoutes = require("./routes/assignments");
app.use("/api/assignments", assignmentRoutes);

app.listen(PORT, () => {
    console.log(`\n🌿 Tapovana Backend running on port ${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
});