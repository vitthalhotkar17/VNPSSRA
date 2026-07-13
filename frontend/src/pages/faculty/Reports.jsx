import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { reportService } from "../../services/reportService.js";
import { CalendarDays, Download, RotateCcw, Search } from "lucide-react";

export default function FacultyReports() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    reportService.facultySummary(user?.id || user?._id).then(setSessions);
  }, [user?.id, user?._id]);

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sessions.filter((session) => {
      const sessionDate = session.startedAt ? new Date(session.startedAt) : null;
      const matchesSearch = !term || (session.subject || "").toLowerCase().includes(term);
      const matchesStart = !startDate || !sessionDate || sessionDate >= new Date(`${startDate}T00:00:00`);
      const matchesEnd = !endDate || !sessionDate || sessionDate <= new Date(`${endDate}T23:59:59`);
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [sessions, searchTerm, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-4">
      <div className="card p-5" style={{ background: "linear-gradient(135deg, #111827, #1f2937)" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold" style={{ fontSize: 18 }}>My Session Reports</h3>
            <p className="text-sm text-slate-400">Search and export your classroom sessions</p>
          </div>
          <button
            onClick={() => reportService.downloadCSV(filteredSessions, "my-sessions.csv")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-indigo-500/35"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Search session</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Subject name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">From date</label>
              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#ffffff", filter: "drop-shadow(0 0 1px rgba(0,0,0,0.8))" }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-indigo-400"
                  style={{ colorScheme: "dark", WebkitAppearance: "none", appearance: "none" }}
                />
              </div>
            </div>

            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">To date</label>
              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#ffffff", filter: "drop-shadow(0 0 1px rgba(0,0,0,0.8))" }} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-indigo-400"
                  style={{ colorScheme: "dark", WebkitAppearance: "none", appearance: "none" }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              <RotateCcw size={14} /> Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/70">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 bg-slate-800/80 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Attendees</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                    No sessions found for the selected date or search.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => (
                  <tr key={s._id || s.id} className="border-b border-slate-800 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-100">{s.subject}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(s.startedAt || s.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-100">{s.attendees}</td>
                    <td className="px-4 py-3">{s.active ? <span className="chip bg-emerald-50 text-emerald-700">Active</span> : <span className="chip bg-slate-100 text-slate-600">Ended</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
