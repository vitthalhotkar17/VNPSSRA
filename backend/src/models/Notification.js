const mongoose = require("mongoose");

/**
 * Notification — admin broadcasts to students.
 */
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["info", "warning", "success", "alert"],
      default: "info",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["student", "faculty", "admin"],
      default: "student",
    },
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isLeaveRequest: { type: Boolean, default: false },
    leaveRequest: {
      student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      studentName: { type: String, trim: true },
      leaveDate: { type: String, trim: true },
      leaveReason: { type: String, trim: true },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
    },
    // Track who has read this notification
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ targetRole: 1 });
notificationSchema.index({ isActive: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
