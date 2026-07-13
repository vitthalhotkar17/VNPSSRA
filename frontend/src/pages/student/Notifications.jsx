import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { notificationService } from "../../services/notificationService.js";
import toast from "react-hot-toast";

export default function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-fade-up" style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="hero-gradient" style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>Student · Notifications</p>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Your notifications</h1>
            <p style={{ color: "rgba(255,255,255,0.58)", fontSize: 13, maxWidth: 540 }}>Stay updated with announcements, attendance notices, and important updates from your institute.</p>
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
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Student inbox</p>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Hello {user?.name?.split(" ")[0] || "Student"}, here are your latest updates.</p>
            </div>
          </div>
        </div>

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
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!n.isRead && (
                      <button className="btn btn-ghost btn-sm" onClick={() => markAsRead(n._id)}>
                        <CheckCheck size={14} /> Read
                      </button>
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
