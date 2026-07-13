const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Session = require("../models/Session");
const Setting = require("../models/Setting");
const Department = require("../models/Department");
const { success, error } = require("../utils/response");
const generateToken = require("../utils/generateToken");
const { isValidDescriptor, checkImageQuality } = require("../utils/faceMatcher");
const { normalizeSettings } = require("../utils/settings");
const { buildFacultyStudentFilter, isFacultyAllowedForDepartment } = require("../utils/departmentAccess");
const { getNextEnrollmentNo } = require("../utils/enrollmentNo");
const path = require("path");

// ─── GET /api/admin/users ────────────────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { role, department, academicYear } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    // Filter students by academicYear
    if (academicYear && role === "student") {
      filter.academicYear = academicYear;
    }
    // Filter faculty by assignedYears
    if (academicYear && role === "faculty") {
      filter.assignedYears = { $in: [academicYear] };
    }
    const users = await User.find(filter).sort({ createdAt: -1 });
    return success(res, { users }, "Users fetched");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/attendance ───────────────────────────────────────────────
const getAllAttendance = async (req, res, next) => {
  try {
    const { date, sessionId, studentId, academicYear } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (sessionId) filter.sessionId = sessionId;
    if (studentId) filter.studentId = studentId;
    if (academicYear) filter.academicYear = academicYear;

    const records = await Attendance.find(filter)
      .populate("studentId", "name email rollNo department academicYear")
      .populate("sessionId", "subject facultyName startedAt academicYear")
      .sort({ createdAt: -1 });

    return success(res, { records }, "Attendance fetched");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/attendance/:id ──────────────────────────────────────────
const getAttendanceById = async (req, res, next) => {
  try {
    const record = await Attendance.findById(req.params.id)
      .populate("studentId", "name email rollNo department")
      .populate("sessionId", "subject facultyName startedAt");

    if (!record) return error(res, "Attendance record not found", 404);
    return success(res, { record }, "Record fetched");
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/admin/user/:id ──────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, "User not found", 404);
    if (user.role === "admin") return error(res, "Cannot delete admin account", 403);
    await User.findByIdAndDelete(req.params.id);
    return success(res, {}, "User deleted");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/students ────────────────────────────────────────────────
const registerStudent = async (req, res, next) => {
  try {
    const { name, email, password, rollNo, department, year, semester, division, contact, faceImageBase64, academicYear } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return error(res, "Email already registered", 409);

    // Validate academicYear
    const validYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];
    if (!academicYear || !validYears.includes(academicYear)) {
      return error(res, "A valid academic year must be selected for the student", 400);
    }

    let faceImage = null;
    let faceSignature = null;
    let faceEmbeddings = [];

    const faceDescriptor = req.body.faceDescriptor;
    if (faceDescriptor) {
      if (!isValidDescriptor(faceDescriptor)) {
        return error(res, "A valid face descriptor is required to register face data.", 400);
      }
      faceEmbeddings = [faceDescriptor];
    }

    if (faceImageBase64) {
      const images = Array.isArray(faceImageBase64) ? faceImageBase64 : [faceImageBase64];
      faceImage = images[0];
      faceSignature = Array.isArray(req.body.faceSignature) ? req.body.faceSignature : null;

      if (faceImage && faceEmbeddings.length) {
        const quality = await checkImageQuality(faceImage);
        if (!quality.passed) {
          return error(res, `Registration image quality failed: ${quality.reason}`, 400);
        }
      }
    }

    if (req.file) {
      const filePath = `/uploads/faces/${req.file.filename}`;
      faceImage = filePath;
      faceSignature = Array.isArray(req.body.faceSignature) ? req.body.faceSignature : null;
    }

    const latestStudent = await User.findOne({ role: "student", enrollmentNo: { $exists: true, $ne: null } })
      .sort({ enrollmentNo: -1 })
      .select("enrollmentNo");

    const enrollmentNo = getNextEnrollmentNo(latestStudent?.enrollmentNo);

    const student = await User.create({
      name,
      email,
      password: password || "student123",
      role: "student",
      rollNo,
      enrollmentNo,
      department,
      contact: contact || "N/A",
      year: year ? parseInt(year) : undefined,
      semester,
      division,
      faceImage,
      faceSignature,
      faceEmbeddings,
      academicYear,
    });

    return success(res, { student }, "Student registered", 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/students ─────────────────────────────────────────────────
const getStudents = async (req, res, next) => {
  try {
    const { department, academicYear } = req.query;
    const filter = { role: "student" };

    if (req.user?.role === "faculty") {
      if (department && !isFacultyAllowedForDepartment(req.user, department)) {
        return error(res, "You are not authorised to view that department.", 403);
      }
      const scopedFilter = buildFacultyStudentFilter(req.user, filter);
      // Faculty can only see students from their assigned academic years
      if (academicYear) {
        if (!req.user.assignedYears.includes(academicYear)) {
          return error(res, "You are not authorized to view this academic year", 403);
        }
        scopedFilter.academicYear = academicYear;
      }
      const students = await User.find(scopedFilter).sort({ name: 1 });
      return success(res, { students }, "Students fetched");
    }

    if (department) filter.department = department;
    if (academicYear) filter.academicYear = academicYear;
    const students = await User.find(filter).sort({ name: 1 });
    return success(res, { students }, "Students fetched");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/students/:id ─────────────────────────────────────────────
const getStudentById = async (req, res, next) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) return error(res, "Student not found", 404);

    if (req.user?.role === "faculty" && !isFacultyAllowedForDepartment(req.user, student.department)) {
      return error(res, "You are not authorised to view that student.", 403);
    }

    return success(res, { student }, "Student fetched");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/admin/students/:id ─────────────────────────────────────────────
const updateStudent = async (req, res, next) => {
  try {
    const { name, email, rollNo, department, year, semester, division, contact, isActive } = req.body;
    const student = await User.findOneAndUpdate(
      { _id: req.params.id, role: "student" },
      { name, email, rollNo, department, year, semester, division, contact, isActive },
      { new: true, runValidators: true }
    );
    if (!student) return error(res, "Student not found", 404);
    return success(res, { student }, "Student updated");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/faculty ──────────────────────────────────────────────────
const registerFaculty = async (req, res, next) => {
  try {
    const { name, email, password, department, employeeId, contact } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return error(res, "Email already registered", 409);

    const faculty = await User.create({
      name,
      email,
      password: password || "faculty123",
      role: "faculty",
      department,
      employeeId,
      contact: contact || "N/A",
    });

    return success(res, { faculty }, "Faculty registered", 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/faculty ───────────────────────────────────────────────────
const getFaculty = async (req, res, next) => {
  try {
    const faculty = await User.find({ role: "faculty" }).sort({ name: 1 });
    return success(res, { faculty }, "Faculty fetched");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/faculty/:id ───────────────────────────────────────────────
const getFacultyById = async (req, res, next) => {
  try {
    const f = await User.findOne({ _id: req.params.id, role: "faculty" });
    if (!f) return error(res, "Faculty not found", 404);
    return success(res, { faculty: f }, "Faculty fetched");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/admin/faculty/:id ───────────────────────────────────────────────
const updateFaculty = async (req, res, next) => {
  try {
    const { name, email, department, employeeId, contact, isActive } = req.body;
    const faculty = await User.findOneAndUpdate(
      { _id: req.params.id, role: "faculty" },
      { name, email, department, employeeId, contact, isActive },
      { new: true, runValidators: true }
    );
    if (!faculty) return error(res, "Faculty not found", 404);
    return success(res, { faculty }, "Faculty updated");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/faculty/:id/reset-password ──────────────────────────────
const resetFacultyPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return error(res, "Password must be at least 6 characters", 400);

    const faculty = await User.findOne({ _id: req.params.id, role: "faculty" }).select("+password");
    if (!faculty) return error(res, "Faculty not found", 404);

    faculty.password = password;
    await faculty.save();
    return success(res, {}, "Faculty password reset");
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/admin/students/:id/reset-password ─────────────────────────────
const resetStudentPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6)
      return error(res, "Password must be at least 6 characters", 400);

    const student = await User.findOne({ _id: req.params.id, role: "student" }).select("+password");
    if (!student) return error(res, "Student not found", 404);

    student.password = password;
    await student.save();
    return success(res, {}, "Student password reset");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const [totalStudents, totalFaculty, totalSessions, totalAttendance, totalDepartments, facultyByDepartment] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "faculty" }),
      Session.countDocuments(),
      Attendance.countDocuments(),
      Department.countDocuments(),
      User.aggregate([
        { $match: { role: "faculty" } },
        { $group: { _id: "$department", count: { $sum: 1 } } },
      ]),
    ]);

    const departmentStats = await Department.find({}, "name code").lean();
    const departmentMap = new Map(departmentStats.map((d) => [String(d._id), d]));
    const departmentBreakdown = facultyByDepartment.map((item) => ({
      departmentId: item._id,
      departmentName: departmentMap.get(String(item._id))?.name || "Unassigned",
      facultyCount: item.count,
    }));

    const recentSessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("facultyId", "name");

    return success(
      res,
      {
        totalStudents,
        totalFaculty,
        totalSessions,
        totalAttendance,
        totalDepartments,
        departmentBreakdown,
        recentSessions,
      },
      "Admin dashboard"
    );
  } catch (err) {
    next(err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const setting = await Setting.findOne().sort({ createdAt: -1 });
    return success(res, { settings: normalizeSettings(setting ? setting.toObject() : {}) }, "Settings fetched");
  } catch (err) {
    next(err);
  }
};

const saveSettings = async (req, res, next) => {
  try {
    const payload = normalizeSettings(req.body || {});
    const settings = await Setting.findOneAndUpdate(
      {},
      { $set: { ...payload, updatedBy: req.user?._id || null } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return success(res, { settings: normalizeSettings(settings.toObject()) }, "Settings saved");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getAllAttendance,
  getAttendanceById,
  deleteUser,
  registerStudent,
  getStudents,
  getStudentById,
  updateStudent,
  registerFaculty,
  getFaculty,
  getFacultyById,
  updateFaculty,
  resetFacultyPassword,
  resetStudentPassword,
  getDashboard,
  getSettings,
  saveSettings,
};
