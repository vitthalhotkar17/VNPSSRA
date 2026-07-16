import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { assignmentService } from "../../services/assignmentService.js";
import { attendanceService } from "../../services/attendanceService.js";
import { Activity, Users, ClipboardCheck, ArrowRight, PlayCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const renderSessionLabel = (session) => {
  if (!session) return "Session";
  if (typeof session === "string") return session;
  if (typeof session === "object") {
    if (session.subject || session.facultyName) {
      return `${session.subject || "Session"}${session.facultyName ? ` · ${session.facultyName}` : ""}`;
    }
    if (session._id || session.id) return session._id || session.id;
  }
  return "Session";
};

export default function FacultyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [recent, setRecent] = useState([]);
  const [sessionStatus, setSessionStatus] = useState({ active: false, subject: "", startedAt: null });
  const [sessionCount, setSessionCount] = useState(0);

  const facultyId = user?._id || user?.id || user?.userId || null;

  useEffect(() => {
    let mounted = true;
    const POLL_INTERVAL = 5000; // ms

    const loadDashboardData = async () => {
      try {
        const [assignedSubjects, sessions, records] = await Promise.all([
          facultyId ? assignmentService.getSubjectsForFaculty(facultyId) : Promise.resolve([]),
          attendanceService.listSessions(),
          attendanceService.listAttendance(),
        ]);

        if (!mounted) return;

        const facultySessions = sessions.filter((session) => {
          const sessionFacultyId = session.facultyId?._id || session.facultyId || session.facultyId?.id;
          return sessionFacultyId === facultyId || session.facultyName === user?.name;
        });

        // Only ever ONE active session at a time per faculty (the most recent one, just in case)
        const activeSession =
          facultySessions
            .filter((session) => session.active)
            .sort((a, b) => new Date(b.startedAt || b.createdAt || 0) - new Date(a.startedAt || a.createdAt || 0))[0] || null;

        setSubjects(assignedSubjects || []);
        setSessionCount(facultySessions.length);
        setSessionStatus({
          active: Boolean(activeSession),
          subject: activeSession?.subject || "",
          startedAt: activeSession?.startedAt || activeSession?.createdAt || null,
        });

        const facultySessionIds = new Set(
          facultySessions.map((session) => session._id || session.id)
        );

        setRecent(
          records
            .filter((record) => facultySessionIds.has(record.sessionId?._id || record.sessionId))
            .slice(0, 6)
        );
      } catch (err) {
        console.error(err);
      }
    };

    if (facultyId || user?.name) {
      loadDashboardData();
      const id = setInterval(() => {
        loadDashboardData();
      }, POLL_INTERVAL);

      return () => {
        mounted = false;
        clearInterval(id);
      };
    }
  }, [facultyId, user?.name]);

  const stats = [
    {
      label: "Assigned Subjects",
      value: subjects.length,
      icon: ClipboardCheck,
      color: "#6366f1",
      path: "/faculty/start-session",
      meta: `${subjects.length} subject${subjects.length !== 1 ? "s" : ""} assigned`,
    },
    {
      label: "Session Status",
      value: sessionStatus.active ? "Active" : "Idle",
      icon: Activity,
      color: "#10b981",
      path: "/faculty/start-session",
      meta: sessionStatus.active ? sessionStatus.subject || "Live session" : "No active session",
    },
    {
      label: "Teaching Load",
      value: sessionCount,
      icon: Users,
      color: "#f59e0b",
      path: "/faculty/reports",
      meta: `${subjects.length} subject${subjects.length !== 1 ? "s" : ""} • ${sessionCount} session${sessionCount !== 1 ? "s" : ""}`,
    },
  ];

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Hero */}
      <div className="hero-gradient" style={{ padding: "32px 36px" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>Welcome back</p>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
            {user?.name || "Faculty"}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13.5, marginBottom: 24 }}>
            {user?.department || "Faculty Department"} · {subjects.length} subject{subjects.length !== 1 ? "s" : ""} assigned
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/faculty/start-session" className="btn btn-primary">
              <PlayCircle size={15} /> Start Session <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {stats.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => navigate(s.path)}
            className="card card-hover"
            style={{ padding: 22, position: "relative", overflow: "hidden", textAlign: "left", border: "none", cursor: "pointer" }}
          >
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${s.color}15` }} />
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `${s.color}15`, display: "grid", placeItems: "center", marginBottom: 16 }}>
              <s.icon size={19} color={s.color} />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{s.value}</p>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>{s.label}</p>
            <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>{s.meta}</p>
          </button>
        ))}
      </div>

      {/* Assigned subjects */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Assigned Subjects</p>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>Subjects currently assigned to your profile</p>
          </div>
          <Link to="/faculty/start-session" className="btn btn-primary btn-sm">+ Start Session</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {subjects.length > 0 ? subjects.map((subj) => {
            // A subject is only "Live" if it matches the faculty's currently active session
            const isLive = sessionStatus.active && sessionStatus.subject === subj;

            return (
              <div
                key={subj}
                onClick={() => navigate("/faculty/start-session", { state: { subject: subj } })}
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{subj}</p>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    {isLive ? "Session in progress" : "Click to start"}
                  </p>
                </div>
                <span className={`chip ${isLive ? "chip-green" : "chip-muted"}`}>
                  {isLive ? "Live" : "Idle"}
                </span>
              </div>
            );
          }) : (
            <div style={{ background: "var(--surface2)", border: "1px dashed var(--border2)", borderRadius: 12, padding: "24px 20px", color: "var(--muted)", fontSize: 13 }}>
              No subjects assigned yet. Contact the administrator.
            </div>
          )}
        </div>
      </div>

      {/* Recent attendance */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Recent Attendance</p>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>Latest students who checked in during your sessions</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/faculty/reports" className="btn btn-ghost btn-sm">View reports</Link>
            <Link to="/faculty/attendance-by-date" className="btn btn-primary btn-sm">Today's attendance</Link>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table-base" style={{ width: "100%" }}>
            <thead>
              <tr><th>Student</th><th>Session</th><th>Face</th><th>Time</th></tr>
            </thead>
            <tbody>
              {recent.length > 0 ? recent.map((record) => (
                <tr key={record._id || record.id}>
                  <td style={{ fontWeight: 600 }}>{record.studentName || record.studentId?.name || "Student"}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{renderSessionLabel(record.sessionId)}</td>
                  <td>
                    <span className={`chip ${record.faceVerified ? "chip-green" : "chip-muted"}`}>
                      {record.faceVerified ? "✓ Verified" : "Pending"}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(record.checkIn || record.createdAt || record.timestamp).toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                    No attendance records yet for your sessions
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
