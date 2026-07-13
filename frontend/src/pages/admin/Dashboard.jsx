import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCog, ClipboardCheck, Activity, TrendingUp, ArrowUpRight } from "lucide-react";
import { reportService } from "../../services/reportService.js";
import { attendanceService } from "../../services/attendanceService.js";
import { api } from "../../services/api.js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#14b8a6", "#0ea5e9", "#f59e0b", "#ef4444"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f1624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
      <p style={{ color: "var(--muted)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#818cf8", fontWeight: 700 }}>{payload[0].value} sessions</p>
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: 0, faculty: 0, sessions: 0, attendance: 0, departments: 0 });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [recent, setRecent] = useState([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [s, recs, dashboardRes] = await Promise.all([
          reportService.overallSummary(),
          attendanceService.listAttendance(),
          api.get("/admin/dashboard"),
        ]);
        if (!isMounted) return;
        const dashboardData = dashboardRes?.data?.data || {};
        setStats({ ...s, departments: dashboardData.totalDepartments || 0 });
        setDepartmentBreakdown(dashboardData.departmentBreakdown || []);
        setAttendanceRecords(recs);
        setRecent(recs.slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const cards = [
    { label: "Total Students", value: stats.students, icon: Users, color: "#6366f1", glow: "rgba(99,102,241,0.2)", path: "/admin/students" },
    { label: "Total Departments", value: stats.departments, icon: Users, color: "#8b5cf6", glow: "rgba(139,92,246,0.2)", path: "/admin/departments" },
    { label: "Total Faculty", value: stats.faculty, icon: UserCog, color: "#10b981", glow: "rgba(16,185,129,0.2)", path: "/admin/faculty" },
    { label: "Sessions Held", value: stats.sessions, icon: Activity, color: "#f59e0b", glow: "rgba(245,158,11,0.2)", path: "/admin/sessions" },
    { label: "Attendances Marked", value: stats.attendance, icon: ClipboardCheck, color: "#06b6d4", glow: "rgba(6,182,212,0.2)", path: "/admin/attendance" },
  ];

  const weekData = useMemo(() => {
    const formatDateKey = (value) => {
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        key: formatDateKey(date),
        label: date.toLocaleDateString("en", { weekday: "short" }),
      };
    });

    const counts = days.map(() => 0);

    attendanceRecords.forEach((record) => {
      const value = record.checkIn || record.createdAt || record.date;
      if (!value) return;
      const key = formatDateKey(value);
      const dayIndex = days.findIndex((day) => day.key === key);
      if (dayIndex !== -1) counts[dayIndex] += 1;
    });

    return days.map((day, index) => ({ day: day.label, count: counts[index] }));
  }, [attendanceRecords]);

  const deptData = departmentBreakdown.length
    ? departmentBreakdown.map((item) => ({ name: item.departmentName, value: item.facultyCount }))
    : [{ name: "No departments", value: 1 }];

  return (
    <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Hero */}
      <div className="hero-gradient" style={{ padding: "32px 36px" }}>
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div>
            <span className="chip chip-blue" style={{ marginBottom: 14 }}><span className="dot-live" /> LIVE SYSTEM</span>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 10 }}>
              Smart Attendance Dashboard
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5, maxWidth: 460, lineHeight: 1.7 }}>
              Real-time face recognition + GPS geofencing. All data from database.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[{ label: "Face Auth", val: "DB Verified" }, { label: "GPS Radius", val: "500 m" }, { label: "Sessions", val: "Auto-expire" }].map((f) => (
              <div key={f.label} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "16px 20px", textAlign: "center", backdropFilter: "blur(10px)", minWidth: 100 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{f.label}</p>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{f.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => navigate(c.path)}
            className="card card-hover"
            style={{ padding: 22, position: "relative", overflow: "hidden", textAlign: "left", border: "none", cursor: "pointer", width: "100%" }}
          >
            <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%", background: c.glow, pointerEvents: "none" }} />
            <div style={{ width: 42, height: 42, borderRadius: 10, background: c.glow, display: "grid", placeItems: "center", marginBottom: 16, border: `1px solid ${c.color}30` }}>
              <c.icon size={19} color={c.color} />
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 30, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
              {loading ? "…" : c.value}
            </p>
            <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>{c.label}</p>
            <span className="chip chip-green" style={{ marginTop: 12 }}><TrendingUp size={10} /> Live</span>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Weekly Attendance</p>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>Sessions marked this week (from DB)</p>
            </div>
            <span className="chip chip-green"><span className="dot-live" /> Live data</span>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={weekData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" fill="#14b8a6" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Departments</p>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>Student distribution</p>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={deptData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4}>
                  {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "var(--muted)" }}>{v}</span>} />
                <Tooltip contentStyle={{ background: "#0f1624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent attendance */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Recent Attendance (from DB)</p>
          <button className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            View all <ArrowUpRight size={13} />
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table-base" style={{ width: "100%" }}>
            <thead>
              <tr><th>Student</th><th>Subject</th><th>Face</th><th>GPS</th><th>Time</th></tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "36px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No attendance records yet</td></tr>
              )}
              {recent.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                  <td style={{ color: "var(--muted)" }}>{r.subject}</td>
                  <td><span className={`chip ${r.faceVerified ? "chip-green" : "chip-amber"}`}>{r.faceVerified ? "✓ Verified" : "Unverified"}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{r.lat ? `${r.lat?.toFixed(4)}, ${r.lng?.toFixed(4)}` : "—"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(r.checkIn || r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
