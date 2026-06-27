// Reload trigger
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
const bookingRoutes = require("./routes/bookings");
const membershipRoutes = require("./routes/memberships");
const workshopRoutes = require("./routes/workshops");
const vedicProgramRoutes = require("./routes/vedic-programs");
const blogsRoutes = require("./routes/blogs");
const customerRoutes = require("./routes/customer");
const transactionRoutes = require("./routes/transaction");
const homeRoutes = require("./routes/home");
const mediaRoutes = require("./routes/media");

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
    max: process.env.NODE_ENV === 'production' ? 120 : 999999, // Disabled for dev to avoid 429
}));

app.get("/health", async (_req, res) => {
    try {
        const { query } = require('./config/db');
        await query('SELECT 1');
        res.json({ success: true, status: "ok", database: "connected", service: "tapovana-backend" });
    } catch (err) {
        console.error('[Health Check] Database ping failed:', err.message);
        res.status(500).json({ success: false, status: "error", message: "Database connection failed", error: err.message });
    }
});

app.use("/api/admin", authRoutes);
app.use("/api/admin/password", passwordRoutes);
app.use("/api/admin/team", teamRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/vedic-programs", vedicProgramRoutes);
app.use("/api/blogs", blogsRoutes);
app.use("/api/media", mediaRoutes);
app.post("/api/uploads/blog-image", require("./middleware/auth").authenticate, require("./middleware/auth").requireRole('SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST'), require("./controllers/blogsController").uploadBlogImage);
app.post("/api/vedicpackages", require("./controllers/vedicProgramsController").registerAttendeeFromMobile);
app.post("/api/vedic-packages/members", require("./controllers/vedicProgramsController").registerAttendeeFromMobile);
app.use("/api/certificates", require("./routes/certificates"));
app.get("/certificates/:id", require("./controllers/certificatesController").downloadCertificatePdf);
app.get("/download/certificate/:id", require("./controllers/certificatesController").downloadCertificatePdf);
app.get("/api/download/certificate/:id", require("./controllers/certificatesController").downloadCertificatePdf);
app.get("/api/certificates/download/:id", require("./controllers/certificatesController").downloadCertificatePdf);
app.get("/api/analytics/dashboard", require("./middleware/auth").authenticate, require("./controllers/homeController").getAnalyticsDashboard);

app.use("/api/customer", customerRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/transaction", transactionRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/home", homeRoutes);

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

    // ── Self-ping keep-alive (prevents Render free-tier sleep & Neon suspension) ─
    // Pings own /health endpoint every 4 minutes via HTTPS.
    // Keeps Neon serverless DB warm (auto-suspends on 5 min inactivity) and pooled connections active.
    const https = require("https");
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;

    if (SELF_URL) {
        const pingInterval = 4 * 60 * 1000; // 4 minutes

        const selfPing = () => {
            const url = `${SELF_URL}/health`;
            https.get(url, (res) => {
                console.log(`[KeepAlive] ✅ Self-ping OK — ${new Date().toISOString()} (HTTP ${res.statusCode})`);
            }).on("error", (err) => {
                console.warn(`[KeepAlive] ⚠️  Self-ping failed — ${err.message}`);
            });
        };

        // First ping after 1 minute (let server fully boot), then every 4 min
        setTimeout(() => {
            selfPing();
            setInterval(selfPing, pingInterval);
        }, 1 * 60 * 1000);

        console.log(`[KeepAlive] 🟢 Self-ping scheduled every 4 min → ${SELF_URL}/health`);
    } else {
        console.log("[KeepAlive] ℹ️  RENDER_EXTERNAL_URL not set — self-ping disabled (local dev mode).");
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Startup Migration: convert base64 images in database to files ─────────
    const migrateExistingBase64Images = async () => {
        try {
            const { query } = require("./config/db");
            const { v4: uuidv4 } = require("uuid");
            const fs = require("fs");
            const path = require("path");
            const UPLOADS_DIR = path.join(__dirname, "../uploads");

            // Helper to ensure uploads dir
            const ensureUploads = () => {
                if (!fs.existsSync(UPLOADS_DIR)) {
                    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
                }
            };

            const extMap = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'image/svg+xml': '.svg'
            };

            // 1. Migrate Services
            const result = await query("SELECT id, name, image_url FROM services WHERE image_url LIKE 'data:image/%'");
            if (result.rows.length > 0) {
                console.log(`[Migration] Found ${result.rows.length} services with base64 images. Converting to files...`);
                ensureUploads();
                for (const row of result.rows) {
                    const matches = row.image_url.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,([\s\S]+)$/);
                    if (matches && matches.length === 4) {
                        const mime = matches[1];
                        const ext = extMap[mime] || '.png';
                        const buffer = Buffer.from(matches[3].replace(/\s/g, ''), 'base64');
                        const filename = uuidv4() + ext;
                        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
                        
                        const newUrl = '/uploads/' + filename;
                        await query('UPDATE services SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
                        console.log(`[Migration] Converted image for service: "${row.name}" -> ${newUrl}`);
                    }
                }
            }

            // 2. Migrate Workshops
            const wsResult = await query("SELECT id, title, image_url FROM workshops WHERE image_url LIKE 'data:image/%'");
            if (wsResult.rows.length > 0) {
                console.log(`[Migration] Found ${wsResult.rows.length} workshops with base64 images. Converting to files...`);
                ensureUploads();
                for (const row of wsResult.rows) {
                    const matches = row.image_url.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,([\s\S]+)$/);
                    if (matches && matches.length === 4) {
                        const mime = matches[1];
                        const ext = extMap[mime] || '.png';
                        const buffer = Buffer.from(matches[3].replace(/\s/g, ''), 'base64');
                        const filename = uuidv4() + ext;
                        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
                        
                        const newUrl = '/uploads/' + filename;
                        await query('UPDATE workshops SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
                        console.log(`[Migration] Converted image for workshop: "${row.title}" -> ${newUrl}`);
                    }
                }
            }

            // 3. Migrate Vedic Programs
            const vpResult = await query("SELECT id, title, image_url FROM vedic_programs WHERE image_url LIKE 'data:image/%'");
            if (vpResult.rows.length > 0) {
                console.log(`[Migration] Found ${vpResult.rows.length} vedic programs with base64 images. Converting to files...`);
                ensureUploads();
                for (const row of vpResult.rows) {
                    const matches = row.image_url.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,([\s\S]+)$/);
                    if (matches && matches.length === 4) {
                        const mime = matches[1];
                        const ext = extMap[mime] || '.png';
                        const buffer = Buffer.from(matches[3].replace(/\s/g, ''), 'base64');
                        const filename = uuidv4() + ext;
                        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
                        
                        const newUrl = '/uploads/' + filename;
                        await query('UPDATE vedic_programs SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
                        console.log(`[Migration] Converted image for program: "${row.title}" -> ${newUrl}`);
                    }
                }
            }

            console.log("[Migration] Database base64 images migration complete.");
        }

            // Convert absolute /uploads/ paths back to relative /uploads/ paths
            const absoluteResult = await query("SELECT id, name, image_url FROM services WHERE image_url LIKE '%/uploads/%'");
            if (absoluteResult.rows.length > 0) {
                console.log(`[Migration] Found ${absoluteResult.rows.length} services with absolute uploads URLs. Normalizing to relative...`);
                for (const row of absoluteResult.rows) {
                    if (row.image_url.includes('/uploads/')) {
                        const filename = row.image_url.split('/uploads/').pop();
                        const newUrl = '/uploads/' + filename;
                        if (row.image_url !== newUrl) {
                            await query('UPDATE services SET image_url = $1 WHERE id = $2', [newUrl, row.id]);
                            console.log(`[Migration] Converted absolute to relative for: "${row.name}" -> ${newUrl}`);
                        }
                    }
                }
                console.log("[Migration] Database relative URLs migration complete.");
            }
        } catch (err) {
            console.error('[Migration] Error migrating base64 images:', err);
        }
    };

    // Run DB base64 images conversion immediately on boot
    migrateExistingBase64Images()
        .then(() => console.log("[Migration] Startup migration check finished."))
        .catch(err => console.error("[Migration] Startup migration check failed:", err));
    // ────────────────────────────────────────────────────────────────────────

    // ── Background workshop status check & notification scheduler ───────────
    const { autoUpdateWorkshopStatuses } = require("./controllers/workshopController");
    let workshopUpdateRunning = false;
    // Run immediately on boot
    autoUpdateWorkshopStatuses()
        .then(() => console.log("[Workshop Scheduler] Initial status check complete."))
        .catch(err => console.error("[Workshop Scheduler] Initial status check failed:", err));

    // Run every 60 seconds (with overlap guard to prevent Neon pool starvation)
    setInterval(async () => {
        if (workshopUpdateRunning) {
            console.warn("[Workshop Scheduler] Previous run still in progress, skipping...");
            return;
        }
        workshopUpdateRunning = true;
        try {
            await autoUpdateWorkshopStatuses();
        } catch (err) {
            const { isTransientError } = require("./config/db");
            if (isTransientError(err)) {
                console.warn("[Workshop Scheduler] Transient database connection timeout/termination (Neon cold-start). Retrying next cycle...");
            } else {
                console.error("Error in background workshop status update:", err);
            }
        } finally {
            workshopUpdateRunning = false;
        }
    }, 60000);

    // ── Background Vedic Program status check & allocations sync scheduler ──
    const { autoUpdateVedicProgramStatuses, sendVedicProgramReminders } = require("./controllers/vedicProgramsController");
    let vedicUpdateRunning = false;
    // Run immediately on boot
    autoUpdateVedicProgramStatuses()
        .then(() => {
            console.log("[Vedic Program Scheduler] Initial status check complete.");
            return sendVedicProgramReminders();
        })
        .then(() => console.log("[Vedic Program Scheduler] Initial reminders check complete."))
        .catch(err => console.error("[Vedic Program Scheduler] Initial Vedic Program checks failed:", err));

    // Run every 60 seconds (with overlap guard)
    setInterval(async () => {
        if (vedicUpdateRunning) {
            console.warn("[Vedic Program Scheduler] Previous run still in progress, skipping...");
            return;
        }
        vedicUpdateRunning = true;
        try {
            await autoUpdateVedicProgramStatuses();
        } catch (err) {
            const { isTransientError } = require("./config/db");
            if (isTransientError(err)) {
                console.warn("[Vedic Program Scheduler] Transient database connection timeout/termination (Neon cold-start). Retrying next cycle...");
            } else {
                console.error("Error in background Vedic Program status update:", err);
            }
        } finally {
            vedicUpdateRunning = false;
        }
    }, 60000);

    // Run reminders check every 2 hours
    let lastRemindersSentDate = "";
    setInterval(async () => {
        const now = new Date();
        const dateKey = now.toISOString().split("T")[0];
        if (lastRemindersSentDate !== dateKey) {
            try {
                await sendVedicProgramReminders();
                lastRemindersSentDate = dateKey;
            } catch (err) {
                console.error("Error running daily reminders job:", err);
            }
        }
    }, 2 * 60 * 60 * 1000);

    // ── Monthly Refresh Job (Midnight on the 15th of every month) ───────────
    let lastMonthlyRefreshDate = "";
    setInterval(async () => {
        const now = new Date();
        const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-15`;
        if (now.getDate() === 15 && now.getHours() === 0 && now.getMinutes() === 0) {
            if (lastMonthlyRefreshDate !== dateKey) {
                console.log("[Scheduler] Running monthly workshop refresh job...");
                try {
                    await autoUpdateWorkshopStatuses();
                    lastMonthlyRefreshDate = dateKey;
                } catch (err) {
                    console.error("[Scheduler] Monthly refresh job error:", err);
                }
            }
        }
    }, 60000);
    // ────────────────────────────────────────────────────────────────────────

    // ── Background Blog Scheduled Publishing Cron ───────────────────────────
    const { publishScheduledBlogs } = require("./controllers/blogsController");
    publishScheduledBlogs()
        .then(() => console.log("[Blog Scheduler] Initial scheduled blogs check complete."))
        .catch(err => console.error("[Blog Scheduler] Initial check failed:", err));

    // Run every 60 seconds
    setInterval(() => {
        publishScheduledBlogs().catch(err => console.error("Error in blog scheduled publishing:", err));
    }, 60000);
    // ────────────────────────────────────────────────────────────────────────
});

// Export for compatibility
module.exports = app;
