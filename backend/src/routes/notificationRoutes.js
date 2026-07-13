const router = require("express").Router();
const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  approveLeaveRequest,
  rejectLeaveRequest,
  deleteNotification,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const { authorise } = require("../middleware/roleMiddleware");

router.use(protect);

router.get("/", getNotifications);                                      // all roles
router.put("/read-all", markAllAsRead);                                 // all roles
router.put("/:id/read", markAsRead);                                    // all roles
router.put("/:id/approve", authorise("faculty"), approveLeaveRequest);   // faculty only
router.put("/:id/reject", authorise("faculty"), rejectLeaveRequest);     // faculty only
router.post("/", createNotification);                                   // admin/faculty + student leave requests
router.delete("/:id", deleteNotification);                              // admin or faculty for leave requests

module.exports = router;
