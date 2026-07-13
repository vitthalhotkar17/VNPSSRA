const Session = require("../models/Session");
const Assignment = require("../models/Assignment");
const Setting = require("../models/Setting");
const { success, error } = require("../utils/response");
const { normalizeSettings, getGeofenceSettings } = require("../utils/settings");
const { normalizeAcademicYear, isValidAcademicYear } = require("../utils/academicYear");
const { buildDepartmentQuery, isDepartmentMatch } = require("../utils/departmentAccess");

const SESSION_DURATION_MINUTES = 30;

// ─── POST /api/sessions/start ─────────────────────────────────────────────────
const startSession = async (req, res, next) => {
  try {
    const { subject, lat, lng, durationMinutes, academicYear, department } = req.body;
    const faculty = req.user;

    if (!subject) return error(res, "Subject is required", 400);
    if (!academicYear) return error(res, "Academic year is required", 400);

    // Validate academicYear format
    const validYears = ["First Year", "Second Year", "Third Year", "Fourth Year"];
    if (!validYears.includes(academicYear)) {
      return error(res, "Invalid academic year selected", 400);
    }

    // Verify faculty has permission for this academic year
    if (!faculty.assignedYears.includes(academicYear)) {
      return error(res, `You are not authorized to start sessions for ${academicYear}`, 403);
    }

    const requestedDepartment = department ?? faculty.department ?? null;
    const sessionDepartment = requestedDepartment || null;

    // Deactivate any other running session by this faculty for this year and department
    const departmentQuery = sessionDepartment
      ? buildDepartmentQuery(sessionDepartment)
      : { department: null };

    await Session.updateMany(
      { facultyId: faculty._id, active: true, academicYear, ...departmentQuery },
      { active: false, endedAt: new Date() }
    );

    const duration = durationMinutes || SESSION_DURATION_MINUTES;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);

    const persistedSetting = await Setting.findOne().sort({ createdAt: -1 });
    const settings = normalizeSettings(persistedSetting ? persistedSetting.toObject() : {});
    const geofence = getGeofenceSettings(settings);

    const sessionLat = lat != null && lat !== "" ? Number(lat) : geofence.lat;
    const sessionLng = lng != null && lng !== "" ? Number(lng) : geofence.lng;

    const session = await Session.create({
      facultyId: faculty._id,
      facultyName: faculty.name,
      subject,
      academicYear,
      department: sessionDepartment,
      expiresAt,
      lat: sessionLat,
      lng: sessionLng,
      radius: geofence.radius,
      active: true,
    });

    return success(res, { session }, "Attendance session started", 201);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/sessions/end/:id ────────────────────────────────────────────────
const endSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      facultyId: req.user._id, // faculty can only end their own
    });

    if (!session) return error(res, "Session not found", 404);
    if (!session.active) return error(res, "Session is already ended", 400);

    session.active = false;
    session.endedAt = new Date();
    await session.save();

    return success(res, { session }, "Session ended");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/sessions ────────────────────────────────────────────────────────
const getSessions = async (req, res, next) => {
  try {
    const { academicYear, department } = req.query;
    const filter = {};

    // Admin sees all sessions
    if (req.user.role === "admin") {
      if (academicYear) filter.academicYear = academicYear;
    }
    // Faculty sees only their sessions for their assigned years
    else if (req.user.role === "faculty") {
      filter.facultyId = req.user._id;
      if (academicYear) {
        if (!req.user.assignedYears.includes(academicYear)) {
          return error(res, "You are not authorized to view this academic year", 403);
        }
        filter.academicYear = academicYear;
      } else {
        // Default: show all assigned years
        filter.academicYear = { $in: req.user.assignedYears };
      }
    }
    // Student sees active sessions for their own academic year
    else if (req.user.role === "student") {
      const studentAcademicYear = normalizeAcademicYear(req.user.academicYear || req.user.year);
      if (!studentAcademicYear) {
        return error(res, "Your academic year is not assigned", 403);
      }
      filter.academicYear = studentAcademicYear;
      filter.active = true;
    }

    const sessions = await Session.find(filter)
      .populate("facultyId", "name email department")
      .sort({ createdAt: -1 });

    return success(res, { sessions }, "Sessions fetched");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/sessions/active ─────────────────────────────────────────────────
// Optional query param: `academicYear` — when provided, the endpoint will
// return the active session for that academic year (with authorization checks).
const getActiveSession = async (req, res, next) => {
  try {
    const { academicYear, department } = req.query;
    const now = new Date();
    const filter = {
      active: true,
      expiresAt: { $gt: now },
    };

    // If an academicYear is explicitly requested, enforce authorization
    if (academicYear) {
      // Students may only query their own year
      if (req.user.role === "student") {
        const studentAcademicYear = normalizeAcademicYear(req.user.academicYear || req.user.year);
        if (!studentAcademicYear) return error(res, "Your academic year is not assigned", 403);
        if (studentAcademicYear !== normalizeAcademicYear(academicYear)) {
          return error(res, "You are not authorized to view this academic year", 403);
        }
        filter.academicYear = studentAcademicYear;
      }
      // Faculty may only query years they are assigned to
      else if (req.user.role === "faculty") {
        if (!req.user.assignedYears || !req.user.assignedYears.includes(academicYear)) {
          return error(res, "You are not authorized to view this academic year", 403);
        }
        filter.academicYear = academicYear;
      }
      // Admins may query any year
      else {
        filter.academicYear = academicYear;
      }
    } else {
      // Default behaviour: students only see sessions for their year
      if (req.user.role === "student") {
        const studentAcademicYear = normalizeAcademicYear(req.user.academicYear || req.user.year);
        if (!studentAcademicYear) return error(res, "Your academic year is not assigned", 403);
        filter.academicYear = studentAcademicYear;
      }
      // Faculty/admin without academicYear will not further restrict by year
    }

    // Department scoping: if a department is specified, enforce authorization
    if (department) {
      if (req.user.role === "student") {
        if (!req.user.department) return error(res, "Your department is not assigned", 403);
        if (!isDepartmentMatch(req.user.department, department)) {
          return error(res, "You are not authorized to view this department", 403);
        }
      }
      Object.assign(filter, buildDepartmentQuery(department));
    } else {
      // Default: students should only see sessions for their department
      if (req.user.role === "student") {
        if (!req.user.department) return error(res, "Your department is not assigned", 403);
        Object.assign(filter, buildDepartmentQuery(req.user.department));
      }
    }

    const session = await Session.findOne(filter).populate("facultyId", "name department");

    return success(res, { session: session || null }, session ? "Active session found" : "No active session");
  } catch (err) {
    next(err);
  }
};

module.exports = { startSession, endSession, getSessions, getActiveSession };
