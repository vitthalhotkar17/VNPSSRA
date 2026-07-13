import { useEffect, useState } from "react";
import { reportService } from "../../services/reportService.js";
import { attendanceService } from "../../services/attendanceService.js";
import { Download, TrendingUp, Users, Calendar, Clock, Radio, CheckCircle, AlertCircle } from "lucide-react";

export default function AdminReports() {
  const [stats, setStats] = useState({ students: 0, faculty: 0, sessions: 0, attendance: 0 });
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [s, records] = await Promise.all([
          reportService.overallSummary(),
          attendanceService.listAttendance(),
        ]);
        if (!isMounted) return;
        setStats(s);
        setRecs(records);
      } catch (err) {
        console.error("Error loading reports:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    const interval = window.setInterval(load, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const verifiedCount = recs.filter((r) => r.faceVerified).length;
  const presentCount = recs.filter((r) => r.status === "Present").length;
  const attendanceRate = recs.length > 0 ? Math.round((presentCount / recs.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Hero Section */}
      <div className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_35%),linear-gradient(135deg,_#05070d,_#111827)] p-6 shadow-2xl shadow-black/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300">
              <TrendingUp size={12} className="text-indigo-400" />
              Reports & Analytics
            </div>
            <h3 className="font-display text-2xl font-bold text-white">Attendance Analytics</h3>
            <p className="mt-2 text-sm text-slate-400">Comprehensive attendance and verification analytics.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Total Students", value: stats.students, icon: Users, color: "#6366f1" },
          { label: "Total Faculty", value: stats.faculty, icon: Users, color: "#8b5cf6" },
          { label: "Sessions", value: stats.sessions, icon: Calendar, color: "#3b82f6" },
          { label: "Attendance Records", value: stats.attendance, icon: Clock, color: "#10b981" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <item.icon size={15} style={{ color: item.color }} />
              {item.label}
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{loading ? "…" : item.value}</p>
          </div>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Total Records", value: recs.length, icon: Calendar, color: "#3b82f6" },
          { label: "Face Verified", value: verifiedCount, icon: CheckCircle, color: "#10b981" },
          { label: "Present Today", value: presentCount, icon: CheckCircle, color: "#14b8a6" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <item.icon size={15} style={{ color: item.color }} />
              {item.label}
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{loading ? "…" : item.value}</p>
          </div>
        ))}
      </div>

      {/* Export Section */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 shadow-2xl shadow-black/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-white">Attendance Records Export</h3>
            <p className="text-sm text-slate-400">{recs.length} records ready to export.</p>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-slate-400">
            Auto-refresh every 30s
          </div>
        </div>

        <button
          onClick={() => reportService.downloadCSV(recs, "attendance-report.csv")}
          className="mb-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || recs.length === 0}
        >
          <Download size={16} className="mr-2" />
          {loading ? "Loading..." : `Download CSV (${recs.length})`}
        </button>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 py-10 text-center text-slate-500">
            Loading attendance records...
          </div>
        ) : recs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 py-12 text-center text-slate-500">
            No attendance records yet
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60">
                  <th className="px-4 py-3 text-left font-medium text-slate-300">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-300">Session</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-300">Face Verified</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-300">Time</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((record) => (
                  <tr key={record._id} className="border-b border-slate-700 transition hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-slate-100">
                      {record.studentName || record.student?.name || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {record.sessionTitle || record.session?.subject || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        record.faceVerified
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-slate-600/30 text-slate-400"
                      }`}>
                        {record.faceVerified ? (
                          <>
                            <CheckCircle size={12} /> Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} /> Unverified
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        record.status === "Present"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : record.status === "Late"
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-slate-600/30 text-slate-400"
                      }`}>
                        {record.status || "Present"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(record.date || record.createdAt || record.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
