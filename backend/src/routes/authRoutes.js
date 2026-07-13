const router = require("express").Router();
const {
  login,
  register,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validationMiddleware");
const {
  loginRules,
  registerStudentRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
} = require("../validators/authValidation");

// Public routes
router.post("/login", loginRules, validate, login);
router.post("/register", registerStudentRules, validate, register);
router.post("/logout", logout);
router.post("/forgot-password", forgotPasswordRules, validate, forgotPassword);
router.post("/reset-password", resetPasswordRules, validate, resetPassword);

// Protected routes
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePasswordRules, validate, changePassword);

module.exports = router;
