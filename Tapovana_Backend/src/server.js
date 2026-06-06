require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth");
const passwordRoutes = require("./routes/password");
const teamRoutes = require("./routes/team");
const serviceRoutes = require("./routes/services");
const workshopRoutes = require("./routes/workshops");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 120,
}));

app.get("/health", (_req, res) => {
    res.json({ success: true, status: "ok", service: "tapovana-backend" });
});

app.use("/api/admin", authRoutes);
app.use("/api/admin/password", passwordRoutes);
app.use("/api/admin/team", teamRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/workshops", workshopRoutes);

app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Endpoint not found." });
});

app.use((err, _req, res, _next) => {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
});

app.listen(PORT, () => {
    console.log(`🌿 Tapovana Backend running on port ${PORT}`);
    console.log(`ENV: ${process.env.NODE_ENV || "development"}`);

    // ── Self-ping keep-alive (prevents Render free-tier sleep) ──────────────
    // Pings own /health endpoint every 13 minutes via HTTPS.
    // Works as a secondary layer alongside the GitHub Actions external cron.
    const https = require("https");
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;

    if (SELF_URL) {
        const pingInterval = 13 * 60 * 1000; // 13 minutes

        const selfPing = () => {
            const url = `${SELF_URL}/health`;
            https.get(url, (res) => {
                console.log(`[KeepAlive] ✅ Self-ping OK — ${new Date().toISOString()} (HTTP ${res.statusCode})`);
            }).on("error", (err) => {
                console.warn(`[KeepAlive] ⚠️  Self-ping failed — ${err.message}`);
            });
        };

        // First ping after 2 minutes (let server fully boot), then every 13 min
        setTimeout(() => {
            selfPing();
            setInterval(selfPing, pingInterval);
        }, 2 * 60 * 1000);

        console.log(`[KeepAlive] 🟢 Self-ping scheduled every 13 min → ${SELF_URL}/health`);
    } else {
        console.log("[KeepAlive] ℹ️  RENDER_EXTERNAL_URL not set — self-ping disabled (local dev mode).");
    }
    // ────────────────────────────────────────────────────────────────────────
});

// Export for compatibility
module.exports = app;