const router = require("express").Router();
const {
  createAssignment,
  getAssignments,
  getAssignmentByFaculty,
  deleteAssignment,
} = require("../controllers/assignmentController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);

router.post("/", authorise("admin"), createAssignment);
router.get("/", authorise("admin"), getAssignments);
router.get("/faculty/:id", getAssignmentByFaculty);           // faculty + admin
router.delete("/:id", authorise("admin"), deleteAssignment);

module.exports = router;
