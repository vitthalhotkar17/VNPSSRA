const router = require("express").Router();
const {
  adminDashboard,
  facultyDashboard,
  studentDashboard,
} = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/admin", authorise("admin"), adminDashboard);
router.get("/faculty", authorise("faculty"), facultyDashboard);
router.get("/student", authorise("student"), studentDashboard);

module.exports = router;
