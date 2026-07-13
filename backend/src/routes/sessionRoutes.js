const router = require("express").Router();
const {
  startSession,
  endSession,
  getSessions,
  getActiveSession,
} = require("../controllers/sessionController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/active", getActiveSession);                              // all roles — student needs this
router.get("/", authorise("admin", "faculty"), getSessions);
router.post("/start", authorise("faculty"), startSession);
router.put("/end/:id", authorise("faculty", "admin"), endSession);

module.exports = router;
