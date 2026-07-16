const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const errorHandler = require("./middleware/errorHandler");
const User = require("./models/User"); // needed for the temporary debug route below

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

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());

const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://0.0.0.0:5173",
  "https://vnpssra.vercel.app"
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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "SAMS API is running", timestamp: new Date() });
});

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
app.use("/api/departments",   departmentRoutes);
app.use("/api/faculty",       facultyRoutes);

app.get("/api/debug-departments", async (req, res) => {
  try {
    const faculty = await User.find({ role: "faculty" }).select("name department").lean();
    const students = await User.find({ role: "student" }).select("name department").lean();

    res.json({
      faculty: faculty.map(f => ({ name: f.name, department: f.department, type: typeof f.department })),
      students: students.map(s => ({ name: s.name, department: s.department, type: typeof s.department })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

module.exports = app;
