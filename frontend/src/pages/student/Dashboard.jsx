import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { reportService } from "../../services/reportService.js";
import { attendanceService } from "../../services/attendanceService.js";
import { ScanFace, MapPin, TrendingUp, Calendar, ArrowRight, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const renderSessionLabel = (session) => {
  if (!session) return "Session";
  if (typeof session === "string") return session;
  if (typeof session === "object") {
    if (session.subject || session.facultyName) {
      return `${session.subject || "Session"}${session.facultyName ? ` · ${session.facultyName}` : ""}`;
    }
    if (session._id) return session._id;
  }
  return "Session";
};

function ProgressRing({ pct, size = 90, stroke = 7, color = "#6366f1" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", display: "inline-grid", placeItems: "center", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <span style={{ position: "absolute", fontSize: 16, fontWeight: 800, color }}>{pct}%</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-hover"
      style={{ padding: 20, position: "relative", overflow: "hidden", textAlign: "left", border: "none", cursor: "pointer" }}
    >
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${color}18`, pointerEvents: "none" }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: "grid", placeItems: "center", marginBottom: 14 }}>
        <Icon size={18} color={color} />
      </div>
      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: "var(--text)" }}>{value}</p>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>{label}</p>
    </button>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [active, setActive] = useState(null);
  const studentId = user?._id || user?.id || user?.userId;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!studentId) return;

      try {
        const [summaryData, session] = await Promise.all([
          reportService.studentSummary(studentId),
          attendanceService.getActiveSession(user?.academicYear, user?.department),
        ]);

        if (!isMounted) return;
        setSummary(summaryData);
        setActive(session);
      } catch (err) {
        console.error(err);
      }
    };

    loadData();
    const interval = window.setInterval(loadData, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [studentId]);

  const pct = summary?.percentage ?? 0;
  const ringColor = pct >= 75 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Hero */}
      <div className="hero-gradient" style={{ padding: "32px 36px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
              Hello, {user.name?.split(" ")[0]} 👋
            </p>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 10, lineHeight: 1.2 }}>
              Ready to mark attendance?
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, marginBottom: 20, maxWidth: 380 }}>
              Use Face Recognition + Live GPS verification to mark your presence securely.
            </p>
            <Link to="/student/mark-attendance" className="btn btn-primary" style={{ display: "inline-flex" }}>
              <ScanFace size={15} /> Mark Attendance <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "24px 28px", textAlign: "center", backdropFilter: "blur(10px)" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Your Attendance</p>
            <ProgressRing pct={pct} color={ringColor} />
            <p style={{ fontSize: 12, color: pct >= 75 ? "#34d399" : "#fbbf24", fontWeight: 600, marginTop: 12 }}>
              {pct >= 75 ? "✓ Above minimum threshold" : "⚠ Below 75% — at risk"}
            </p>
          </div>
        </div>
      </div>

      {/* Active session alert */}
      {active && (
        <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <CheckCircle size={20} color="#10b981" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#34d399" }}>Active Session: {active.subject}</p>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
              Ends at {new Date(active.expiresAt).toLocaleTimeString()} · Mark attendance now!
            </p>
          </div>
          <Link to="/student/mark-attendance" className="btn btn-success btn-sm">Mark Now →</Link>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <StatCard icon={Calendar} label="Total Classes" value={summary?.total ?? 0} color="#6366f1" onClick={() => navigate("/student/reports")} />
        <StatCard icon={ScanFace} label="Present" value={summary?.present ?? 0} color="#10b981" onClick={() => navigate("/student/reports")} />
        <StatCard icon={MapPin} label="Absent" value={summary?.absent ?? 0} color="#f43f5e" onClick={() => navigate("/student/reports")} />
        <StatCard icon={TrendingUp} label="Attendance %" value={`${pct}%`} color="#f59e0b" onClick={() => navigate("/student/reports")} />
      </div>

      {/* Recent records */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Recent Attendance</p>
          <Link to="/student/reports" className="btn btn-ghost btn-sm">Full report →</Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table-base">
            <thead><tr><th>Session</th><th>Status</th><th>Time</th></tr></thead>
            <tbody>
              {(summary?.records || []).slice(0, 6).map((r) => (
                <tr key={r._id || r.id}>
                  <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>{renderSessionLabel(r.sessionId)}</td>
                  <td><span className="chip chip-green">{r.status}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(r.checkIn || r.createdAt || r.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {(!summary?.records || summary.records.length === 0) && (
                <tr><td colSpan={3} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No attendance records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
