import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { attendanceService } from "../../services/attendanceService.js";
import { reportService } from "../../services/reportService.js";
import { CalendarDays, Download, Search, RefreshCcw, CheckCircle, XCircle } from "lucide-react";

const todayISO = () => new Date().toISOString().slice(0, 10);
const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

export default function FacultyAttendanceByDate() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const loadRecords = async (selectedDate) => {
    setLoading(true);
    setError(null);
    try {
      const from = `${selectedDate}T00:00:00`;
      const to = `${selectedDate}T23:59:59`;
      const data = await attendanceService.listAttendance({ from, to });
      setRecords(data || []);
    } catch (err) {
      setError(err.message || "Unable to load attendance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!date) return;
    loadRecords(date);
  }, [date]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => {
      const student = record.studentId?.name || record.studentName || "";
      const session = record.sessionId?.subject || record.sessionId?.name || "";
      const status = record.status || "";
      return (
        student.toLowerCase().includes(term) ||
        session.toLowerCase().includes(term) ||
        status.toLowerCase().includes(term)
      );
    });
  }, [records, search]);

  const overallCount = filteredRecords.length;
  const presentCount = filteredRecords.filter((rec) => String(rec.status).toLowerCase() !== "absent").length;

  const exportRecords = () => {
    const rows = filteredRecords.map((record) => ({
      student: record.studentId?.name || record.studentName || "Unknown",
      email: record.studentId?.email || "",
      subject: record.sessionId?.subject || record.sessionId?.name || "Unknown",
      status: record.status || "Present",
      checkIn: formatDateTime(record.checkIn || record.createdAt || record.timestamp),
      accuracy: record.location?.accuracy ? `${Math.round(record.location.accuracy)}m` : record.accuracy ? `${Math.round(record.accuracy)}m` : "—",
    }));

    reportService.downloadCSV(rows, `faculty-attendance-${date}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5" style={{ background: "linear-gradient(135deg, #111827, #1f2937)" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold" style={{ fontSize: 18 }}>Today's Attendance</h3>
            <p className="text-sm text-slate-400">View attendance for the selected date. Use the filter to change the day.</p>
          </div>
          <button
            type="button"
            onClick={exportRecords}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:shadow-indigo-500/35"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Select date</label>
              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Search attendance</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Student or subject"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setSearch(""); setDate(todayISO()); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              <RefreshCcw size={14} /> Reset
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-400">Date</p>
            <p className="mt-2 text-lg font-semibold text-white">{date}</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-400">Records</p>
            <p className="mt-2 text-lg font-semibold text-white">{overallCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-400">Present</p>
            <p className="mt-2 text-lg font-semibold text-white">{presentCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">Attendance records</p>
            <p className="text-xs text-slate-500">Showing records for {date}</p>
          </div>
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-300">
              <CheckCircle size={14} /> Loading...
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-600 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950/60">
          <table className="w-full text-sm text-left text-slate-200">
            <thead className="bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Checked In</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                    {loading ? "Loading attendance..." : "No attendance records found for this date."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id || record.id || `${record.studentId?._id || record.studentId}_${record.sessionId?._id || record.sessionId}`}
                    className="border-t border-slate-800 hover:bg-slate-950/80"
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">{record.studentId?.name || record.studentName || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-300">{record.sessionId?.subject || record.sessionId?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-300">{record.status || "Present"}</td>
                    <td className="px-4 py-3 text-slate-300">{formatDateTime(record.checkIn || record.createdAt || record.timestamp)}</td>
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
