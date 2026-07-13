const router = require("express").Router();
const {
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.get("/", listDepartments);
router.get("/:id", protect, authorise("admin"), getDepartmentById);
router.post("/", protect, authorise("admin"), createDepartment);
router.put("/:id", protect, authorise("admin"), updateDepartment);
router.delete("/:id", protect, authorise("admin"), deleteDepartment);

module.exports = router;
