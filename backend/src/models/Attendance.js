const mongoose = require("mongoose");

/**
 * Attendance — one record per student per session.
 * Stores face verification score, GPS coordinates, anti-spoof metrics, and timestamps.
 */
const attendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    studentName: {
      type: String,
      trim: true,
    },

    // Denormalized for fast reporting
    subject: {
      type: String,
      trim: true,
    },

    // YYYY-MM-DD
    date: {
      type: String,
      required: true,
    },

    // Check-in / Check-out
    checkIn: {
      type: Date,
      default: Date.now,
    },

    checkOut: {
      type: Date,
      default: null,
    },

    // Face Verification
    faceVerified: {
      type: Boolean,
      default: false,
    },

    verificationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // AI Anti-Spoof Metrics (Hidden from normal queries)
    antiSpoofMetrics: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },

    // GPS Location
    lat: {
      type: Number,
      default: null,
    },

    lng: {
      type: Number,
      default: null,
    },

    // Attendance Status
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      default: "Present",
    },

    // Academic Year
    academicYear: {
      type: String,
      enum: ["First Year", "Second Year", "Third Year", "Fourth Year"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance for same student in same session
attendanceSchema.index(
  { sessionId: 1, studentId: 1 },
  { unique: true }
);

// Reporting indexes
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ academicYear: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);