const Notification = require("../models/Notification");
const User = require("../models/User");
const { success, error } = require("../utils/response");
const { sendCustomMessageEmail } = require("../services/mailService");

// ─── POST /api/notifications  (admin, faculty, student for leave requests) ───
const createNotification = async (req, res, next) => {
  try {
    const { title, message, type, targetRole = "student", targetUsers, sendEmail, isLeaveRequest, leaveRequest, studentName } = req.body;
    if (!title || !message) return error(res, "Title and message are required", 400);
    if (!["student", "faculty", "admin"].includes(targetRole)) return error(res, "Invalid recipient role", 400);

    const isLeaveRequestPayload = Boolean(isLeaveRequest || leaveRequest);
    const isBroadcast = !Array.isArray(targetUsers) || targetUsers.length === 0;
    const recipientRole = isLeaveRequestPayload ? targetRole : targetRole;

    if (req.user.role === "student") {
      if (!isLeaveRequestPayload) {
        return error(res, "Students can only submit leave requests.", 403);
      }
      if (!leaveRequest?.leaveDate || !leaveRequest?.leaveReason) {
        return error(res, "Leave date and reason are required", 400);
      }
      if (!(["faculty", "admin"].includes(recipientRole))) {
        return error(res, "Students can send leave requests to faculty or admin only.", 400);
      }
      if (recipientRole === "faculty") {
        if (isBroadcast) {
          return error(res, "Please select a faculty recipient for your leave request.", 400);
        }

        const selectedFacultyIds = Array.isArray(targetUsers) ? targetUsers : [];
        const matchingFaculty = await User.find({
          _id: { $in: selectedFacultyIds },
          role: "faculty",
          isActive: true,
        }).select("_id");

        if (matchingFaculty.length !== selectedFacultyIds.length) {
          return error(res, "Selected faculty recipients are not valid for your department.", 400);
        }
      }
    }

    if (req.user.role === "faculty") {
      if (recipientRole !== "student") {
        return error(res, "Faculty can only send notifications to students.", 403);
      }
      if (isBroadcast) {
        return error(res, "Faculty must select specific students to message.", 403);
      }
    }

    const notification = await Notification.create({
      title,
      message,
      type: type || "info",
      createdBy: req.user._id,
      targetRole: recipientRole,
      targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
      isLeaveRequest: isLeaveRequestPayload,
      leaveRequest: isLeaveRequestPayload
        ? {
            student: req.user._id,
            studentName: studentName || req.user.name,
            leaveDate: leaveRequest?.leaveDate,
            leaveReason: leaveRequest?.leaveReason,
            status: "pending",
          }
        : undefined,
    });

    let emailResult = null;
    if (sendEmail) {
      const filter = { role: targetRole };
      if (!isBroadcast) filter._id = { $in: targetUsers };
      const recipients = await User.find(filter).select("email name");

      const outcomes = await Promise.all(
        recipients
          .filter((r) => r.email)
          .map((r) =>
            sendCustomMessageEmail(r.email, {
              subject: title,
              message,
              senderName: req.user.name,
              type: type || "info",
            })
          )
      );
      emailResult = {
        attempted: recipients.length,
        sent: outcomes.filter(Boolean).length,
      };
    }

    return success(res, { notification, email: emailResult }, "Notification sent", 201);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/notifications  (student/faculty: own + broadcasts) ─────────────
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let filter = { isActive: true };

    if (role === "student" || role === "faculty") {
      filter.$or = [
        { targetUsers: { $size: 0 }, targetRole: role },
        { targetUsers: userId },
      ];

      if (role === "student") {
        filter.$or.push({ isLeaveRequest: true, createdBy: userId });
      }
    }

    const notifications = await Notification.find(filter)
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .limit(50);

    // Add unread flag for each notification
    const withReadStatus = notifications.map((n) => ({
      ...n.toObject(),
      isRead: n.readBy.includes(userId),
    }));

    const unreadCount = withReadStatus.filter((n) => !n.isRead).length;

    return success(res, { notifications: withReadStatus, unreadCount }, "Notifications fetched");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/notifications/:id/read  ────────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: userId },
    });
    return success(res, {}, "Marked as read");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/notifications/read-all  ────────────────────────────────────────
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany(
      { isActive: true },
      { $addToSet: { readBy: userId } }
    );
    return success(res, {}, "All notifications marked as read");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/notifications/:id/approve  (faculty only for leave requests) ──
