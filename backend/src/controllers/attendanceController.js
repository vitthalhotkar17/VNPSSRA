const Attendance = require("../models/Attendance");
const Session = require("../models/Session");
const User = require("../models/User");
const { verifyFaceMatch } = require("../utils/faceMatcher");
const { normalizeAcademicYear } = require("../utils/academicYear");
const { buildFacultyStudentFilter, isFacultyAllowedForDepartment } = require("../utils/departmentAccess");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Send a success response */
const success = (res, message, data = {}, statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

/** Send an error response */
const error = (res, message, statusCode = 400, extra = {}) =>
  res.status(statusCode).json({ success: false, message, ...extra });

/** Return today's date as YYYY-MM-DD in local time */
const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

/** Haversine distance in metres between two lat/lng points */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6_371_000;
  const toR = (deg) => (deg * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/attendance/mark
// @access  Student
// ─────────────────────────────────────────────────────────────────────────────
const markAttendance = async (req, res) => {
  try {
    const {
      sessionId,
      faceImage,
      faceDescriptor,
      lat,
      lng,
      identityProof, // { antiSpoofing: {...} } — from faceIdentityTracker.getProof()
    } = req.body;

    // ── 1. Validate required fields ──────────────────────────────────────────
    if (!sessionId) {
      return error(res, "Session ID is required.", 400);
    }
    if (!faceImage) {
      return error(res, "Live face image is required for attendance verification.", 400);
    }
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return error(res, "A valid live face descriptor is required for attendance verification.", 400);
    }

    // ── 2. Fetch student ─────────────────────────────────────────────────────
    const student = await User.findById(req.user._id).select(
      "name email role isActive academicYear year"
    );
    if (!student || student.role !== "student") {
      return error(res, "Only students can mark attendance.", 403);
    }
    if (!student.isActive) {
      return error(res, "Your account is inactive. Please contact administration.", 403);
    }
    const studentAcademicYear = normalizeAcademicYear(student.academicYear || student.year);
    if (!studentAcademicYear) {
      return error(res, "Your academic year is not assigned.", 403);
    }

    // ── 3. Fetch and validate session ────────────────────────────────────────
    const session = await Session.findById(sessionId);
    if (!session) {
      return error(res, "Session not found.", 404);
    }

    // ── 3a. Verify student's academic year matches session's academic year ────
    const sessionAcademicYear = normalizeAcademicYear(session.academicYear);
    if (sessionAcademicYear !== studentAcademicYear) {
      return error(
        res,
        `This session is for ${session.academicYear}. You can only mark attendance for your year (${studentAcademicYear}).`,
        403
      );
    }

    if (session.department) {
      const studentDepartment = student.department || null;
      if (!studentDepartment || String(studentDepartment) !== String(session.department)) {
        return error(
          res,
          `This session is for ${session.department}. You are registered in ${studentDepartment || "a different department"}.`,
          403
        );
      }
    }

    const now = new Date();

    if (!session.active) {
      return error(res, "This session is no longer active.", 400);
    }

    if (session.expiresAt && now > new Date(session.expiresAt)) {
      return error(res, "Session has expired.", 400);
    }

    if (session.startedAt && now < new Date(session.startedAt)) {
      return error(res, "Session has not started yet.", 400);
    }

    // ── 4. Check student is enrolled in this session ─────────────────────────
    const isEnrolled =
      session.enrolledStudents?.some(
        (id) => id.toString() === student._id.toString()
      ) ?? true; // if no enrollment list, allow all students

    if (!isEnrolled) {
      return error(res, "You are not enrolled in this session.", 403);
    }

    // ── 5. Prevent duplicate attendance ─────────────────────────────────────
    const alreadyMarked = await Attendance.findOne({
      sessionId,
      studentId: student._id,
      date: todayString(),
    });
    if (alreadyMarked) {
      return error(res, "Attendance already marked for this session today.", 409, {
        record: {
          checkIn: alreadyMarked.checkIn,
          status: alreadyMarked.status,
          verificationScore: alreadyMarked.verificationScore,
        },
      });
    }

    // ── 6. Geo-fencing check (if session has a location requirement) ─────────
    if (session.lat != null && session.lng != null) {

      const distance = haversineDistance(
        parseFloat(lat),
        parseFloat(lng),
        session.lat,
        session.lng
      );

      const allowedRadius = session.radius || 500;

      if (distance > allowedRadius) {
        return error(
          res,
          `You are too far from the session location.`,
          400
        );
      }
    }

    // ── 7. Enhanced face verification with anti-spoofing (pure Node, no Python) ──
    const freshStudent = await User.findById(student._id).select("+faceEmbeddings");

    const embeddings = freshStudent.faceEmbeddings?.length ? freshStudent.faceEmbeddings : [];

    if (!embeddings.length) {
      return error(
        res,
        "No face registered for this account. Please register your face first.",
        400
      );
    }

    const result = await verifyFaceMatch({
      descriptor: faceDescriptor,
      storedDescriptors: embeddings,
      image: faceImage,
      antiSpoofData: identityProof,
    });
    const faceVerified = result.verified;
    const verificationScore = result.score || 0;
    const antiSpoofData = identityProof || null;

    if (!faceVerified) {
      const errorMessage =
        result.error || `Face verification failed. (Score: ${verificationScore}%)`;
      return error(res, errorMessage, 400, {
        verified: false,
        score: verificationScore,
        antiSpoofReport: result.antiSpoofReport,
      });
    }

    // ── 8. Determine late status ─────────────────────────────────────────────
    let status = "Present";
    if (session.startTime) {
      const lateThresholdMs = (session.lateThresholdMinutes ?? 15) * 60 * 1000;
      if (now - new Date(session.startTime) > lateThresholdMs) {
        status = "Late";
      }
    }

    // ── 9. Create attendance record ──────────────────────────────────────────
    const record = await Attendance.create({
      sessionId,
      studentId: student._id,
      studentName: student.name,
      subject: session.subject,
      academicYear: student.academicYear,
      date: todayString(),
      checkIn: now,
      faceVerified,
      verificationScore,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      status,
      antiSpoofMetrics: antiSpoofData,
    });

    return success(res, "Attendance marked successfully.", {
      record: {
        id: record._id,
        status: record.status,
        checkIn: record.checkIn,
        subject: record.subject,
        verificationScore: record.verificationScore,
        faceVerified: record.faceVerified,
      },
    }, 201);
  } catch (err) {
    console.error("[markAttendance]", err);
    return error(res, "Internal server error.", 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/attendance/check-in
// @access  Student
// ─────────────────────────────────────────────────────────────────────────────
const checkIn = async (req, res) => {
  try {
    const { sessionId, lat, lng } = req.body;

    if (!sessionId) return error(res, "Session ID is required.", 400);

    const session = await Session.findById(sessionId);
    if (!session) return error(res, "Session not found.", 404);
    if (!session.isActive) return error(res, "Session is not active.", 400);

    // Check if student already has an open check-in
    const existing = await Attendance.findOne({
      sessionId,
      studentId: req.user._id,
      date: todayString(),
    });

    if (existing?.checkIn && !existing?.checkOut) {
      return error(res, "You are already checked in to this session.", 409, {
        checkIn: existing.checkIn,
      });
    }
    if (existing?.checkOut) {
      return error(res, "You have already checked out of this session.", 409);
    }

    let record;
    if (existing) {
      existing.checkIn = new Date();
      existing.lat = lat ? parseFloat(lat) : existing.lat;
      existing.lng = lng ? parseFloat(lng) : existing.lng;
      await existing.save();
      record = existing;
    } else {
      // Fetch student to get academicYear
      const student = await User.findById(req.user._id).select("name academicYear");
      record = await Attendance.create({
        sessionId,
        studentId: req.user._id,
        studentName: student.name,
        subject: session.subject,
        academicYear: student.academicYear,
        date: todayString(),
        checkIn: new Date(),
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        status: "Present",
        faceVerified: false,
      });
    }

    return success(res, "Checked in successfully.", {
      record: { id: record._id, checkIn: record.checkIn, status: record.status },
    }, 201);
  } catch (err) {
    console.error("[checkIn]", err);
    return error(res, "Internal server error.", 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/attendance/check-out
// @access  Student
// ─────────────────────────────────────────────────────────────────────────────
const checkOut = async (req, res) => {
  try {
    const { sessionId, lat, lng } = req.body;

    if (!sessionId) return error(res, "Session ID is required.", 400);

    const record = await Attendance.findOne({
      sessionId,
      studentId: req.user._id,
      date: todayString(),
    });

    if (!record) return error(res, "No check-in record found for this session.", 404);
    if (!record.checkIn) return error(res, "You have not checked in yet.", 400);
    if (record.checkOut) return error(res, "You have already checked out.", 409);

    const now = new Date();
    record.checkOut = now;
    record.duration = Math.round((now - record.checkIn) / 60000); // minutes
    record.checkOutLat = lat ? parseFloat(lat) : null;
    record.checkOutLng = lng ? parseFloat(lng) : null;
    await record.save();

    return success(res, "Checked out successfully.", {
      record: {
        id: record._id,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        duration: `${record.duration} minutes`,
        status: record.status,
      },
    });
  } catch (err) {
    console.error("[checkOut]", err);
    return error(res, "Internal server error.", 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/attendance/history
// @access  Student
// @query   page, limit, subject, from, to
// ─────────────────────────────────────────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const { subject, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const filter = { studentId: req.user._id };
    if (subject) filter.subject = subject;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1, checkIn: -1 })
        .skip(skip)
        .limit(limit)
        .select("-antiSpoofMetrics")
        .populate("sessionId", "subject startTime endTime location"),
      Attendance.countDocuments(filter),
    ]);

    // Summary stats
    const allRecords = await Attendance.find({ studentId: req.user._id }).select("status");
    const stats = allRecords.reduce(
      (acc, r) => {
        acc.total++;
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { total: 0, Present: 0, Late: 0, Absent: 0 }
    );
    stats.percentage =
      stats.total > 0 ? Math.round(((stats.Present + stats.Late) / stats.total) * 100) : 0;

    return success(res, "Attendance history fetched.", {
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats,
      records,
    });
  } catch (err) {
    console.error("[getHistory]", err);
    return error(res, "Internal server error.", 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/attendance/student/:id
// @access  Admin, Faculty
// @query   page, limit, subject, from, to
// ─────────────────────────────────────────────────────────────────────────────
const getStudentAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const student = await User.findById(id).select("name email role department");
    if (!student) return error(res, "Student not found.", 404);
    if (student.role !== "student") return error(res, "User is not a student.", 400);

    const isOwnProfile = req.user?.role === "student" && req.user?._id?.toString() === id;
    if (req.user?.role === "student" && !isOwnProfile) {
      return error(res, "You are not authorised to view that student's attendance.", 403);
    }

    if (req.user?.role === "faculty" && !isFacultyAllowedForDepartment(req.user, student.department)) {
      return error(res, "You are not authorised to view that student's attendance.", 403);
    }

    const filter = { studentId: id };
    if (subject) filter.subject = subject;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1, checkIn: -1 })
        .skip(skip)
        .limit(limit)
        .select("-antiSpoofMetrics")
        .populate("sessionId", "subject startTime endTime location"),
      Attendance.countDocuments(filter),
    ]);

    // Per-subject breakdown
    const allRecords = await Attendance.find({ studentId: id }).select("status subject");
    const subjectMap = {};
    for (const r of allRecords) {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = { total: 0, present: 0 };
      subjectMap[r.subject].total++;
      if (r.status === "Present" || r.status === "Late") subjectMap[r.subject].present++;
    }
    const subjectBreakdown = Object.entries(subjectMap).map(([sub, d]) => ({
      subject: sub,
      total: d.total,
      present: d.present,
      percentage: Math.round((d.present / d.total) * 100),
    }));

    const overallTotal = allRecords.length;
    const overallPresent = allRecords.filter((r) => ["Present", "Late"].includes(r.status)).length;
    const overallAbsent = overallTotal - overallPresent;

    return success(res, "Student attendance fetched.", {
      student: { id: student._id, name: student.name, email: student.email },
      summary: {
        total: overallTotal,
        present: overallPresent,
        absent: overallAbsent,
        percentage: overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0,
      },
      subjectBreakdown,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      records,
    });
  } catch (err) {
    console.error("[getStudentAttendance]", err);
    return error(res, "Internal server error.", 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/attendance/session/:id
// @access  Admin, Faculty
// ─────────────────────────────────────────────────────────────────────────────
const getSessionAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id);
    if (!session) return error(res, "Session not found.", 404);

    const records = await Attendance.find({ sessionId: id })
      .sort({ checkIn: 1 })
      .select("-antiSpoofMetrics")
      .populate("studentId", "name email rollNumber");

    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === "Present").length,
      late: records.filter((r) => r.status === "Late").length,
      absent: records.filter((r) => r.status === "Absent").length,
    };
    summary.presentPercentage =
      summary.total > 0 ? Math.round(((summary.present + summary.late) / summary.total) * 100) : 0;

    return success(res, "Session attendance fetched.", {
      session: {
        id: session._id,
        subject: session.subject,
        startTime: session.startTime,
        endTime: session.endTime,
        isActive: session.isActive,
      },
      summary,
      records,
    });
  } catch (err) {
    console.error("[getSessionAttendance]", err);
    return error(res, "Internal server error.", 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route   GET /api/attendance/report
// @access  Admin, Faculty
// @query   from, to, subject, studentId, format (json|summary)
// ─────────────────────────────────────────────────────────────────────────────
const getReport = async (req, res) => {
  try {
    const { from, to, subject, studentId, format = "json" } = req.query;

    const filter = {};
    if (subject) filter.subject = subject;
    if (studentId) filter.studentId = studentId;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    if (req.user?.role === "faculty") {
      const facultyScopedStudents = await User.find(buildFacultyStudentFilter(req.user, { role: "student" })).select("_id");
      const scopedStudentIds = facultyScopedStudents.map((student) => student._id.toString());
      if (studentId) {
        if (!scopedStudentIds.includes(studentId.toString())) {
          return error(res, "You are not authorised to view that student's attendance.", 403);
        }
      } else {
        filter.studentId = { $in: scopedStudentIds };
      }
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1, checkIn: -1 })
      .populate("studentId", "name email rollNumber")
      .populate("sessionId", "subject startTime endTime");

    if (format === "summary") {
      // Aggregate per-student summary
      const studentMap = {};
      for (const r of records) {
        const key = r.studentId?._id?.toString() || r.studentId?.toString();
        const name = r.studentId?.name || r.studentName || "Unknown";
        if (!studentMap[key]) {
          studentMap[key] = { studentId: key, name, total: 0, present: 0, late: 0, absent: 0 };
        }
        studentMap[key].total++;
        if (r.status === "Present") studentMap[key].present++;
        else if (r.status === "Late") studentMap[key].late++;
        else studentMap[key].absent++;
      }

      const summary = Object.values(studentMap).map((s) => ({
        ...s,
        percentage: Math.round(((s.present + s.late) / s.total) * 100),
      }));

      const lowAttendance = summary.filter((s) => s.percentage < 75);

      return success(res, "Attendance report (summary) generated.", {
        generatedAt: new Date(),
        filters: { from, to, subject, studentId },
        totalRecords: records.length,
        totalStudents: summary.length,
        lowAttendance,
        summary,
      });
    }

    // Default: full records
    return success(res, "Attendance report generated.", {
      generatedAt: new Date(),
      filters: { from, to, subject, studentId },
      totalRecords: records.length,
      records,
    });
  } catch (err) {
    console.error("[getReport]", err);
    return error(res, "Internal server error.", 500);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  markAttendance,
  checkIn,
  checkOut,
  getHistory,
  getStudentAttendance,
  getSessionAttendance,
  getReport,
};
