const router = require("express").Router();
const {
  getProfile,
  updateProfile,
  uploadProfileImage,
} = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");
const { uploadProfile } = require("../middleware/uploadMiddleware");

router.use(protect);

router.get("/", getProfile);
router.put("/", updateProfile);
router.post("/upload", uploadProfile.single("profileImage"), uploadProfileImage);

module.exports = router;