const approveLeaveRequest = async (req, res, next) => {
  try {
    if (req.user.role !== "faculty") {
      return error(res, "Only faculty can approve leave requests", 403);
    }

    const notif = await Notification.findById(req.params.id);
    if (!notif) return error(res, "Notification not found", 404);
    if (!notif.isLeaveRequest) return error(res, "This notification is not a leave request", 400);

    notif.leaveRequest = {
      ...notif.leaveRequest,
      status: "approved",
      approvedBy: req.user._id,
      approvedAt: new Date(),
    };
    await notif.save();

    // Create a notification targeted to the student informing them of the approval
    try {
      const studentId = notif.leaveRequest?.student;
      const studentName = notif.leaveRequest?.studentName;
      const leaveDate = notif.leaveRequest?.leaveDate;

      if (studentId) {
        const title = "Leave request approved";
        const message = `Your leave request for ${leaveDate || "the selected date"} has been approved by ${req.user.name}.`;

        await Notification.create({
          title,
          message,
          type: "info",
          createdBy: req.user._id,
          targetRole: "student",
          targetUsers: [studentId],
          isLeaveRequest: true,
          leaveRequest: {
            student: studentId,
            studentName: studentName,
            leaveDate: leaveDate,
            leaveReason: notif.leaveRequest?.leaveReason,
            status: "approved",
            approvedBy: req.user._id,
            approvedAt: notif.leaveRequest?.approvedAt || new Date(),
          },
        });
      }
    } catch (err) {
      // non-fatal: log and continue
      console.error("Failed to create student notification for leave approval:", err);
    }

    return success(res, { notification: notif }, "Leave request approved");
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/notifications/:id/reject  (faculty only for leave requests) ──
const rejectLeaveRequest = async (req, res, next) => {
  try {
    if (req.user.role !== "faculty") {
      return error(res, "Only faculty can reject leave requests", 403);
    }

    const notif = await Notification.findById(req.params.id);
    if (!notif) return error(res, "Notification not found", 404);
    if (!notif.isLeaveRequest) return error(res, "This notification is not a leave request", 400);

    notif.leaveRequest = {
      ...notif.leaveRequest,
      status: "rejected",
      approvedBy: req.user._id,
      approvedAt: new Date(),
    };
    await notif.save();

    // Notify the student about the rejection
    try {
      const studentId = notif.leaveRequest?.student;
      const studentName = notif.leaveRequest?.studentName;
      const leaveDate = notif.leaveRequest?.leaveDate;

      if (studentId) {
        const title = "Leave request rejected";
        const message = `Your leave request for ${leaveDate || "the selected date"} has been rejected by ${req.user.name}.`;

        await Notification.create({
          title,
          message,
          type: "info",
          createdBy: req.user._id,
          targetRole: "student",
          targetUsers: [studentId],
          isLeaveRequest: true,
          leaveRequest: {
            student: studentId,
            studentName: studentName,
            leaveDate: leaveDate,
            leaveReason: notif.leaveRequest?.leaveReason,
            status: "rejected",
            approvedBy: req.user._id,
            approvedAt: notif.leaveRequest?.approvedAt || new Date(),
          },
        });
      }
    } catch (err) {
      console.error("Failed to create student notification for leave rejection:", err);
    }

    return success(res, { notification: notif }, "Leave request rejected");
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/notifications/:id  (admin or faculty for leave requests) ───
const deleteNotification = async (req, res, next) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return error(res, "Notification not found", 404);

    const canDelete = req.user.role === "admin" || (req.user.role === "faculty" && notif.isLeaveRequest);
    if (!canDelete) return error(res, "You are not allowed to delete this notification", 403);

    notif.isActive = false;
    await notif.save();
    return success(res, {}, "Notification deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  approveLeaveRequest,
  rejectLeaveRequest,
  deleteNotification,
};
