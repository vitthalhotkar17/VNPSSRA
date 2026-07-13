import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { notificationService } from "../../services/notificationService.js";
import { api } from "../../services/api.js";
import toast from "react-hot-toast";

export default function FacultyNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  // Send notification UI state
  const [sendOpen, setSendOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("student");
  const [academicYear, setAcademicYear] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { notifications: list, unreadCount } = await notificationService.getAll();
      setNotifications(list);
      if (unreadCount > 0) {
        await notificationService.markAllAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      toast.error(err.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      toast.error(err.message || "Unable to update notification");
    }
  };

  const remove = async (id) => {
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Notification removed");
    } catch (err) {
      toast.error(err.message || "Unable to remove notification");
    }
  };

  const approveLeave = async (id) => {
    try {
      await notificationService.approveLeaveRequest(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, leaveRequest: { ...n.leaveRequest, status: "approved" } } : n)));
      toast.success("Leave request approved");
    } catch (err) {
      toast.error(err.message || "Unable to approve leave request");
    }
  };

  const rejectLeave = async (id) => {
    try {
      await notificationService.rejectLeaveRequest(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, leaveRequest: { ...n.leaveRequest, status: "rejected" } } : n)));
      toast.success("Leave request rejected");
    } catch (err) {
      toast.error(err.message || "Unable to reject leave request");
    }
  };

  return (
    <div className="animate-fade-up" style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="hero-gradient" style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Faculty · Notifications</p>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Your notifications</h1>
            <p style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, maxWidth: 500 }}>Review student leave requests, approvals, and updates for your department.</p>
          </div>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }}>
            <Bell size={24} color="white" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(99,102,241,0.12)", display: "grid", placeItems: "center" }}>
              <Sparkles size={18} color="#6366f1" />
            </div>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Faculty inbox</p>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Hello {user?.name?.split(" ")[0] || "Faculty"}, stay updated with student requests.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-primary" onClick={() => setSendOpen((s) => !s)}>
              Send Notification
            </button>
          </div>
        </div>
        
        {sendOpen && (
          <div style={{ border: "1px dashed var(--border)", padding: 12, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ fontWeight: 700 }}>To:</label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" name="target" checked={targetRole === "student"} onChange={() => setTargetRole("student")} /> Student
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" name="target" checked={targetRole === "admin"} onChange={() => setTargetRole("admin")} /> Admin
              </label>
            </div>

            {targetRole === "student" && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8, fontWeight: 700 }}>Academic Year</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["First Year", "Second Year", "Third Year", "Fourth Year"].map((y) => (
                    <button
                      key={y}
                      className={"btn btn-ghost btn-sm" + (academicYear === y ? " active" : "")}
                      onClick={async () => {
                        setAcademicYear(y);
                        setFetchingStudents(true);
                        try {
                          const dept = user?.department?._id || user?.department || null;
                          const params = { academicYear: y };
                          if (dept) params.department = dept;
                          const { data } = await api.get("/admin/students", { params });
                          const list = data?.data?.students || [];
                          setStudents(list);
                          setSelectedStudents([]);
                          setSelectAll(false);
                        } catch (err) {
                          toast.error(err.message || "Unable to load students");
                        } finally {
                          setFetchingStudents(false);
                        }
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>

                {academicYear && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>Students ({students.length})</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" checked={selectAll} onChange={(e) => {
                            const v = e.target.checked;
                            setSelectAll(v);
                            setSelectedStudents(v ? students.map(s => s._id) : []);
                          }} /> Select all
                        </label>
                      </div>
                    </div>

                    {fetchingStudents ? (
                      <div style={{ color: "var(--muted)" }}>Loading students…</div>
                    ) : students.length === 0 ? (
                      <div style={{ color: "var(--muted)" }}>No students found for this year in your department.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflow: "auto", paddingRight: 8 }}>
                        {students.map((s) => (
                          <label key={s._id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(s._id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedStudents((prev) => {
                                  if (checked) return [...prev, s._id];
                                  return prev.filter((id) => id !== s._id);
                                });
                                if (!e.target.checked) setSelectAll(false);
                              }}
                            />
                            <span>{s.name} ({s.enrollmentNo || s.rollNo || s.email})</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {targetRole === "admin" && (
              <div style={{ marginTop: 12, color: "var(--muted)" }}>
                Faculty accounts cannot send notifications to admins. Please contact an admin or use an admin account.
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input placeholder="Title" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="input" />
              <textarea placeholder="Message" value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} className="input" rows={3} />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    if (!notifTitle || !notifMessage) return toast.error("Title and message are required");
                    if (targetRole === "student") {
                      if (!selectedStudents.length) return toast.error("Select at least one student");
                      try {
                        await notificationService.create({ title: notifTitle, message: notifMessage, targetRole: "student", targetUsers: selectedStudents, type: "info", sendEmail: false });
                        toast.success("Notification sent to selected students");
                        setNotifTitle("");
                        setNotifMessage("");
                        setSendOpen(false);
                        load();
                      } catch (err) {
                        toast.error(err.message || "Unable to send notification");
                      }
                    } else {
                      toast.error("Sending to admin is not supported from faculty account");
                    }
                  }}
                >
                  Send
                </button>
                <button className="btn btn-ghost" onClick={() => setSendOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
            <Loader2 size={18} className="animate-spin" style={{ marginBottom: 8 }} />
            <div>Loading notifications…</div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notifications.map((n) => (
              <div key={n._id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 16, background: n.isRead ? "var(--surface2)" : "rgba(99,102,241,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#818cf8" }}>
                        {n.isLeaveRequest ? "Leave Request" : n.type || "info"}
                      </span>
                      {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8" }} />}
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{n.title}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>{n.message}</div>
                    {n.isLeaveRequest && n.leaveRequest && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
                        <div>Student: {n.leaveRequest.studentName || "Student"}</div>
                        <div>Date: {n.leaveRequest.leaveDate}</div>
                        <div>Reason: {n.leaveRequest.leaveReason}</div>
                        <div>Status: <strong>{n.leaveRequest.status || "pending"}</strong></div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!n.isRead && (
                      <button className="btn btn-ghost btn-sm" onClick={() => markAsRead(n._id)}>
                        <CheckCheck size={14} /> Read
                      </button>
                    )}
                    {n.isLeaveRequest && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => approveLeave(n._id)} disabled={n.leaveRequest?.status === "approved" || n.leaveRequest?.status === "rejected"}>
                          {n.leaveRequest?.status === "approved" ? "Approved" : "Approve"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => rejectLeave(n._id)} disabled={n.leaveRequest?.status === "approved" || n.leaveRequest?.status === "rejected"}>
                          {n.leaveRequest?.status === "rejected" ? "Rejected" : "Reject"}
                        </button>
                      </>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => remove(n._id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
