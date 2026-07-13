import { useEffect, useState } from "react";
import { CalendarRange, Send, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { notificationService } from "../../services/notificationService.js";
import toast from "react-hot-toast";

export default function StudentLeaveRequest() {
  const { user } = useAuth();
  const [form, setForm] = useState({ leaveDate: "", reason: "", recipientRole: "faculty", recipientUserId: "" });
  const [eligibleFaculty, setEligibleFaculty] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaveRequests, setLoadingLeaveRequests] = useState(false);

  useEffect(() => {
    const loadFaculty = async () => {
      if (form.recipientRole !== "faculty") {
        setEligibleFaculty([]);
        return;
      }

      setFacultyLoading(true);
      try {
        const faculty = await notificationService.getFacultyRecipients();
        setEligibleFaculty(faculty);
      } catch {
        setEligibleFaculty([]);
      } finally {
        setFacultyLoading(false);
      }
    };

    loadFaculty();
  }, [form.recipientRole]);

  const loadLeaveRequests = async () => {
    if (!user?._id) return;

    setLoadingLeaveRequests(true);
    try {
      const { notifications = [] } = await notificationService.getAll();
      const myLeaves = notifications.filter((n) => n.isLeaveRequest && (n.createdBy?._id || n.createdBy) === user._id);
      setLeaveRequests(myLeaves);
    } catch {
      setLeaveRequests([]);
    } finally {
      setLoadingLeaveRequests(false);
    }
  };

  useEffect(() => {
    loadLeaveRequests();
  }, [user?._id]);

  useEffect(() => {
    if (!user?._id) return;

    const interval = window.setInterval(() => {
      loadLeaveRequests();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [user?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.leaveDate) {
      toast.error("Please select the leave date.");
      return;
    }

    if (!form.reason.trim()) {
      toast.error("Please add a short reason for your leave.");
      return;
    }

    if (form.recipientRole === "faculty" && !form.recipientUserId) {
      toast.error("Please select a faculty member to receive your leave request.");
      return;
    }

    setSubmitting(true);
    try {
      await notificationService.submitLeaveRequest({
        leaveDate: form.leaveDate,
        leaveReason: form.reason.trim(),
        studentName: user?.name || "Student",
        recipientRole: form.recipientRole,
        recipientUserId: form.recipientUserId,
      });

      setSubmitted(true);
      setForm({ leaveDate: "", reason: "", recipientRole: "faculty", recipientUserId: "" });
      await loadLeaveRequests();
      toast.success(form.recipientRole === "admin" ? "Leave request sent to admin." : "Leave request sent to your faculty.");
    } catch (err) {
      toast.error(err.message || "Unable to send leave request right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up" style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="hero-gradient" style={{ padding: "28px 32px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>
              Student · Leave Request
            </p>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
              Request a leave for a specific day
            </h1>
            <p style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, maxWidth: 460 }}>
              Submit a leave request directly to your faculty for one selected day. You’ll see the result here once faculty approves or rejects it.
            </p>
          </div>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: "rgba(255,255,255,0.15)", display: "grid", placeItems: "center", backdropFilter: "blur(8px)" }}>
            <CalendarRange size={24} color="white" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(99,102,241,0.12)", display: "grid", placeItems: "center" }}>
            <Sparkles size={18} color="#6366f1" />
          </div>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Leave request form</p>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Hello {user?.name?.split(" ")[0] || "Student"}, request leave for one day.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Leave Date</label>
            <input
              className="input"
              type="date"
              min={today}
              value={form.leaveDate}
              onChange={(e) => setForm({ ...form, leaveDate: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label">Send To</label>
            <select
              className="input"
              value={form.recipientRole}
              onChange={(e) => setForm({ ...form, recipientRole: e.target.value, recipientUserId: "" })}
            >
              <option value="faculty">Faculty</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {form.recipientRole === "faculty" && (
            <div>
              <label className="label">Select Faculty</label>
              <select
                className="input"
                value={form.recipientUserId}
                onChange={(e) => setForm({ ...form, recipientUserId: e.target.value })}
                disabled={facultyLoading}
              >
                <option value="">{facultyLoading ? "Loading faculty…" : "Choose faculty from your department"}</option>
                {eligibleFaculty.map((faculty) => (
                  <option key={faculty._id} value={faculty._id}>
                    {faculty.name} {faculty.department?.name ? `• ${faculty.department.name}` : ""}
                  </option>
                ))}
              </select>
              {eligibleFaculty.length === 0 && !facultyLoading && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>No department faculty is available right now.</p>
              )}
            </div>
          )}

          <div>
            <label className="label">Reason for Leave</label>
            <textarea
              className="input"
              rows={5}
              placeholder="Briefly explain why you need to take leave for this day."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              required
            />
          </div>

          <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>
            {form.recipientRole === "admin"
              ? "Your request will be sent to admin for review."
              : "Your request will be sent to a department faculty member for approval."}
          </div>

          {submitted && (
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: "12px 14px", color: "#10b981", fontSize: 13, fontWeight: 600 }}>
              Leave request submitted successfully.
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ alignSelf: "flex-start" }}>
            <Send size={14} /> {submitting ? "Sending…" : "Send Leave Request"}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>My leave requests</p>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Track the current status of every leave request you’ve sent.</p>
          </div>
        </div>

        {loadingLeaveRequests ? (
          <div style={{ padding: "10px 0", color: "var(--muted)", fontSize: 13 }}>Loading your leave requests…</div>
        ) : leaveRequests.length === 0 ? (
          <div style={{ padding: "10px 0", color: "var(--muted)", fontSize: 13 }}>No leave requests yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leaveRequests.map((request) => (
              <div key={request._id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--surface2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>{request.leaveRequest?.leaveDate || "—"}</div>
                    <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{request.leaveRequest?.leaveReason || "No reason provided"}</div>
                  </div>
                  <span style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "capitalize",
                    background: request.leaveRequest?.status === "approved" ? "rgba(16,185,129,0.14)" : request.leaveRequest?.status === "rejected" ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.14)",
                    color: request.leaveRequest?.status === "approved" ? "#10b981" : request.leaveRequest?.status === "rejected" ? "#ef4444" : "#f59e0b",
                  }}>
                    {request.leaveRequest?.status || "pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
