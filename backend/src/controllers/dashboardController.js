const User = require("../models/User");
const Session = require("../models/Session");
const Attendance = require("../models/Attendance");
const Assignment = require("../models/Assignment");
const { success } = require("../utils/response");
const { todayString } = require("../utils/dateUtils");

// ─── GET /api/dashboard/admin ─────────────────────────────────────────────────
const adminDashboard = async (req, res, next) => {
  try {
    const today = todayString();

    const [totalStudents, totalFaculty, totalSessions, todayAttendance] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "faculty" }),
      Session.countDocuments(),
      Attendance.countDocuments({ date: today }),
    ]);

    const recentSessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("facultyId", "name");

    return success(
      res,
      { totalStudents, totalFaculty, totalSessions, todayAttendance, recentSessions },
      "Admin dashboard"
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/dashboard/faculty ──────────────────────────────────────────────
const facultyDashboard = async (req, res, next) => {
  try {
    const facultyId = req.user._id;
    const today = todayString();

    const assignment = await Assignment.findOne({ facultyId });
    const subjects = assignment?.subjects || [];

    const [totalSessions, todaySessions, activeSession] = await Promise.all([
      Session.countDocuments({ facultyId }),
      Session.countDocuments({ facultyId, startedAt: { $gte: new Date(today) } }),
      Session.findOne({ facultyId, active: true, expiresAt: { $gt: new Date() } }),
    ]);

    // Latest 5 sessions with attendee counts
    const recentSessions = await Session.find({ facultyId })
      .sort({ createdAt: -1 })
      .limit(5);

    const sessionsWithCount = await Promise.all(
      recentSessions.map(async (s) => {
        const count = await Attendance.countDocuments({ sessionId: s._id });
        return { ...s.toJSON(), attendeeCount: count };
      })
    );

    return success(
      res,
      { subjects, totalSessions, todaySessions, activeSession, recentSessions: sessionsWithCount },
      "Faculty dashboard"
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/dashboard/student ──────────────────────────────────────────────
const studentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const today = todayString();

    const [totalPresent, todayRecord, activeSession] = await Promise.all([
      Attendance.countDocuments({ studentId, status: "Present" }),
      Attendance.findOne({ studentId, date: today }).populate("sessionId", "subject"),
      Session.findOne({ active: true, expiresAt: { $gt: new Date() } }),
    ]);

    // Estimate total possible sessions (all sessions from DB)
    const totalSessions = await Session.countDocuments();
    const percentage = totalSessions
      ? Math.round((totalPresent / totalSessions) * 100)
      : 0;

    const recentRecords = await Attendance.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("sessionId", "subject facultyName");

    return success(
      res,
      {
        totalPresent,
        totalSessions,
        percentage,
        todayRecord,
        activeSession,
        recentRecords,
        hasFace: req.user.faceEmbeddings?.length > 0,
      },
      "Student dashboard"
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { adminDashboard, facultyDashboard, studentDashboard };
