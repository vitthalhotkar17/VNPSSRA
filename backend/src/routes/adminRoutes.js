const router = require("express").Router();
const {
  getUsers,
  getAllAttendance,
  getAttendanceById,
  deleteUser,
  registerStudent,
  getStudents,
  getStudentById,
  updateStudent,
  registerFaculty,
  getFaculty,
  getFacultyById,
  updateFaculty,
  resetFacultyPassword,
  resetStudentPassword,
  getDashboard,
  getSettings,
  saveSettings,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");
const { uploadFace } = require("../middleware/uploadMiddleware");

router.use(protect);

// Student list is available to both admin and faculty
router.get("/students", authorise("admin", "faculty"), getStudents);
router.get("/students/:id", authorise("admin", "faculty"), getStudentById);

router.use(authorise("admin"));

// Dashboard
router.get("/dashboard", getDashboard);

// Settings
router.get("/settings", getSettings);
router.put("/settings", saveSettings);

// Users (generic)
router.get("/users", getUsers);
router.delete("/user/:id", deleteUser);

// Students
router.post("/students", uploadFace.single("faceFile"), registerStudent);
router.put("/students/:id", updateStudent);
router.post("/students/:id/reset-password", resetStudentPassword);

// Faculty
router.post("/faculty", registerFaculty);
router.get("/faculty", getFaculty);
router.get("/faculty/:id", getFacultyById);
router.put("/faculty/:id", updateFaculty);
router.post("/faculty/:id/reset-password", resetFacultyPassword);

// Attendance (admin read)
router.get("/attendance", getAllAttendance);
router.get("/attendance/:id", getAttendanceById);

module.exports = router;
