import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Sidebar({ items, brand = "SAMS", role = "" }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <aside style={{
      width: 256, minHeight: "100vh", background: "var(--surface)",
      borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh", flexShrink: 0
    }}>
      {/* Brand */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg,#6366f1,#7c3aed)",
          display: "grid", placeItems: "center", fontSize: 18,
          boxShadow: "0 0 20px rgba(99,102,241,0.35)"
        }}>🎓</div>
        <div>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{brand}</p>
          <p style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>v3.0 · Face + GPS</p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "10px 10px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        <p style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, padding: "10px 10px 6px" }}>Menu</p>
        {items.map((item) => (
          item.action === "logout" ? (
            <button key={item.label}
              onClick={() => { logout(); navigate("/login"); }}
              className="nav-link"
              style={{ width: "100%", background: "transparent", border: "none", textAlign: "left", display: "flex", alignItems: "center", gap: 10, color: "#f87171" }}>
              <item.icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <item.icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "#6366f1", color: "#fff", padding: "2px 7px", borderRadius: 10 }}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        ))}
      </nav>

      {/* System status */}
      <div style={{ padding: "0 10px 10px" }}>
        <div style={{
          background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)",
          borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8
        }}>
          <span className="dot-live" />
          <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>System Online</span>
          <span style={{ fontSize: 10.5, color: "var(--muted)", marginLeft: "auto" }}>Face + GPS</span>
        </div>
      </div>
    </aside>
  );
}
