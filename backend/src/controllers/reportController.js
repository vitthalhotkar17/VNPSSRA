const Attendance = require("../models/Attendance");
const Session = require("../models/Session");
const User = require("../models/User");
const { success } = require("../utils/response");

// ─── GET /api/reports/student ─────────────────────────────────────────────────
const studentReport = async (req, res, next) => {
  try {
    const studentId = req.query.studentId || req.user._id;
    const { startDate, endDate } = req.query;

    const filter = { studentId };
    if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };

    const records = await Attendance.find(filter)
      .populate("sessionId", "subject facultyName startedAt")
      .sort({ date: -1 });

    const totalSessions = await Session.countDocuments();
    const present = records.filter((r) => r.status === "Present").length;

    return success(
      res,
      {
        records,
        summary: {
          total: totalSessions,
          present,
          absent: Math.max(0, totalSessions - present),
          percentage: totalSessions ? Math.round((present / totalSessions) * 100) : 0,
        },
      },
      "Student report"
    );
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/faculty ─────────────────────────────────────────────────
const facultyReport = async (req, res, next) => {
  try {
    const facultyId = req.query.facultyId || req.user._id;
    const { startDate, endDate } = req.query;

    const sessionFilter = { facultyId };
    if (startDate && endDate) {
      sessionFilter.startedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    const sessions = await Session.find(sessionFilter).sort({ startedAt: -1 });

    const sessionsWithData = await Promise.all(
      sessions.map(async (s) => {
        const attendees = await Attendance.countDocuments({ sessionId: s._id });
        return { ...s.toJSON(), attendees };
      })
    );

    return success(res, { sessions: sessionsWithData }, "Faculty report");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/subject ─────────────────────────────────────────────────
const subjectReport = async (req, res, next) => {
  try {
    const { subject, startDate, endDate } = req.query;

    const sessionFilter = {};
    if (subject) sessionFilter.subject = subject;
    if (startDate && endDate) {
      sessionFilter.startedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + "T23:59:59"),
      };
    }

    const sessions = await Session.find(sessionFilter);
    const sessionIds = sessions.map((s) => s._id);

    const records = await Attendance.find({ sessionId: { $in: sessionIds } })
      .populate("studentId", "name rollNo department")
      .populate("sessionId", "subject startedAt facultyName")
      .sort({ date: -1 });

    return success(res, { records, sessionCount: sessions.length }, "Subject report");
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/date ────────────────────────────────────────────────────
const dateReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return success(res, { records: [] }, "No date provided");

    const records = await Attendance.find({ date })
      .populate("studentId", "name email rollNo department")
      .populate("sessionId", "subject facultyName")
      .sort({ checkIn: 1 });

    return success(res, { records, count: records.length }, "Date report");
  } catch (err) {
    next(err);
  }
};

module.exports = { studentReport, facultyReport, subjectReport, dateReport };
