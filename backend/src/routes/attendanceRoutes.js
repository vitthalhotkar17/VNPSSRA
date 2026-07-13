const router = require("express").Router();
const {
  markAttendance,
  checkIn,
  checkOut,
  getHistory,
  getStudentAttendance,
  getSessionAttendance,
  getReport,
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);

// Student routes
router.post("/mark", authorise("student"), markAttendance);
router.post("/check-in", authorise("student"), checkIn);
router.post("/check-out", authorise("student"), checkOut);
router.get("/history", authorise("student"), getHistory);

// Shared / admin / faculty / student routes
router.get("/student/:id", authorise("admin", "faculty", "student"), getStudentAttendance);
router.get("/session/:id", authorise("admin", "faculty"), getSessionAttendance);
router.get("/report", authorise("admin", "faculty"), getReport);

module.exports = router;
