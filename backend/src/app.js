const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const errorHandler = require("./middleware/errorHandler");

// ─── Route imports ────────────────────────────────────────────────────────────
const authRoutes          = require("./routes/authRoutes");
const adminRoutes         = require("./routes/adminRoutes");
const attendanceRoutes    = require("./routes/attendanceRoutes");
const sessionRoutes       = require("./routes/sessionRoutes");
const subjectRoutes       = require("./routes/subjectRoutes");
const assignmentRoutes    = require("./routes/assignmentRoutes");
const faceRoutes          = require("./routes/faceRoutes");
const dashboardRoutes     = require("./routes/dashboardRoutes");
const reportRoutes        = require("./routes/reportRoutes");
const profileRoutes       = require("./routes/profileRoutes");
const notificationRoutes  = require("./routes/notificationRoutes");
const chatbotRoutes       = require("./routes/chatbotRoutes");
const departmentRoutes    = require("./routes/departmentRoutes");
const facultyRoutes       = require("./routes/facultyRoutes");

const app = express();

// ─── Security & Performance middleware ────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://0.0.0.0:5173",
].filter(Boolean);

app.use(cors({
  origin: isDev
    ? true
    : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ─── Logger ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── Static files ────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "SAMS API is running 🚀", timestamp: new Date() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/attendance",    attendanceRoutes);
app.use("/api/sessions",      sessionRoutes);
app.use("/api/subjects",      subjectRoutes);
app.use("/api/assignments",   assignmentRoutes);
app.use("/api/faces",         faceRoutes);
app.use("/api/chatbot",       chatbotRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/reports",       reportRoutes);
app.use("/api/profile",       profileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/departments",    departmentRoutes);
app.use("/api/faculty",        facultyRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
