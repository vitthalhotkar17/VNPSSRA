const router = require("express").Router();
const {
  studentReport,
  facultyReport,
  subjectReport,
  dateReport,
} = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/student", studentReport);                                      // student sees own; admin/faculty can pass ?studentId=
router.get("/faculty", authorise("admin", "faculty"), facultyReport);
router.get("/subject", authorise("admin", "faculty"), subjectReport);
router.get("/date", authorise("admin", "faculty"), dateReport);

module.exports = router;
