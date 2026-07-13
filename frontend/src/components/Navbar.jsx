import { useEffect, useRef, useState } from "react";
import { Bell, Search, LogOut, KeyRound, Check, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { notificationService } from "../services/notificationService.js";import { resolveAssetUrl } from "../services/api.js";
export default function Navbar({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("");

  const [open, setOpen]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const popRef = useRef(null);

  const load = async () => {
    try {
      const { notifications: list, unreadCount: cnt } = await notificationService.getAll();
      setNotifications(list.slice(0, 5));
      setUnreadCount(cnt);
    } catch { /* silent */ }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const goToNotifications = () => {
    setOpen(false);
    navigate(`/${user.role}/notifications`);
  };

  const refreshPageData = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent("app:refresh"));
    window.setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <header style={{
      height: 64, background: "rgba(8,13,26,0.85)", backdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center",
      padding: "0 28px", gap: 16, position: "sticky", top: 0, zIndex: 50
    }}>
      <div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{title}</h1>
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1, textTransform: "capitalize" }}>
          {user?.role} panel · {new Date().toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
        </p>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={refreshPageData}
          title="Refresh data"
          style={{
            width: 36, height: 36, borderRadius: 9, background: "var(--surface2)",
            border: "1px solid var(--border)", display: "grid", placeItems: "center",
            cursor: "pointer", color: refreshing ? "#818cf8" : "var(--muted)"
          }}>
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "7px 14px", width: 220
        }}>
          <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--text)", width: "100%" }}
            placeholder="Search…" />
        </div>

        {/* Bell + dropdown */}
        <div ref={popRef} style={{ position: "relative" }}>
          <button onClick={() => setOpen((o) => !o)} style={{
            width: 36, height: 36, borderRadius: 9, background: "var(--surface2)",
            border: "1px solid var(--border)", display: "grid", placeItems: "center",
            cursor: "pointer", position: "relative", color: "var(--muted)"
          }}>
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 6, right: 6, minWidth: 14, height: 14, padding: "0 3px", background: "#f43f5e", borderRadius: 7, border: "1.5px solid var(--surface)", fontSize: 9, fontWeight: 700, color: "#fff", display: "grid", placeItems: "center" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div style={{
              position: "absolute", top: 44, right: 0, width: 320,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 60
            }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Notifications</span>
                {unreadCount > 0 && <span className="chip chip-blue">{unreadCount} new</span>}
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--muted)", fontSize: 12.5 }}>No notifications yet</div>
                ) : notifications.map((n) => (
                  <div key={n._id} onClick={() => !n.isRead && markRead(n._id)}
                    style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: n.isRead ? "default" : "pointer", background: n.isRead ? "transparent" : "rgba(99,102,241,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{n.title}</span>
                      {!n.isRead ? <span className="dot-live" style={{ flexShrink: 0, marginTop: 4 }} /> : <Check size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.message}</p>
                  </div>
                ))}
              </div>
              <button onClick={goToNotifications} style={{ width: "100%", padding: "11px 0", background: "var(--surface2)", border: "none", color: "#818cf8", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                View All Notifications
              </button>
            </div>
          )}
        </div>

        <button onClick={() => navigate(`/${user.role}/reset-password`)}
          style={{ width: 36, height: 36, borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)" }}>
          <KeyRound size={16} />
        </button>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 10, borderLeft: "1px solid var(--border)" }}>
          <button onClick={() => navigate(`/${user.role}/profile`)}
            style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
              background: "linear-gradient(135deg,#6366f1,#7c3aed)",
              display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "#fff"
            }}>
              {user?.profileImage
                ? <img src={resolveAssetUrl(user.profileImage)} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </div>
            <div className="hidden sm:block" style={{ textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: "var(--muted)" }}>{user?.email}</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
