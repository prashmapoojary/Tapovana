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

// For local development
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`🌿 Tapovana Backend running on port ${PORT}`);
        console.log(`ENV: ${process.env.NODE_ENV || "development"}`);
    });
}

// Export for Vercel serverless
module.exports = app;