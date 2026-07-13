const { body } = require("express-validator");

const loginRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const registerStudentRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("rollNo").trim().notEmpty().withMessage("Roll number is required"),
  body("department").trim().notEmpty().withMessage("Department is required"),
];

const forgotPasswordRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
];

const resetPasswordRules = [
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];

module.exports = {
  loginRules,
  registerStudentRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
};
