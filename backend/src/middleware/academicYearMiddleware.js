const { error } = require("../utils/response");

/**
 * validateStudentAcademicYear — ensures a student can only access sessions/attendance
 * for their own academic year.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
const validateStudentAcademicYear = (req, res, next) => {
  try {
    // Only apply to students
    if (req.user.role !== "student") {
      return next();
    }

    // Student must have an academic year assigned
    if (!req.user.academicYear) {
      return error(res, "Your academic year is not assigned. Please contact administration.", 403);
    }

    // Attach student's academic year to request for controller use
    req.studentAcademicYear = req.user.academicYear;
    next();
  } catch (err) {
    return error(res, "Error validating academic year access", 500);
  }
};

/**
 * validateFacultyAcademicYear — ensures a faculty can only create sessions
 * for their assigned academic years.
 * 
 * Expected in request body: academicYear (from frontend)
 */
const validateFacultyAcademicYear = (req, res, next) => {
  try {
    // Only apply to faculty
    if (req.user.role !== "student") {
      return next();
    }

    const { academicYear } = req.body;

    if (!academicYear) {
      return error(res, "Academic year is required to start a session.", 400);
    }

    // Check if faculty has permission for this year
    if (!req.user.assignedYears.includes(academicYear)) {
      return error(
        res,
        `You are not authorized to manage ${academicYear}. Contact your admin to update your permissions.`,
        403
      );
    }

    // Attach year to request for controller use
    req.sessionAcademicYear = academicYear;
    next();
  } catch (err) {
    return error(res, "Error validating faculty academic year access", 500);
  }
};

/**
 * validateSessionAcademicYear — validates that:
 * - Students can only access sessions from their own academic year
 * - Faculty can only access sessions from their assigned years
 * - Admin can access all sessions
 * 
 * Expected in request query or body: academicYear (optional filter)
 */
const validateSessionAcademicYear = (req, res, next) => {
  try {
    const { academicYear } = req.query || req.body;

    // Admin has full access
    if (req.user.role === "admin") {
      return next();
    }

    // Student can only access their own year
    if (req.user.role === "student") {
      if (academicYear && academicYear !== req.user.academicYear) {
        return error(
          res,
          "You can only access sessions for your assigned academic year.",
          403
        );
      }
      req.yearFilter = req.user.academicYear;
      return next();
    }

    // Faculty can only access their assigned years
    if (req.user.role === "faculty") {
      if (academicYear && !req.user.assignedYears.includes(academicYear)) {
        return error(
          res,
          "You are not authorized to access this academic year.",
          403
        );
      }
      if (academicYear) {
        req.yearFilter = academicYear;
      } else {
        // Default to all assigned years for faculty
        req.yearFilter = req.user.assignedYears;
      }
      return next();
    }

    next();
  } catch (err) {
    return error(res, "Error validating session academic year access", 500);
  }
};

/**
 * validateAttendanceAcademicYear — ensures students can only mark attendance
 * for sessions in their academic year.
 */
const validateAttendanceAcademicYear = (req, res, next) => {
  try {
    // Only apply to students marking attendance
    if (req.user.role !== "student") {
      return next();
    }

    if (!req.user.academicYear) {
      return error(res, "Your academic year is not assigned.", 403);
    }

    req.studentAcademicYear = req.user.academicYear;
    next();
  } catch (err) {
    return error(res, "Error validating attendance academic year", 500);
  }
};

module.exports = {
  validateStudentAcademicYear,
  validateFacultyAcademicYear,
  validateSessionAcademicYear,
  validateAttendanceAcademicYear,
};
