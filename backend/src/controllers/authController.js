const crypto = require("crypto");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const generateToken = require("../utils/generateToken");
const { success, error } = require("../utils/response");
const { sendPasswordResetEmail } = require("../services/mailService");
const { isValidDescriptor, checkImageQuality } = require("../utils/faceMatcher");
const { getNextEnrollmentNo } = require("../utils/enrollmentNo");

// ─── POST /api/auth/login ────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    // Fetch user including password (select: false on schema)
    const user = await User.findOne({ email }).select("+password +faceEmbeddings");
    if (!user) return error(res, "Invalid credentials", 401);

    // Optional role check (frontend can pass role to restrict login tab)
    if (role && user.role !== role) return error(res, "Invalid credentials", 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return error(res, "Invalid credentials", 401);

    if (!user.isActive) return error(res, "Account is disabled. Contact admin.", 403);

    const token = generateToken({ id: user._id, role: user.role });

    return success(res, { token, user }, "Login successful");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/register ────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, rollNo, department, year, semester, division, faceImage, contact, academicYear } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return error(res, "Email already registered", 409);

    // Validate academicYear for student registration
    const validYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];
    if (!academicYear || !validYears.includes(academicYear)) {
      return error(res, "A valid academic year must be selected during registration", 400);
    }

    let faceImageValue = null;
    let faceSignature = null;
    let faceEmbeddings = [];

    const faceDescriptor = req.body.faceDescriptor;
    if (faceDescriptor) {
      if (!isValidDescriptor(faceDescriptor)) {
        return error(res, "A valid face descriptor is required to register face data.", 400);
      }
      faceEmbeddings = [faceDescriptor];
    }

    if (faceImage) {
      const images = Array.isArray(faceImage) ? faceImage : [faceImage];
      faceImageValue = images[0];
      faceSignature = Array.isArray(req.body.faceSignature) ? req.body.faceSignature : null;

      if (faceEmbeddings.length) {
        const quality = await checkImageQuality(faceImageValue);
        if (!quality.passed) {
          return error(res, `Registration image quality failed: ${quality.reason}`, 400);
        }
      }
    }

    const latestStudent = await User.findOne({ role: "student", enrollmentNo: { $exists: true, $ne: null } })
      .sort({ enrollmentNo: -1 })
      .select("enrollmentNo");

    const enrollmentNo = getNextEnrollmentNo(latestStudent?.enrollmentNo);

    const student = await User.create({
      name,
      email,
      password,
      role: "student",
      rollNo,
      enrollmentNo,
      department,
      year: year ? parseInt(year) : undefined,
      semester,
      division,
      contact: contact?.trim() || "N/A",
      faceImage: faceImageValue,
      faceSignature,
      faceEmbeddings,
      academicYear,
    });

    const token = generateToken({ id: student._id, role: student.role });

    return success(res, { token, user: student }, "Registration successful", 201);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
// JWT is stateless; client drops the token. Server-side we just respond OK.
const logout = (req, res) => {
  return success(res, {}, "Logged out successfully");
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    // req.user is set by protect middleware
    return success(res, { user: req.user }, "User profile fetched");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond 200 to avoid user enumeration
    if (!user) {
      return success(res, {}, "If that email is registered, you will receive a reset link.");
    }

    // Generate token & store
    const token = crypto.randomBytes(32).toString("hex");
    await PasswordReset.findOneAndDelete({ userId: user._id }); // clear old tokens
    await PasswordReset.create({ userId: user._id, token });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&userId=${user._id}`;
    await sendPasswordResetEmail(user.email, resetLink);

    return success(res, {}, "Password reset link sent to your email.");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, userId, password } = req.body;

    const record = await PasswordReset.findOne({ userId, token });
    if (!record) return error(res, "Invalid or expired reset token.", 400);

    const user = await User.findById(userId);
    if (!user) return error(res, "User not found.", 404);

    user.password = password; // pre-save hook hashes it
    await user.save();
    await PasswordReset.findByIdAndDelete(record._id);

    return success(res, {}, "Password reset successful. You can now login.");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/auth/change-password ──────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return error(res, "Current password is incorrect.", 400);

    user.password = newPassword;
    await user.save();

    return success(res, {}, "Password changed successfully.");
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, logout, getMe, forgotPassword, resetPassword, changePassword };
