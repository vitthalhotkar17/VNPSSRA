const router = require("express").Router();
const {
  listFacultyForStudent,
  listFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  updateFacultyAcademicYears,
} = require("../controllers/facultyController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);
router.get("/eligible", listFacultyForStudent);
router.get("/", authorise("admin"), listFaculty);
router.get("/:id", authorise("admin"), getFacultyById);
router.post("/", authorise("admin"), createFaculty);
router.put("/:id", authorise("admin"), updateFaculty);
router.put("/:id/academic-years", authorise("admin"), updateFacultyAcademicYears);
router.delete("/:id", authorise("admin"), deleteFaculty);

module.exports = router;
