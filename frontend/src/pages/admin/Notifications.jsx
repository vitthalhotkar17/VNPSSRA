import { useEffect, useState } from "react";
import { notificationService } from "../../services/notificationService.js";
import { api } from "../../services/api.js";
import { Bell, Plus, Trash2, Check, X, Send, Mail, CheckCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import toast from "react-hot-toast";

const TYPE_STYLES = {
  info:    { chip: "chip-blue",  label: "Info" },
  warning: { chip: "chip-amber", label: "Warning" },
  success: { chip: "chip-green", label: "Success" },
  alert:   { chip: "chip-rose",  label: "Alert" },
};

export default function Notifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isFaculty = user?.role === "faculty";
  const canCompose = isAdmin || isFaculty;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ title: "", message: "", type: "info" });
  const [sending, setSending]             = useState(false);
  const [sendEmail, setSendEmail]         = useState(false);
  const [recipientRole, setRecipientRole] = useState("student");
  const [recipientMode, setRecipientMode] = useState("all");
  const [recipients, setRecipients]       = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]); // ids

  const load = async () => {
    try {
      const { notifications: list, unreadCount: cnt } = await notificationService.getAll();
      setNotifications(list);
      setUnreadCount(cnt);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!canCompose) return;
    const endpoint = recipientRole === "faculty" ? "/admin/faculty" : "/admin/students";
    api.get(endpoint)
      .then(({ data }) => setRecipients(data.data?.[recipientRole === "faculty" ? "faculty" : "students"] || []))
      .catch(() => setRecipients([]));
  }, [canCompose, recipientRole]);

  useEffect(() => {
    if (!isAdmin) setRecipientMode("manual");
  }, [isAdmin]);

  useEffect(() => {
    setSelectedRecipients([]);
  }, [recipientRole]);

  const markRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success("All marked as read");
  };

  const remove = async (id) => {
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      toast.success("Notification deleted");
    } catch (err) { toast.error(err.message); }
  };

  const approve = async (id) => {
    try {
      await notificationService.approveLeaveRequest(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, leaveRequest: { ...n.leaveRequest, status: "approved" } } : n));
      toast.success("Leave request approved");
    } catch (err) { toast.error(err.message); }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return toast.error("Title and message are required");
    if (recipientMode === "manual" && selectedRecipients.length === 0) {
      return toast.error(`Select at least one ${recipientRole === "faculty" ? "faculty" : "student"} to message.`);
    }
    if (isFaculty && selectedRecipients.length === 0) {
      return toast.error("Select at least one student to message.");
    }
    setSending(true);
    try {
      const { notification, email } = await notificationService.create({
        ...form,
        targetRole: recipientRole,
        targetUsers: recipientMode === "manual" ? selectedRecipients : [],
        sendEmail,
      });
      setNotifications((prev) => [{ ...notification, isRead: true }, ...prev]);
      setForm({ title: "", message: "", type: "info" });
      setSelectedRecipients([]);
      setSendEmail(false);
      setShowForm(false);
      if (sendEmail && email) {
        toast.success(`Sent! Emailed ${email.sent}/${email.attempted} recipient${email.attempted !== 1 ? "s" : ""}.`);
      } else {
        const targetLabel = recipientRole === "faculty" ? "faculty" : "student";
        toast.success(
          recipientMode === "all"
            ? `Notification sent to all ${targetLabel}s!`
            : `Message sent to ${selectedRecipients.length} ${targetLabel}(s)!`
        );
      }
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const toggleRecipient = (id) => {
    setSelectedRecipients((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="animate-fade-up" style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Send notification modal (admin only) */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <form onSubmit={send} className="card" style={{ width: 480, padding: 28, position: "relative" }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}><X size={18} /></button>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Send Notification</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="label">Title *</div>
                <input required className="input" placeholder="Notification title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <div className="label">Message *</div>
                <textarea required className="input" rows={4} placeholder="Write your message here…" value={form.message} style={{ resize: "vertical" }}
                  onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              <div>
                <div className="label">Type</div>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="alert">Alert</option>
                </select>
              </div>
              <div>
                <div className="label">Recipient Role</div>
                <select className="input" value={recipientRole} onChange={(e) => setRecipientRole(e.target.value)}>
                  <option value="student">Students</option>
                  {isAdmin && <option value="faculty">Faculty</option>}
                </select>
              </div>
              {isAdmin ? (
                <div>
                  <div className="label">Send To</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className={recipientMode === "all" ? "btn btn-secondary" : "btn btn-ghost"}
                      onClick={() => setRecipientMode("all")}
                    >
                      All {recipientRole === "student" ? "Students" : "Faculty"}
                    </button>
                    <button type="button" className={recipientMode === "manual" ? "btn btn-secondary" : "btn btn-ghost"}
                      onClick={() => setRecipientMode("manual")}
                    >
                      Select Manually
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  Faculty can only message specific students.
                </p>
              )}
              {(recipientMode === "manual" || isFaculty) && (
                <div>
                  <div className="label">
                    Recipients {isFaculty && <span style={{ color: "var(--muted)", fontWeight: 400 }}>(required)</span>}
                    {isAdmin && recipientMode === "all" && <span style={{ color: "var(--muted)", fontWeight: 400 }}> — sending to all {recipientRole === "student" ? "students" : "faculty"}</span>}
                  </div>
                  <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border2)", borderRadius: 10, padding: 8 }}>
                    {recipients.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--muted)", padding: 8 }}>No recipients found.</p>
                    ) : recipients.map((r) => (
                      <label key={r._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(r._id)}
                          onChange={() => toggleRecipient(r._id)}
                        />
                        {r.name} <span style={{ color: "var(--muted)", fontSize: 11 }}>({r.rollNo || r.email || r.employeeId || r.department || "ID"})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {recipientMode === "all" && isAdmin && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  This notification will be sent to all {recipientRole === "student" ? "students" : "faculty"}.
                </p>
              )}
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                <Mail size={14} /> Also send this as an email
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                <Send size={14} /> {sending ? "Sending…" : recipientMode === "all" ? `Send to All ${recipientRole === "student" ? "Students" : "Faculty"}` : `Send to ${selectedRecipients.length} ${recipientRole === "student" ? "Student" : "Faculty"}(s)`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header */}
      <div className="hero-gradient" style={{ padding: "28px 32px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>
              {isAdmin ? "Admin · Notifications" : isFaculty ? "Faculty · Notifications" : "Student · Notifications"}
            </p>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Notifications</h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
              {isAdmin ? "Send announcements to all students, or a message to specific students." : isFaculty ? "Send a message to your students." : `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}.`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {unreadCount > 0 && (
              <button className="btn btn-secondary" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark All Read
              </button>
            )}
            {canCompose && (
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Send Notification
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification list */}
      <div className="card" style={{ padding: 24 }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>Loading notifications…</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <Bell size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
            <p style={{ color: "var(--muted)", fontSize: 14 }}>No notifications yet.</p>
            {canCompose && <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>Click "Send Notification" to get started.</p>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {notifications.map((n) => {
              const style = TYPE_STYLES[n.type] || TYPE_STYLES.info;
              return (
                <div key={n._id} style={{
                  display: "flex", gap: 14, padding: "16px 14px", borderRadius: 12,
                  background: n.isRead ? "transparent" : "rgba(99,102,241,0.05)",
                  border: n.isRead ? "1px solid transparent" : "1px solid rgba(99,102,241,0.15)",
                  transition: "all 0.2s", alignItems: "flex-start"
                }}>
                  {/* Unread dot */}
                  <div style={{ marginTop: 6, flexShrink: 0 }}>
                    {!n.isRead
                      ? <span className="dot-live" />
                      : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border2)" }} />
                    }
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{n.title}</span>
                      <span className={`chip ${style.chip}`}>{style.label}</span>
                      {!n.isRead && <span className="chip chip-blue">New</span>}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 8 }}>{n.message}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: "var(--muted)", flexWrap: "wrap" }}>
                      <span>From: <strong style={{ color: "var(--text)" }}>{n.createdBy?.name || "Admin"}</strong></span>
                      <span>·</span>
                      <span>{timeAgo(n.createdAt)}</span>
                      {n.isLeaveRequest && (
                        <>
                          <span>·</span>
                          <span className={`chip ${n.leaveRequest?.status === "approved" ? "chip-green" : "chip-amber"}`}>
                            {n.leaveRequest?.status === "approved" ? "Approved" : "Pending"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!n.isRead && (
                      <button onClick={() => markRead(n._id)} title="Mark as read"
                        style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", cursor: "pointer" }}>
                        <Check size={13} />
                      </button>
                    )}
                    {isFaculty && n.isLeaveRequest && n.leaveRequest?.status !== "approved" && (
                      <button onClick={() => approve(n._id)} title="Approve leave request"
                        style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#34d399", cursor: "pointer" }}>
                        <CheckCheck size={13} />
                      </button>
                    )}
                    {(isAdmin || (isFaculty && n.isLeaveRequest)) && (
                      <button onClick={() => remove(n._id)} title="Delete"
                        style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", color: "#f87171", cursor: "pointer" }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
