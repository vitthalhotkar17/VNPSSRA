const router = require("express").Router();
const {
  registerFace,
  verifyFace,
  getFaceData,
  deleteFaceData,
} = require("../controllers/faceController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");
const { uploadFace } = require("../middleware/uploadMiddleware");

router.use(protect);

router.post("/register", uploadFace.single("faceFile"), registerFace);
router.post("/verify", authorise("student"), verifyFace);
router.get("/student/:id", authorise("admin", "faculty"), getFaceData);
router.delete("/student/:id", authorise("admin"), deleteFaceData);

module.exports = router;
