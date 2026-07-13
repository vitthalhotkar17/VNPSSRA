const router = require("express").Router();
const {
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
} = require("../controllers/subjectController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/", getSubjects);                                      // all roles
router.post("/", authorise("admin"), createSubject);
router.put("/:id", authorise("admin"), updateSubject);
router.delete("/:id", authorise("admin"), deleteSubject);

module.exports = router;
