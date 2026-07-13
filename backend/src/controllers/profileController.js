const User = require("../models/User");
const { success, error } = require("../utils/response");
const path = require("path");

const normalizeDepartment = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  const departmentMap = {
    co: "Co",
    ej: "Ej",
    mech: "Mech",
    civil: "Civil",
  };

  return departmentMap[normalized] || value || "";
};

// ─── GET /api/profile ─────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    return success(res, { user: req.user }, "Profile fetched");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/profile ─────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, department, rollNo, year, employeeId } = req.body;

    const updates = {};
    if (typeof name !== "undefined") updates.name = name;
    if (typeof rollNo !== "undefined") updates.rollNo = rollNo;
    if (typeof year !== "undefined") updates.year = year;
    if (typeof employeeId !== "undefined") updates.employeeId = employeeId;

    if (typeof department !== "undefined") {
      const normalizedDepartment = normalizeDepartment(department);
      // Only set department when caller explicitly provided a value
      updates.department = normalizedDepartment;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    return success(res, { user }, "Profile updated");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/profile/upload ─────────────────────────────────────────────────
const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) return error(res, "No image uploaded", 400);

    const profileImage = `/uploads/profiles/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage },
      { new: true }
    );

    return success(res, { user, profileImage }, "Profile image uploaded");
  } catch (err) {
    next(err);
  }
};

module.exports = { getProfile, updateProfile, uploadProfileImage };
