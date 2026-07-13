import { api } from "./api.js";

export const notificationService = {
  async getAll() {
    const { data } = await api.get("/notifications");
    return data.data || { notifications: [], unreadCount: 0 };
  },

  async create({ title, message, type, targetRole, targetUsers, sendEmail }) {
    const { data } = await api.post("/notifications", { title, message, type, targetRole, targetUsers, sendEmail });
    return data.data;
  },

  async markAsRead(id) {
    await api.put(`/notifications/${id}/read`);
  },

  async markAllAsRead() {
    await api.put("/notifications/read-all");
  },

  async delete(id) {
    await api.delete(`/notifications/${id}`);
  },

  async getFacultyRecipients() {
    const { data } = await api.get("/faculty/eligible");
    const payload = data?.data ?? data;
    return payload?.faculty || [];
  },

  async submitLeaveRequest({ leaveDate, leaveReason, studentName, recipientRole = "faculty", recipientUserId }) {
    const { data } = await api.post("/notifications", {
      title: "Leave Request",
      message: `${studentName || "A student"} requested leave on ${leaveDate}. Reason: ${leaveReason}`,
      type: "info",
      targetRole: recipientRole === "admin" ? "admin" : "faculty",
      targetUsers: recipientRole === "faculty" && recipientUserId ? [recipientUserId] : [],
      sendEmail: false,
      isLeaveRequest: true,
      leaveRequest: { leaveDate, leaveReason },
      studentName: studentName || "Student",
    });

    return data.data;
  },

  async approveLeaveRequest(id) {
    const { data } = await api.put(`/notifications/${id}/approve`);
    return data.data;
  },

  async rejectLeaveRequest(id) {
    const { data } = await api.put(`/notifications/${id}/reject`);
    return data.data;
  },
};
